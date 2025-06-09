import { SVGElementNode } from '../types';

/**
 * Calculates the height of a text element based on its tspans
 */
export function calculateTextElementHeight(
  element: SVGElementNode,
  oldLineHeight: number = 0,
): { height: number; lineHeight: number } {
  if (!element.innerHTML) return { height: 0, lineHeight: oldLineHeight };

  const tspanMatches = element.innerHTML.match(/<tspan[^>]*y="([^"]*)"[^>]*>/g);
  if (!tspanMatches || tspanMatches.length === 0) return { height: 0, lineHeight: oldLineHeight };

  // Extract y coordinates
  const yCoordinates = tspanMatches.map(match => {
    const yMatch = match.match(/y="([^"]*)"/);
    return yMatch ? parseFloat(yMatch[1]) : 0;
  });

  let estimatedLineHeight = oldLineHeight;
  if (oldLineHeight === 0) {
    const dyMatch = element.innerHTML.match(/dy="([^"]*)"/);
    if (dyMatch) {
      estimatedLineHeight = parseFloat(dyMatch[1]);
    } else {
      const fontSizeMatch = element.innerHTML.match(/font-size="([^"]*)"/);
      const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 12;
      estimatedLineHeight = fontSize * 1.2;
    }
  }

  // Single line has no additional height
  if (yCoordinates.length === 1) return { height: oldLineHeight, lineHeight: estimatedLineHeight };

  // Height is the difference between first and last line plus one line height
  const minY = Math.min(...yCoordinates);
  const maxY = Math.max(...yCoordinates);

  let lineHeight = oldLineHeight;
  if (oldLineHeight === 0) {
    // Calculate line height using the same logic as rendering:
    // Use difference between first and second tspan, or fallback to font size
    if (yCoordinates.length >= 2) {
      // Use the difference between first and second tspan y-coordinates
      lineHeight = Math.abs(yCoordinates[1] - yCoordinates[0]);
    } else {
      lineHeight = estimatedLineHeight; // Fallback to estimated line height
    }
  }

  return { height: maxY - minY + lineHeight, lineHeight };
}

/**
 * Shifts elements whose bottom is below the given y-coordinate
 */
export function shiftElementsBelow(svgTree: SVGElementNode, belowY: number, deltaY: number): void {
  function processElement(element: SVGElementNode): void {
    // Check if element has a y coordinate and calculate its bottom
    const yAttr = element.attributes.y;
    if (yAttr) {
      const y = parseFloat(yAttr);
      const heightAttr = element.attributes.height;
      let elementBottom = y;

      if (heightAttr) {
        // Element has explicit height
        elementBottom = y + parseFloat(heightAttr);
      } else {
        // For elements without height, use the y coordinate as approximation
        elementBottom = y;
      }

      if (elementBottom > belowY) {
        element.attributes.y = String(y + deltaY);
      }
    }

    // Check for cy attribute (circles) - bottom is cy + r
    const cyAttr = element.attributes.cy;
    if (cyAttr) {
      const cy = parseFloat(cyAttr);
      const rAttr = element.attributes.r;
      let elementBottom = cy;

      if (rAttr) {
        elementBottom = cy + parseFloat(rAttr);
      }

      if (elementBottom > belowY) {
        element.attributes.cy = String(cy + deltaY);
      }
    }

    // Check for other y-based attributes (lines) - use the lower y coordinate as bottom
    const y1Attr = element.attributes.y1;
    const y2Attr = element.attributes.y2;
    if (y1Attr && y2Attr) {
      const y1 = parseFloat(y1Attr);
      const y2 = parseFloat(y2Attr);
      const elementBottom = Math.max(y1, y2);

      if (elementBottom > belowY) {
        element.attributes.y1 = String(y1 + deltaY);
        element.attributes.y2 = String(y2 + deltaY);
      }
    } else if (y1Attr) {
      const y1 = parseFloat(y1Attr);
      if (y1 > belowY) {
        element.attributes.y1 = String(y1 + deltaY);
      }
    } else if (y2Attr) {
      const y2 = parseFloat(y2Attr);
      if (y2 > belowY) {
        element.attributes.y2 = String(y2 + deltaY);
      }
    }

    // Check transform translate for elements positioned via transform
    // Note: For transformed elements, we check the y coordinate since height is not easily determinable
    const transformAttr = element.attributes.transform;
    if (transformAttr) {
      const translateMatch = transformAttr.match(/translate\(([^,)]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        if (y > belowY) {
          element.attributes.transform = transformAttr.replace(
            /translate\([^)]+\)/,
            `translate(${x}, ${y + deltaY})`,
          );
        }
      }
    }

    // Handle path elements - check if any y coordinate in the path is below the threshold
    // Note: This is an approximation since calculating path bounds is complex
    if (element.tagName === 'path' && element.attributes.d) {
      const pathData = element.attributes.d;
      // Extract y coordinates from path data (M, L, C, Q commands)
      const yMatches = pathData.match(
        /[MLCQSTAZmlcqstaz][\s,]*[^MLCQSTAZmlcqstaz]*?[\s,]+([0-9.-]+)/g,
      );
      if (yMatches) {
        let shouldShift = false;

        // Check if any y coordinate in the path is below the threshold
        for (const match of yMatches) {
          const coords = match.match(/([0-9.-]+)/g);
          if (coords && coords.length >= 2) {
            const y = parseFloat(coords[1]); // y is typically the second coordinate
            if (y > belowY) {
              shouldShift = true;
              break;
            }
          }
        }

        if (shouldShift) {
          // Add or update transform translate for the path
          if (element.attributes.transform) {
            const existingTransform = element.attributes.transform;
            const translateMatch = existingTransform.match(/translate\(([^,)]+),\s*([^)]+)\)/);
            if (translateMatch) {
              const x = parseFloat(translateMatch[1]);
              const y = parseFloat(translateMatch[2]);
              element.attributes.transform = existingTransform.replace(
                /translate\([^)]+\)/,
                `translate(${x}, ${y + deltaY})`,
              );
            } else {
              // Add translate to existing transform
              element.attributes.transform = `translate(0, ${deltaY}) ${existingTransform}`;
            }
          } else {
            // Create new transform attribute
            element.attributes.transform = `translate(0, ${deltaY})`;
          }
        }
      }
    }

    // Process tspan elements within text elements
    if (element.innerHTML && element.isText) {
      element.innerHTML = element.innerHTML.replace(
        /<tspan([^>]*)y="([^"]*)"([^>]*)/g,
        (match, before, yValue, after) => {
          const y = parseFloat(yValue);
          if (y > belowY) {
            return `<tspan${before}y="${y + deltaY}"${after}`;
          }
          return match;
        },
      );
    }

    // Recursively process children
    element.children.forEach(processElement);
  }

  processElement(svgTree);
}

/**
 * Detects if an element is likely a full-height background element
 */
function isFullHeightElement(element: SVGElementNode, svgHeight: number): boolean {
  const heightAttr = element.attributes.height;
  const yAttr = element.attributes.y;

  if (!heightAttr) return false;

  const height = parseFloat(heightAttr);
  const y = yAttr ? parseFloat(yAttr) : 0;

  // Simple and reliable heuristics:

  // 1. Height is close to or larger than SVG height (within 10% tolerance)
  const heightRatio = height / svgHeight;
  if (heightRatio < 0.9) return false;

  // 2. Element starts at or near the top (y <= 10)
  if (y > 10) return false;

  return true;
}

/**
 * Updates heights of full-height background elements and SVG dimensions
 * 
 * When text content expands and increases the overall document height, we need to:
 * 1. Expand background elements (like full-height rectangles) to maintain visual consistency
 * 2. Update the SVG container dimensions to accommodate the new content
 * 3. Update the viewBox to ensure proper coordinate mapping
 * 
 * This prevents backgrounds from being too short and content from being clipped.
 */
export function updateFullHeightElements(
  svgTree: SVGElementNode,
  deltaHeight: number,
  originalSvgHeight: number,
): void {
  function processElement(element: SVGElementNode): void {
    if (isFullHeightElement(element, originalSvgHeight)) {
      const currentHeight = parseFloat(element.attributes.height);
      const newHeight = Math.max(0, currentHeight + deltaHeight);
      element.attributes.height = String(newHeight);
    }

    // If this is the SVG root element, also update viewBox
    if (element.tagName === 'svg' && element.attributes.viewBox) {
      const viewBoxParts = element.attributes.viewBox.split(/\s+/);
      if (viewBoxParts.length === 4) {
        const [minX, minY, width, height] = viewBoxParts.map(parseFloat);
        const newHeight = Math.max(0, height + deltaHeight);
        element.attributes.viewBox = `${minX} ${minY} ${width} ${newHeight}`;
      }
    }

    // Recursively process children
    element.children.forEach(processElement);
  }

  processElement(svgTree);
}

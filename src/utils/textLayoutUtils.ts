import { SVGElementNode } from '../types';

/**
 * Represents a line in text layout with its position
 */
export interface Line {
  y: number;
  x: number; // leftmost x position on this line
}

/**
 * Array of lines, sorted by y-coordinate with unique y-values
 */
export type Lines = Line[];

/**
 * Extracts lines from tspan elements, handling multiple tspans on the same line
 */
export function extractLinesFromTspans(tspanStrings: string[]): Lines {
  const lineMap = new Map<number, number>(); // y -> leftmost x

  tspanStrings.forEach(tspanString => {
    const yMatch = tspanString.match(/y="([^"]*)"/);
    const xMatch = tspanString.match(/x="([^"]*)"/);

    if (yMatch) {
      const y = parseFloat(yMatch[1]);
      const x = xMatch ? parseFloat(xMatch[1]) : 0;

      // Keep track of the leftmost x position for each y
      if (!lineMap.has(y) || x < lineMap.get(y)!) {
        lineMap.set(y, x);
      }
    }
  });

  // Convert to Lines array and sort by y
  const lines: Lines = Array.from(lineMap.entries())
    .map(([y, x]) => ({ y, x }))
    .sort((a, b) => a.y - b.y);

  return lines;
}

/**
 * Extracts lines from a text element's innerHTML
 */
export function extractLinesFromElement(element: SVGElementNode): Lines {
  if (!element.innerHTML) return [];

  const tspanMatches = element.innerHTML.match(/<tspan[^>]*y="([^"]*)"[^>]*>/g);
  if (!tspanMatches) return [];

  return extractLinesFromTspans(Array.from(tspanMatches));
}

/**
 * Calculates the height of a text element based on its lines
 */
export function calculateTextElementHeight(
  element: SVGElementNode,
  oldLineHeight: number = 0,
): { height: number; lineHeight: number } {
  if (!element.innerHTML) return { height: 0, lineHeight: oldLineHeight };

  const lines = extractLinesFromElement(element);
  if (lines.length === 0) return { height: 0, lineHeight: oldLineHeight };

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
  if (lines.length === 1) return { height: oldLineHeight, lineHeight: estimatedLineHeight };

  // Height is the difference between first and last line plus one line height
  const minY = lines[0].y; // lines are sorted, so first is minimum
  const maxY = lines[lines.length - 1].y; // last is maximum

  let lineHeight = oldLineHeight;
  if (oldLineHeight === 0) {
    // Calculate line height using the difference between first and second line
    if (lines.length >= 2) {
      lineHeight = Math.abs(lines[1].y - lines[0].y);
    } else {
      lineHeight = estimatedLineHeight; // Fallback to estimated line height
    }
  }

  return { height: maxY - minY + lineHeight, lineHeight };
}

/**
 * Shifts elements whose top is below the given y-coordinate
 */
export function shiftElementsBelow(svgTree: SVGElementNode, belowY: number, deltaY: number): void {
  function processElement(element: SVGElementNode): void {
    // Check if element has a y coordinate - shift if element's top is below threshold
    const yAttr = element.attributes.y;
    if (yAttr) {
      const y = parseFloat(yAttr);

      // Element is below if its top position is below the threshold
      if (y > belowY) {
        element.attributes.y = String(y + deltaY);
      }
    }

    // Check for cy attribute (circles) - shift if center is below threshold
    const cyAttr = element.attributes.cy;
    if (cyAttr) {
      const cy = parseFloat(cyAttr);

      // Circle is below if its center is below the threshold
      if (cy > belowY) {
        element.attributes.cy = String(cy + deltaY);
      }
    }

    // Check for other y-based attributes (lines) - shift if any point is below threshold
    const y1Attr = element.attributes.y1;
    const y2Attr = element.attributes.y2;
    if (y1Attr && y2Attr) {
      const y1 = parseFloat(y1Attr);
      const y2 = parseFloat(y2Attr);

      // Line is below if any of its endpoints is below the threshold
      if (y1 > belowY || y2 > belowY) {
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
    const transformAttr = element.attributes.transform;
    if (transformAttr) {
      const translateMatch = transformAttr.match(/translate\(([^,)\s]+)[\s,]+([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);

        // Transform is below if its y translation is below the threshold
        if (y > belowY) {
          element.attributes.transform = transformAttr.replace(
            /translate\([^)]+\)/,
            `translate(${x}, ${y + deltaY})`,
          );
        }
      }
    }

    // Handle path elements - check if the path's top-most y coordinate is below the threshold
    // Note: This is an approximation since calculating path bounds is complex
    if (element.tagName === 'path' && element.attributes.d) {
      const pathData = element.attributes.d;
      // Extract y coordinates from path data (M, L, C, Q commands)
      const yMatches = pathData.match(
        /[MLCQSTAZmlcqstaz][\s,]*[^MLCQSTAZmlcqstaz]*?[\s,]+([0-9.-]+)/g,
      );
      if (yMatches) {
        let minY = Infinity;

        // Find the minimum y coordinate in the path (top-most point)
        for (const match of yMatches) {
          const coords = match.match(/([0-9.-]+)/g);
          if (coords && coords.length >= 2) {
            const y = parseFloat(coords[1]); // y is typically the second coordinate
            minY = Math.min(minY, y);
          }
        }

        // Shift if the path's top-most point is below the threshold
        if (minY !== Infinity && minY > belowY) {
          // Add or update transform translate for the path
          if (element.attributes.transform) {
            const existingTransform = element.attributes.transform;
            const translateMatch = existingTransform.match(/translate\(([^,)\s]+)[\s,]+([^)]+)\)/);
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
          // Shift tspan if its y coordinate is below the threshold
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

import { encode } from 'he';
import { HTMLElement } from 'node-html-parser';

import { DataBindingContext, SVGElementNode, JSONValue, TextLayoutComponent } from '../types';

import { findElementById } from './svgUtils';
import { breakTextIntoLines, generateTspans, FontConfig } from './textUtils';

/**
 * Escapes XML special characters using he library with numeric entities
 */
function escapeXML(str: string): string {
  return encode(str, {
    useNamedReferences: false, // Forces numeric references
    decimal: true, // Use decimal (&#38;) instead of hex (&#x26;)
  });
}

/**
 * Calculates the height of a text element based on its tspans
 */
function calculateTextElementHeight(
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
function shiftElementsBelow(svgTree: SVGElementNode, belowY: number, deltaY: number): void {
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
 * Updates heights of full-height background elements
 */
function updateFullHeightElements(
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

    // Recursively process children
    element.children.forEach(processElement);
  }

  processElement(svgTree);
}

/**
 * Updates the SVG height attribute and viewBox (only if they exist)
 */
function updateSvgHeight(svgTree: SVGElementNode, deltaHeight: number): void {
  // Only update height if the SVG already has a height attribute
  if (svgTree.attributes.height) {
    const currentHeight = parseFloat(svgTree.attributes.height);
    const newHeight = Math.max(0, currentHeight + deltaHeight);
    svgTree.attributes.height = String(newHeight);
  }

  // Update viewBox if it exists
  if (svgTree.attributes.viewBox) {
    const viewBoxParts = svgTree.attributes.viewBox.split(/\s+/);
    if (viewBoxParts.length === 4) {
      const [minX, minY, width, height] = viewBoxParts.map(parseFloat);
      const newHeight = Math.max(0, height + deltaHeight);
      svgTree.attributes.viewBox = `${minX} ${minY} ${width} ${newHeight}`;
    }
  }
}

/**
 * Extracts a value from a nested object using a dot-notation path
 */
function getValueFromPath(obj: JSONValue, path: string): JSONValue | undefined {
  if (!path) return undefined;

  const parts = path.split('.');
  let current: JSONValue | undefined = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = (current as Record<string, JSONValue>)[part];
  }

  return current;
}

/**
 * Applies data bindings from data source to SVG elements
 */
export function applyDataBindings({
  svgTree,
  connections,
  dataSources,
  components = [],
}: DataBindingContext): void {
  let totalHeightDelta = 0;
  const originalSvgHeight = svgTree.attributes.height ? parseFloat(svgTree.attributes.height) : 0;

  // Process each connection
  connections.forEach(connection => {
    // Find the target component
    const targetComponent = components.find(component => component.id === connection.targetNodeId);
    if (!targetComponent) {
      return;
    }

    // Handle based on component type
    if (targetComponent.type === 'text' || targetComponent.type === 'image') {
      const elementId = targetComponent.elementId;

      // Find the target element in the SVG
      const targetElement = findElementById(svgTree, elementId);
      if (!targetElement) {
        return;
      }

      // Get the data value from the source field path
      const dataValue = getValueFromPath(
        dataSources[connection.sourceNodeId],
        connection.sourceField,
      );
      if (dataValue === undefined) return;

      // Apply the value based on element type
      if (targetComponent.type === 'text' && targetElement.isText) {
        // For text elements, we need to handle the innerHTML for Figma's tspan elements
        const dataString = String(dataValue);
        const textComponent = targetComponent as TextLayoutComponent;

        if (targetElement.innerHTML) {
          // If there's tspan content, we need to update the content of each tspan
          const tempDiv = new HTMLElement('div', {});
          tempDiv.innerHTML = targetElement.innerHTML;

          // Get all tspans
          const tspans = tempDiv.querySelectorAll('tspan');

          if (tspans.length > 0) {
            // Check for rendering strategy
            const renderingStrategy = textComponent.renderingStrategy;

            if (renderingStrategy?.width.type === 'constrained') {
              // Calculate original height before modification
              const { height: originalHeight, lineHeight: oldLineHeight } =
                calculateTextElementHeight(targetElement);

              // For constrained width, break text into lines and generate tspans
              const firstTspan = tspans[0];
              const x = parseFloat(firstTspan.getAttribute('x') || '0');
              const y = parseFloat(firstTspan.getAttribute('y') || '0');

              // Extract font information from the first tspan for text measurement
              const fontFamily = firstTspan.getAttribute('font-family') || 'Arial';
              const fontSize = parseFloat(firstTspan.getAttribute('font-size') || '12');
              const fontWeight = firstTspan.getAttribute('font-weight') || 'normal';
              const letterSpacing = parseFloat(firstTspan.getAttribute('letter-spacing') || '0');

              // Extract line spacing information
              const lineSpacingAttr =
                firstTspan.getAttribute('line-spacing') || firstTspan.getAttribute('line-height');
              const lineSpacing = lineSpacingAttr ? parseFloat(lineSpacingAttr) - fontSize : 0;

              const fontConfig: FontConfig = {
                fontFamily,
                fontSize,
                fontWeight,
                letterSpacing: letterSpacing || undefined,
                lineSpacing: lineSpacing || undefined,
              };

              // Break text into lines based on width constraint
              const lines = breakTextIntoLines(
                dataString,
                renderingStrategy.width.value,
                fontConfig,
              );

              // Calculate line height from existing tspans or fallback to dy/font size estimate
              let lineHeight: number;
              if (tspans.length >= 2) {
                // Use the difference between first and second tspan y-coordinates
                const firstY = parseFloat(tspans[0].getAttribute('y') || '0');
                const secondY = parseFloat(tspans[1].getAttribute('y') || '0');
                lineHeight = Math.abs(secondY - firstY);
              } else {
                // Fallback to dy attribute or font size estimate
                lineHeight = parseFloat(firstTspan.getAttribute('dy') || String(fontSize * 1.2));
              }

              // Generate tspan data for each line with line spacing
              const tspanData = generateTspans(lines, x, y, lineHeight, lineSpacing);

              // Clear existing tspans
              tspans.forEach(tspan => tspan.remove());

              // Create new tspans for each line
              tspanData.forEach((data, index) => {
                const newTspan = new HTMLElement('tspan', {});
                newTspan.setAttribute('x', String(data.x));
                newTspan.setAttribute('y', String(data.y));

                // Copy attributes from the first tspan to maintain styling
                if (index === 0) {
                  Object.entries(firstTspan.attributes).forEach(([name, value]) => {
                    if (name !== 'x' && name !== 'y') {
                      newTspan.setAttribute(name, value);
                    }
                  });
                } else {
                  // For subsequent lines, copy all attributes except positioning
                  Object.entries(firstTspan.attributes).forEach(([name, value]) => {
                    if (name !== 'x' && name !== 'y' && name !== 'dy') {
                      newTspan.setAttribute(name, value);
                    }
                  });
                }

                newTspan.textContent = data.text;
                tempDiv.appendChild(newTspan);
              });

              // Update the innerHTML
              targetElement.innerHTML = tempDiv.innerHTML;

              // Calculate new height and height delta
              const { height: newHeight } = calculateTextElementHeight(
                targetElement,
                oldLineHeight,
              );
              const heightDelta = newHeight - originalHeight;

              // If height changed, shift elements below and update total height delta
              if (heightDelta !== 0) {
                shiftElementsBelow(svgTree, y, heightDelta);
                totalHeightDelta += heightDelta;
              }
            } else {
              // Natural strategy - use existing behavior
              tspans[0].textContent = dataString;
              // Clear the rest of the tspans
              for (let i = 1; i < tspans.length; i++) {
                tspans[i].textContent = '';
              }
            }

            // Update the innerHTML
            targetElement.innerHTML = tempDiv.innerHTML;
          } else {
            // No tspans found, just replace the entire innerHTML
            targetElement.innerHTML = escapeXML(dataString);
          }
        }

        // Also update textContent for compatibility
        targetElement.textContent = dataString;
      } else if (targetComponent.type === 'image' && targetElement.isImage) {
        // For image elements, update the href/xlink:href attribute
        targetElement.attributes['href'] = String(dataValue);
        targetElement.attributes['xlink:href'] = String(dataValue);
      }
    }
    // Color components are handled separately in applyColorComponents function
  });

  // Update full-height elements and SVG height if there were any height changes
  if (totalHeightDelta !== 0) {
    updateFullHeightElements(svgTree, totalHeightDelta, originalSvgHeight);
    updateSvgHeight(svgTree, totalHeightDelta);
  }
}

/**
 * Serializes an SVG element tree back to string format
 */
export function serializeSVG(svgTree: SVGElementNode): string {
  // Create a simple SVG serialization
  const attributes = Object.entries(svgTree.attributes)
    .map(([key, value]) => `${key}="${escapeXML(value)}"`)
    .join(' ');

  let result = `<${svgTree.tagName} ${attributes}`;

  if (svgTree.children.length === 0 && !svgTree.textContent && !svgTree.innerHTML) {
    // Self-closing tag
    return `${result} />`;
  }

  result += '>';

  // For text elements, use innerHTML to preserve tspan elements
  if (svgTree.isText && svgTree.innerHTML) {
    result += svgTree.innerHTML;
  }
  // Add text content if it exists and there's no innerHTML
  else if (svgTree.textContent) {
    result += escapeXML(svgTree.textContent);
  }

  // Add children recursively (for non-text elements, or text elements without innerHTML)
  if (!svgTree.isText || !svgTree.innerHTML) {
    svgTree.children.forEach(child => {
      result += serializeSVG(child);
    });
  }

  // Close tag
  result += `</${svgTree.tagName}>`;

  return result;
}

import { encode } from 'he';
import { HTMLElement } from 'node-html-parser';

import { DataBindingContext, SVGElementNode, JSONValue, TextLayoutComponent } from '../types';

import { findElementById } from './svgUtils';
import {
  calculateTextElementHeight,
  shiftElementsBelow,
  updateFullHeightElements,
  updateSvgHeight,
} from './textLayoutUtils';
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

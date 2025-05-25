import { HTMLElement } from 'node-html-parser';

import { DataBindingContext } from '../types';
import { SVGElementNode } from '../types';

import { findElementById } from './svgUtils';

/**
 * Extracts a value from a nested object using a dot-notation path
 */
function getValueFromPath(obj: any, path: string): any {
  if (!path) return undefined;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    current = current[part];
  }
  
  return current;
}

/**
 * Applies data bindings from data source to SVG elements
 */
export function applyDataBindings({ svgTree, connections, dataSources, nodes = [] }: DataBindingContext): void {
  // Process each connection
  connections.forEach(connection => {
    // Find the target node
    const targetNode = nodes.find(node => node.id === connection.targetNodeId);
    if (!targetNode) {
      return;
    }
    
    // Handle based on node type
    if (targetNode.type === 'text' || targetNode.type === 'image') {
      const elementId = targetNode.elementId;
      
      // Find the target element in the SVG
      const targetElement = findElementById(svgTree, elementId);
      if (!targetElement) {
        return;
      }
    
      // Get the data value from the source field path
      const dataValue = getValueFromPath(dataSources[connection.sourceNodeId], connection.sourceField);
      if (dataValue === undefined) return;
      
      // Apply the value based on element type
      if (targetNode.type === 'text' && targetElement.isText) {
        // For text elements, we need to handle the innerHTML for Figma's tspan elements
        const dataString = String(dataValue);
        
        if (targetElement.innerHTML) {
          // If there's tspan content, we need to update the content of each tspan
          const tempDiv = new HTMLElement('div', {});
          tempDiv.innerHTML = targetElement.innerHTML;
          
          // Get all tspans
          const tspans = tempDiv.querySelectorAll('tspan');
          
          if (tspans.length > 0) {
            // Update the first tspan with our data
            tspans[0].textContent = dataString;
            // As a workaround, clear the rest of the tspans
            for (let i = 1; i < tspans.length; i++) {
              tspans[i].textContent = '';
            }
            
            // Update the innerHTML
            targetElement.innerHTML = tempDiv.innerHTML;
          } else {
            // No tspans found, just replace the entire innerHTML
            targetElement.innerHTML = dataString;
          }
        }
        
        // Also update textContent for compatibility
        targetElement.textContent = dataString;
      } else if (targetNode.type === 'image' && targetElement.isImage) {
        // For image elements, update the href/xlink:href attribute
        targetElement.attributes['href'] = String(dataValue);
        targetElement.attributes['xlink:href'] = String(dataValue);
      }
    } 
    // Color nodes are handled separately in applyColorNodes function
  });
}

/**
 * Serializes an SVG element tree back to string format
 */
export function serializeSVG(svgTree: SVGElementNode): string {
  // Create a simple SVG serialization
  const attributes = Object.entries(svgTree.attributes)
    .map(([key, value]) => `${key}="${value}"`)
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
    result += svgTree.textContent;
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

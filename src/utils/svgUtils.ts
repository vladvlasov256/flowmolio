import { encode } from 'he';
import parse, { type HTMLElement } from 'node-html-parser';

import { SVGElementNode } from '../types';

import { IdGenerator } from './IdGenerator';

export function parseSVG(svgString: string): SVGElementNode {
  try {
    // Create a DOM parser
    const doc = parse(svgString);

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('SVG parsing error: ' + parserError.textContent);
    }

    // Get the root SVG element
    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found');
    }

    // Create ID generator for deterministic IDs
    const idGenerator = IdGenerator.fromSVGString(svgString);

    // Parse the SVG hierarchy
    return parseElement(svgElement, idGenerator);
  } catch (error) {
    throw new Error('SVG parsing failed: ' + (error as Error).message);
  }
}

function parseElement(element: HTMLElement, idGenerator: IdGenerator): SVGElementNode {
  // Get attributes
  const attributes: Record<string, string> = {};
  Object.entries(element.attributes).forEach(([key, value]) => {
    attributes[key] = value;
  });

  // Store the original ID if it exists
  const originalId = element.id || undefined;

  // Get ID (generate deterministic one if not present)
  const id = originalId || idGenerator.next(element.tagName.toLowerCase());

  // Determine if it's a text element
  const isText = element.tagName.toLowerCase() === 'text';

  // Determine if it's an image element
  const isImage = element.tagName.toLowerCase() === 'image';

  // For text elements, capture the innerHTML with tspans intact
  let innerHTML: string | undefined;
  let textContent: string | undefined;

  if (isText) {
    innerHTML = element.innerHTML;
    // Also keep textContent for compatibility
    textContent = element.textContent || '';
  }

  // Enter deeper level for children parsing
  idGenerator.enterLevel();

  // Parse children (skip tspan children for text elements since we're capturing innerHTML)
  const children: SVGElementNode[] = [];
  if (!isText) {
    Array.from(element.children).forEach(child => {
      // Skip tspan children since they're already captured in innerHTML
      if (isText && child.tagName.toLowerCase() === 'tspan') {
        return;
      }
      children.push(parseElement(child, idGenerator));
    });
  } else {
    // For text elements, don't parse tspan children
    Array.from(element.children).forEach(child => {
      // Only include non-tspan children if there are any
      if (child.tagName.toLowerCase() !== 'tspan') {
        children.push(parseElement(child, idGenerator));
      }
    });
  }

  // Exit level after processing children
  idGenerator.exitLevel();

  return {
    id,
    originalId,
    tagName: element.tagName.toLowerCase(),
    attributes,
    children,
    isText,
    isImage,
    textContent,
    innerHTML,
  };
}

export function findElementById(tree: SVGElementNode, id: string): SVGElementNode | null {
  if (tree.id === id) {
    return tree;
  }

  if (tree.children && tree.children.length > 0) {
    for (const child of tree.children) {
      const found = findElementById(child, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Escapes XML special characters for safe inclusion in XML/SVG
 */
function escapeXML(str: string): string {
  return encode(str, {
    useNamedReferences: false, // Forces numeric references
    decimal: true, // Use decimal (&#38;) instead of hex (&#x26;)
  });
}

/**
 * Serializes an SVG element tree back to string format
 */
export function serializeSVG(svgTree: SVGElementNode): string {
  // Create a simple SVG serialization
  let attributes = Object.entries(svgTree.attributes)
    .filter(([key]) => key !== 'id') // Remove id from attributes since we'll handle it separately
    .map(([key, value]) => `${key}="${escapeXML(value)}"`)
    .join(' ');

  // Include the id if it exists (either original or generated)
  if (svgTree.id) {
    const idAttr = `id="${escapeXML(svgTree.id)}"`;
    attributes = attributes ? `${idAttr} ${attributes}` : idAttr;
  }

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

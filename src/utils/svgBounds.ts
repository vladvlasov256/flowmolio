import { FabricObject, loadSVGFromString } from 'fabric';

import { SVGElementNode } from '../types';

import { serializeSVG } from './svgUtils';
import { extractLinesFromElement } from './textLayoutUtils';

/**
 * Represents the bounding box of an SVG element
 */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Loads all fabric.js objects from an SVG string and returns them indexed by ID
 */
export async function loadAllFabricObjects(
  svgString: string,
): Promise<Record<string, FabricObject>> {
  const fabricObjectsById: Record<string, FabricObject> = {};

  await loadSVGFromString(svgString, (element, obj) => {
    const fabricElementId = element.getAttribute('id');
    if (fabricElementId) {
      fabricObjectsById[fabricElementId] = obj;
    }
  });

  return fabricObjectsById;
}

/**
 * Calculate element bounds using pre-loaded fabric objects
 */
function calculateElementBoundsFromFabricObjects(
  fabricObjectsById: Record<string, FabricObject>,
  targetElement: SVGElementNode,
): ElementBounds {
  const elementId = targetElement?.id;

  // Require ID for fabric.js bounds calculation
  if (!elementId) {
    throw new Error(
      `Element must have an ID for fabric.js bounds calculation: ${targetElement.tagName}`,
    );
  }

  const fabricObject = fabricObjectsById[elementId];
  if (fabricObject) {
    const bounds = fabricObject.getBoundingRect();
    return {
      x: bounds.left,
      y: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
  }

  // If element with ID not found, throw an error for debugging
  throw new Error(
    `Element with ID "${elementId}" not found in fabric.js objects. Check if the element exists in the SVG string.`,
  );
}

/**
 * Legacy function - Calculate element bounds using fabric.js for accurate SVG rendering
 * @deprecated Use loadAllFabricObjects + calculateElementBoundsFromFabricObjects for better performance
 */
async function calculateElementBoundsWithFabric(
  svgString: string,
  targetElement: SVGElementNode,
): Promise<ElementBounds> {
  const fabricObjectsById = await loadAllFabricObjects(svgString);
  return calculateElementBoundsFromFabricObjects(fabricObjectsById, targetElement);
}

/**
 * Context for height update operations
 */
export interface HeightUpdateContext {
  element: SVGElementNode;
  oldBounds: ElementBounds;
  newBounds: ElementBounds;
  deltaHeight: number;
}

/**
 * Calculate element bounds using fabric.js (async)
 * This version creates a root SVG if none provided
 * Handles root <svg> elements specially by returning their width/height attributes
 */
export async function calculateSingleElementBounds(
  element: SVGElementNode,
  svgRoot?: SVGElementNode,
): Promise<ElementBounds> {
  // Handle root SVG elements specially
  if (element.tagName.toLowerCase() === 'svg') {
    const width = parseFloat(element.attributes.width || '0');
    const height = parseFloat(element.attributes.height || '0');
    return {
      x: 0,
      y: 0,
      width,
      height,
    };
  }

  let root: SVGElementNode;

  if (svgRoot) {
    root = svgRoot;
  } else {
    // Create a temporary root SVG if none provided
    root = {
      tagName: 'svg',
      attributes: {
        width: '1000',
        height: '1000',
        xmlns: 'http://www.w3.org/2000/svg',
      },
      children: [element],
      id: 'temp-root',
      isText: false,
      isImage: false,
    };
  }

  // Use the serialized SVG string from renderUtils
  const svgString = serializeSVG(root);

  return await calculateElementBoundsWithFabric(svgString, element);
}

/**
 * Calculate bounds for an element within the context of the full SVG tree
 * This is the primary bounds calculation function
 * Throws errors for invalid combinations of SVG elements
 */
export async function calculateElementBounds(
  element: SVGElementNode,
  svgRoot: SVGElementNode,
): Promise<ElementBounds> {
  // Throw error if element is an SVG
  if (element.tagName.toLowerCase() === 'svg') {
    throw new Error(
      'Cannot calculate bounds for SVG element using calculateElementBounds. Use calculateSingleElementBounds instead.',
    );
  }

  // Throw error if svgRoot is not an SVG
  if (svgRoot.tagName.toLowerCase() !== 'svg') {
    throw new Error('svgRoot must be an SVG element');
  }

  const svgString = serializeSVG(svgRoot);

  return await calculateElementBoundsWithFabric(svgString, element);
}

/**
 * Synchronous fallback for text bounds using line extraction
 * Used when we need immediate bounds for text layout calculations
 */
export function calculateTextBoundsSync(element: SVGElementNode): ElementBounds {
  const lines = extractLinesFromElement(element);

  if (lines.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Get the leftmost x and topmost y
  const minX = Math.min(...lines.map(line => line.x));
  const minY = lines[0].y; // lines are sorted by y
  const maxY = lines[lines.length - 1].y;

  // Estimate line height
  let lineHeight = 12; // default fallback
  if (lines.length >= 2) {
    lineHeight = lines[1].y - lines[0].y;
  } else {
    // Try to get from font-size
    const fontSizeMatch = element.innerHTML?.match(/font-size="([^"]*)"/);
    if (fontSizeMatch) {
      lineHeight = parseFloat(fontSizeMatch[1]) * 1.2;
    }
  }

  // Estimate width by finding the longest line
  let maxWidth = 0;
  if (element.innerHTML) {
    const xMatches = element.innerHTML.match(/x="([^"]*)"/g);
    if (xMatches && xMatches.length > 1) {
      const xValues = xMatches.map(match => parseFloat(match.replace(/x="|"/g, '')));
      maxWidth = Math.max(...xValues) - minX + 100;
    }
  }

  if (maxWidth === 0) {
    maxWidth = 200; // reasonable default
  }

  const height = lines.length > 1 ? maxY - minY + lineHeight : lineHeight;

  return {
    x: minX,
    y: minY,
    width: maxWidth,
    height: height,
  };
}

/**
 * Checks if an element contains (overlaps with) the changed element
 *
 * An element "contains" the changed element if their bounds intersect
 * for at least 90% of the changed element's height.
 */
export function containsChangedElement(
  element: SVGElementNode,
  changedElementBounds: ElementBounds,
  fabricObjectsById: Record<string, FabricObject>,
): boolean {
  const tagName = element.tagName.toLowerCase();

  // Ignore elements that don't have visual bounds or make no sense for containment
  const nonRenderableElements = [
    'defs',
    'clippath',
    'mask',
    'pattern',
    'marker',
    'symbol',
    'style',
    'title',
    'desc',
    'metadata',
  ];
  if (nonRenderableElements.includes(tagName)) {
    return false;
  }

  // Special handling for container elements that can have children
  // These elements can't have bounds calculated by fabric.js (or shouldn't), but they can contain elements that do
  const containerElements = ['g', 'svg', 'symbol', 'marker', 'switch', 'a', 'foreignobject'];
  if (containerElements.includes(tagName)) {
    // Check if any child of the container contains the changed element
    for (const child of element.children) {
      if (containsChangedElement(child, changedElementBounds, fabricObjectsById)) {
        return true;
      }
    }
    return false;
  }

  try {
    const elementBounds = calculateElementBoundsFromFabricObjects(fabricObjectsById, element);

    // Calculate vertical overlap between the two elements
    const overlapTop = Math.max(elementBounds.y, changedElementBounds.y);
    const overlapBottom = Math.min(
      elementBounds.y + elementBounds.height,
      changedElementBounds.y + changedElementBounds.height,
    );

    // If there's no overlap, return false
    if (overlapTop >= overlapBottom) {
      return false;
    }

    const overlapHeight = overlapBottom - overlapTop;
    const changedElementHeight = changedElementBounds.height;

    // Element contains the changed element if there's meaningful overlap
    // For very small elements, any overlap counts
    // For larger elements, require at least 90% overlap
    if (changedElementHeight < 5) {
      return overlapHeight > 0;
    }

    const overlapRatio = overlapHeight / changedElementHeight;
    return overlapRatio >= 0.9;
  } catch {
    // If bounds calculation fails, assume no containment
    return false;
  }
}

/**
 * Updates heights of siblings that contain the changed element
 * Falls back to full-height logic if no containing elements are found
 */
export async function updateContainingSiblings(
  containerElement: SVGElementNode,
  changedElementBounds: ElementBounds,
  deltaHeight: number,
  svgRoot: SVGElementNode,
  fabricObjectsById: Record<string, FabricObject>,
  processedElements: Set<SVGElementNode> = new Set(),
): Promise<void> {
  // First pass: try to find elements that contain the changed element
  const elementsToUpdate: SVGElementNode[] = [];

  for (const child of containerElement.children) {
    // Skip if this child has already been processed
    // This prevents double-processing when recursively traversing up the hierarchy
    if (processedElements.has(child)) {
      continue;
    }

    if (containsChangedElement(child, changedElementBounds, fabricObjectsById)) {
      elementsToUpdate.push(child);
    }
  }

  // With fabric.js providing accurate bounds, we don't need fallback logic
  // If no containing elements found, that means no elements should be updated

  // Update all identified elements
  for (const child of elementsToUpdate) {
    // Mark this element as processed
    processedElements.add(child);

    // Update the element's height based on its type
    switch (child.tagName.toLowerCase()) {
      case 'rect': {
        if (child.attributes.height) {
          const currentHeight = parseFloat(child.attributes.height);
          const newHeight = Math.max(0, currentHeight + deltaHeight);
          child.attributes.height = String(newHeight);
        }
        break;
      }

      case 'ellipse': {
        if (child.attributes.ry) {
          const currentRy = parseFloat(child.attributes.ry);
          const newRy = Math.max(0, currentRy + deltaHeight / 2);
          child.attributes.ry = String(newRy);
        }
        break;
      }

      case 'circle': {
        if (child.attributes.r) {
          const currentR = parseFloat(child.attributes.r);
          const newR = Math.max(0, currentR + deltaHeight / 2);
          child.attributes.r = String(newR);
        }
        break;
      }

      case 'g': {
        // For groups, recursively update their containing children
        // passing the processedElements set to avoid duplicate processing
        await updateContainingSiblings(
          child,
          changedElementBounds,
          deltaHeight,
          svgRoot,
          fabricObjectsById,
          processedElements,
        );
        break;
      }

      // For paths and other complex shapes, we'd need more sophisticated logic
      // but for Figma exports, rects are most common for backgrounds
    }
  }

  // Also update clipPath defs that are referenced by elements in this container
  // This ensures clipPaths expand when their corresponding containers expand
  if (svgRoot) {
    await updateReferencedClipPaths(svgRoot, containerElement, changedElementBounds, deltaHeight);
  }
}

/**
 * Updates specific clipPath rectangles that are referenced by elements in the container
 */
async function updateReferencedClipPaths(
  svgTree: SVGElementNode,
  containerElement: SVGElementNode,
  changedElementBounds: ElementBounds,
  deltaHeight: number,
): Promise<void> {
  // Find all clip-path references in the container
  const clipPathIds = new Set<string>();

  function collectClipPathReferences(element: SVGElementNode): void {
    const clipPath = element.attributes['clip-path'];
    if (clipPath) {
      // Extract ID from url(#clipPathId) format
      const match = clipPath.match(/url\(#([^)]+)\)/);
      if (match) {
        clipPathIds.add(match[1]);
      }
    }

    // Recursively check children
    element.children.forEach(collectClipPathReferences);
  }

  collectClipPathReferences(containerElement);

  if (clipPathIds.size === 0) return;

  // Find the defs element in the SVG tree
  function findDefs(element: SVGElementNode): SVGElementNode | null {
    for (const child of element.children) {
      if (child.tagName.toLowerCase() === 'defs') {
        return child;
      }
      const found = findDefs(child);
      if (found) return found;
    }
    return null;
  }

  const defsElement = findDefs(svgTree);
  if (!defsElement) return;

  // Update only the referenced clipPaths
  for (const child of defsElement.children) {
    if (child.tagName.toLowerCase() === 'clippath') {
      const clipPathId = child.attributes.id;
      if (clipPathId && clipPathIds.has(clipPathId)) {
        // Check for rect children in this specific clipPath
        for (const clipChild of child.children) {
          if (clipChild.tagName.toLowerCase() === 'rect') {
            // Simple attribute comparison - if clipPath height >= original bounds height, expand it
            const clipRectY = parseFloat(clipChild.attributes.y || '0');
            const clipRectHeight = parseFloat(clipChild.attributes.height || '0');
            const clipBottom = clipRectY + clipRectHeight;
            const changedBottom = changedElementBounds.y + changedElementBounds.height;

            // If the clipPath rect extends at least as far down as the original changed element bounds,
            // then it should be expanded to accommodate the new height
            if (clipBottom >= changedBottom) {
              const currentHeight = parseFloat(clipChild.attributes.height || '0');
              const newHeight = Math.max(0, currentHeight + deltaHeight);
              clipChild.attributes.height = String(newHeight);
            }
          }
        }
      }
    }
  }
}

/**
 * Finds the parent element of a given element in the SVG tree
 */
function findParentElement(
  svgTree: SVGElementNode,
  targetElement: SVGElementNode,
): SVGElementNode | null {
  function searchInElement(element: SVGElementNode): SVGElementNode | null {
    // Check if any child is our target
    for (const child of element.children) {
      if (child === targetElement) {
        return element;
      }

      // Recursively search in children
      const found = searchInElement(child);
      if (found) return found;
    }
    return null;
  }

  return searchInElement(svgTree);
}

/**
 * Recursively updates element heights from a changed element up to the SVG root
 */
export async function updateElementAndAncestors(
  svgTree: SVGElementNode,
  changedElement: SVGElementNode,
  changedElementOriginalBounds: ElementBounds,
  deltaHeight: number,
  fabricObjectsById: Record<string, FabricObject>,
): Promise<void> {
  if (deltaHeight === 0) return;

  // Create a set to track processed elements and prevent double-processing
  const processedElements = new Set<SVGElementNode>();

  // Add the changed element to processed set since it's the source of the change
  // and should never be processed by updateContainingSiblings
  processedElements.add(changedElement);

  // Traverse up the hierarchy from the changed element to the root
  let currentElement = changedElement;

  while (currentElement) {
    // Find the parent of the current element
    const parentElement = findParentElement(svgTree, currentElement);
    if (!parentElement) {
      // Reached the top or element not in tree
      break;
    }

    // Add current element to processed set
    processedElements.add(currentElement);

    // Update siblings that contain the changed element (using original bounds)
    await updateContainingSiblings(
      parentElement,
      changedElementOriginalBounds,
      deltaHeight,
      svgTree,
      fabricObjectsById,
      processedElements,
    );

    // If parent is the SVG root, also update SVG dimensions
    if (parentElement.tagName === 'svg') {
      // Update SVG height
      if (parentElement.attributes.height) {
        const currentHeight = parseFloat(parentElement.attributes.height);
        const newHeight = Math.max(0, currentHeight + deltaHeight);
        parentElement.attributes.height = String(newHeight);
      }

      // Update viewBox
      if (parentElement.attributes.viewBox) {
        const viewBoxParts = parentElement.attributes.viewBox.split(/\s+/);
        if (viewBoxParts.length === 4) {
          const [minX, minY, width, height] = viewBoxParts.map(parseFloat);
          const newHeight = Math.max(0, height + deltaHeight);
          parentElement.attributes.viewBox = `${minX} ${minY} ${width} ${newHeight}`;
        }
      }

      break; // Reached the root
    }

    // Move up to the parent for the next iteration
    currentElement = parentElement;
  }
}

/**
 * Main function to handle height updates from text expansion
 * This replaces the global updateBackgroundElements approach
 */
export async function handleTextHeightChange(
  svgTree: SVGElementNode,
  textElement: SVGElementNode,
  deltaHeight: number,
  originalBounds: ElementBounds,
): Promise<void> {
  // Load fabric objects once for all bounds calculations
  const svgString = serializeSVG(svgTree);
  const fabricObjectsById = await loadAllFabricObjects(svgString);

  // For very small text elements, use expanded bounds for containment detection
  // This ensures backgrounds get updated even for single-line text that expands
  const boundsForContainment =
    originalBounds.height < 5
      ? { ...originalBounds, height: Math.max(originalBounds.height, deltaHeight) }
      : originalBounds;

  // Start the recursive update from the text element
  await updateElementAndAncestors(
    svgTree,
    textElement,
    boundsForContainment,
    deltaHeight,
    fabricObjectsById,
  );
}

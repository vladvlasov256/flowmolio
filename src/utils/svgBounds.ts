import { SVGElementNode } from '../types';
import { StaticCanvas, loadSVGFromString } from 'fabric/node';

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
 * Cache for fabric.js parsed SVG objects to avoid re-parsing
 */
const fabricSvgCache = new Map<string, { objects: any[], options: any }>();

/**
 * Converts SVG tree to string for fabric.js processing
 */
function svgTreeToString(svgTree: SVGElementNode): string {
  function nodeToString(node: SVGElementNode): string {
    const attributes = Object.entries(node.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    
    const children = node.children
      .map(child => nodeToString(child))
      .join('');
    
    const innerHTML = node.innerHTML || '';
    
    if (children || innerHTML) {
      return `<${node.tagName} ${attributes}>${innerHTML}${children}</${node.tagName}>`;
    } else {
      return `<${node.tagName} ${attributes} />`;
    }
  }

  // Ensure we always have a complete SVG document
  if (svgTree.tagName.toLowerCase() === 'svg') {
    return nodeToString(svgTree);
  } else {
    // If we're given a non-SVG element, we need to find the SVG root
    // For now, wrap in a basic SVG
    return `<svg xmlns="http://www.w3.org/2000/svg">${nodeToString(svgTree)}</svg>`;
  }
}

/**
 * Calculate element bounds using fabric.js for accurate SVG rendering
 */
async function calculateElementBoundsWithFabric(
  svgTree: SVGElementNode,
  targetElementId?: string,
): Promise<ElementBounds> {
  const svgString = svgTreeToString(svgTree);
  const cacheKey = `${svgString}_${targetElementId || 'root'}`;
  
  let fabricData = fabricSvgCache.get(cacheKey);
  
  if (!fabricData) {
    try {
      const parsedSvg = await loadSVGFromString(svgString);
      fabricData = {
        objects: parsedSvg.objects.filter(obj => obj !== null),
        options: parsedSvg.options
      };
      fabricSvgCache.set(cacheKey, fabricData);
    } catch (error) {
      console.warn('Failed to parse SVG with fabric.js:', error);
      throw error;
    }
  }
  
  if (targetElementId) {
    // Find the specific element by ID
    for (const obj of fabricData.objects) {
      if (obj.id === targetElementId || 
          obj.elementId === targetElementId || 
          obj.data?.id === targetElementId ||
          obj.svgUid === targetElementId) {
        const bounds = obj.getBoundingRect();
        return {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height
        };
      }
    }
    
    // If element not found, return zero bounds
    return { x: 0, y: 0, width: 0, height: 0 };
  } else {
    // Calculate overall bounds of all objects
    if (fabricData.objects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const allBounds = fabricData.objects.map(obj => obj.getBoundingRect());
    const minX = Math.min(...allBounds.map(b => b.left));
    const minY = Math.min(...allBounds.map(b => b.top));
    const maxX = Math.max(...allBounds.map(b => b.left + b.width));
    const maxY = Math.max(...allBounds.map(b => b.top + b.height));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
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
 * This is the primary bounds calculation function
 */
export async function calculateElementBounds(
  element: SVGElementNode, 
  svgRoot?: SVGElementNode
): Promise<ElementBounds> {
  const root = svgRoot || element;
  const elementId = element.attributes.id;
  
  return await calculateElementBoundsWithFabric(root, elementId);
}

/**
 * Calculate bounds for an element within the context of the full SVG tree
 * This version has access to the full SVG context for better positioning
 */
export async function calculateElementBoundsInContext(
  element: SVGElementNode,
  svgRoot: SVGElementNode,
): Promise<ElementBounds> {
  const elementId = element.attributes.id;
  return await calculateElementBoundsWithFabric(svgRoot, elementId);
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
export async function containsChangedElement(
  element: SVGElementNode, 
  changedElementBounds: ElementBounds,
  svgRoot?: SVGElementNode
): Promise<boolean> {
  const elementBounds = await calculateElementBounds(element, svgRoot);

  // Calculate vertical overlap between the two elements
  const overlapTop = Math.max(elementBounds.y, changedElementBounds.y);
  const overlapBottom = Math.min(
    elementBounds.y + elementBounds.height,
    changedElementBounds.y + changedElementBounds.height
  );
  
  // If there's no overlap, return false
  if (overlapTop >= overlapBottom) return false;
  
  const overlapHeight = overlapBottom - overlapTop;
  const changedElementHeight = changedElementBounds.height;
  
  // Element contains the changed element if there's meaningful overlap
  // For very small elements, any overlap counts
  // For larger elements, require at least 90% overlap
  if (changedElementHeight < 5) {
    return overlapHeight > 0; // Any overlap is good enough for very small elements
  }
  
  const overlapRatio = overlapHeight / changedElementHeight;
  return overlapRatio >= 0.9;
}

/**
 * Fallback function: checks if an element is full-height relative to its parent
 * This is used when containment logic doesn't find any elements
 */
async function isFullHeightElement(
  element: SVGElementNode, 
  parentBounds: ElementBounds,
  svgRoot?: SVGElementNode
): Promise<boolean> {
  const elementBounds = await calculateElementBounds(element, svgRoot);

  // Height should be close to parent height (within 10% tolerance)
  const heightRatio = elementBounds.height / parentBounds.height;
  if (heightRatio < 0.9) return false;

  // Element should start near the top of parent (within 10px)
  const relativeY = elementBounds.y - parentBounds.y;
  if (relativeY > 10) return false;

  return true;
}

/**
 * Updates heights of siblings that contain the changed element
 * Falls back to full-height logic if no containing elements are found
 */
export async function updateContainingSiblings(
  containerElement: SVGElementNode,
  changedElementBounds: ElementBounds,
  deltaHeight: number,
  svgRoot?: SVGElementNode,
): Promise<void> {
  // First pass: try to find elements that contain the changed element
  let foundContainingElements = false;
  const elementsToUpdate: SVGElementNode[] = [];
  
  for (const child of containerElement.children) {
    if (await containsChangedElement(child, changedElementBounds, svgRoot)) {
      elementsToUpdate.push(child);
      foundContainingElements = true;
    }
  }
  
  // With fabric.js providing accurate bounds, we don't need fallback logic
  // If no containing elements found, that means no elements should be updated
  
  // Update all identified elements
  for (const child of elementsToUpdate) {
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
          await updateContainingSiblings(child, changedElementBounds, deltaHeight, svgRoot);
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
            // Use the same logic as containsChangedElement but for clipPath rects
            if (await containsChangedElement(clipChild, changedElementBounds, svgTree)) {
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
 * Calculates how much a parent's height should change based on a child's height change
 */
async function calculateParentHeightChange(
  parentElement: SVGElementNode,
  childElement: SVGElementNode,
  childDeltaHeight: number,
  svgRoot?: SVGElementNode,
): Promise<number> {
  const parentBounds = await calculateElementBounds(parentElement, svgRoot);
  const childBounds = await calculateElementBounds(childElement, svgRoot);

  // If child is at the bottom of parent, parent height should increase
  const childBottomY = childBounds.y + childBounds.height;
  const parentBottomY = parentBounds.y + parentBounds.height;

  // Only increase parent height if child expansion goes beyond parent's current bottom
  const childNewBottomY = childBottomY + childDeltaHeight;

  if (childNewBottomY > parentBottomY) {
    return childNewBottomY - parentBottomY;
  }

  return 0;
}

/**
 * Recursively updates element heights from a changed element up to the SVG root
 */
export async function updateElementAndAncestors(
  svgTree: SVGElementNode,
  changedElement: SVGElementNode,
  changedElementOriginalBounds: ElementBounds,
  deltaHeight: number,
): Promise<void> {
  if (deltaHeight === 0) return;

  // Find the parent of the changed element
  const parentElement = findParentElement(svgTree, changedElement);
  if (!parentElement) {
    // This shouldn't happen unless changedElement is not in the tree
    return;
  }

  // Update siblings that contain the changed element (using original bounds)
  await updateContainingSiblings(parentElement, changedElementOriginalBounds, deltaHeight, svgTree);

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

    return;
  }

  // Calculate how much the parent's height should change
  const parentDeltaHeight = await calculateParentHeightChange(parentElement, changedElement, deltaHeight, svgTree);

  // If parent height doesn't need to change, we might still need to propagate
  // the original deltaHeight up to update siblings at higher levels
  const propagationDelta = parentDeltaHeight > 0 ? parentDeltaHeight : deltaHeight;

  // Recursively update ancestors
  await updateElementAndAncestors(svgTree, parentElement, changedElementOriginalBounds, propagationDelta);
}

/**
 * Main function to handle height updates from text expansion
 * This replaces the global updateBackgroundElements approach
 */
export async function handleTextHeightChange(
  svgTree: SVGElementNode,
  textElement: SVGElementNode,
  deltaHeight: number,
): Promise<void> {
  // Capture the original bounds of the text element before any modifications
  // Use sync version for text bounds since we need immediate calculation for layout
  const originalBounds = calculateTextBoundsSync(textElement);
  
  // For very small text elements, use expanded bounds for containment detection
  // This ensures backgrounds get updated even for single-line text that expands
  const boundsForContainment = originalBounds.height < 5 
    ? { ...originalBounds, height: Math.max(originalBounds.height, deltaHeight) }
    : originalBounds;
  
  // Start the recursive update from the text element
  await updateElementAndAncestors(svgTree, textElement, boundsForContainment, deltaHeight);
}

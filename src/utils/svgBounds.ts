import { SVGElementNode } from '../types';

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
 * Context for height update operations
 */
export interface HeightUpdateContext {
  element: SVGElementNode;
  oldBounds: ElementBounds;
  newBounds: ElementBounds;
  deltaHeight: number;
}

/**
 * Calculates bounds for a text element using our line-based approach
 */
function calculateTextBounds(element: SVGElementNode): ElementBounds {
  const lines = extractLinesFromElement(element);

  if (lines.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Get the leftmost x and topmost y
  const minX = Math.min(...lines.map(line => line.x));
  const minY = lines[0].y; // lines are sorted by y
  const maxY = lines[lines.length - 1].y;

  // Estimate line height and text width
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

  // Estimate width by finding the longest line (rough approximation)
  // For Figma exports, we can often find width constraints or measure text
  let maxWidth = 0;
  if (element.innerHTML) {
    // Look for x coordinates to estimate line lengths
    const xMatches = element.innerHTML.match(/x="([^"]*)"/g);
    if (xMatches && xMatches.length > 1) {
      const xValues = xMatches.map(match => parseFloat(match.replace(/x="|"/g, '')));
      maxWidth = Math.max(...xValues) - minX + 100; // rough estimation
    }
  }

  // Fallback width estimation
  if (maxWidth === 0) {
    maxWidth = 200; // reasonable default for Figma text blocks
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
 * Calculates bounds for a rectangle element
 */
function calculateRectBounds(element: SVGElementNode): ElementBounds {
  const x = parseFloat(element.attributes.x || '0');
  const y = parseFloat(element.attributes.y || '0');
  const width = parseFloat(element.attributes.width || '0');
  const height = parseFloat(element.attributes.height || '0');

  return { x, y, width, height };
}

/**
 * Calculates bounds for a circle element
 */
function calculateCircleBounds(element: SVGElementNode): ElementBounds {
  const cx = parseFloat(element.attributes.cx || '0');
  const cy = parseFloat(element.attributes.cy || '0');
  const r = parseFloat(element.attributes.r || '0');

  return {
    x: cx - r,
    y: cy - r,
    width: r * 2,
    height: r * 2,
  };
}

/**
 * Calculates bounds for an ellipse element
 */
function calculateEllipseBounds(element: SVGElementNode): ElementBounds {
  const cx = parseFloat(element.attributes.cx || '0');
  const cy = parseFloat(element.attributes.cy || '0');
  const rx = parseFloat(element.attributes.rx || '0');
  const ry = parseFloat(element.attributes.ry || '0');

  return {
    x: cx - rx,
    y: cy - ry,
    width: rx * 2,
    height: ry * 2,
  };
}

/**
 * Calculates bounds for a line element
 */
function calculateLineBounds(element: SVGElementNode): ElementBounds {
  const x1 = parseFloat(element.attributes.x1 || '0');
  const y1 = parseFloat(element.attributes.y1 || '0');
  const x2 = parseFloat(element.attributes.x2 || '0');
  const y2 = parseFloat(element.attributes.y2 || '0');

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  return { x: minX, y: minY, width, height };
}

/**
 * Calculates bounds for a group element by computing bounding box of all children
 */
function calculateGroupBounds(element: SVGElementNode): ElementBounds {
  if (element.children.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const childBounds = element.children.map(child => calculateElementBounds(child));

  // Find the overall bounding box
  const minX = Math.min(...childBounds.map(b => b.x));
  const minY = Math.min(...childBounds.map(b => b.y));
  const maxX = Math.max(...childBounds.map(b => b.x + b.width));
  const maxY = Math.max(...childBounds.map(b => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculates bounds for a path element (basic approximation)
 * For Figma exports, paths are often simple shapes
 */
function calculatePathBounds(element: SVGElementNode): ElementBounds {
  const pathData = element.attributes.d;
  if (!pathData) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Extract coordinates from path data (rough approximation)
  const coordMatches = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (!coordMatches || coordMatches.length < 2) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const coords = coordMatches.map(coord => parseFloat(coord));

  // Separate x and y coordinates (assuming they alternate)
  const xCoords = coords.filter((_, index) => index % 2 === 0);
  const yCoords = coords.filter((_, index) => index % 2 === 1);

  if (xCoords.length === 0 || yCoords.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...xCoords);
  const minY = Math.min(...yCoords);
  const maxX = Math.max(...xCoords);
  const maxY = Math.max(...yCoords);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Main function to calculate bounds for any SVG element
 */
export function calculateElementBounds(element: SVGElementNode): ElementBounds {
  switch (element.tagName.toLowerCase()) {
    case 'text':
      return calculateTextBounds(element);

    case 'rect':
      return calculateRectBounds(element);

    case 'circle':
      return calculateCircleBounds(element);

    case 'ellipse':
      return calculateEllipseBounds(element);

    case 'line':
      return calculateLineBounds(element);

    case 'g':
      return calculateGroupBounds(element);

    case 'path':
      return calculatePathBounds(element);

    case 'svg': {
      // For SVG root, use viewBox or width/height
      const viewBox = element.attributes.viewBox;
      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        if (parts.length === 4) {
          return {
            x: parseFloat(parts[0]),
            y: parseFloat(parts[1]),
            width: parseFloat(parts[2]),
            height: parseFloat(parts[3]),
          };
        }
      }
      // Fallback to width/height attributes
      return {
        x: 0,
        y: 0,
        width: parseFloat(element.attributes.width || '0'),
        height: parseFloat(element.attributes.height || '0'),
      };
    }

    default:
      // For unknown elements, return zero bounds
      // Note: In production, you might want to use a proper logging system
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Checks if an element is a full-height element relative to its parent
 */
export function isFullHeightSibling(element: SVGElementNode, parentBounds: ElementBounds): boolean {
  const elementBounds = calculateElementBounds(element);

  // Element must have height attribute or be a rect/path
  if (!['rect', 'path', 'ellipse', 'circle'].includes(element.tagName.toLowerCase())) {
    return false;
  }

  // Height should be close to parent height (within 10% tolerance)
  const heightRatio = elementBounds.height / parentBounds.height;
  if (heightRatio < 0.9) return false;

  // Element should start near the top of parent (within 10px)
  const relativeY = elementBounds.y - parentBounds.y;
  if (relativeY > 10) return false;

  return true;
}

/**
 * Updates heights of full-height siblings within a container
 */
export function updateFullHeightSiblings(
  containerElement: SVGElementNode,
  deltaHeight: number,
  svgRoot?: SVGElementNode,
): void {
  const containerBounds = calculateElementBounds(containerElement);

  containerElement.children.forEach(child => {
    if (isFullHeightSibling(child, containerBounds)) {
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

        // For paths and other complex shapes, we'd need more sophisticated logic
        // but for Figma exports, rects are most common for backgrounds
      }
    }
  });

  // Also update clipPath defs that are referenced by elements in this container
  // This ensures clipPaths expand when their corresponding containers expand
  if (svgRoot) {
    updateReferencedClipPaths(svgRoot, containerElement, containerBounds, deltaHeight);
  }
}

/**
 * Updates specific clipPath rectangles that are referenced by elements in the container
 */
function updateReferencedClipPaths(
  svgTree: SVGElementNode,
  containerElement: SVGElementNode,
  containerBounds: ElementBounds,
  deltaHeight: number,
): void {
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
  defsElement.children.forEach(child => {
    if (child.tagName.toLowerCase() === 'clippath') {
      const clipPathId = child.attributes.id;
      if (clipPathId && clipPathIds.has(clipPathId)) {
        // Check for rect children in this specific clipPath
        child.children.forEach(clipChild => {
          if (clipChild.tagName.toLowerCase() === 'rect') {
            // Use the same logic as isFullHeightSibling but for clipPath rects
            if (isFullHeightSibling(clipChild, containerBounds)) {
              const currentHeight = parseFloat(clipChild.attributes.height || '0');
              const newHeight = Math.max(0, currentHeight + deltaHeight);
              clipChild.attributes.height = String(newHeight);
            }
          }
        });
      }
    }
  });
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
function calculateParentHeightChange(
  parentElement: SVGElementNode,
  childElement: SVGElementNode,
  childDeltaHeight: number,
): number {
  const parentBounds = calculateElementBounds(parentElement);
  const childBounds = calculateElementBounds(childElement);

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
export function updateElementAndAncestors(
  svgTree: SVGElementNode,
  changedElement: SVGElementNode,
  deltaHeight: number,
): void {
  if (deltaHeight === 0) return;

  // Find the parent of the changed element
  const parentElement = findParentElement(svgTree, changedElement);
  if (!parentElement) {
    // This shouldn't happen unless changedElement is not in the tree
    return;
  }

  // Update full-height siblings in the parent container
  updateFullHeightSiblings(parentElement, deltaHeight, svgTree);

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
  const parentDeltaHeight = calculateParentHeightChange(parentElement, changedElement, deltaHeight);

  // If parent height doesn't need to change, we might still need to propagate
  // the original deltaHeight up to update siblings at higher levels
  const propagationDelta = parentDeltaHeight > 0 ? parentDeltaHeight : deltaHeight;

  // Recursively update ancestors
  updateElementAndAncestors(svgTree, parentElement, propagationDelta);
}

/**
 * Main function to handle height updates from text expansion
 * This replaces the global updateFullHeightElements approach
 */
export function handleTextHeightChange(
  svgTree: SVGElementNode,
  textElement: SVGElementNode,
  deltaHeight: number,
): void {
  // Start the recursive update from the text element
  updateElementAndAncestors(svgTree, textElement, deltaHeight);
}

import { Component, Connection, Layout, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';
import { calculateElementBounds, isFullHeightSibling, updateFullHeightSiblings } from '../../src/utils/svgBounds';
import { parseSVG } from '../../src/utils/svgUtils';

describe('Recursive Height Update System', () => {
  describe('calculateElementBounds', () => {
    it('should calculate correct bounds for basic elements', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="20" width="80" height="160" />
          <circle cx="50" cy="100" r="25" />
          <text><tspan x="10" y="50">Test</tspan></text>
        </svg>
      `);

      const rectBounds = calculateElementBounds(svgTree.children[0]);
      expect(rectBounds).toEqual({ x: 10, y: 20, width: 80, height: 160 });

      const circleBounds = calculateElementBounds(svgTree.children[1]);
      expect(circleBounds).toEqual({ x: 25, y: 75, width: 50, height: 50 });

      const svgBounds = calculateElementBounds(svgTree);
      expect(svgBounds).toEqual({ x: 0, y: 0, width: 100, height: 200 });
    });

    it('should calculate group bounds as bounding box of children', () => {
      const svgTree = parseSVG(`
        <svg>
          <g>
            <rect x="10" y="20" width="30" height="40" />
            <rect x="50" y="70" width="20" height="10" />
          </g>
        </svg>
      `);

      const groupBounds = calculateElementBounds(svgTree.children[0]);
      // Group should encompass both rects:
      // Min: (10, 20), Max: (70, 80)
      expect(groupBounds).toEqual({ x: 10, y: 20, width: 60, height: 60 });
    });
  });

  describe('isFullHeightSibling', () => {
    it('should detect full-height background elements', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect width="100" height="200" fill="white" />
          <rect x="0" y="0" width="100" height="180" />
          <rect x="0" y="50" width="100" height="150" />
        </svg>
      `);

      const svgBounds = calculateElementBounds(svgTree);
      
      // First rect: full height, at top → should be detected
      expect(isFullHeightSibling(svgTree.children[0], svgBounds)).toBe(true);
      
      // Second rect: 90% height, at top → should be detected
      expect(isFullHeightSibling(svgTree.children[1], svgBounds)).toBe(true);
      
      // Third rect: 75% height, starts at y=50 → should NOT be detected
      expect(isFullHeightSibling(svgTree.children[2], svgBounds)).toBe(false);
    });

    it('should only detect supported element types', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect width="100" height="200" />
          <text><tspan x="0" y="0">Text</tspan></text>
          <g></g>
        </svg>
      `);

      const svgBounds = calculateElementBounds(svgTree);
      
      expect(isFullHeightSibling(svgTree.children[0], svgBounds)).toBe(true); // rect
      expect(isFullHeightSibling(svgTree.children[1], svgBounds)).toBe(false); // text
      expect(isFullHeightSibling(svgTree.children[2], svgBounds)).toBe(false); // g
    });
  });

  describe('updateFullHeightSiblings', () => {
    it('should update heights of full-height rect siblings', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect width="100" height="200" fill="white" />
          <rect x="10" y="10" width="80" height="30" />
        </svg>
      `);

      updateFullHeightSiblings(svgTree, 50);

      // First rect should be updated (full-height)
      expect(svgTree.children[0].attributes.height).toBe('250');
      
      // Second rect should NOT be updated (not full-height)
      expect(svgTree.children[1].attributes.height).toBe('30');
    });
  });

  describe('ClipPath Defs Update', () => {
    it('should update clipPath rectangles in defs when text expands', () => {
      const svgWithClipPath = `
        <svg width="390" height="626" viewBox="0 0 390 626">
          <defs>
            <clipPath id="clip0_210_520">
              <rect width="390" height="626" fill="white"/>
            </clipPath>
          </defs>
          <rect width="390" height="626" fill="url(#paint0_linear_210_520)"/>
          <g id="Frame 32" clip-path="url(#clip0_210_520)">
            <text id="clipped-text" fill="#FDFDFD" font-family="Montserrat" font-size="12">
              <tspan x="16" y="479.802">Short text</tspan>
            </text>
          </g>
        </svg>
      `;

      const textComponent: Component = {
        id: 'text1',
        type: 'text',
        elementId: 'clipped-text',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 350
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'text1',
      };

      const layout: Layout = {
        svg: svgWithClipPath,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          longText: 'This is a very long text that will expand and should cause both the background rect and the clipPath rect to expand, preventing content from being clipped.'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // Check that background rect was updated
      const backgroundRectMatch = result.match(/<rect[^>]*width="390"[^>]*height="([^"]*)"/);
      expect(backgroundRectMatch).toBeTruthy();
      const backgroundHeight = parseFloat(backgroundRectMatch![1]);
      expect(backgroundHeight).toBeGreaterThan(626);

      // Check that clipPath rect was also updated (note: clipPath is rendered as lowercase 'clippath')
      const clipPathRectMatch = result.match(/<clippath[^>]*>[\s\S]*?<rect[^>]*width="390"[^>]*height="([^"]*)"/);
      expect(clipPathRectMatch).toBeTruthy();
      const clipPathHeight = parseFloat(clipPathRectMatch![1]);
      expect(clipPathHeight).toBeGreaterThan(626);
      expect(clipPathHeight).toBeCloseTo(backgroundHeight, 1); // Should be very close to background height

      // Verify text expanded
      const tspanCount = (result.match(/<tspan/g) || []).length;
      expect(tspanCount).toBeGreaterThan(1);

      // Verify SVG height was updated
      const svgHeightMatch = result.match(/<svg[^>]*height="([^"]*)"/);
      expect(svgHeightMatch).toBeTruthy();
      const svgHeight = parseFloat(svgHeightMatch![1]);
      expect(svgHeight).toBeGreaterThan(626);
    });

    it('should handle multiple clipPaths in defs', () => {
      const svgWithMultipleClipPaths = `
        <svg width="400" height="500" viewBox="0 0 400 500">
          <defs>
            <clipPath id="fullClip">
              <rect width="400" height="500" fill="white"/>
            </clipPath>
            <clipPath id="partialClip">
              <rect x="0" y="100" width="400" height="200" fill="white"/>
            </clipPath>
          </defs>
          <rect width="400" height="500" fill="white"/>
          <g clip-path="url(#fullClip)">
            <text id="text1" font-size="12">
              <tspan x="10" y="400">Expanding text</tspan>
            </text>
          </g>
        </svg>
      `;

      const textComponent: Component = {
        id: 'comp1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'constrained', value: 380 }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'comp1',
      };

      const layout: Layout = {
        svg: svgWithMultipleClipPaths,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          text: 'This long text will expand the document and should update the full-height clipPath but not the partial one.'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // Full clipPath should be updated (height >= 90% of original)
      const fullClipMatch = result.match(/<clippath[^>]*id="fullClip"[^>]*>[\s\S]*?<rect[^>]*height="([^"]*)"/);
      expect(fullClipMatch).toBeTruthy();
      const fullClipHeight = parseFloat(fullClipMatch![1]);
      expect(fullClipHeight).toBeGreaterThan(500);

      // Partial clipPath should NOT be updated (height < 90% of original, or y > 10)
      const partialClipMatch = result.match(/<clippath[^>]*id="partialClip"[^>]*>[\s\S]*?<rect[^>]*height="([^"]*)"/);
      expect(partialClipMatch).toBeTruthy();
      const partialClipHeight = parseFloat(partialClipMatch![1]);
      expect(partialClipHeight).toBe(200); // Should remain unchanged
    });

    it('should only update clipPaths that are actually referenced', () => {
      const svgWithUnusedClipPath = `
        <svg width="400" height="500" viewBox="0 0 400 500">
          <defs>
            <clipPath id="usedClip">
              <rect width="400" height="500" fill="white"/>
            </clipPath>
            <clipPath id="unusedClip">
              <rect width="400" height="500" fill="white"/>
            </clipPath>
          </defs>
          <rect width="400" height="500" fill="white"/>
          <g clip-path="url(#usedClip)">
            <text id="text1" font-size="12">
              <tspan x="10" y="400">Expanding text</tspan>
            </text>
          </g>
        </svg>
      `;

      const textComponent: Component = {
        id: 'comp1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'constrained', value: 380 }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'comp1',
      };

      const layout: Layout = {
        svg: svgWithUnusedClipPath,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          text: 'This long text will expand and should update only the used clipPath, not the unused one.'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // Used clipPath should be updated
      const usedClipMatch = result.match(/<clippath[^>]*id="usedClip"[^>]*>[\s\S]*?<rect[^>]*height="([^"]*)"/);
      expect(usedClipMatch).toBeTruthy();
      const usedClipHeight = parseFloat(usedClipMatch![1]);
      expect(usedClipHeight).toBeGreaterThan(500);

      // Unused clipPath should NOT be updated (should remain at 500)
      const unusedClipMatch = result.match(/<clippath[^>]*id="unusedClip"[^>]*>[\s\S]*?<rect[^>]*height="([^"]*)"/);
      expect(unusedClipMatch).toBeTruthy();
      const unusedClipHeight = parseFloat(unusedClipMatch![1]);
      expect(unusedClipHeight).toBe(500); // Should remain unchanged
    });
  });

  describe('Tricky Nested Structure', () => {
    it('should handle complex nested containers with text expansion', () => {
      const trickySvg = `
        <svg width="390" height="626" viewBox="0 0 390 626">
          <rect width="390" height="626" fill="url(#paint0_linear_210_520)"/>
          <g id="text-container">
            <text id="long-text" fill="#FDFDFD" font-family="Montserrat" font-size="12">
              <tspan x="16" y="479.802">Short text</tspan>
            </text>
          </g>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'long-text',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 350
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: trickySvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          longText: 'Join Marco Simmons as he dives deep into the hidden conspiracies lurking in everyday life. From mind-controlling WiFi routers to the secret agenda of left-handed scissors, no mundane mystery is too small for investigation. Broadcasting from his home studio with an obsessive attention to detail, Marco uncovers the truth behind the lies you never knew you were being told. New episodes every Tuesday, because that\'s when the surveillance is lightest.'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // Extract dimensions
      const svgHeightMatch = result.match(/<svg[^>]*height="([^"]*)"/);
      const rectHeightMatch = result.match(/<rect[^>]*height="([^"]*)"/);
      const viewBoxMatch = result.match(/viewBox="([^"]*)"/);
      const tspanCount = (result.match(/<tspan/g) || []).length;

      // Verify text expansion
      expect(tspanCount).toBeGreaterThan(1);
      expect(tspanCount).toBeLessThan(20); // Reasonable upper bound

      // Verify background rect expansion
      expect(rectHeightMatch).toBeTruthy();
      const rectHeight = parseFloat(rectHeightMatch![1]);
      expect(rectHeight).toBeGreaterThan(626);

      // Verify SVG height expansion
      expect(svgHeightMatch).toBeTruthy();
      const svgHeight = parseFloat(svgHeightMatch![1]);
      expect(svgHeight).toBeGreaterThan(626);
      expect(svgHeight).toBeCloseTo(rectHeight, 1); // Should be similar

      // Verify viewBox expansion
      expect(viewBoxMatch).toBeTruthy();
      const viewBoxParts = viewBoxMatch![1].split(/\s+/);
      expect(viewBoxParts).toHaveLength(4);
      const viewBoxHeight = parseFloat(viewBoxParts[3]);
      expect(viewBoxHeight).toBeGreaterThan(626);
      expect(viewBoxHeight).toBeCloseTo(svgHeight, 1);
    });

    it('should preserve non-background elements unchanged', () => {
      const svgWithMixedElements = `
        <svg width="200" height="300" viewBox="0 0 200 300">
          <rect width="200" height="300" fill="white"/>
          <rect x="10" y="10" width="50" height="50" fill="blue"/>
          <circle cx="100" cy="100" r="20" fill="red"/>
          <text id="expand-text" font-size="12">
            <tspan x="10" y="200">Text to expand</tspan>
          </text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'text1',
        type: 'text',
        elementId: 'expand-text',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 180
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'text1',
      };

      const layout: Layout = {
        svg: svgWithMixedElements,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          text: 'This is a much longer text that will definitely wrap to multiple lines and should cause the background to expand but leave other elements unchanged'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // Background rect should expand
      const backgroundRectMatch = result.match(/<rect[^>]*width="200"[^>]*height="([^"]*)"/);
      expect(backgroundRectMatch).toBeTruthy();
      const backgroundHeight = parseFloat(backgroundRectMatch![1]);
      expect(backgroundHeight).toBeGreaterThan(300);

      // Small blue rect should remain unchanged
      const blueRectMatch = result.match(/<rect[^>]*x="10"[^>]*y="10"[^>]*width="50"[^>]*height="([^"]*)"/);
      expect(blueRectMatch).toBeTruthy();
      expect(blueRectMatch![1]).toBe('50');

      // Circle should remain unchanged
      const circleMatch = result.match(/<circle[^>]*cx="100"[^>]*cy="100"[^>]*r="([^"]*)"/);
      expect(circleMatch).toBeTruthy();
      expect(circleMatch![1]).toBe('20');
    });

    it('should handle multiple text expansions independently', () => {
      const svgWithMultipleTexts = `
        <svg width="400" height="500">
          <rect width="400" height="500" fill="white"/>
          <g id="section1">
            <rect width="400" height="200" fill="lightblue"/>
            <text id="text1" font-size="12">
              <tspan x="10" y="50">First text</tspan>
            </text>
          </g>
          <g id="section2">
            <rect width="400" height="200" fill="lightgreen"/>
            <text id="text2" font-size="12">
              <tspan x="10" y="300">Second text</tspan>
            </text>
          </g>
        </svg>
      `;

      const components: Component[] = [
        {
          id: 'comp1',
          type: 'text',
          elementId: 'text1',
          renderingStrategy: { width: { type: 'constrained', value: 380 } }
        },
        {
          id: 'comp2', 
          type: 'text',
          elementId: 'text2',
          renderingStrategy: { width: { type: 'constrained', value: 380 } }
        }
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'data1', sourceField: 'text1', targetNodeId: 'comp1' },
        { sourceNodeId: 'data1', sourceField: 'text2', targetNodeId: 'comp2' }
      ];

      const layout: Layout = {
        svg: svgWithMultipleTexts,
        connections,
        components,
      };

      const dataSources: DataSources = {
        data1: { 
          text1: 'This is the first long text that will expand the first section and should cause proper height updates in its container',
          text2: 'This is the second long text that will expand the second section independently of the first section'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // Both sections should have expanded backgrounds
      const allRectMatches = result.match(/<rect[^>]*height="([^"]*)"[^>]*>/g);
      expect(allRectMatches).toBeTruthy();
      expect(allRectMatches!.length).toBeGreaterThanOrEqual(3); // Main background + 2 section backgrounds

      // Main SVG should have expanded
      const svgHeightMatch = result.match(/<svg[^>]*height="([^"]*)"/);
      expect(svgHeightMatch).toBeTruthy();
      const svgHeight = parseFloat(svgHeightMatch![1]);
      expect(svgHeight).toBeGreaterThan(500);

      // Should have multiple tspans from both texts
      const tspanCount = (result.match(/<tspan/g) || []).length;
      expect(tspanCount).toBeGreaterThan(2); // At least one expansion happened
    });

    it('should handle deeply nested containers with proper bubbling', () => {
      // Test the original tricky structure where rect is at a different nesting level
      const deeplyNestedSvg = `
        <svg width="390" height="626" viewBox="0 0 390 626">
          <g id="Frame 32">
            <rect width="390" height="626" fill="white"/>
            <g id="text-container">
              <text id="nested-text" font-size="12">
                <tspan x="16" y="479.802">Short</tspan>
              </text>
            </g>
          </g>
        </svg>
      `;

      const textComponent: Component = {
        id: 'nested-comp',
        type: 'text',
        elementId: 'nested-text',
        renderingStrategy: {
          width: { type: 'constrained', value: 350 }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'nested-comp',
      };

      const layout: Layout = {
        svg: deeplyNestedSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          longText: 'This very long text will expand and should cause the background rect in the Frame 32 container to expand, even though it\'s not a direct sibling of the text element.'
        },
      };

      const result = renderFlowMolio(layout, dataSources);

      // The deeply nested structure should still expand properly
      const rectHeightMatch = result.match(/<rect[^>]*height="([^"]*)"/);
      const svgHeightMatch = result.match(/<svg[^>]*height="([^"]*)"/);
      const tspanCount = (result.match(/<tspan/g) || []).length;

      // Text should expand to multiple lines
      expect(tspanCount).toBeGreaterThan(1);

      // Background rect should expand (because the parent group expanded)
      expect(rectHeightMatch).toBeTruthy();
      const rectHeight = parseFloat(rectHeightMatch![1]);
      expect(rectHeight).toBeGreaterThan(626);

      // SVG should also expand
      expect(svgHeightMatch).toBeTruthy();
      const svgHeight = parseFloat(svgHeightMatch![1]);
      expect(svgHeight).toBeGreaterThan(626);
    });
  });
});
import { Component, Connection, Layout, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';
import { calculateElementBounds, calculateSingleElementBounds, containsChangedElement, updateContainingSiblings } from '../../src/utils/svgBounds';
import { parseSVG } from '../../src/utils/svgUtils';

describe('Recursive Height Update System', () => {
  describe('calculateElementBounds', () => {
    it('should calculate correct bounds for basic elements', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect id="rect1" x="10" y="20" width="80" height="160" />
          <circle id="circle1" cx="50" cy="100" r="25" />
          <text id="text1"><tspan x="10" y="50">Test</tspan></text>
        </svg>
      `);

      const rectBounds = await calculateElementBounds(svgTree.children[0], svgTree);
      // Fabric.js provides more accurate bounds calculation
      expect(rectBounds.x).toBeCloseTo(9.5, 1);
      expect(rectBounds.y).toBeCloseTo(19.5, 1);
      expect(rectBounds.width).toBeCloseTo(81, 1);
      expect(rectBounds.height).toBeCloseTo(161, 1);

      const circleBounds = await calculateElementBounds(svgTree.children[1], svgTree);
      // Circle bounds should be approximately: center (50, 100), radius 25 = bounds (24.5, 74.5, 51, 51)
      expect(circleBounds.x).toBeCloseTo(24.5, 0);
      expect(circleBounds.y).toBeCloseTo(74.5, 0);
      expect(circleBounds.width).toBeCloseTo(51, 0);
      expect(circleBounds.height).toBeCloseTo(51, 0);

      const svgBounds = await calculateSingleElementBounds(svgTree);
      // SVG bounds are taken from width/height attributes
      expect(svgBounds.x).toBe(0);
      expect(svgBounds.y).toBe(0);
      expect(svgBounds.width).toBe(100);
      expect(svgBounds.height).toBe(200);
    });

    it('should calculate group bounds as bounding box of children', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="100">
          <g>
            <rect id="rect1" x="10" y="20" width="30" height="40" />
            <rect id="rect2" x="50" y="70" width="20" height="10" />
          </g>
        </svg>
      `);

      // Should throw because group bounds are not supported
      await expect(calculateElementBounds(svgTree.children[0], svgTree)).rejects.toThrow();
    });
  });

  describe('containsChangedElement', () => {
    it('should detect elements that contain the changed element', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect id="rect1" width="100" height="200" fill="white" />
          <rect id="rect2" x="0" y="0" width="100" height="180" />
          <rect id="rect3" x="0" y="50" width="100" height="150" />
        </svg>
      `);

      // Simulate a text element positioned at y=100 with height=20
      const changedElementBounds = { x: 10, y: 100, width: 80, height: 20 };
      
      // First rect: contains the changed element (y=0, height=200 fully contains y=100-120)
      expect(await containsChangedElement(svgTree.children[0], changedElementBounds, svgTree)).toBe(true);
      
      // Second rect: contains the changed element (y=0, height=180 fully contains y=100-120)
      expect(await containsChangedElement(svgTree.children[1], changedElementBounds, svgTree)).toBe(true);
      
      // Third rect: contains the changed element (y=50, height=150 → bottom=200, contains y=100-120)
      expect(await containsChangedElement(svgTree.children[2], changedElementBounds, svgTree)).toBe(true);
    });

    it('should detect non-containing elements', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect id="rect1" x="0" y="0" width="100" height="50" />
          <rect id="rect2" x="0" y="150" width="100" height="50" />
          <text id="text1"><tspan x="0" y="0">Text</tspan></text>
          <g>
            <rect id="rect3" width="100" height="200" />
          </g>
        </svg>
      `);

      // Simulate a text element positioned at y=100 with height=20
      const changedElementBounds = { x: 10, y: 100, width: 80, height: 20 };
      
      expect(await containsChangedElement(svgTree.children[0], changedElementBounds, svgTree)).toBe(false); // rect above (y=0-50)
      expect(await containsChangedElement(svgTree.children[1], changedElementBounds, svgTree)).toBe(false); // rect below (y=150-200)
      expect(await containsChangedElement(svgTree.children[2], changedElementBounds, svgTree)).toBe(false); // text (no meaningful height)
      
      const group = svgTree.children[3];
      expect(await containsChangedElement(group.children[0], changedElementBounds, svgTree)).toBe(true); // rect (contains full-height rect)
    });

    it('should handle edge cases with partial overlap', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect id="rect1" x="0" y="0" width="100" height="110" />
          <rect id="rect2" x="0" y="90" width="100" height="110" />
        </svg>
      `);

      // Text at y=100 with height=20 (y=100-120)
      const changedElementBounds = { x: 10, y: 100, width: 80, height: 20 };
      
      // First rect: y=0-110, overlaps y=100-110 (10px out of 20px = 50% < 90%)
      expect(await containsChangedElement(svgTree.children[0], changedElementBounds, svgTree)).toBe(false);
      
      // Second rect: y=90-200, overlaps y=100-120 (20px out of 20px = 100% >= 90%)
      expect(await containsChangedElement(svgTree.children[1], changedElementBounds, svgTree)).toBe(true);
    });
  });

  describe('updateContainingSiblings', () => {
    it('should update heights of containing rect siblings', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect id="rect1" width="100" height="200" fill="white" />
          <rect id="rect2" x="10" y="10" width="80" height="30" />
        </svg>
      `);

      // Simulate a text element that is contained in the first rect but not the second
      const changedElementBounds = { x: 20, y: 50, width: 60, height: 20 };
      await updateContainingSiblings(svgTree, changedElementBounds, 50, svgTree);

      // First rect should be updated (contains the changed element)
      expect(svgTree.children[0].attributes.height).toBe('250');
      
      // Second rect should NOT be updated (doesn't contain the changed element)
      expect(svgTree.children[1].attributes.height).toBe('30');
    });

    it('should recursively update containing groups and their children', async () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <g>
            <rect id="rect1" width="100" height="200" fill="background" />
            <rect id="rect2" x="10" y="10" width="80" height="30" fill="small" />
          </g>
          <rect id="rect3" x="5" y="5" width="90" height="40" fill="other" />
        </svg>
      `);

      // Simulate a text element that is contained in the group
      const changedElementBounds = { x: 20, y: 100, width: 60, height: 20 };
      await updateContainingSiblings(svgTree, changedElementBounds, 50, svgTree);

      // Group should be detected as containing the changed element and processed
      const group = svgTree.children[0];
      
      // Background rect inside the group should be updated (contains the changed element)
      expect(group.children[0].attributes.height).toBe('250'); // 200 + 50
      
      // Small rect inside the group should NOT be updated (doesn't contain the changed element)
      expect(group.children[1].attributes.height).toBe('30'); // unchanged
      
      // Other rect should NOT be updated (doesn't contain the changed element)
      expect(svgTree.children[1].attributes.height).toBe('40'); // unchanged
    });
  });

  describe('ClipPath Defs Update', () => {
    it('should update clipPath rectangles in defs when text expands', async () => {
      const svgWithClipPath = `
        <svg width="390" height="626" viewBox="0 0 390 626">
          <defs>
            <clipPath id="clip0_210_520">
              <rect id="clip-rect" width="390" height="626" fill="white"/>
            </clipPath>
          </defs>
          <rect id="background-rect" width="390" height="626" fill="url(#paint0_linear_210_520)"/>
          <g clip-path="url(#clip0_210_520)">
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

      const result = await renderFlowMolio(layout, dataSources);

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

    it('should handle multiple clipPaths in defs', async () => {
      const svgWithMultipleClipPaths = `
        <svg width="400" height="500" viewBox="0 0 400 500">
          <defs>
            <clipPath id="fullClip">
              <rect id="full-clip-rect" width="400" height="500" fill="white"/>
            </clipPath>
            <clipPath id="partialClip">
              <rect id="partial-clip-rect" x="0" y="100" width="400" height="200" fill="white"/>
            </clipPath>
          </defs>
          <rect id="background-rect" width="400" height="500" fill="white"/>
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

      const result = await renderFlowMolio(layout, dataSources);

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

    it('should only update clipPaths that are actually referenced', async () => {
      const svgWithUnusedClipPath = `
        <svg width="400" height="500" viewBox="0 0 400 500">
          <defs>
            <clipPath id="usedClip">
              <rect id="used-clip-rect" width="400" height="500" fill="white"/>
            </clipPath>
            <clipPath id="unusedClip">
              <rect id="unused-clip-rect" width="400" height="500" fill="white"/>
            </clipPath>
          </defs>
          <rect id="background-rect" width="400" height="500" fill="white"/>
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

      const result = await renderFlowMolio(layout, dataSources);

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

    it('should update all backgrounds that contain text using precise containment logic (not just full-height heuristic)', async () => {
      const svgWithHalfHeightBackground = `
        <svg width="400" height="600" viewBox="0 0 400 600">
          <defs>
            <clipPath id="halfClip">
              <rect id="half-clip-rect" x="0" y="150" width="400" height="300" fill="white"/>
            </clipPath>
          </defs>
          
          <!-- Container group for the half-height section -->
          <g id="half-section">
            <!-- Half-height background (should be updated - contains the text) -->
            <rect id="half-background" x="0" y="150" width="400" height="300" fill="#ffffff"/>
            
            <!-- Text positioned within the half-height background -->
            <g clip-path="url(#halfClip)">
              <text id="contained-text" font-family="Arial" font-size="16" fill="#333">
                <tspan x="20" y="300">This text is within the half-height background</tspan>
              </text>
            </g>
          </g>
          
          <!-- Full background (should NOT be updated - text is not here) -->
          <rect id="full-background" x="0" y="0" width="400" height="600" fill="#f0f0f0"/>
          
          <!-- Another small background outside the half area (should NOT be updated) -->
          <rect id="small-background" x="50" y="50" width="100" height="50" fill="#e0e0e0"/>
        </svg>
      `;

      const textComponent: Component = {
        id: 'textComp',
        type: 'text',
        elementId: 'contained-text',
        renderingStrategy: {
          width: { type: 'constrained', value: 360 }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'content',
        sourceField: 'description',
        targetNodeId: 'textComp',
      };

      const layout: Layout = {
        svg: svgWithHalfHeightBackground,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        content: { 
          description: 'This is a very long text that will expand significantly beyond the original text bounds, causing the half-height background and its clipPath to expand while leaving the full-height background and small background unchanged because they do not contain the text element according to precise containment logic.'
        },
      };

      const result = await renderFlowMolio(layout, dataSources);

      // Debug: Log the result to see what's happening
      console.log('Rendered SVG:', result);

      // Half-height background should be updated (contains the text at y=300)
      const halfBgMatch = result.match(/<rect[^>]*id="half-background"[^>]*height="([^"]*)"/);
      expect(halfBgMatch).toBeTruthy();
      const halfBgHeight = parseFloat(halfBgMatch![1]);
      console.log('Half background height:', halfBgHeight);
      expect(halfBgHeight).toBeGreaterThan(300); // Should have expanded

      // Half-height clipPath should also be updated
      const halfClipMatch = result.match(/<clippath[^>]*id="halfClip"[^>]*>[\s\S]*?<rect[^>]*height="([^"]*)"/);
      expect(halfClipMatch).toBeTruthy();
      const halfClipHeight = parseFloat(halfClipMatch![1]);
      expect(halfClipHeight).toBeGreaterThan(300); // Should have expanded

      // Full background SHOULD also be updated (text at y=300 overlaps with y=0-600)
      const fullBgMatch = result.match(/<rect[^>]*id="full-background"[^>]*height="([^"]*)"/);
      expect(fullBgMatch).toBeTruthy();
      const fullBgHeight = parseFloat(fullBgMatch![1]);
      expect(fullBgHeight).toBeGreaterThan(600); // Should have expanded

      // Small background should NOT be updated (doesn't contain the text at y=300)
      const smallBgMatch = result.match(/<rect[^>]*id="small-background"[^>]*height="([^"]*)"/);
      expect(smallBgMatch).toBeTruthy();
      const smallBgHeight = parseFloat(smallBgMatch![1]);
      expect(smallBgHeight).toBe(50); // Should remain unchanged
    });
  });

  describe('Tricky Nested Structure', () => {
    it('should handle complex nested containers with text expansion', async () => {
      const trickySvg = `
        <svg width="390" height="626" viewBox="0 0 390 626">
          <rect id="background-rect" width="390" height="626" fill="url(#paint0_linear_210_520)"/>
          <g>
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

      const result = await renderFlowMolio(layout, dataSources);

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

    it('should preserve non-background elements unchanged', async () => {
      const svgWithMixedElements = `
        <svg width="200" height="300" viewBox="0 0 200 300">
          <rect id="background-rect" width="200" height="300" fill="white"/>
          <rect id="blue-rect" x="10" y="10" width="50" height="50" fill="blue"/>
          <circle id="red-circle" cx="100" cy="100" r="20" fill="red"/>
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

      const result = await renderFlowMolio(layout, dataSources);

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

    it('should handle multiple text expansions independently', async () => {
      const svgWithMultipleTexts = `
        <svg width="400" height="500">
          <rect id="main-background" width="400" height="500" fill="white"/>
          <g>
            <rect id="section1-bg" width="400" height="200" fill="lightblue"/>
            <text id="text1" font-size="12">
              <tspan x="10" y="50">First text</tspan>
            </text>
          </g>
          <g>
            <rect id="section2-bg" width="400" height="200" fill="lightgreen"/>
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

      const result = await renderFlowMolio(layout, dataSources);

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

    it('should handle deeply nested containers with proper bubbling', async () => {
      // Test the original tricky structure where rect is at a different nesting level
      const deeplyNestedSvg = `
        <svg width="390" height="626" viewBox="0 0 390 626">
          <g>
            <rect id="background-rect" width="390" height="626" fill="white"/>
            <g>
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

      const result = await renderFlowMolio(layout, dataSources);

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
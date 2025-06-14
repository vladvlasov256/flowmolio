import { Layout, Connection, Component, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('renderFlowMolio - Texts', () => {
  describe('Text component data binding', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <text id="text1"><tspan x="0" y="0">Original Text</tspan></text>
        <text id="text2"><tspan x="0" y="0">Another Text</tspan></text>
      </svg>
    `;

    it('should apply text data binding correctly', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'natural'
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { title: 'New Text' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><text id="text1"><tspan x="0" y="0">New Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle nested data paths with dot notation', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'natural'
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'product.name',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: {
          product: {
            name: 'Nested Product Name',
          },
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><text id="text1"><tspan x="0" y="0">Nested Product Name</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle missing data sources gracefully', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'natural'
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'missing-data',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {};

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle missing fields in data sources', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'natural'
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'missing.field',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { title: 'Available Title' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });
  });

  describe('Constrained width text rendering', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Original Text</tspan></text>
      </svg>
    `;

    it('should break long text into multiple lines for constrained width', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a very long text that should be broken into multiple lines' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should contain multiple tspan elements with different y coordinates
      expect(result).toContain('<tspan x="10" y="20"');
      expect(result).toContain('This is');
      // Should have broken the text into multiple lines
      const tspanCount = (result.match(/<tspan/g) || []).length;
      expect(tspanCount).toBeGreaterThan(1);
    });

    it('should handle short text with constrained width without breaking', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 200
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'shortText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { shortText: 'Short' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should contain only one tspan element
      const tspanCount = (result.match(/<tspan/g) || []).length;
      expect(tspanCount).toBe(1);
      expect(result).toContain('Short');
    });

    it('should preserve original font attributes in constrained width mode', async () => {
      const mockSvgWithAttributes = `
        <svg width="100" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Times" font-size="14" font-weight="bold" fill="red">Original Text</tspan></text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 30
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithAttributes,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { text: 'Test text for styling' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should preserve font attributes
      expect(result).toContain('font-family="Times"');
      expect(result).toContain('font-size="14"');
      expect(result).toContain('font-weight="bold"');
      expect(result).toContain('fill="red"');
    });

    it('should apply line spacing when specified in SVG attributes', async () => {
      const mockSvgWithLineSpacing = `
        <svg width="100" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12" line-spacing="18">Original Text</tspan></text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithLineSpacing,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { text: 'This is a longer text that should be broken into multiple lines with custom spacing' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have multiple lines with increased spacing
      const tspanMatches = result.match(/<tspan[^>]*y="([^"]*)"[^>]*>/g);
      expect(tspanMatches).toBeTruthy();
      expect(tspanMatches!.length).toBeGreaterThan(1);
      
      // Extract y coordinates
      const yCoordinates = tspanMatches!.map(match => {
        const yMatch = match.match(/y="([^"]*)"/);
        return yMatch ? parseFloat(yMatch[1]) : 0;
      });
      
      // Check that line spacing is applied (line-spacing: 18, font-size: 12, so extra spacing is 6)
      // With default line height of 12 * 1.2 = 14.4, total spacing should be 14.4 + 6 = 20.4
      if (yCoordinates.length >= 2) {
        const lineSpacing = yCoordinates[1] - yCoordinates[0];
        expect(lineSpacing).toBeCloseTo(20.4, 1); // Allow for rounding differences
      }
    });

    it('should use line-height attribute as alternative to line-spacing', async () => {
      const mockSvgWithLineHeight = `
        <svg width="100" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12" line-height="20">Original Text</tspan></text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithLineHeight,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { text: 'This is a longer text that should be broken into multiple lines' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have multiple lines with line height spacing
      const tspanMatches = result.match(/<tspan[^>]*y="([^"]*)"[^>]*>/g);
      expect(tspanMatches).toBeTruthy();
      expect(tspanMatches!.length).toBeGreaterThan(1);
      
      // Extract y coordinates
      const yCoordinates = tspanMatches!.map(match => {
        const yMatch = match.match(/y="([^"]*)"/);
        return yMatch ? parseFloat(yMatch[1]) : 0;
      });
      
      // Check that line height is applied (line-height: 20, font-size: 12, so extra spacing is 8)
      // With default line height of 12 * 1.2 = 14.4, total spacing should be 14.4 + 8 = 22.4
      if (yCoordinates.length >= 2) {
        const lineSpacing = yCoordinates[1] - yCoordinates[0];
        expect(lineSpacing).toBeCloseTo(22.4, 1); // Allow for rounding differences
      }
    });

    it('should calculate line height from existing tspan y-coordinates', async () => {
      const mockSvgWithMultipleTspans = `
        <svg width="100" height="100">
          <text id="text1">
            <tspan x="10" y="20" font-family="Arial" font-size="12">First line</tspan>
            <tspan x="10" y="35" font-family="Arial" font-size="12">Second line</tspan>
          </text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithMultipleTspans,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { text: 'This is a longer text that should use the original line height spacing' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have multiple lines with the original line height (35 - 20 = 15)
      const tspanMatches = result.match(/<tspan[^>]*y="([^"]*)"[^>]*>/g);
      expect(tspanMatches).toBeTruthy();
      expect(tspanMatches!.length).toBeGreaterThan(1);
      
      // Extract y coordinates
      const yCoordinates = tspanMatches!.map(match => {
        const yMatch = match.match(/y="([^"]*)"/);
        return yMatch ? parseFloat(yMatch[1]) : 0;
      });
      
      // Check that the original line height (15) is preserved
      if (yCoordinates.length >= 2) {
        const actualLineHeight = yCoordinates[1] - yCoordinates[0];
        expect(actualLineHeight).toBe(15); // Should use the original 35 - 20 = 15
      }
    });

    it('should fallback to font size estimate when only one tspan exists', async () => {
      const mockSvgWithSingleTspan = `
        <svg width="100" height="100">
          <text id="text1">
            <tspan x="10" y="20" font-family="Arial" font-size="16">Single line</tspan>
          </text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'text',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithSingleTspan,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { text: 'This is a longer text that should use font size fallback' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have multiple lines with font size based line height (16 * 1.2 = 19.2)
      const tspanMatches = result.match(/<tspan[^>]*y="([^"]*)"[^>]*>/g);
      expect(tspanMatches).toBeTruthy();
      expect(tspanMatches!.length).toBeGreaterThan(1);
      
      // Extract y coordinates
      const yCoordinates = tspanMatches!.map(match => {
        const yMatch = match.match(/y="([^"]*)"/);
        return yMatch ? parseFloat(yMatch[1]) : 0;
      });
      
      // Check that font size based line height is used
      if (yCoordinates.length >= 2) {
        const actualLineHeight = yCoordinates[1] - yCoordinates[0];
        expect(actualLineHeight).toBeCloseTo(19.2, 1); // 16 * 1.2
      }
    });
  });

  describe('Height adjustment for constrained text', () => {
    it('should shift elements below when text height increases', async () => {
      const mockSvgWithElementsBelow = `
        <svg width="200" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
          <rect x="10" y="40" width="50" height="20" fill="blue" />
          <circle cx="50" cy="80" r="10" fill="red" />
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 60
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithElementsBelow,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a much longer text that will definitely span multiple lines and increase the overall height' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Elements below should be shifted down
      // Original rect was at y="40", should now be at a higher y value
      const rectMatch = result.match(/<rect[^>]*y="([^"]*)"[^>]*>/);
      expect(rectMatch).toBeTruthy();
      const rectY = parseFloat(rectMatch![1]);
      expect(rectY).toBeGreaterThan(40);
      
      // Original circle was at cy="80", should now be at a higher cy value
      const circleMatch = result.match(/<circle[^>]*cy="([^"]*)"[^>]*>/);
      expect(circleMatch).toBeTruthy();
      const circleY = parseFloat(circleMatch![1]);
      expect(circleY).toBeGreaterThan(80);
      
      // SVG height should be increased
      const svgMatch = result.match(/<svg[^>]*height="([^"]*)"[^>]*>/);
      expect(svgMatch).toBeTruthy();
      const svgHeight = parseFloat(svgMatch![1]);
      expect(svgHeight).toBeGreaterThan(100);
    });

    it('should handle elements positioned with transform translate', async () => {
      const mockSvgWithTransforms = `
        <svg width="200" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
          <g transform="translate(10, 50)">
            <rect width="30" height="10" fill="green" />
          </g>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithTransforms,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is another long text that will cause height changes' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Transform translate should be adjusted
      const transformMatch = result.match(/transform="translate\(([^,)]+),\s*([^)]+)\)"/);
      expect(transformMatch).toBeTruthy();
      const translateY = parseFloat(transformMatch![2]);
      expect(translateY).toBeGreaterThan(50);
    });

    it('should not shift elements that are above the text', async () => {
      const mockSvgWithElementsAbove = `
        <svg width="200" height="120">
          <rect x="10" y="5" width="50" height="10" fill="blue" />
          <text id="text1"><tspan x="10" y="30" font-family="Arial" font-size="12">Short</tspan></text>
          <rect x="10" y="50" width="50" height="10" fill="red" />
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 40
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithElementsAbove,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This text will expand and should only affect elements below' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // First rect (above text) should remain at y="5"
      const firstRectMatch = result.match(/<rect[^>]*y="5"[^>]*>/);
      expect(firstRectMatch).toBeTruthy();
      
      // Second rect (below text) should be shifted
      const allRectMatches = result.match(/<rect[^>]*y="([^"]*)"[^>]*>/g);
      expect(allRectMatches).toBeTruthy();
      expect(allRectMatches!.length).toBe(2);
      
      // Extract y values for all rects
      const rectYValues = allRectMatches!.map(match => {
        const yMatch = match.match(/y="([^"]*)"/);
        return yMatch ? parseFloat(yMatch[1]) : 0;
      });
      
      expect(rectYValues[0]).toBe(5); // First rect unchanged
      expect(rectYValues[1]).toBeGreaterThan(50); // Second rect shifted
    });

    it('should not add height attribute to SVG without one', async () => {
      const mockSvgWithoutHeight = `
        <svg width="200">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
          <rect x="10" y="40" width="50" height="20" fill="blue" />
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithoutHeight,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a much longer text that will definitely span multiple lines' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // SVG should still not have a height attribute
      const svgMatch = result.match(/<svg[^>]*>/);
      expect(svgMatch).toBeTruthy();
      expect(svgMatch![0]).not.toContain('height=');
      
      // But elements should still be shifted
      const rectMatch = result.match(/<rect[^>]*y="([^"]*)"[^>]*>/);
      expect(rectMatch).toBeTruthy();
      const rectY = parseFloat(rectMatch![1]);
      expect(rectY).toBeGreaterThan(40);
    });

    it('should update viewBox height when SVG has viewBox attribute', async () => {
      const mockSvgWithViewBox = `
        <svg width="200" height="100" viewBox="0 0 200 100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
          <rect x="10" y="40" width="50" height="20" fill="blue" />
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithViewBox,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a much longer text that will definitely span multiple lines and increase the viewBox height' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // SVG height should be increased
      const svgMatch = result.match(/<svg[^>]*height="([^"]*)"[^>]*>/);
      expect(svgMatch).toBeTruthy();
      const svgHeight = parseFloat(svgMatch![1]);
      expect(svgHeight).toBeGreaterThan(100);
      
      // ViewBox height should also be increased
      const viewBoxMatch = result.match(/<svg[^>]*viewBox="([^"]*)"[^>]*>/);
      expect(viewBoxMatch).toBeTruthy();
      const viewBoxParts = viewBoxMatch![1].split(/\s+/);
      expect(viewBoxParts).toHaveLength(4);
      const viewBoxHeight = parseFloat(viewBoxParts[3]);
      expect(viewBoxHeight).toBeGreaterThan(100);
      
      // ViewBox height should be updated (increased from original 100)
      // The exact calculation might differ due to text layout specifics
      expect(viewBoxHeight).toBeGreaterThan(100);
      
      // Verify that viewBox and SVG height have both been increased
      expect(svgHeight).toBeGreaterThan(100);
      expect(viewBoxHeight).toBeGreaterThan(100);
    });

    it('should shift path elements by adding transform attribute', async () => {
      const mockSvgWithPath = `
        <svg width="200" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
          <path d="M 10 50 L 60 50 L 35 80 Z" fill="green" />
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithPath,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a much longer text that will definitely span multiple lines and push the path down' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Path should have a transform attribute added to shift it
      const pathMatch = result.match(/<path[^>]*transform="translate\(0,\s*([^)]+)\)"[^>]*>/);
      expect(pathMatch).toBeTruthy();
      const translateY = parseFloat(pathMatch![1]);
      expect(translateY).toBeGreaterThan(0);
      
      // Original path data should be preserved
      expect(result).toContain('d="M 10 50 L 60 50 L 35 80 Z"');
    });

    it('should update existing transform on path elements', async () => {
      const mockSvgWithTransformedPath = `
        <svg width="200" height="100">
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
          <path d="M 10 60 L 60 60 L 35 90 Z" transform="scale(1.5)" fill="blue" />
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 40
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithTransformedPath,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is another long text that will cause the path to be shifted down while preserving its existing transform' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Path should have both the translate and original scale transform
      const pathMatch = result.match(/<path[^>]*transform="translate\(0,\s*([^)]+)\) scale\(1\.5\)"[^>]*>/);
      expect(pathMatch).toBeTruthy();
      const translateY = parseFloat(pathMatch![1]);
      expect(translateY).toBeGreaterThan(0);
    });
  });

  it('should apply text data binding correctly to text elements without ids', async () => {
    const textComponent0: Component = {
      id: 'node1',
      type: 'text',
      elementId: 'fmo-text-1',
      renderingStrategy: {
        width: {
          type: 'natural'
        }
      }
    };

    const textComponent1: Component = {
      id: 'node2',
      type: 'text',
      elementId: 'fmo-text-2',
      renderingStrategy: {
        width: {
          type: 'natural'
        }
      }
    };

    const connection0: Connection = {
      sourceNodeId: 'data1',
      sourceField: 'firstText',
      targetNodeId: 'node1',
    };

    const connection1: Connection = {
      sourceNodeId: 'data1',
      sourceField: 'secondText',
      targetNodeId: 'node2',
    };

    const sampleSvg = `
      <svg width="100" height="100">
        <text><tspan x="0" y="0">Original Text</tspan></text>
        <text><tspan x="0" y="0">Another Text</tspan></text>
      </svg>
    `;

    const layout: Layout = {
      svg: sampleSvg,
      connections: [connection0, connection1],
      components: [textComponent0, textComponent1],
    };

    const dataSources: DataSources = {
      data1: { firstText: 'First', secondText: 'Second' },
    };

    const result = await renderFlowMolio(layout, dataSources);
    expect(result).toEqual(
      `<svg id="fmo-svg-1" width="100" height="100"><text id="fmo-text-1"><tspan x="0" y="0">First</tspan></text><text id="fmo-text-2"><tspan x="0" y="0">Second</tspan></text></svg>`,
    );
  });

  describe('Full-height element handling', () => {
    it('should update heights of background elements when text expands', async () => {
      const mockSvgWithBackground = `
        <svg width="375" height="826">
          <rect width="375" height="826" fill="white"/>
          <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Short</tspan></text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithBackground,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a much longer text that will definitely span multiple lines and cause height expansion' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Background rect should have increased height
      const rectMatch = result.match(/<rect[^>]*height="([^"]*)"[^>]*>/);
      expect(rectMatch).toBeTruthy();
      const rectHeight = parseFloat(rectMatch![1]);
      expect(rectHeight).toBeGreaterThan(826);
      
      // SVG height should also be increased
      const svgMatch = result.match(/<svg[^>]*height="([^"]*)"[^>]*>/);
      expect(svgMatch).toBeTruthy();
      const svgHeight = parseFloat(svgMatch![1]);
      expect(svgHeight).toBeGreaterThan(826);
    });

    it('should not update heights of non-background elements', async () => {
      const mockSvgWithSmallRect = `
        <svg width="375" height="200">
          <rect x="10" y="10" width="50" height="30" fill="blue"/>
          <text id="text1"><tspan x="10" y="60" font-family="Arial" font-size="12">Short</tspan></text>
        </svg>
      `;

      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: {
            type: 'constrained',
            value: 50
          }
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'longText',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvgWithSmallRect,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { longText: 'This is a much longer text that will span multiple lines' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Small rect should keep original height (not a background element)
      const rectMatch = result.match(/<rect[^>]*height="([^"]*)"[^>]*>/);
      expect(rectMatch).toBeTruthy();
      const rectHeight = parseFloat(rectMatch![1]);
      expect(rectHeight).toBe(30); // Should remain unchanged
    });
  });
});

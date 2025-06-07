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

    it('should apply text data binding correctly', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">New Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle nested data paths with dot notation', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Nested Product Name</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle missing data sources gracefully', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle missing fields in data sources', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });
  });

  describe('Constrained width text rendering', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Original Text</tspan></text>
      </svg>
    `;

    it('should break long text into multiple lines for constrained width', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
      // Should contain multiple tspan elements with different y coordinates
      expect(result).toContain('<tspan x="10" y="20"');
      expect(result).toContain('This is');
      // Should have broken the text into multiple lines
      const tspanCount = (result.match(/<tspan/g) || []).length;
      expect(tspanCount).toBeGreaterThan(1);
    });

    it('should handle short text with constrained width without breaking', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
      // Should contain only one tspan element
      const tspanCount = (result.match(/<tspan/g) || []).length;
      expect(tspanCount).toBe(1);
      expect(result).toContain('Short');
    });

    it('should preserve original font attributes in constrained width mode', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
      // Should preserve font attributes
      expect(result).toContain('font-family="Times"');
      expect(result).toContain('font-size="14"');
      expect(result).toContain('font-weight="bold"');
      expect(result).toContain('fill="red"');
    });

    it('should apply line spacing when specified in SVG attributes', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
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

    it('should use line-height attribute as alternative to line-spacing', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
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

    it('should calculate line height from existing tspan y-coordinates', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
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

    it('should fallback to font size estimate when only one tspan exists', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      
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

  it('should apply text data binding correctly to text elements without ids', () => {
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

    const result = renderFlowMolio(layout, dataSources);
    expect(result).toEqual(
      `<svg width="100" height="100"><text ><tspan x="0" y="0">First</tspan></text><text ><tspan x="0" y="0">Second</tspan></text></svg>`,
    );
  });
});

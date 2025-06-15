import { Component, Connection, Layout, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('Text Alignment Feature', () => {
  describe('Natural text rendering with alignment', () => {
    it('should apply left alignment with custom offset', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'natural' },
          horizontalAlignment: 'left',
          offset: 50,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: `<svg width="200" height="100"><text id="text1"><tspan x="10" y="30">Original</tspan></text></svg>`,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { title: 'Left Aligned' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have x="50" (offset) and text-anchor="start" (left alignment)
      expect(result).toContain('x="50"');
      expect(result).toContain('text-anchor="start"');
      expect(result).toContain('Left Aligned');
    });

    it('should apply center alignment with custom offset', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'natural' },
          horizontalAlignment: 'center',
          offset: 100,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: `<svg width="200" height="100"><text id="text1"><tspan x="10" y="30">Original</tspan></text></svg>`,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { title: 'Center Aligned' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have x="100" (offset) and text-anchor="middle" (center alignment)
      expect(result).toContain('x="100"');
      expect(result).toContain('text-anchor="middle"');
      expect(result).toContain('Center Aligned');
    });

    it('should apply right alignment with custom offset', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'natural' },
          horizontalAlignment: 'right',
          offset: 150,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: `<svg width="200" height="100"><text id="text1"><tspan x="10" y="30">Original</tspan></text></svg>`,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { title: 'Right Aligned' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should have x="150" (offset) and text-anchor="end" (right alignment)
      expect(result).toContain('x="150"');
      expect(result).toContain('text-anchor="end"');
      expect(result).toContain('Right Aligned');
    });
  });

  describe('Constrained text rendering with alignment', () => {
    it('should apply center alignment with constrained width', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'constrained', value: 100 },
          horizontalAlignment: 'center',
          offset: 75,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'description',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: `<svg width="200" height="200"><text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Original text</tspan></text></svg>`,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          description: 'This is a long text that will be broken into multiple lines and center aligned' 
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // All tspan elements should have the same x offset and center alignment
      const tspanMatches = result.match(/<tspan[^>]*>/g) || [];
      expect(tspanMatches.length).toBeGreaterThan(1); // Should have multiple lines
      
      // Each tspan should have x="75" and text-anchor="middle"
      tspanMatches.forEach(tspan => {
        expect(tspan).toContain('x="75"');
        expect(tspan).toContain('text-anchor="middle"');
      });
    });

    it('should apply right alignment with constrained width', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        renderingStrategy: {
          width: { type: 'constrained', value: 80 },
          horizontalAlignment: 'right',
          offset: 120,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'description',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: `<svg width="200" height="200"><text id="text1"><tspan x="10" y="20" font-family="Arial" font-size="12">Original text</tspan></text></svg>`,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { 
          description: 'This text will be broken into lines and right aligned at offset 120' 
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // All tspan elements should have the same x offset and right alignment
      const tspanMatches = result.match(/<tspan[^>]*>/g) || [];
      expect(tspanMatches.length).toBeGreaterThan(1); // Should have multiple lines
      
      // Each tspan should have x="120" and text-anchor="end"
      tspanMatches.forEach(tspan => {
        expect(tspan).toContain('x="120"');
        expect(tspan).toContain('text-anchor="end"');
      });
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain original behavior when no rendering strategy is provided', async () => {
      const textComponent: Component = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
        // No renderingStrategy provided
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: `<svg width="200" height="100"><text id="text1"><tspan x="25" y="30">Original</tspan></text></svg>`,
        connections: [connection],
        components: [textComponent],
      };

      const dataSources: DataSources = {
        data1: { title: 'Legacy Text' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      
      // Should preserve original x position and not add text-anchor
      expect(result).toContain('x="25"'); // Original position preserved
      expect(result).not.toContain('text-anchor'); // No text-anchor added
      expect(result).toContain('Legacy Text');
    });
  });
});
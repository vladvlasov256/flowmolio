import { Layout, Connection, Component, ColorRole, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('renderFlowMolio', () => {
  describe('Basic functionality', () => {
    it('should throw error when no SVG template provided', async () => {
      const layout: Layout = {
        svg: '',
        connections: [],
        components: [],
      };

      await expect(renderFlowMolio(layout, {})).rejects.toThrow('No SVG template provided');
    });

    it('should handle empty preview object gracefully', async () => {
      const layout: Layout = {
        svg: '<svg></svg>',
        connections: [],
        components: [],
      };

      const result = await renderFlowMolio(layout, {});
      expect(result).toEqual('<svg id="fmo-svg-1" />');
    });

    it('should throw error when SVG parsing fails', async () => {
      const layout: Layout = {
        svg: 'invalid-svg',
        connections: [],
        components: [],
      };

      await expect(renderFlowMolio(layout, {})).rejects.toThrow('SVG parsing failed:');
    });
  });

  describe('Complex scenarios', () => {
    const complexSvg = `
      <svg width="200" height="200">
        <rect id="bg" fill="#ffffff" stroke="#000000"/>
        <text id="title">Product Title</text>
        <text id="price">$0.00</text>
        <image id="product-img" href="placeholder.jpg"/>
        <circle id="badge" fill="#ff0000"/>
      </svg>
    `;

    it('should handle multiple data bindings simultaneously', async () => {
      const components: Component[] = [
        { id: 'titleNode', type: 'text', elementId: 'title' },
        { id: 'priceNode', type: 'text', elementId: 'price' },
        { id: 'imgNode', type: 'image', elementId: 'product-img' },
        {
          id: 'colorNode',
          type: 'color',
          color: '#ff0000',
          enabledRoles: {
            [ColorRole.FILL]: true,
            [ColorRole.STROKE]: false,
            [ColorRole.STOP_COLOR]: false,
          },
        },
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
        { sourceNodeId: 'product', sourceField: 'price', targetNodeId: 'priceNode' },
        { sourceNodeId: 'product', sourceField: 'image', targetNodeId: 'imgNode' },
        { sourceNodeId: 'theme', sourceField: 'badgeColor', targetNodeId: 'colorNode' },
      ];

      const layout: Layout = {
        svg: complexSvg,
        connections,
        components,
      };

      const dataSources: DataSources = {
        product: {
          name: 'Awesome Product',
          price: '$29.99',
          image: 'https://example.com/awesome.jpg',
        },
        theme: {
          badgeColor: '#00ff00',
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Awesome Product</text><text id="price">$29.99</text><image id="product-img" href="https://example.com/awesome.jpg" xlink:href="https://example.com/awesome.jpg" /><circle id="badge" fill="#00ff00" /></svg>`,
      );
    });

    it('should handle partial data gracefully', async () => {
      const components: Component[] = [
        { id: 'titleNode', type: 'text', elementId: 'title' },
        { id: 'priceNode', type: 'text', elementId: 'price' },
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
        { sourceNodeId: 'product', sourceField: 'missing', targetNodeId: 'priceNode' },
      ];

      const layout: Layout = {
        svg: complexSvg,
        connections,
        components,
      };

      const dataSources: DataSources = {
        product: {
          name: 'Partial Product',
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Partial Product</text><text id="price">$0.00</text><image id="product-img" href="placeholder.jpg" /><circle id="badge" fill="#ff0000" /></svg>`,
      );
    });

    it('should handle connections without matching components', async () => {
      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'nonexistentNode' },
      ];

      const layout: Layout = {
        svg: complexSvg,
        connections,
        components: [],
      };

      const dataSources: DataSources = {
        product: { name: 'Test Product' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });

    it('should handle components without matching elements', async () => {
      const components: Component[] = [
        { id: 'titleNode', type: 'text', elementId: 'nonexistentElement' },
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
      ];

      const layout: Layout = {
        svg: complexSvg,
        connections,
        components,
      };

      const dataSources: DataSources = {
        product: { name: 'Test Product' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });
  });

  describe('XML escaping', () => {
    it('should escape XML special characters in attribute values', async () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [{ sourceNodeId: 'data', sourceField: 'title', targetNodeId: 'textNode' }],
        components: [{ id: 'textNode', type: 'text', elementId: 'test' }],
      };

      const dataSources: DataSources = {
        data: {
          title: 'Material & care',
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toContain('Material &#38; care');
    });

    it('should escape multiple XML special characters', async () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [{ sourceNodeId: 'data', sourceField: 'content', targetNodeId: 'textNode' }],
        components: [{ id: 'textNode', type: 'text', elementId: 'test' }],
      };

      const dataSources: DataSources = {
        data: {
          content: 'Text with <brackets>, "quotes" & ampersands',
        },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toContain('Text with &#60;brackets&#62;, &#34;quotes&#34; &#38; ampersands');
    });

    it('should escape special characters in ID attributes', async () => {
      const svg = '<svg><text id="Material & care">Test</text></svg>';
      
      const layout: Layout = {
        svg,
        connections: [],
        components: [],
      };

      const result = await renderFlowMolio(layout, {});
      expect(result).toContain('id="Material &#38; care"');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty data sources', async () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        components: [],
      };

      const result = await renderFlowMolio(layout, {});
      expect(result).toContain('Test');
    });

    it('should handle null data sources', async () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        components: [],
      };

      const result = await renderFlowMolio(layout, {} as DataSources);
      expect(result).toContain('Test');
    });

    it('should handle undefined preview object properties', async () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        components: [],
      };

      // Remove components property to test undefined handling
      const partialLayout: Partial<Layout> = { ...layout };
      delete partialLayout.components;

      const result = await renderFlowMolio(partialLayout as Layout, {});
      expect(result).toContain('Test');
    });
  });
});

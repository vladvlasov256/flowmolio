import { Layout, Connection, Component, ColorRole, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('renderFlowMolio', () => {
  describe('Basic functionality', () => {
    it('should return error message when no SVG template provided', () => {
      const layout: Layout = {
        svg: '',
        connections: [],
        components: [],
      };

      const result = renderFlowMolio(layout, {});
      expect(result).toBe('<div>No SVG template provided</div>');
    });

    it('should handle empty preview object gracefully', () => {
      const layout: Layout = {
        svg: '<svg></svg>',
        connections: [],
        components: [],
      };

      const result = renderFlowMolio(layout, {});
      expect(result).toEqual('<svg  />');
    });

    it('should return error message when SVG parsing fails', () => {
      const layout: Layout = {
        svg: 'invalid-svg',
        connections: [],
        components: [],
      };

      const result = renderFlowMolio(layout, {});
      expect(result).toContain('Rendering error:');
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

    it('should handle multiple data bindings simultaneously', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Awesome Product</text><text id="price">$29.99</text><image id="product-img" href="https://example.com/awesome.jpg" xlink:href="https://example.com/awesome.jpg" /><circle id="badge" fill="#00ff00" /></svg>`,
      );
    });

    it('should handle partial data gracefully', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Partial Product</text><text id="price">$0.00</text><image id="product-img" href="placeholder.jpg" /><circle id="badge" fill="#ff0000" /></svg>`,
      );
    });

    it('should handle connections without matching components', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });

    it('should handle components without matching elements', () => {
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

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });
  });

  describe('Edge cases', () => {
    it('should handle empty data sources', () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        components: [],
      };

      const result = renderFlowMolio(layout, {});
      expect(result).toContain('Test');
    });

    it('should handle null data sources', () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        components: [],
      };

      const result = renderFlowMolio(layout, {} as DataSources);
      expect(result).toContain('Test');
    });

    it('should handle undefined preview object properties', () => {
      const layout: Layout = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        components: [],
      };

      // Remove components property to test undefined handling
      const partialLayout: Partial<Layout> = { ...layout };
      delete partialLayout.components;

      const result = renderFlowMolio(partialLayout as Layout, {});
      expect(result).toContain('Test');
    });
  });
});

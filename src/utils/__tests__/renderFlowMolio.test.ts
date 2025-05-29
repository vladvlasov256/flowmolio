import { PreviewObject, Connection, NodeData, ColorRole } from '../../types';
import { renderFlowMolio } from '../renderFlowMolio';

describe('renderFlowMolio', () => {
  describe('Basic functionality', () => {
    it('should return error message when no SVG template provided', () => {
      const previewObject: PreviewObject = {
        svg: '',
        connections: [],
        nodes: [],
      };

      const result = renderFlowMolio(previewObject, {});
      expect(result).toBe('<div>No SVG template provided</div>');
    });

    it('should handle empty preview object gracefully', () => {
      const previewObject: PreviewObject = {
        svg: '<svg></svg>',
        connections: [],
        nodes: [],
      };

      const result = renderFlowMolio(previewObject, {});
      expect(result).toEqual('<svg  />');
    });

    it('should return error message when SVG parsing fails', () => {
      const previewObject: PreviewObject = {
        svg: 'invalid-svg',
        connections: [],
        nodes: [],
      };

      const result = renderFlowMolio(previewObject, {});
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
      const nodes: NodeData[] = [
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

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes,
      };

      const dataSources = {
        product: {
          name: 'Awesome Product',
          price: '$29.99',
          image: 'https://example.com/awesome.jpg',
        },
        theme: {
          badgeColor: '#00ff00',
        },
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(
        `<svg width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Awesome Product</text><text id="price">$29.99</text><image id="product-img" href="https://example.com/awesome.jpg" xlink:href="https://example.com/awesome.jpg" /><circle id="badge" fill="#00ff00" /></svg>`,
      );
    });

    it('should handle partial data gracefully', () => {
      const nodes: NodeData[] = [
        { id: 'titleNode', type: 'text', elementId: 'title' },
        { id: 'priceNode', type: 'text', elementId: 'price' },
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
        { sourceNodeId: 'product', sourceField: 'missing', targetNodeId: 'priceNode' },
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes,
      };

      const dataSources = {
        product: {
          name: 'Partial Product',
        },
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(
        `<svg width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Partial Product</text><text id="price">$0.00</text><image id="product-img" href="placeholder.jpg" /><circle id="badge" fill="#ff0000" /></svg>`,
      );
    });

    it('should handle connections without matching nodes', () => {
      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'nonexistentNode' },
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes: [],
      };

      const dataSources = {
        product: { name: 'Test Product' },
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });

    it('should handle nodes without matching elements', () => {
      const nodes: NodeData[] = [
        { id: 'titleNode', type: 'text', elementId: 'nonexistentElement' },
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes,
      };

      const dataSources = {
        product: { name: 'Test Product' },
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });
  });

  describe('Edge cases', () => {
    it('should handle empty data sources', () => {
      const previewObject: PreviewObject = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        nodes: [],
      };

      const result = renderFlowMolio(previewObject, {});
      expect(result).toContain('Test');
    });

    it('should handle null data sources', () => {
      const previewObject: PreviewObject = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        nodes: [],
      };

      const result = renderFlowMolio(previewObject, null);
      expect(result).toContain('Test');
    });

    it('should handle undefined preview object properties', () => {
      const previewObject: PreviewObject = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        nodes: [],
      };

      // Remove nodes property to test undefined handling
      const partialPreview: Partial<PreviewObject> = { ...previewObject };
      delete partialPreview.nodes;

      const result = renderFlowMolio(partialPreview as PreviewObject, {});
      expect(result).toContain('Test');
    });
  });
});

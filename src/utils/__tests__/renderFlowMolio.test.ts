import { PreviewObject, Connection, NodeData, ColorRole } from '../../types';
import { renderFlowMolio } from '../renderFlowMolio';

describe('renderFlowMolio', () => {
  describe('Basic functionality', () => {
    it('should return error message when no SVG template provided', () => {
      const previewObject: PreviewObject = {
        svg: '',
        connections: [],
        nodes: []
      };
      
      const result = renderFlowMolio(previewObject, {});
      expect(result).toBe('<div>No SVG template provided</div>');
    });

    it('should handle empty preview object gracefully', () => {
      const previewObject: PreviewObject = {
        svg: '<svg></svg>',
        connections: [],
        nodes: []
      };
      
      const result = renderFlowMolio(previewObject, {});
      expect(result).toEqual('<svg  />');
    });

    it('should return error message when SVG parsing fails', () => {
      const previewObject: PreviewObject = {
        svg: 'invalid-svg',
        connections: [],
        nodes: []
      };
      
      const result = renderFlowMolio(previewObject, {});
      expect(result).toContain('Rendering error:');
    });
  });

  describe('Text node data binding', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <text id="text1"><tspan x="0" y="0">Original Text</tspan></text>
        <text id="text2"><tspan x="0" y="0">Another Text</tspan></text>
      </svg>
    `;

    it('should apply text data binding correctly', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1'
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode]
      };

      const dataSources = {
        data1: { title: 'New Text' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">New Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`);
    });

    it('should handle nested data paths with dot notation', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1'
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'product.name',
        targetNodeId: 'node1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode]
      };

      const dataSources = {
        data1: { 
          product: { 
            name: 'Nested Product Name' 
          } 
        }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Nested Product Name</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`);
    });

    it('should handle missing data sources gracefully', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1'
      };

      const connection: Connection = {
        sourceNodeId: 'missing-data',
        sourceField: 'title',
        targetNodeId: 'node1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode]
      };

      const dataSources = {};

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`);
    });

    it('should handle missing fields in data sources', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1'
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'missing.field',
        targetNodeId: 'node1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode]
      };

      const dataSources = {
        data1: { title: 'Available Title' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`);
    });
  });

  describe('Image node data binding', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <image id="img1" href="original.jpg" xlink:href="original.jpg"/>
      </svg>
    `;

    it('should apply image URL binding correctly', () => {
      const imageNode: NodeData = {
        id: 'node1',
        type: 'image',
        elementId: 'img1'
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'imageUrl',
        targetNodeId: 'node1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [imageNode]
      };

      const dataSources = {
        data1: { imageUrl: 'https://example.com/new-image.jpg' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><image id="img1" href="https://example.com/new-image.jpg" xlink:href="https://example.com/new-image.jpg" /></svg>`);
    });
  });

  describe('Color node processing', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <rect id="rect1" fill="#ff0000" stroke="#0000ff"/>
        <circle id="circle1" fill="#ff0000"/>
        <defs>
          <linearGradient>
            <stop stop-color="#ff0000" offset="0%"/>
          </linearGradient>
        </defs>
      </svg>
    `;
    // `<svg width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#0000ff" /><circle id="circle1" fill="#ff0000" /><defs ><lineargradient ><stop stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`

    it('should apply color changes based on fill role', () => {
      const colorNode: NodeData = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'primaryColor',
        targetNodeId: 'color1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [colorNode]
      };

      const dataSources = {
        data1: { primaryColor: '#00ff00' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><rect id="rect1" fill="#00ff00" stroke="#0000ff" /><circle id="circle1" fill="#00ff00" /><defs ><lineargradient ><stop stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`);
    });

    it('should apply color changes based on stroke role', () => {
      const colorNode: NodeData = {
        id: 'color1',
        type: 'color',
        color: '#0000ff',
        enabledRoles: {
          [ColorRole.FILL]: false,
          [ColorRole.STROKE]: true,
          [ColorRole.STOP_COLOR]: false
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'borderColor',
        targetNodeId: 'color1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [colorNode]
      };

      const dataSources = {
        data1: { borderColor: '#ff00ff' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#ff00ff" /><circle id="circle1" fill="#ff0000" /><defs ><lineargradient ><stop stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`);
    });

    it('should apply color changes based on stop-color role', () => {
      const colorNode: NodeData = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: false,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: true
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'gradientColor',
        targetNodeId: 'color1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [colorNode]
      };

      const dataSources = {
        data1: { gradientColor: '#ffff00' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#0000ff" /><circle id="circle1" fill="#ff0000" /><defs ><lineargradient ><stop stop-color="#ffff00" offset="0%" /></lineargradient></defs></svg>`);
    });

    it('should handle multiple enabled color roles', () => {
      const colorNode: NodeData = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: true
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'themeColor',
        targetNodeId: 'color1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [colorNode]
      };

      const dataSources = {
        data1: { themeColor: '#00ffff' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><rect id="rect1" fill="#00ffff" stroke="#0000ff" /><circle id="circle1" fill="#00ffff" /><defs ><lineargradient ><stop stop-color="#00ffff" offset="0%" /></lineargradient></defs></svg>`);
    });

    it('should only replace colors that match the target color exactly', () => {
      const colorNode: NodeData = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: true,
          [ColorRole.STOP_COLOR]: false
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'newColor',
        targetNodeId: 'color1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [colorNode]
      };

      const dataSources = {
        data1: { newColor: '#purple' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><rect id="rect1" fill="#purple" stroke="#0000ff" /><circle id="circle1" fill="#purple" /><defs ><lineargradient ><stop stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`);
    });

    it('should handle invalid color values gracefully', () => {
      const colorNode: NodeData = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false
        }
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'invalidColor',
        targetNodeId: 'color1'
      };

      const previewObject: PreviewObject = {
        svg: mockSvg,
        connections: [connection],
        nodes: [colorNode]
      };

      const dataSources = {
        data1: { invalidColor: null }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#0000ff" /><circle id="circle1" fill="#ff0000" /><defs ><lineargradient ><stop stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`);
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
            [ColorRole.STOP_COLOR]: false
          }
        }
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
        { sourceNodeId: 'product', sourceField: 'price', targetNodeId: 'priceNode' },
        { sourceNodeId: 'product', sourceField: 'image', targetNodeId: 'imgNode' },
        { sourceNodeId: 'theme', sourceField: 'badgeColor', targetNodeId: 'colorNode' }
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes
      };

      const dataSources = {
        product: {
          name: 'Awesome Product',
          price: '$29.99',
          image: 'https://example.com/awesome.jpg'
        },
        theme: {
          badgeColor: '#00ff00'
        }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Awesome Product</text><text id="price">$29.99</text><image id="product-img" href="https://example.com/awesome.jpg" xlink:href="https://example.com/awesome.jpg" /><circle id="badge" fill="#00ff00" /></svg>`);
    });

    it('should handle partial data gracefully', () => {
      const nodes: NodeData[] = [
        { id: 'titleNode', type: 'text', elementId: 'title' },
        { id: 'priceNode', type: 'text', elementId: 'price' }
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
        { sourceNodeId: 'product', sourceField: 'missing', targetNodeId: 'priceNode' }
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes
      };

      const dataSources = {
        product: {
          name: 'Partial Product'
        }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toEqual(`<svg width="200" height="200"><rect id="bg" fill="#ffffff" stroke="#000000" /><text id="title">Partial Product</text><text id="price">$0.00</text><image id="product-img" href="placeholder.jpg" /><circle id="badge" fill="#ff0000" /></svg>`);
    });

    it('should handle connections without matching nodes', () => {
      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'nonexistentNode' }
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes: []
      };

      const dataSources = {
        product: { name: 'Test Product' }
      };

      const result = renderFlowMolio(previewObject, dataSources);
      expect(result).toContain('Product Title'); // Original text should remain
    });

    it('should handle nodes without matching elements', () => {
      const nodes: NodeData[] = [
        { id: 'titleNode', type: 'text', elementId: 'nonexistentElement' }
      ];

      const connections: Connection[] = [
        { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' }
      ];

      const previewObject: PreviewObject = {
        svg: complexSvg,
        connections,
        nodes
      };

      const dataSources = {
        product: { name: 'Test Product' }
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
        nodes: []
      };

      const result = renderFlowMolio(previewObject, {});
      expect(result).toContain('Test');
    });

    it('should handle null data sources', () => {
      const previewObject: PreviewObject = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        nodes: []
      };

      const result = renderFlowMolio(previewObject, null);
      expect(result).toContain('Test');
    });

    it('should handle undefined preview object properties', () => {
      const previewObject: PreviewObject = {
        svg: '<svg><text id="test">Test</text></svg>',
        connections: [],
        nodes: []
      };

      // Remove nodes property to test undefined handling
      const partialPreview: Partial<PreviewObject> = { ...previewObject };
      delete partialPreview.nodes;

      const result = renderFlowMolio(partialPreview as PreviewObject, {});
      expect(result).toContain('Test');
    });
  });
});
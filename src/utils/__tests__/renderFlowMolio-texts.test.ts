import { PreviewObject, Connection, NodeData, ColorRole } from '../../types';
import { renderFlowMolio } from '../renderFlowMolio';

describe('renderFlowMolio - Texts', () => {
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

  it('should apply text data binding correctly to text elements without ids', () => {
    const textNode: NodeData = {
      id: 'node1',
      type: 'text',
      elementId: 'el-knh7ozh33'
    };

    const connection: Connection = {
      sourceNodeId: 'data1',
      sourceField: 'title',
      targetNodeId: 'node1'
    };

    const sampleSvg = `
      <svg width="100" height="100">
      <g id="Wallet with chain Style #36252 0YK0G 1000">
      <text fill="#848484" xml:space="preserve" style="white-space: pre" font-family="Work Sans" font-size="12" letter-spacing="0px"><tspan x="203" y="192.309">Style #36252 0YK0G 1000&#10;</tspan></text>
      <text fill="black" xml:space="preserve" style="white-space: pre" font-family="Work Sans" font-size="14" letter-spacing="0px"><tspan x="203" y="174.309">Wallet with chain&#10;</tspan><tspan x="203" y="213.309">&#10;</tspan></text>
      </g>
      </svg>
    `;

    const previewObject: PreviewObject = {
      svg: sampleSvg,
      connections: [connection],
      nodes: [textNode]
    };

    const dataSources = {
      data1: { title: 'New Text' }
    };

    const result = renderFlowMolio(previewObject, dataSources);
    expect(result).toEqual(`<svg width="100" height="100"><g id="Wallet with chain Style #36252 0YK0G 1000"><text fill="#848484" xml:space="preserve" style="white-space: pre" font-family="Work Sans" font-size="12" letter-spacing="0px"><tspan x="203" y="192.309">New Text</tspan></text><text fill="black" xml:space="preserve" style="white-space: pre" font-family="Work Sans" font-size="14" letter-spacing="0px"><tspan x="203" y="174.309">Wallet with chain&#10;</tspan><tspan x="203" y="213.309">&#10;</tspan></text></g></svg>`);
  });
});
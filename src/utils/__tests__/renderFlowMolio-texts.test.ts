import { Blueprint, Connection, NodeData } from '../../types';
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
        elementId: 'text1',
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const blueprint: Blueprint = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode],
      };

      const dataSources = {
        data1: { title: 'New Text' },
      };

      const result = renderFlowMolio(blueprint, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">New Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle nested data paths with dot notation', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'product.name',
        targetNodeId: 'node1',
      };

      const blueprint: Blueprint = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode],
      };

      const dataSources = {
        data1: {
          product: {
            name: 'Nested Product Name',
          },
        },
      };

      const result = renderFlowMolio(blueprint, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Nested Product Name</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle missing data sources gracefully', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
      };

      const connection: Connection = {
        sourceNodeId: 'missing-data',
        sourceField: 'title',
        targetNodeId: 'node1',
      };

      const blueprint: Blueprint = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode],
      };

      const dataSources = {};

      const result = renderFlowMolio(blueprint, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });

    it('should handle missing fields in data sources', () => {
      const textNode: NodeData = {
        id: 'node1',
        type: 'text',
        elementId: 'text1',
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'missing.field',
        targetNodeId: 'node1',
      };

      const blueprint: Blueprint = {
        svg: mockSvg,
        connections: [connection],
        nodes: [textNode],
      };

      const dataSources = {
        data1: { title: 'Available Title' },
      };

      const result = renderFlowMolio(blueprint, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><text id="text1"><tspan x="0" y="0">Original Text</tspan></text><text id="text2"><tspan x="0" y="0">Another Text</tspan></text></svg>`,
      );
    });
  });

  it('should apply text data binding correctly to text elements without ids', () => {
    const textNode0: NodeData = {
      id: 'node1',
      type: 'text',
      elementId: 'fmo-text-1',
    };

    const textNode1: NodeData = {
      id: 'node2',
      type: 'text',
      elementId: 'fmo-text-2',
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

    const blueprint: Blueprint = {
      svg: sampleSvg,
      connections: [connection0, connection1],
      nodes: [textNode0, textNode1],
    };

    const dataSources = {
      data1: { firstText: 'First', secondText: 'Second' },
    };

    const result = renderFlowMolio(blueprint, dataSources);
    expect(result).toEqual(
      `<svg width="100" height="100"><text ><tspan x="0" y="0">First</tspan></text><text ><tspan x="0" y="0">Second</tspan></text></svg>`,
    );
  });
});

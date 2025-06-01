import { Layout, Connection, Component, DataSources } from '../../types';
import { renderFlowMolio } from '../renderFlowMolio';

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

  it('should apply text data binding correctly to text elements without ids', () => {
    const textComponent0: Component = {
      id: 'node1',
      type: 'text',
      elementId: 'fmo-text-1',
    };

    const textComponent1: Component = {
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

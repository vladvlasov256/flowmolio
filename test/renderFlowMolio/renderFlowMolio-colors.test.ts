import { Layout, Connection, Component, ColorRole, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('renderFlowMolio', () => {
  describe('Color component processing', () => {
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

    it('should apply color changes based on fill role', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'primaryColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { primaryColor: '#00ff00' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#00ff00" stroke="#0000ff" /><circle id="circle1" fill="#00ff00" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should apply color changes based on stroke role', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#0000ff',
        enabledRoles: {
          [ColorRole.FILL]: false,
          [ColorRole.STROKE]: true,
          [ColorRole.STOP_COLOR]: false,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'borderColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { borderColor: '#ff00ff' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#ff00ff" /><circle id="circle1" fill="#ff0000" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should apply color changes based on stop-color role', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: false,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: true,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'gradientColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { gradientColor: '#ffff00' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#0000ff" /><circle id="circle1" fill="#ff0000" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ffff00" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should handle multiple enabled color roles', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: true,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'themeColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { themeColor: '#00ffff' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#00ffff" stroke="#0000ff" /><circle id="circle1" fill="#00ffff" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#00ffff" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should only replace colors that match the target color exactly', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: true,
          [ColorRole.STOP_COLOR]: false,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'newColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { newColor: '#purple' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#purple" stroke="#0000ff" /><circle id="circle1" fill="#purple" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should handle invalid color values gracefully', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false,
        },
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'invalidColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { invalidColor: null },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#0000ff" /><circle id="circle1" fill="#ff0000" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should apply colors only to specified element IDs when elementIds is provided', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false,
        },
        elementIds: ['rect1'], // Only apply to rect1, not circle1
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'newColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { newColor: '#00ff00' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#00ff00" stroke="#0000ff" /><circle id="circle1" fill="#ff0000" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should apply colors to all elements when elementIds is empty array', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false,
        },
        elementIds: [], // Empty array should apply to all elements
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'newColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { newColor: '#00ff00' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#00ff00" stroke="#0000ff" /><circle id="circle1" fill="#00ff00" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should apply colors to all elements when elementIds is not provided', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false,
        },
        // No elementIds property - should apply to all elements
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'newColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { newColor: '#00ff00' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#00ff00" stroke="#0000ff" /><circle id="circle1" fill="#00ff00" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });

    it('should apply colors to multiple specified element IDs', async () => {
      const mockSvgMultiple = `
        <svg width="100" height="100">
          <rect id="rect1" fill="#ff0000" stroke="#0000ff"/>
          <rect id="rect2" fill="#ff0000" stroke="#0000ff"/>
          <circle id="circle1" fill="#ff0000"/>
        </svg>
      `;

      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: false,
        },
        elementIds: ['rect1', 'circle1'], // Apply to rect1 and circle1, but not rect2
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'newColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvgMultiple,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { newColor: '#00ff00' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#00ff00" stroke="#0000ff" /><rect id="rect2" fill="#ff0000" stroke="#0000ff" /><circle id="circle1" fill="#00ff00" /></svg>`,
      );
    });

    it('should work with element IDs and multiple color roles', async () => {
      const colorComponent: Component = {
        id: 'color1',
        type: 'color',
        color: '#0000ff',
        enabledRoles: {
          [ColorRole.FILL]: false,
          [ColorRole.STROKE]: true,
          [ColorRole.STOP_COLOR]: false,
        },
        elementIds: ['rect1'], // Only apply stroke changes to rect1
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'strokeColor',
        targetNodeId: 'color1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [colorComponent],
      };

      const dataSources: DataSources = {
        data1: { strokeColor: '#ff00ff' },
      };

      const result = await renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg id="fmo-svg-1" width="100" height="100"><rect id="rect1" fill="#ff0000" stroke="#ff00ff" /><circle id="circle1" fill="#ff0000" /><defs id="fmo-defs-1"><lineargradient id="fmo-lineargradient-1"><stop id="fmo-stop-1" stop-color="#ff0000" offset="0%" /></lineargradient></defs></svg>`,
      );
    });
  });
});

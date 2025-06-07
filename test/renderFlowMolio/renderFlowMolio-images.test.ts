import { Layout, Connection, Component, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('renderFlowMolio - Images', () => {
  describe('Image component data binding', () => {
    const mockSvg = `
      <svg width="100" height="100">
        <image id="img1" href="original.jpg" xlink:href="original.jpg"/>
      </svg>
    `;

    it('should apply image URL binding correctly', () => {
      const imageComponent: Component = {
        id: 'node1',
        type: 'image',
        elementId: 'img1',
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'imageUrl',
        targetNodeId: 'node1',
      };

      const layout: Layout = {
        svg: mockSvg,
        connections: [connection],
        components: [imageComponent],
      };

      const dataSources: DataSources = {
        data1: { imageUrl: 'https://example.com/new-image.jpg' },
      };

      const result = renderFlowMolio(layout, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><image id="img1" href="https://example.com/new-image.jpg" xlink:href="https://example.com/new-image.jpg" /></svg>`,
      );
    });
  });
});

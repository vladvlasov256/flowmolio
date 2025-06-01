import { Blueprint, Connection, NodeData, DataSources } from '../../types';
import { renderFlowMolio } from '../renderFlowMolio';

describe('renderFlowMolio - Images', () => {
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
        elementId: 'img1',
      };

      const connection: Connection = {
        sourceNodeId: 'data1',
        sourceField: 'imageUrl',
        targetNodeId: 'node1',
      };

      const blueprint: Blueprint = {
        svg: mockSvg,
        connections: [connection],
        nodes: [imageNode],
      };

      const dataSources: DataSources = {
        data1: { imageUrl: 'https://example.com/new-image.jpg' },
      };

      const result = renderFlowMolio(blueprint, dataSources);
      expect(result).toEqual(
        `<svg width="100" height="100"><image id="img1" href="https://example.com/new-image.jpg" xlink:href="https://example.com/new-image.jpg" /></svg>`,
      );
    });
  });
});

import { parseSVG } from '../../src/utils/svgUtils';
import { shiftElementsBelow } from '../../src/utils/textLayoutUtils';

describe('textLayoutUtils', () => {
  describe('shiftElementsBelow', () => {
    it('should handle translate transforms with space-separated coordinates', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="50" width="20" height="30" transform="translate(0 626)" />
          <rect x="10" y="150" width="20" height="30" />
        </svg>
      `);

      // Shift elements below y=100 by 50 units
      shiftElementsBelow(svgTree, 100, 50);

      // First rect should be shifted (y=50 + height=30 = bottom at 80, which is below 100 after transform translate y=626)
      const firstRect = svgTree.children[0];
      expect(firstRect.attributes.transform).toBe('translate(0, 676)'); // 626 + 50

      // Second rect should be shifted (y=150 is below threshold)
      const secondRect = svgTree.children[1];
      expect(secondRect.attributes.y).toBe('200'); // 150 + 50
    });

    it('should handle translate transforms with comma-separated coordinates', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="50" width="20" height="30" transform="translate(0, 626)" />
          <rect x="10" y="150" width="20" height="30" />
        </svg>
      `);

      // Shift elements below y=100 by 50 units
      shiftElementsBelow(svgTree, 100, 50);

      // First rect should be shifted
      const firstRect = svgTree.children[0];
      expect(firstRect.attributes.transform).toBe('translate(0, 676)'); // 626 + 50

      // Second rect should be shifted
      const secondRect = svgTree.children[1];
      expect(secondRect.attributes.y).toBe('200'); // 150 + 50
    });

    it('should handle translate transforms with mixed spacing', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="50" width="20" height="30" transform="translate(100,  300)" />
          <rect x="10" y="150" width="20" height="30" transform="translate(200 400)" />
        </svg>
      `);

      // Shift elements below y=250 by 75 units
      shiftElementsBelow(svgTree, 250, 75);

      // First rect: y=50 + transform y=300 = effectively at 350, which is below 250
      const firstRect = svgTree.children[0];
      expect(firstRect.attributes.transform).toBe('translate(100, 375)'); // 300 + 75

      // Second rect: y=150 + transform y=400 = effectively at 550, which is below 250
      const secondRect = svgTree.children[1];
      expect(firstRect.attributes.transform).toBe('translate(100, 375)'); // 300 + 75
      expect(secondRect.attributes.transform).toBe('translate(200, 475)'); // 400 + 75
    });

    it('should not shift elements that are above the threshold', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="20" width="20" height="30" transform="translate(0 50)" />
          <rect x="10" y="80" width="20" height="10" />
        </svg>
      `);

      // Shift elements below y=100 by 25 units
      shiftElementsBelow(svgTree, 100, 25);

      // First rect: transform y=50 is below threshold (50 < 100), so should NOT be shifted
      const firstRect = svgTree.children[0];
      expect(firstRect.attributes.transform).toBe('translate(0 50)'); // unchanged

      // Second rect: y=80 + height=10 = bottom at 90, which is above 100, so should NOT be shifted
      const secondRect = svgTree.children[1];
      expect(secondRect.attributes.y).toBe('80'); // unchanged
    });

    it('should handle complex transform strings with translate', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="50" width="20" height="30" transform="scale(1.5) translate(0 626) rotate(45)" />
        </svg>
      `);

      // Shift elements below y=500 by 100 units
      shiftElementsBelow(svgTree, 500, 100);

      // Transform should be updated while preserving other transformations
      const rect = svgTree.children[0];
      expect(rect.attributes.transform).toBe('scale(1.5) translate(0, 726) rotate(45)'); // 626 + 100
    });

    it('should handle elements without transform attributes', () => {
      const svgTree = parseSVG(`
        <svg width="100" height="200">
          <rect x="10" y="150" width="20" height="30" />
          <circle cx="50" cy="180" r="10" />
        </svg>
      `);

      // Shift elements below y=100 by 25 units
      shiftElementsBelow(svgTree, 100, 25);

      // Rect should be shifted by its y attribute
      const rect = svgTree.children[0];
      expect(rect.attributes.y).toBe('175'); // 150 + 25

      // Circle should be shifted by its cy attribute  
      const circle = svgTree.children[1];
      expect(circle.attributes.cy).toBe('205'); // 180 + 25
    });
  });
});
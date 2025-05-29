import { IdGenerator } from '../IdGenerator';

describe('IdGenerator', () => {
  describe('Constructor', () => {
    it('should create instance with empty existing IDs when no parameter provided', () => {
      const generator = new IdGenerator();
      expect(generator.next('div')).toBe('fmo-div-1');
    });

    it('should create instance with provided existing IDs', () => {
      const existingIds = new Set(['fmo-div-1', 'fmo-span-1']);
      const generator = new IdGenerator(existingIds);

      // Should avoid existing IDs by adding suffix
      expect(generator.next('div')).toBe('fmo-div-1:1');
      expect(generator.next('span')).toBe('fmo-span-1:1');
    });
  });

  describe('fromSVGString', () => {
    it('should extract existing IDs from SVG string', () => {
      const svgString = `
        <svg>
          <rect id="rect1" />
          <circle id="circle1" />
          <text id="text1">Hello</text>
        </svg>
      `;

      const generator = IdGenerator.fromSVGString(svgString);

      // Should avoid extracted IDs
      expect(generator.next('rect')).toBe('fmo-rect-1');
      expect(generator.next('circle')).toBe('fmo-circle-1');
      expect(generator.next('text')).toBe('fmo-text-1');
    });

    it('should handle SVG with no IDs', () => {
      const svgString = '<svg><rect /><circle /></svg>';
      const generator = IdGenerator.fromSVGString(svgString);

      expect(generator.next('rect')).toBe('fmo-rect-1');
      expect(generator.next('circle')).toBe('fmo-circle-1');
    });

    it('should handle empty SVG string', () => {
      const generator = IdGenerator.fromSVGString('');
      expect(generator.next('div')).toBe('fmo-div-1');
    });

    it('should extract IDs with special characters', () => {
      const svgString = '<svg><rect id="my-id_123" /><circle id="fmo-circle-1" /></svg>';
      const generator = IdGenerator.fromSVGString(svgString);

      expect(generator.next('circle')).toBe('fmo-circle-1:1');
      expect(generator.next('rect')).toBe('fmo-rect-1');
    });
  });

  describe('reset', () => {
    it('should reset hierarchy counters and depth', () => {
      const generator = new IdGenerator();

      generator.enterLevel();
      generator.next('div');
      generator.enterLevel();
      generator.next('span');

      generator.reset();

      // After reset, should start fresh but existing IDs still avoided
      expect(generator.next('div')).toBe('fmo-div-1:1');
      expect(generator.next('span')).toBe('fmo-span-1:1');
    });

    it('should preserve existing IDs after reset', () => {
      const existingIds = new Set(['fmo-div-1']);
      const generator = new IdGenerator(existingIds);

      generator.enterLevel();
      generator.next('span');
      generator.reset();

      // Should still avoid existing IDs
      expect(generator.next('div')).toBe('fmo-div-1:1');
    });
  });

  describe('enterLevel and exitLevel', () => {
    it('should track depth levels correctly', () => {
      const generator = new IdGenerator();

      // Level 0
      expect(generator.next('div')).toBe('fmo-div-1');

      generator.enterLevel(); // Level 1
      expect(generator.next('div')).toBe('fmo-div-1:1');
      expect(generator.next('span')).toBe('fmo-span-1');

      generator.enterLevel(); // Level 2
      expect(generator.next('div')).toBe('fmo-div-1:2');

      generator.exitLevel(); // Back to Level 1
      expect(generator.next('div')).toBe('fmo-div-2');

      generator.exitLevel(); // Back to Level 0
      expect(generator.next('div')).toBe('fmo-div-2:1');
    });

    it('should handle exitLevel when already at depth 0', () => {
      const generator = new IdGenerator();

      // Should not crash when exiting at depth 0
      generator.exitLevel();
      generator.exitLevel();

      expect(generator.next('div')).toBe('fmo-div-1');
    });

    it('should maintain separate counters per level', () => {
      const generator = new IdGenerator();

      // Level 0
      generator.next('div'); // fmo-div-1
      generator.next('span'); // fmo-span-1

      generator.enterLevel(); // Level 1
      generator.next('div'); // fmo-div-1 (fresh counter at this level)
      generator.next('span'); // fmo-span-1 (fresh counter at this level)

      generator.exitLevel(); // Back to Level 0
      generator.next('div'); // fmo-div-2 (continues from level 0 counter)

      expect(generator.next('span')).toBe('fmo-span-2');
    });
  });

  describe('next', () => {
    it('should generate sequential IDs for same tag type', () => {
      const generator = new IdGenerator();

      expect(generator.next('div')).toBe('fmo-div-1');
      expect(generator.next('div')).toBe('fmo-div-2');
      expect(generator.next('div')).toBe('fmo-div-3');
    });

    it('should generate separate counters for different tag types', () => {
      const generator = new IdGenerator();

      expect(generator.next('div')).toBe('fmo-div-1');
      expect(generator.next('span')).toBe('fmo-span-1');
      expect(generator.next('div')).toBe('fmo-div-2');
      expect(generator.next('span')).toBe('fmo-span-2');
    });

    it('should handle collision detection with existing IDs', () => {
      const existingIds = new Set(['fmo-div-1', 'fmo-div-2', 'fmo-div-2-1']);
      const generator = new IdGenerator(existingIds);

      expect(generator.next('div')).toBe('fmo-div-1:1');
      expect(generator.next('div')).toBe('fmo-div-2:1');
    });

    it('should handle collision with suffix conflicts', () => {
      const existingIds = new Set(['fmo-div-1', 'fmo-div-1-1', 'fmo-div-1-2']);
      const generator = new IdGenerator(existingIds);

      expect(generator.next('div')).toBe('fmo-div-1:1');
    });

    it('should add generated IDs to existing set to prevent future collisions', () => {
      const generator = new IdGenerator();

      const firstId = generator.next('div');
      const secondId = generator.next('div');

      expect(firstId).toBe('fmo-div-1');
      expect(secondId).toBe('fmo-div-2');

      // Create new generator with first ID as existing
      const newGenerator = new IdGenerator(new Set([firstId]));
      expect(newGenerator.next('div')).toBe('fmo-div-1:1');
    });

    it('should handle complex tag names', () => {
      const generator = new IdGenerator();

      expect(generator.next('custom-element')).toBe('fmo-custom-element-1');
      expect(generator.next('svg:rect')).toBe('fmo-svg:rect-1');
      expect(generator.next('data-123')).toBe('fmo-data-123-1');
    });

    it('should ensure counter maps exist for current depth', () => {
      const generator = new IdGenerator();

      // Jump to deep level without calling enterLevel
      generator.enterLevel();
      generator.enterLevel();
      generator.enterLevel();

      expect(generator.next('div')).toBe('fmo-div-1');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex workflow with multiple levels and resets', () => {
      const existingIds = new Set(['fmo-div-1', 'fmo-span-2']);
      const generator = new IdGenerator(existingIds);

      // Level 0
      expect(generator.next('div')).toBe('fmo-div-1:1');
      expect(generator.next('span')).toBe('fmo-span-1');

      generator.enterLevel(); // Level 1
      expect(generator.next('div')).toBe('fmo-div-1:2');
      expect(generator.next('span')).toBe('fmo-span-1:1');

      generator.reset();

      // After reset, should start fresh but preserve existing IDs
      expect(generator.next('div')).toBe('fmo-div-1:3');
      expect(generator.next('span')).toBe('fmo-span-1:2');
    });

    it('should handle SVG extraction with subsequent generation', () => {
      const svgString = `
        <svg>
          <g id="fmo-g-1">
            <rect id="fmo-rect-1" />
            <rect id="fmo-rect-3" />
          </g>
        </svg>
      `;

      const generator = IdGenerator.fromSVGString(svgString);

      expect(generator.next('g')).toBe('fmo-g-1:1');
      expect(generator.next('rect')).toBe('fmo-rect-1:1'); // Avoids existing
      expect(generator.next('rect')).toBe('fmo-rect-2'); // Next count
    });
  });
});

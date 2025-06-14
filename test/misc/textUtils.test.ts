import { generateTspans, breakTextIntoLines } from '../../src/utils/textUtils';

describe('textUtils', () => {
  describe('generateTspans', () => {
    it('should generate tspans without line spacing by default', async () => {
      const lines = ['First line', 'Second line', 'Third line'];
      const startX = 10;
      const startY = 20;
      const lineHeight = 14;
      
      const result = generateTspans(lines, startX, startY, lineHeight);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ x: 10, y: 20, text: 'First line' });
      expect(result[1]).toEqual({ x: 10, y: 34, text: 'Second line' }); // 20 + 14
      expect(result[2]).toEqual({ x: 10, y: 48, text: 'Third line' }); // 20 + 14*2
    });

    it('should apply line spacing when provided', async () => {
      const lines = ['First line', 'Second line', 'Third line'];
      const startX = 10;
      const startY = 20;
      const lineHeight = 14;
      const lineSpacing = 5;
      
      const result = generateTspans(lines, startX, startY, lineHeight, lineSpacing);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ x: 10, y: 20, text: 'First line' });
      expect(result[1]).toEqual({ x: 10, y: 39, text: 'Second line' }); // 20 + (14+5)
      expect(result[2]).toEqual({ x: 10, y: 58, text: 'Third line' }); // 20 + (14+5)*2
    });

    it('should handle zero line spacing', async () => {
      const lines = ['First line', 'Second line'];
      const startX = 5;
      const startY = 15;
      const lineHeight = 12;
      const lineSpacing = 0;
      
      const result = generateTspans(lines, startX, startY, lineHeight, lineSpacing);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ x: 5, y: 15, text: 'First line' });
      expect(result[1]).toEqual({ x: 5, y: 27, text: 'Second line' }); // 15 + 12
    });

    it('should handle negative line spacing', async () => {
      const lines = ['First line', 'Second line'];
      const startX = 0;
      const startY = 100;
      const lineHeight = 16;
      const lineSpacing = -4; // Tighter spacing
      
      const result = generateTspans(lines, startX, startY, lineHeight, lineSpacing);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ x: 0, y: 100, text: 'First line' });
      expect(result[1]).toEqual({ x: 0, y: 112, text: 'Second line' }); // 100 + (16-4)
    });

    it('should handle single line', async () => {
      const lines = ['Only line'];
      const startX = 50;
      const startY = 75;
      const lineHeight = 18;
      const lineSpacing = 10;
      
      const result = generateTspans(lines, startX, startY, lineHeight, lineSpacing);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ x: 50, y: 75, text: 'Only line' });
    });
  });

  describe('breakTextIntoLines', () => {
    const mockFontConfig = {
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal'
    };

    it('should handle line breaks in text', async () => {
      const text = 'First line\nSecond line\nThird line';
      const result = breakTextIntoLines(text, 200, mockFontConfig);
      
      expect(result).toEqual(['First line', 'Second line', 'Third line']);
    });

    it('should handle both line breaks and word wrapping', async () => {
      const text = 'Short\nThis is a very long line that should wrap\nEnd';
      const result = breakTextIntoLines(text, 50, mockFontConfig);
      
      expect(result.length).toBeGreaterThan(3); // Should have more than the original 3 lines
      expect(result[0]).toBe('Short');
      expect(result[result.length - 1]).toBe('End');
      // The middle line should be broken into multiple lines
      expect(result.some(line => line.includes('This is'))).toBeTruthy();
    });

    it('should preserve empty lines', async () => {
      const text = 'First line\n\nThird line';
      const result = breakTextIntoLines(text, 200, mockFontConfig);
      
      expect(result).toEqual(['First line', '', 'Third line']);
    });

    it('should handle Windows-style line breaks (\\r\\n)', async () => {
      const text = 'First line\r\nSecond line\r\nThird line';
      const result = breakTextIntoLines(text, 200, mockFontConfig);
      
      expect(result).toEqual(['First line', 'Second line', 'Third line']);
    });

    it('should handle mixed line breaks and spaces', async () => {
      const text = 'Line one\nLine two with spaces\nLine three';
      const result = breakTextIntoLines(text, 200, mockFontConfig);
      
      expect(result).toEqual(['Line one', 'Line two with spaces', 'Line three']);
    });

    it('should handle line break at the end', async () => {
      const text = 'First line\nSecond line\n';
      const result = breakTextIntoLines(text, 200, mockFontConfig);
      
      expect(result).toEqual(['First line', 'Second line', '']);
    });

    it('should handle only line breaks', async () => {
      const text = '\n\n\n';
      const result = breakTextIntoLines(text, 200, mockFontConfig);
      
      expect(result).toEqual(['', '', '', '']);
    });
  });
});
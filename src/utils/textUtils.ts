import { measureText } from './measureText';

export interface FontConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight?: string | number;
  letterSpacing?: number;
  lineSpacing?: number;
}

export interface TspanData {
  x: number;
  y: number;
  text: string;
}

export function breakTextIntoLines(
  text: string,
  maxWidth: number,
  fontConfig: FontConfig,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measureText(testLine, fontConfig);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word is too long - handle overflow
        lines.push(word);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function generateTspans(
  lines: string[],
  startX: number,
  startY: number,
  lineHeight: number,
  lineSpacing: number = 0,
): TspanData[] {
  return lines.map((line, index) => ({
    x: startX,
    y: startY + index * (lineHeight + lineSpacing),
    text: line,
  }));
}

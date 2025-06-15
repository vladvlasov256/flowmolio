import { measureText } from './measureText'

export interface FontConfig {
  fontFamily: string
  fontSize: number
  fontWeight?: string | number
  letterSpacing?: number
  lineSpacing?: number
}

export interface TspanData {
  x: number
  y: number
  text: string
}

export function breakTextIntoLines(
  text: string,
  maxWidth: number,
  fontConfig: FontConfig,
): string[] {
  // First split by line breaks, then handle word wrapping for each line
  const textLines = text.split(/\r?\n/)
  const finalLines: string[] = []

  for (const textLine of textLines) {
    if (textLine.trim() === '') {
      // Empty line - preserve it
      finalLines.push('')
      continue
    }

    // Word wrap this line
    const words = textLine.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = measureText(testLine, fontConfig)

      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          finalLines.push(currentLine)
          currentLine = word
        } else {
          // Single word is too long - handle overflow
          finalLines.push(word)
        }
      }
    }

    if (currentLine) {
      finalLines.push(currentLine)
    }
  }

  return finalLines
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
  }))
}

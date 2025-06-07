// Pre-calculated average character widths for common fonts
export const CHAR_WIDTHS: Record<string, Record<string, Record<number, number>>> = {
  'Work Sans': {
    normal: { 14: 0.52, 16: 0.59, 20: 0.74 },
    bold: { 14: 0.56, 16: 0.64, 20: 0.80 }
  },
  'Arial': {
    normal: { 12: 0.48, 14: 0.56, 16: 0.64, 18: 0.72, 20: 0.80 },
    bold: { 12: 0.52, 14: 0.60, 16: 0.68, 18: 0.76, 20: 0.84 }
  },
  'Times': {
    normal: { 12: 0.45, 14: 0.52, 16: 0.59, 18: 0.67, 20: 0.74 },
    bold: { 12: 0.49, 14: 0.56, 16: 0.63, 18: 0.71, 20: 0.78 }
  }
};

export function approximateWidth(text: string, fontFamily: string, fontSize: number, fontWeight: string | number): number {
  const weight = fontWeight === 'bold' || (typeof fontWeight === 'number' && fontWeight >= 700) ? 'bold' : 'normal';
  const ratio = CHAR_WIDTHS[fontFamily]?.[weight]?.[fontSize] || 0.6;
  return text.length * fontSize * ratio;
}
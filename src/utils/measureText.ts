import { FontConfig } from './textUtils'

export function measureText(
  text: string,
  { fontFamily, fontSize, fontWeight, letterSpacing }: FontConfig,
): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas context is not available')
  }

  ctx.font = `${fontWeight || 'normal'} ${fontSize}px "${fontFamily}"`

  // Basic text measurement
  let width = ctx.measureText(text).width

  // Simple approximation for letter spacing if provided
  if (letterSpacing && letterSpacing > 0) {
    width += letterSpacing * (text.length - 1)
  }

  return width
}

import { encode } from 'he'
import { HTMLElement } from 'node-html-parser'

import {
  DataBindingContext,
  SVGElementNode,
  JSONValue,
  TextLayoutComponent,
  ColorReplacementComponent,
  ColorRole,
} from '../types'

import { handleTextHeightChange, calculateTextBoundsSync } from './svgBounds'
import { findElementById } from './svgUtils'
import {
  calculateTextElementHeight,
  shiftElementsBelow,
  extractLinesFromElement,
} from './textLayoutUtils'
import { breakTextIntoLines, generateTspans, FontConfig } from './textUtils'
import { getValueFromPath } from './dataUtils'

/**
 * Converts horizontal alignment to SVG text-anchor attribute value
 */
function getTextAnchor(horizontalAlignment: 'left' | 'center' | 'right'): string {
  switch (horizontalAlignment) {
    case 'center':
      return 'middle'
    case 'right':
      return 'end'
    case 'left':
    default:
      return 'start'
  }
}

/**
 * Handles constrained width text rendering with line breaking and height updates
 */
async function applyConstrainedTextRendering(
  svgTree: SVGElementNode,
  targetElement: SVGElementNode,
  dataString: string,
  tspans: HTMLElement[],
  widthValue: number,
  horizontalAlignment: 'left' | 'center' | 'right',
  offset: number,
  tempDiv: HTMLElement,
): Promise<void> {
  // Calculate original height and bounds before modification
  const { height: originalHeight, lineHeight: oldLineHeight } =
    calculateTextElementHeight(targetElement)
  const originalBounds = calculateTextBoundsSync(targetElement)

  // For constrained width, break text into lines and generate tspans
  const firstTspan = tspans[0]
  const x = offset // Use offset instead of original x position
  const y = parseFloat(firstTspan.getAttribute('y') || '0')

  // Extract font information from the parent text element
  const fontFamily = targetElement.attributes['font-family'] || 'Arial'
  const fontSize = parseFloat(targetElement.attributes['font-size'] || '12')
  const fontWeight = targetElement.attributes['font-weight'] || 'normal'
  const letterSpacing = parseFloat(targetElement.attributes['letter-spacing'] || '0')

  // Extract line spacing information from parent text element
  const lineSpacingAttr =
    targetElement.attributes['line-spacing'] || targetElement.attributes['line-height']
  const lineSpacing = lineSpacingAttr ? parseFloat(lineSpacingAttr) - fontSize : 0

  const fontConfig: FontConfig = {
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing: letterSpacing || undefined,
    lineSpacing: lineSpacing || undefined,
  }

  // Break text into lines based on width constraint
  const lines = breakTextIntoLines(dataString, widthValue, fontConfig)

  // Calculate line height from existing lines or fallback to dy/font size estimate
  let lineHeight: number
  const existingLines = extractLinesFromElement(targetElement)
  if (existingLines.length >= 2) {
    // Use the difference between first and second line y-coordinates
    lineHeight = Math.abs(existingLines[1].y - existingLines[0].y)
  } else {
    // Fallback to dy attribute or font size estimate
    lineHeight = parseFloat(firstTspan.getAttribute('dy') || String(fontSize * 1.2))
  }

  // Generate tspan data for each line with line spacing
  const tspanData = generateTspans(lines, x, y, lineHeight, lineSpacing)

  // Clear existing tspans
  tspans.forEach(tspan => tspan.remove())

  // Create new tspans for each line
  tspanData.forEach((data, index) => {
    const newTspan = new HTMLElement('tspan', {})
    newTspan.setAttribute('x', String(data.x))
    newTspan.setAttribute('y', String(data.y))

    // Set text-anchor based on horizontal alignment
    newTspan.setAttribute('text-anchor', getTextAnchor(horizontalAlignment))

    // Copy attributes from the first tspan to maintain styling
    if (index === 0) {
      Object.entries(firstTspan.attributes).forEach(([name, value]) => {
        if (name !== 'x' && name !== 'y' && name !== 'text-anchor') {
          newTspan.setAttribute(name, value)
        }
      })
    } else {
      // For subsequent lines, copy all attributes except positioning
      Object.entries(firstTspan.attributes).forEach(([name, value]) => {
        if (name !== 'x' && name !== 'y' && name !== 'dy' && name !== 'text-anchor') {
          newTspan.setAttribute(name, value)
        }
      })
    }

    newTspan.textContent = data.text
    tempDiv.appendChild(newTspan)
  })

  // Update the innerHTML
  targetElement.innerHTML = tempDiv.innerHTML

  // Calculate new height and height delta
  const { height: newHeight } = calculateTextElementHeight(targetElement, oldLineHeight)
  const heightDelta = newHeight - originalHeight

  // If height changed, shift elements below and update container hierarchy
  if (heightDelta !== 0) {
    shiftElementsBelow(svgTree, y, heightDelta)
    await handleTextHeightChange(svgTree, targetElement, heightDelta, originalBounds)
  }
}

/**
 * Handles natural text rendering without width constraints
 */
function applyNaturalTextRendering(
  dataString: string,
  tspans: HTMLElement[],
  horizontalAlignment: 'left' | 'center' | 'right',
  offset: number,
): void {
  // Natural strategy - use existing behavior but with alignment and offset
  const firstTspan = tspans[0]
  firstTspan.textContent = dataString

  // Update x position and text-anchor for alignment
  firstTspan.setAttribute('x', String(offset))
  firstTspan.setAttribute('text-anchor', getTextAnchor(horizontalAlignment))

  // Clear the rest of the tspans
  for (let i = 1; i < tspans.length; i++) {
    tspans[i].textContent = ''
  }
}

/**
 * Applies text data bindings and handles text layout changes
 */
async function applyTextDataBindings({
  svgTree,
  connections,
  dataSources,
  components = [],
}: DataBindingContext): Promise<void> {
  // Process each connection for text components only
  for (const connection of connections) {
    // Find the target component
    const targetComponent = components.find(component => component.id === connection.targetNodeId)
    if (!targetComponent || targetComponent.type !== 'text') {
      continue
    }

    const elementId = targetComponent.elementId

    // Find the target element in the SVG
    const targetElement = findElementById(svgTree, elementId)
    if (!targetElement || !targetElement.isText) {
      return
    }

    // Get the data value from the source field path
    const dataValue = getValueFromPath(dataSources[connection.sourceNodeId], connection.sourceField)
    if (dataValue === undefined) return

    // For text elements, we need to handle the innerHTML for Figma's tspan elements
    const dataString = String(dataValue)
    const textComponent = targetComponent as TextLayoutComponent

    if (targetElement.innerHTML) {
      // If there's tspan content, we need to update the content of each tspan
      const tempDiv = new HTMLElement('div', {})
      tempDiv.innerHTML = targetElement.innerHTML

      // Get all tspans
      const tspans = tempDiv.querySelectorAll('tspan')

      if (tspans.length > 0) {
        // Check for rendering strategy
        const renderingStrategy = textComponent.renderingStrategy

        if (renderingStrategy) {
          // Use rendering strategy values
          const horizontalAlignment = renderingStrategy.horizontalAlignment
          const offset = renderingStrategy.offset

          if (renderingStrategy.width.type === 'constrained') {
            await applyConstrainedTextRendering(
              svgTree,
              targetElement,
              dataString,
              tspans,
              renderingStrategy.width.value,
              horizontalAlignment,
              offset,
              tempDiv,
            )
          } else {
            applyNaturalTextRendering(dataString, tspans, horizontalAlignment, offset)
          }
        } else {
          // No rendering strategy - use legacy behavior (just replace text content)
          tspans[0].textContent = dataString
          // Clear the rest of the tspans
          for (let i = 1; i < tspans.length; i++) {
            tspans[i].textContent = ''
          }
        }

        // Update the innerHTML
        targetElement.innerHTML = tempDiv.innerHTML
      } else {
        // No tspans found, just replace the entire innerHTML
        targetElement.innerHTML = encode(dataString, {
          useNamedReferences: false,
          decimal: true,
        })
      }
    }

    // Also update textContent for compatibility
    targetElement.textContent = dataString
  }
}

/**
 * Applies image data bindings
 */
function applyImageDataBindings({
  svgTree,
  connections,
  dataSources,
  components = [],
}: DataBindingContext): void {
  // Process each connection for image components only
  connections.forEach(connection => {
    // Find the target component
    const targetComponent = components.find(component => component.id === connection.targetNodeId)
    if (!targetComponent || targetComponent.type !== 'image') {
      return
    }

    const elementId = targetComponent.elementId

    // Find the target element in the SVG
    const targetElement = findElementById(svgTree, elementId)
    if (!targetElement || !targetElement.isImage) {
      return
    }

    // Get the data value from the source field path
    const dataValue = getValueFromPath(dataSources[connection.sourceNodeId], connection.sourceField)
    if (dataValue === undefined) return

    // For image elements, update the href/xlink:href attribute
    targetElement.attributes['href'] = String(dataValue)
    targetElement.attributes['xlink:href'] = String(dataValue)
  })
}

/**
 * Applies color data bindings
 */
function applyColorDataBindings({
  svgTree,
  connections,
  dataSources,
  components = [],
}: DataBindingContext): void {
  // Find connections to color components
  const colorComponentConnections = connections.filter(conn => {
    const targetComponent = components.find(c => c.id === conn.targetNodeId)
    return targetComponent && targetComponent.type === 'color'
  })

  // If no connections to color components, nothing to do
  if (colorComponentConnections.length === 0) return

  // Process each connection to a color component
  colorComponentConnections.forEach(connection => {
    // Find the target color component
    const colorComponent = components.find(
      c => c.id === connection.targetNodeId && c.type === 'color',
    ) as ColorReplacementComponent | undefined

    if (!colorComponent) return

    // Get the color value from the data source
    const sourceValue = getValueFromPath(
      dataSources[connection.sourceNodeId],
      connection.sourceField,
    )
    if (!sourceValue || typeof sourceValue !== 'string') return

    // This is the color we want to replace
    const targetColor = colorComponent.color
    if (!targetColor) return

    // Get all elements in the SVG tree
    const applyColorToElements = (element: SVGElementNode) => {
      // If elementIds is specified and not empty, only apply to those specific elements
      const shouldApplyToElement =
        !colorComponent.elementIds ||
        colorComponent.elementIds.length === 0 ||
        (element.id && colorComponent.elementIds.includes(element.id))

      if (shouldApplyToElement) {
        // Apply colors based on enabled roles, but only if they match the target color
        if (
          colorComponent.enabledRoles[ColorRole.FILL] &&
          element.attributes.fill &&
          element.attributes.fill.toLowerCase() === targetColor.toLowerCase()
        ) {
          element.attributes.fill = sourceValue
        }

        if (
          colorComponent.enabledRoles[ColorRole.STROKE] &&
          element.attributes.stroke &&
          element.attributes.stroke.toLowerCase() === targetColor.toLowerCase()
        ) {
          element.attributes.stroke = sourceValue
        }

        if (
          colorComponent.enabledRoles[ColorRole.STOP_COLOR] &&
          element.tagName === 'stop' &&
          element.attributes['stop-color'] &&
          element.attributes['stop-color'].toLowerCase() === targetColor.toLowerCase()
        ) {
          element.attributes['stop-color'] = sourceValue
        }
      }

      // Process children recursively
      if (element.children && element.children.length > 0) {
        element.children.forEach(applyColorToElements)
      }
    }

    // Start processing from the root
    applyColorToElements(svgTree)
  })
}

/**
 * Applies data bindings from data source to SVG elements
 */
export async function applyDataBindings(context: DataBindingContext): Promise<void> {
  // Apply text data bindings (each text element handles its own container updates)
  await applyTextDataBindings(context)

  // Apply image data bindings
  applyImageDataBindings(context)

  // Apply color data bindings
  applyColorDataBindings(context)
}

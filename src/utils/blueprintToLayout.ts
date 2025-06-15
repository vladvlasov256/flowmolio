import {
  Blueprint,
  Layout,
  Component,
  TextLayoutComponent,
  ImageLayoutComponent,
  ColorReplacementComponent,
  ColorRole,
  Connection,
} from '../types'

/**
 * Converts a Blueprint (from FlowMolio Studio) to a Layout object that can be used with renderFlowMolio
 */
export function convertBlueprintToLayout(blueprint: Blueprint): Layout {
  // Convert edges to connections
  const connections: Connection[] = blueprint.edges.map(edge => ({
    sourceNodeId: edge.source,
    sourceField: edge.sourceHandle || '',
    targetNodeId: edge.target,
  }))

  // Filter and convert nodes to components
  const components: Component[] = blueprint.nodes
    .filter(node => ['textLayout', 'imageLayout', 'colorNode'].includes(node.type || ''))
    .map(node => {
      switch (node.type) {
        case 'textLayout':
          return {
            id: node.id,
            type: 'text',
            elementId: node.data.textElementId,
            renderingStrategy: node.data.renderingStrategy,
          } as TextLayoutComponent

        case 'imageLayout':
          return {
            id: node.id,
            type: 'image',
            elementId: node.data.imageElementId,
          } as ImageLayoutComponent

        case 'colorNode': {
          const data = node.data
          return {
            id: node.id,
            type: 'color',
            color: data.selectedColor || '',
            enabledRoles: {
              [ColorRole.FILL]: data.enabledRoles?.[ColorRole.FILL] ?? false,
              [ColorRole.STROKE]: data.enabledRoles?.[ColorRole.STROKE] ?? false,
              [ColorRole.STOP_COLOR]: data.enabledRoles?.[ColorRole.STOP_COLOR] ?? false,
            },
            elementIds: data.elementIds, // Optional property for filtering specific elements
          } as ColorReplacementComponent
        }

        default:
          // This should never happen due to the filter above
          throw new Error(`Unknown node type: ${node.type}`)
      }
    })

  return {
    svg: blueprint.svg,
    connections,
    components,
  }
}

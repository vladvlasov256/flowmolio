import { Connection, PreviewObject, NodeData, ColorNodeData, ColorRole } from '../types';

import { applyDataBindings, serializeSVG } from './renderUtils';
import { parseSVG } from './svgUtils';

/**
 * Processes color nodes to apply color changes to SVG elements based on connections
 */
function applyColorNodes(
  svgTree: any,
  nodes: NodeData[],
  connections: Connection[],
  dataSources: any,
): void {
  // Find connections to color nodes
  const colorNodeConnections = connections.filter(conn => {
    const targetNode = nodes.find(n => n.id === conn.targetNodeId);
    return targetNode && targetNode.type === 'color';
  });

  // If no connections to color nodes, nothing to do
  if (colorNodeConnections.length === 0) return;

  // Process each connection to a color node
  colorNodeConnections.forEach(connection => {
    // Find the target color node
    const colorNode = nodes.find(n => n.id === connection.targetNodeId && n.type === 'color') as
      | ColorNodeData
      | undefined;

    if (!colorNode) return;

    // Get the color value from the data source
    const sourceValue = getValueFromDataSource(dataSources, connection);
    if (!sourceValue || typeof sourceValue !== 'string') return;

    // This is the color we want to replace
    const targetColor = colorNode.color;
    if (!targetColor) return;

    // Get all elements in the SVG tree
    const applyColorToElements = (element: any) => {
      // Apply colors based on enabled roles, but only if they match the target color
      if (
        colorNode.enabledRoles[ColorRole.FILL] &&
        element.attributes.fill &&
        element.attributes.fill.toLowerCase() === targetColor.toLowerCase()
      ) {
        element.attributes.fill = sourceValue;
      }

      if (
        colorNode.enabledRoles[ColorRole.STROKE] &&
        element.attributes.stroke &&
        element.attributes.stroke.toLowerCase() === targetColor.toLowerCase()
      ) {
        element.attributes.stroke = sourceValue;
      }

      if (
        colorNode.enabledRoles[ColorRole.STOP_COLOR] &&
        element.tagName === 'stop' &&
        element.attributes['stop-color'] &&
        element.attributes['stop-color'].toLowerCase() === targetColor.toLowerCase()
      ) {
        element.attributes['stop-color'] = sourceValue;
      }

      // Process children recursively
      if (element.children && element.children.length > 0) {
        element.children.forEach(applyColorToElements);
      }
    };

    // Start processing from the root
    applyColorToElements(svgTree);
  });
}

/**
 * Helper to extract a value from a data source using a connection
 */
function getValueFromDataSource(dataSources: any, connection: Connection): any {
  if (!dataSources || !connection.sourceNodeId || !connection.sourceField) {
    return null;
  }

  const dataSource = dataSources[connection.sourceNodeId];
  if (!dataSource) return null;

  // Handle dot notation paths
  const path = connection.sourceField.split('.');
  let value = dataSource;

  for (const part of path) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return null;
    }
    value = value[part];
  }

  return value;
}

/**
 * Renders an SVG with data bindings and color node processing
 * This is a pure rendering function without any hover/inspection functionality
 */
export function renderFlowMolio(previewObject: PreviewObject, dataSources: any): string {
  if (!previewObject.svg) {
    return '<div>No SVG template provided</div>';
  }

  try {
    // Parse the SVG
    const svgTree = parseSVG(previewObject.svg);

    // Apply data bindings
    applyDataBindings({
      svgTree,
      connections: previewObject.connections,
      dataSources,
      nodes: previewObject.nodes || [],
    });

    // Apply color node changes if there are nodes and connections
    if (
      previewObject.nodes &&
      previewObject.nodes.length > 0 &&
      previewObject.connections &&
      previewObject.connections.length > 0
    ) {
      applyColorNodes(svgTree, previewObject.nodes, previewObject.connections, dataSources);
    }

    // Serialize the modified SVG back to string
    return serializeSVG(svgTree);
  } catch (error) {
    return `<div>Rendering error: ${(error as Error).message}</div>`;
  }
}

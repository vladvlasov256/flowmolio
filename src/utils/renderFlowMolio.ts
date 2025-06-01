import {
  Connection,
  Blueprint,
  Component,
  ColorReplacementComponent,
  ColorRole,
  DataSources,
  SVGElementNode,
  JSONValue,
} from '../types';

import { applyDataBindings, serializeSVG } from './renderUtils';
import { parseSVG } from './svgUtils';

/**
 * Processes color components to apply color changes to SVG elements based on connections
 */
function applyColorComponents(
  svgTree: SVGElementNode,
  components: Component[],
  connections: Connection[],
  dataSources: DataSources,
): void {
  // Find connections to color components
  const colorComponentConnections = connections.filter(conn => {
    const targetComponent = components.find(c => c.id === conn.targetNodeId);
    return targetComponent && targetComponent.type === 'color';
  });

  // If no connections to color components, nothing to do
  if (colorComponentConnections.length === 0) return;

  // Process each connection to a color component
  colorComponentConnections.forEach(connection => {
    // Find the target color component
    const colorComponent = components.find(
      c => c.id === connection.targetNodeId && c.type === 'color',
    ) as ColorReplacementComponent | undefined;

    if (!colorComponent) return;

    // Get the color value from the data source
    const sourceValue = getValueFromDataSource(dataSources, connection);
    if (!sourceValue || typeof sourceValue !== 'string') return;

    // This is the color we want to replace
    const targetColor = colorComponent.color;
    if (!targetColor) return;

    // Get all elements in the SVG tree
    const applyColorToElements = (element: SVGElementNode) => {
      // If elementIds is specified and not empty, only apply to those specific elements
      const shouldApplyToElement =
        !colorComponent.elementIds ||
        colorComponent.elementIds.length === 0 ||
        (element.id && colorComponent.elementIds.includes(element.id));

      if (shouldApplyToElement) {
        // Apply colors based on enabled roles, but only if they match the target color
        if (
          colorComponent.enabledRoles[ColorRole.FILL] &&
          element.attributes.fill &&
          element.attributes.fill.toLowerCase() === targetColor.toLowerCase()
        ) {
          element.attributes.fill = sourceValue;
        }

        if (
          colorComponent.enabledRoles[ColorRole.STROKE] &&
          element.attributes.stroke &&
          element.attributes.stroke.toLowerCase() === targetColor.toLowerCase()
        ) {
          element.attributes.stroke = sourceValue;
        }

        if (
          colorComponent.enabledRoles[ColorRole.STOP_COLOR] &&
          element.tagName === 'stop' &&
          element.attributes['stop-color'] &&
          element.attributes['stop-color'].toLowerCase() === targetColor.toLowerCase()
        ) {
          element.attributes['stop-color'] = sourceValue;
        }
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
function getValueFromDataSource(dataSources: DataSources, connection: Connection): JSONValue {
  if (!dataSources || !connection.sourceNodeId || !connection.sourceField) {
    return null;
  }

  const dataSource = dataSources[connection.sourceNodeId];
  if (!dataSource) return null;

  // Handle dot notation paths
  const path = connection.sourceField.split('.');
  let value: JSONValue = dataSource;

  for (const part of path) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return null;
    }
    const record = value as Record<string, JSONValue>;
    value = record[part];
  }

  return value;
}

/**
 * Renders an SVG with data bindings and color node processing
 * This is a pure rendering function without any hover/inspection functionality
 */
export function renderFlowMolio(blueprint: Blueprint, dataSources: DataSources): string {
  if (!blueprint.svg) {
    return '<div>No SVG template provided</div>';
  }

  try {
    // Parse the SVG
    const svgTree = parseSVG(blueprint.svg);

    // Apply data bindings
    applyDataBindings({
      svgTree,
      connections: blueprint.connections,
      dataSources,
      components: blueprint.components || [],
    });

    // Apply color component changes if there are components and connections
    if (
      blueprint.components &&
      blueprint.components.length > 0 &&
      blueprint.connections &&
      blueprint.connections.length > 0
    ) {
      applyColorComponents(svgTree, blueprint.components, blueprint.connections, dataSources);
    }

    // Serialize the modified SVG back to string
    return serializeSVG(svgTree);
  } catch (error) {
    return `<div>Rendering error: ${(error as Error).message}</div>`;
  }
}

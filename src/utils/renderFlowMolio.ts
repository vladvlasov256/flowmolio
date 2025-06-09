import { Layout, DataSources } from '../types';

import { applyDataBindings, serializeSVG } from './renderUtils';
import { parseSVG } from './svgUtils';

/**
 * Renders an SVG with data bindings applied
 * This is a pure rendering function without any hover/inspection functionality
 */
export function renderFlowMolio(layout: Layout, dataSources: DataSources): string {
  if (!layout.svg) {
    return '<div>No SVG template provided</div>';
  }

  try {
    // Parse the SVG
    const svgTree = parseSVG(layout.svg);

    // Apply data bindings (includes text, image, and color components)
    applyDataBindings({
      svgTree,
      connections: layout.connections,
      dataSources,
      components: layout.components || [],
    });

    // Serialize the modified SVG back to string
    return serializeSVG(svgTree);
  } catch (error) {
    return `<div>Rendering error: ${(error as Error).message}</div>`;
  }
}

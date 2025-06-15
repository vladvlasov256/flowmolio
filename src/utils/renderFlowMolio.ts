import { Layout, DataSources } from '../types';

import { applyDataBindings, serializeSVG } from './renderUtils';
import { parseSVG } from './svgUtils';

/**
 * Renders an SVG with data bindings applied
 * This is a pure rendering function without any hover/inspection functionality
 */
export async function renderFlowMolio(layout: Layout, dataSources: DataSources): Promise<string> {
  if (!layout.svg) {
    throw new Error('No SVG template provided');
  }

  // Parse the SVG
  const svgTree = parseSVG(layout.svg);

  // Apply data bindings (includes text, image, and color components)
  await applyDataBindings({
    svgTree,
    connections: layout.connections,
    dataSources,
    components: layout.components || [],
  });

  // Serialize the modified SVG back to string
  return serializeSVG(svgTree);
}

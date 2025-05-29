/* eslint-disable no-unused-vars */
export enum ColorRole {
  FILL = 'fill',
  STROKE = 'stroke',
  STOP_COLOR = 'stop-color',
}
/* eslint-enable no-unused-vars */

export interface SVGElementNode {
  id: string;
  originalId?: string;
  tagName: string;
  attributes: Record<string, string>;
  children: SVGElementNode[];
  isText: boolean;
  isImage: boolean;
  innerHTML?: string;
  textContent?: string;
}

// Connection between data source and target node
export interface Connection {
  sourceNodeId: string;
  sourceField: string;
  targetNodeId: string;
}

// Node type definitions
export interface BaseNodeData {
  id: string;
}

export interface TextNodeData extends BaseNodeData {
  type: 'text';
  elementId: string;
}

export interface ImageNodeData extends BaseNodeData {
  type: 'image';
  elementId: string;
}

export interface ColorNodeData extends BaseNodeData {
  type: 'color';
  color: string;
  enabledRoles: {
    [ColorRole.FILL]: boolean;
    [ColorRole.STROKE]: boolean;
    [ColorRole.STOP_COLOR]: boolean;
  };
  elementIds?: string[];
}

// Union type for all node types
export type NodeData = TextNodeData | ImageNodeData | ColorNodeData;

// Preview object containing SVG, connections, and nodes
export interface PreviewObject {
  svg: string;
  connections: Connection[];
  nodes: NodeData[];
}

// Data binding context for applying values to elements
export interface DataBindingContext {
  svgTree: SVGElementNode;
  connections: Connection[];
  dataSources: any;
  nodes?: NodeData[];
}

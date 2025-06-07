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

// Component type definitions
export interface BaseComponent {
  id: string;
}

export interface TextLayoutComponent extends BaseComponent {
  type: 'text';
  elementId: string;
  renderingStrategy?: {
    width:
      | {
          type: 'constrained';
          value: number;
        }
      | {
          type: 'natural';
        };
  };
}

export interface ImageLayoutComponent extends BaseComponent {
  type: 'image';
  elementId: string;
}

export interface ColorReplacementComponent extends BaseComponent {
  type: 'color';
  color: string;
  enabledRoles: {
    [ColorRole.FILL]: boolean;
    [ColorRole.STROKE]: boolean;
    [ColorRole.STOP_COLOR]: boolean;
  };
  elementIds?: string[];
}

// Union type for all component types
export type Component = TextLayoutComponent | ImageLayoutComponent | ColorReplacementComponent;

// JSON value type representing any valid JSON value
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Data sources type - a record of data source IDs to JSON objects
export type DataSources = Record<string, JSONValue>;

// Layout containing SVG, connections, and components
export interface Layout {
  svg: string;
  connections: Connection[];
  components: Component[];
}

// Data binding context for applying values to elements
export interface DataBindingContext {
  svgTree: SVGElementNode;
  connections: Connection[];
  dataSources: DataSources;
  components?: Component[];
}

// Generic node structure (matches React Flow Node structure)
export interface BlueprintNode {
  id: string;
  type?: string;
  position: {
    x: number;
    y: number;
  };
  data: any;
  [key: string]: any; // Allow additional properties
}

// Generic edge structure (matches React Flow Edge structure)
export interface BlueprintEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: any;
  [key: string]: any; // Allow additional properties
}

// Blueprint represents the exported project from FlowMolio Studio
export interface Blueprint {
  // SVG markup string
  svg: string;

  // Nodes (contains all node types including UI-specific data)
  nodes: BlueprintNode[];

  // Edges (contains connection information)
  edges: BlueprintEdge[];
}

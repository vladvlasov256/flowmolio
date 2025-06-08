import { Blueprint, ColorRole } from '../../src/types';
import { convertBlueprintToLayout } from '../../src/utils/blueprintToLayout';

describe('convertBlueprintToLayout', () => {
  const mockBlueprint: Blueprint = {
    svg: '<svg width="100" height="100"><text id="title">Hello</text><image id="img" href="test.jpg" /></svg>',
    nodes: [
      {
        id: 'text-node-1',
        type: 'textLayout',
        position: { x: 100, y: 100 },
        data: {
          textElementId: 'title',
          renderingStrategy: {
            width: {
              type: 'natural'
            }
          }
        }
      },
      {
        id: 'image-node-1',
        type: 'imageLayout',
        position: { x: 200, y: 100 },
        data: {
          imageElementId: 'img'
        }
      },
      {
        id: 'color-node-1',
        type: 'colorNode',
        position: { x: 300, y: 100 },
        data: {
          selectedColor: '#ff0000',
          enabledRoles: {
            [ColorRole.FILL]: true,
            [ColorRole.STROKE]: false,
            [ColorRole.STOP_COLOR]: true
          },
          elementIds: ['rect1', 'circle1']
        }
      },
      {
        id: 'data-source-1',
        type: 'dataSource',
        position: { x: 50, y: 50 },
        data: {
          sourceType: 'json'
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'data-source-1',
        target: 'text-node-1',
        sourceHandle: 'title'
      },
      {
        id: 'edge-2',
        source: 'data-source-1',
        target: 'image-node-1',
        sourceHandle: 'imageUrl'
      },
      {
        id: 'edge-3',
        source: 'data-source-1',
        target: 'color-node-1',
        sourceHandle: 'primaryColor'
      }
    ]
  };

  it('should convert blueprint to layout correctly', () => {
    const layout = convertBlueprintToLayout(mockBlueprint);

    expect(layout.svg).toBe(mockBlueprint.svg);
    expect(layout.connections).toEqual([
      {
        sourceNodeId: 'data-source-1',
        sourceField: 'title',
        targetNodeId: 'text-node-1'
      },
      {
        sourceNodeId: 'data-source-1',
        sourceField: 'imageUrl',
        targetNodeId: 'image-node-1'
      },
      {
        sourceNodeId: 'data-source-1',
        sourceField: 'primaryColor',
        targetNodeId: 'color-node-1'
      }
    ]);
    expect(layout.components).toEqual([
      {
        id: 'text-node-1',
        type: 'text',
        elementId: 'title',
        renderingStrategy: {
          width: {
            type: 'natural'
          }
        }
      },
      {
        id: 'image-node-1',
        type: 'image',
        elementId: 'img'
      },
      {
        id: 'color-node-1',
        type: 'color',
        color: '#ff0000',
        enabledRoles: {
          [ColorRole.FILL]: true,
          [ColorRole.STROKE]: false,
          [ColorRole.STOP_COLOR]: true
        },
        elementIds: ['rect1', 'circle1']
      }
    ]);
  });

  it('should filter out non-component nodes', () => {
    const blueprint: Blueprint = {
      svg: '<svg></svg>',
      nodes: [
        {
          id: 'data-source-1',
          type: 'dataSource',
          position: { x: 0, y: 0 },
          data: {}
        },
        {
          id: 'text-node-1',
          type: 'textLayout',
          position: { x: 100, y: 100 },
          data: {
            textElementId: 'title',
            renderingStrategy: {
              width: {
                type: 'natural'
              }
            }
          }
        },
        {
          id: 'unknown-node',
          type: 'unknownType',
          position: { x: 200, y: 200 },
          data: {}
        }
      ],
      edges: []
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.components).toHaveLength(1);
    expect(layout.components[0]).toEqual({
      id: 'text-node-1',
      type: 'text',
      elementId: 'title',
      renderingStrategy: {
        width: {
          type: 'natural'
        }
      }
    });
  });

  it('should handle missing sourceHandle in edges', () => {
    const blueprint: Blueprint = {
      svg: '<svg></svg>',
      nodes: [
        {
          id: 'text-node-1',
          type: 'textLayout',
          position: { x: 100, y: 100 },
          data: {
            textElementId: 'title',
            renderingStrategy: {
              width: {
                type: 'natural'
              }
            }
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'data-source-1',
          target: 'text-node-1'
          // No sourceHandle
        }
      ]
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.connections[0].sourceField).toBe('');
  });

  it('should handle missing color node data gracefully', () => {
    const blueprint: Blueprint = {
      svg: '<svg></svg>',
      nodes: [
        {
          id: 'color-node-1',
          type: 'colorNode',
          position: { x: 100, y: 100 },
          data: {
            // Missing selectedColor and enabledRoles
          }
        }
      ],
      edges: []
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.components[0]).toEqual({
      id: 'color-node-1',
      type: 'color',
      color: '',
      enabledRoles: {
        [ColorRole.FILL]: false,
        [ColorRole.STROKE]: false,
        [ColorRole.STOP_COLOR]: false
      },
      elementIds: undefined
    });
  });

  it('should handle empty blueprint', () => {
    const blueprint: Blueprint = {
      svg: '<svg></svg>',
      nodes: [],
      edges: []
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.svg).toBe('<svg></svg>');
    expect(layout.connections).toEqual([]);
    expect(layout.components).toEqual([]);
  });

  it('should include renderingStrategy in text layout components', () => {
    const blueprint: Blueprint = {
      svg: '<svg><text id="title">Hello</text></svg>',
      nodes: [
        {
          id: 'text-node-1',
          type: 'textLayout',
          position: { x: 100, y: 100 },
          data: {
            textElementId: 'title',
            renderingStrategy: {
              width: {
                type: 'constrained',
                value: 200
              }
            }
          }
        }
      ],
      edges: []
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.components).toHaveLength(1);
    expect(layout.components[0]).toEqual({
      id: 'text-node-1',
      type: 'text',
      elementId: 'title',
      renderingStrategy: {
        width: {
          type: 'constrained',
          value: 200
        }
      }
    });
  });

  it('should handle text layout components with natural rendering strategy', () => {
    const blueprint: Blueprint = {
      svg: '<svg><text id="title">Hello</text></svg>',
      nodes: [
        {
          id: 'text-node-1',
          type: 'textLayout',
          position: { x: 100, y: 100 },
          data: {
            textElementId: 'title',
            renderingStrategy: {
              width: {
                type: 'natural'
              }
            }
          }
        }
      ],
      edges: []
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.components).toHaveLength(1);
    expect(layout.components[0]).toEqual({
      id: 'text-node-1',
      type: 'text',
      elementId: 'title',
      renderingStrategy: {
        width: {
          type: 'natural'
        }
      }
    });
  });

  it('should handle text layout components without renderingStrategy', () => {
    const blueprint: Blueprint = {
      svg: '<svg><text id="title">Hello</text></svg>',
      nodes: [
        {
          id: 'text-node-1',
          type: 'textLayout',
          position: { x: 100, y: 100 },
          data: {
            textElementId: 'title'
            // No renderingStrategy
          }
        }
      ],
      edges: []
    };

    const layout = convertBlueprintToLayout(blueprint);

    expect(layout.components).toHaveLength(1);
    expect(layout.components[0]).toEqual({
      id: 'text-node-1',
      type: 'text',
      elementId: 'title',
      renderingStrategy: undefined
    });
  });
});
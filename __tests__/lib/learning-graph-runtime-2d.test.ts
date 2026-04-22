import {
  buildLearningGraphMindMapVisibility,
  buildLearningGraphMindMapLayout,
  createLearningGraphMindMapCollapsedState,
  expandLearningGraphMindMapPath,
  isLearningGraphMindMapToggleHit,
  resolveLearningGraphPointerCanvasPoint,
  resolveLearningGraph2DLabelVisibility,
  resolveLearningGraph2DNodeText,
  resolveLearningGraph2DNodeVisualState,
  resolveLearningGraph2DViewportAction,
} from '@/lib/learning/graph-runtime-2d';

describe('learning graph runtime 2d helpers', () => {
  it('shows labels for selected-neighborhood nodes', () => {
    expect(
      resolveLearningGraph2DLabelVisibility(
        {
          id: 'concept:limits',
          label: '极限',
          type: 'Concept',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'global',
          nodeDegree: 1,
          selectedNeighborhoodNodeIds: new Set(['concept:limits']),
          selectedNodeId: null,
        }
      )
    ).toBe(true);
  });

  it('shows labels for high-degree global anchor nodes', () => {
    expect(
      resolveLearningGraph2DLabelVisibility(
        {
          id: 'concept:derivative',
          label: '导数',
          type: 'Concept',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'global',
          nodeDegree: 4,
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
        }
      )
    ).toBe(true);
  });

  it('hides most fragment labels when they are not selected or highlighted', () => {
    expect(
      resolveLearningGraph2DLabelVisibility(
        {
          id: 'fragment:1',
          label: '函数极限的定义',
          type: 'Fragment',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'global',
          nodeDegree: 1,
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
        }
      )
    ).toBe(false);
  });

  it('shows stable labels for mind map nodes and keeps hidden fragments unlabeled', () => {
    expect(
      resolveLearningGraph2DLabelVisibility(
        {
          id: 'concept:limits',
          label: '极限',
          type: 'Concept',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'mindmap',
          nodeDegree: 1,
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
        }
      )
    ).toBe(true);

    expect(
      resolveLearningGraph2DLabelVisibility(
        {
          id: 'fragment:1',
          label: '函数极限的定义',
          type: 'Fragment',
        },
        {
          generatedNodeIds: [],
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          mode: 'mindmap',
          nodeDegree: 1,
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
        }
      )
    ).toBe(false);
  });

  it('truncates long mind map labels into short in-box summaries', () => {
    expect(
      resolveLearningGraph2DNodeText(
        {
          id: 'definition:limits',
          label: '函数极限的定义与性质总结',
          summaryLabel: '函数极限的定义与性质总结',
          type: 'Definition',
        },
        'mindmap'
      )
    ).toBe('函数极限的定义与…');

    expect(
      resolveLearningGraph2DNodeText(
        {
          id: 'definition:limits',
          label: '函数极限的定义与性质总结',
          summaryLabel: '函数极限的定义与性质总结',
          type: 'Definition',
        },
        'global'
      )
    ).toBe('函数极限的定义与性质总结');
  });

  it('spreads mind map nodes across stable columns and rows', () => {
    const layout = buildLearningGraphMindMapLayout({
      edges: [
        { source: 'book:1', target: 'asset:1', type: 'MINDMAP_CHILD' },
        { source: 'asset:1', target: 'section:1', type: 'MINDMAP_CHILD' },
        { source: 'section:1', target: 'concept:1', type: 'MINDMAP_CHILD' },
        { source: 'section:1', target: 'concept:2', type: 'MINDMAP_CHILD' },
      ],
      nodes: [
        { id: 'book:1', label: 'test.pdf', type: 'Book' },
        { id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        { id: 'section:1', label: '第一章 极限', type: 'Section' },
        { id: 'concept:1', label: '极限', type: 'Concept' },
        { id: 'concept:2', label: '导数', type: 'Concept' },
      ],
    });

    expect(layout['book:1']).toMatchObject({ x: 0, y: 0 });
    expect(layout['asset:1']?.x).toBeGreaterThan(layout['book:1']?.x ?? 0);
    expect(layout['section:1']?.x).toBeGreaterThan(layout['asset:1']?.x ?? 0);
    expect(layout['concept:1']?.x).toBe(layout['concept:2']?.x);
    expect(Math.abs((layout['concept:2']?.y ?? 0) - (layout['concept:1']?.y ?? 0))).toBeGreaterThanOrEqual(96);
  });

  it('collapses deeper mind map branches by default to reduce density', () => {
    const graph = {
      edges: [
        { source: 'book:1', target: 'asset:1', type: 'MINDMAP_CHILD' },
        { source: 'asset:1', target: 'section:1', type: 'MINDMAP_CHILD' },
        { source: 'section:1', target: 'concept:1', type: 'MINDMAP_CHILD' },
        { source: 'concept:1', target: 'definition:1', type: 'MINDMAP_CHILD' },
      ],
      nodes: [
        { id: 'book:1', label: 'test.pdf', type: 'Book' },
        { id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        { id: 'section:1', label: '第一章 极限', type: 'Section' },
        { id: 'concept:1', label: '极限', type: 'Concept' },
        { id: 'definition:1', label: '函数极限', type: 'Definition' },
      ],
    };

    const collapsedState = createLearningGraphMindMapCollapsedState(graph);
    const visible = buildLearningGraphMindMapVisibility(graph, collapsedState);

    expect(collapsedState['book:1']).toBe(false);
    expect(collapsedState['asset:1']).toBe(false);
    expect(collapsedState['section:1']).toBe(true);
    expect(visible.nodes.map((node) => node.id)).toEqual(['book:1', 'asset:1', 'section:1']);
    expect(visible.edges).toEqual([
      { source: 'book:1', target: 'asset:1', type: 'MINDMAP_CHILD' },
      { source: 'asset:1', target: 'section:1', type: 'MINDMAP_CHILD' },
    ]);
  });

  it('reveals child branches after expanding a collapsed node', () => {
    const graph = {
      edges: [
        { source: 'book:1', target: 'asset:1', type: 'MINDMAP_CHILD' },
        { source: 'asset:1', target: 'section:1', type: 'MINDMAP_CHILD' },
        { source: 'section:1', target: 'concept:1', type: 'MINDMAP_CHILD' },
      ],
      nodes: [
        { id: 'book:1', label: 'test.pdf', type: 'Book' },
        { id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        { id: 'section:1', label: '第一章 极限', type: 'Section' },
        { id: 'concept:1', label: '极限', type: 'Concept' },
      ],
    };

    const collapsedState = createLearningGraphMindMapCollapsedState(graph);
    const visible = buildLearningGraphMindMapVisibility(graph, {
      ...collapsedState,
      'section:1': false,
    });

    expect(visible.nodes.map((node) => node.id)).toEqual([
      'book:1',
      'asset:1',
      'section:1',
      'concept:1',
    ]);
  });

  it('expands the ancestor chain for a selected hidden node', () => {
    const graph = {
      edges: [
        { source: 'book:1', target: 'asset:1', type: 'MINDMAP_CHILD' },
        { source: 'asset:1', target: 'section:1', type: 'MINDMAP_CHILD' },
        { source: 'section:1', target: 'concept:1', type: 'MINDMAP_CHILD' },
        { source: 'concept:1', target: 'definition:1', type: 'MINDMAP_CHILD' },
      ],
      nodes: [
        { id: 'book:1', label: 'test.pdf', type: 'Book' },
        { id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        { id: 'section:1', label: '第一章 极限', type: 'Section' },
        { id: 'concept:1', label: '极限', type: 'Concept' },
        { id: 'definition:1', label: '函数极限', type: 'Definition' },
      ],
    };

    const collapsedState = createLearningGraphMindMapCollapsedState(graph);
    const expandedState = expandLearningGraphMindMapPath(
      graph,
      collapsedState,
      'definition:1'
    );
    const visible = buildLearningGraphMindMapVisibility(graph, expandedState);

    expect(expandedState['section:1']).toBe(false);
    expect(expandedState['concept:1']).toBe(false);
    expect(visible.nodes.map((node) => node.id)).toEqual([
      'book:1',
      'asset:1',
      'section:1',
      'concept:1',
      'definition:1',
    ]);
  });

  it('detects toggle badge hits separately from the node body', () => {
    expect(
      isLearningGraphMindMapToggleHit({
        boxWidth: 120,
        graphPoint: { x: 74, y: 0 },
        nodeCenter: { x: 0, y: 0 },
      })
    ).toBe(true);

    expect(
      isLearningGraphMindMapToggleHit({
        boxWidth: 120,
        graphPoint: { x: 0, y: 0 },
        nodeCenter: { x: 0, y: 0 },
      })
    ).toBe(false);
  });

  it('derives canvas-relative click coordinates from touch-style client positions', () => {
    expect(
      resolveLearningGraphPointerCanvasPoint({
        clientX: 214,
        clientY: 180,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 120,
            top: 180,
          }),
        },
      })
    ).toEqual({
      x: 94,
      y: 0,
    });
  });

  it('marks generated explore nodes with explore emphasis', () => {
    expect(
      resolveLearningGraph2DNodeVisualState(
        {
          id: 'explore:concept:无穷小',
          label: '无穷小',
          type: 'Concept',
        },
        {
          generatedNodeIds: ['explore:concept:无穷小'],
          guideStatusByNodeId: {},
          highlightedNodeIds: ['explore:concept:无穷小'],
          mode: 'explore',
          selectedNeighborhoodNodeIds: null,
          selectedNodeId: null,
          theme: {
            background: '#fff',
            borderSoft: '#ddd',
            edge: '#999',
            explore: '#f90',
            fragment: '#aaa',
            primary: '#333',
            source: '#090',
            step: '#cc0',
            success: '#060',
            surface: '#fff',
            text: '#111',
            textSoft: '#666',
            warning: '#cc0',
          },
        }
      )
    ).toEqual(
      expect.objectContaining({
        color: '#f90',
        emphasis: 'generated',
        opacity: 0.98,
      })
    );
  });

  it('keeps focusNode and clearSelection from recentering the 2d viewport', () => {
    expect(resolveLearningGraph2DViewportAction('hydrate')).toBe('fit');
    expect(resolveLearningGraph2DViewportAction('focusNode')).toBe('preserve');
    expect(resolveLearningGraph2DViewportAction('clearSelection')).toBe('preserve');
  });
});

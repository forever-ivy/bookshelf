import {
  buildLearningGraphViewModel,
  getLearningGraphSelection,
  type LearningGraph,
} from '@/lib/learning/graph';

describe('learning graph adapter', () => {
  const graph: LearningGraph = {
    edges: [
      { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
      { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
      { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
      { source: 'fragment:1', target: 'step:0', type: 'EVIDENCE_FOR' },
      { source: 'step:0', target: 'book:profile', type: 'TEACHES' },
      { source: 'step:0', target: 'concept:limits', type: 'TESTS' },
      { source: 'concept:limits', target: 'ghost:1', type: 'MENTIONS' },
    ],
    nodes: [
      { id: 'book:profile', label: '微积分期中复习', type: 'Book' },
      { assetKind: 'upload', fileName: 'test.pdf', id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
      {
        assetId: 1,
        chapterLabel: 'Section 2',
        chunkIndex: 1,
        fragmentId: 1001,
        id: 'fragment:1',
        label: '函数极限的定义和性质',
        semanticSummary: '函数极限的定义和性质',
        type: 'Fragment',
      },
      { concept: '极限', id: 'concept:limits', label: '极限', type: 'Concept' },
      {
        guidingQuestion: '极限最先该怎么理解？',
        id: 'step:0',
        keywords: ['极限'],
        label: '建立整体认知',
        objective: '先搭整体框架',
        stepIndex: 0,
        title: '建立整体认知',
        type: 'LessonStep',
      },
    ],
    provider: 'fallback',
  };

  it('drops dangling edges while preserving original nodes', () => {
    const viewModel = buildLearningGraphViewModel(graph);

    expect(viewModel.graph.nodes).toHaveLength(5);
    expect(viewModel.graph.edges).toHaveLength(6);
    expect(viewModel.graph.edges.some((edge) => edge.target === 'ghost:1')).toBe(false);
  });

  it('builds adjacency and related fragment indexes for each node', () => {
    const viewModel = buildLearningGraphViewModel(graph);

    expect(viewModel.linkedNodeIdsByNodeId['concept:limits']).toEqual(
      expect.arrayContaining(['fragment:1', 'step:0'])
    );
    expect(viewModel.relatedFragmentsByNodeId['concept:limits'].map((node) => node.id)).toEqual([
      'fragment:1',
    ]);
    expect(viewModel.relatedAssetsByNodeId['fragment:1'].map((node) => node.id)).toEqual(['asset:1']);
    expect(viewModel.relatedStepsByNodeId['fragment:1'].map((node) => node.id)).toEqual(['step:0']);
  });

  it('derives selection details and related fragment ordering by chunk index', () => {
    const viewModel = buildLearningGraphViewModel({
      ...graph,
      edges: [
        ...graph.edges.filter((edge) => edge.target !== 'ghost:1'),
        { source: 'fragment:2', target: 'concept:limits', type: 'MENTIONS' },
      ],
      nodes: [
        ...graph.nodes,
        {
          assetId: 1,
          chapterLabel: 'Section 3',
          chunkIndex: 0,
          fragmentId: 1002,
          id: 'fragment:2',
          label: '极限计算题型',
          semanticSummary: '极限计算题型',
          type: 'Fragment',
        },
      ],
    });

    const selection = getLearningGraphSelection(viewModel, 'concept:limits');

    expect(selection?.title).toBe('极限');
    expect(selection?.metadata).toEqual(expect.arrayContaining(['关联节点 3 个']));
    expect(selection?.relatedFragments.map((fragment) => fragment.id)).toEqual([
      'fragment:2',
      'fragment:1',
    ]);
  });
});

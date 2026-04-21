import {
  buildLearningDocumentGraphViewModel,
  buildLearningExploreGraphLens,
  buildLearningGlobalGraphLens,
  buildLearningGraphSelectionPresentation,
  buildLearningGuideGraphLens,
  buildLearningGraphViewModel,
  getLearningGraphSelection,
  resolveLearningExploreGraphFocus,
  type LearningGraph,
} from '@/lib/learning/graph';

describe('learning graph adapter', () => {
  const graph: LearningGraph = {
    edges: [
      { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
      { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
      { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
      { source: 'fragment:1', target: 'step:0', type: 'EVIDENCE_FOR' },
      { source: 'fragment:2', target: 'asset:1', type: 'DERIVED_FROM' },
      { source: 'fragment:2', target: 'concept:derivative', type: 'MENTIONS' },
      { source: 'fragment:2', target: 'step:1', type: 'EVIDENCE_FOR' },
      { source: 'step:0', target: 'book:profile', type: 'TEACHES' },
      { source: 'step:0', target: 'concept:limits', type: 'TESTS' },
      { source: 'step:1', target: 'book:profile', type: 'TEACHES' },
      { source: 'step:1', target: 'concept:derivative', type: 'TESTS' },
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
      {
        assetId: 1,
        chapterLabel: 'Section 3',
        chunkIndex: 2,
        fragmentId: 1002,
        id: 'fragment:2',
        label: '导数的定义',
        semanticSummary: '导数的定义',
        type: 'Fragment',
      },
      { concept: '极限', id: 'concept:limits', label: '极限', type: 'Concept' },
      { concept: '导数', id: 'concept:derivative', label: '导数', type: 'Concept' },
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
      {
        guidingQuestion: '导数和极限怎么接上？',
        id: 'step:1',
        keywords: ['导数'],
        label: '连接导数概念',
        objective: '把导数接回整体图谱',
        stepIndex: 1,
        title: '连接导数概念',
        type: 'LessonStep',
      },
    ],
    provider: 'fallback',
  };

  it('drops dangling edges while preserving original nodes', () => {
    const viewModel = buildLearningGraphViewModel(graph);

    expect(viewModel.graph.nodes).toHaveLength(8);
    expect(viewModel.graph.edges).toHaveLength(11);
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

  it('builds a document view model without lesson step nodes', () => {
    const viewModel = buildLearningDocumentGraphViewModel(graph);

    expect(viewModel.graph.nodes.map((node) => node.id)).toEqual([
      'book:profile',
      'asset:1',
      'fragment:1',
      'fragment:2',
      'concept:limits',
      'concept:derivative',
    ]);
    expect(viewModel.graph.edges).toEqual([
      { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
      { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
      { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
      { source: 'fragment:2', target: 'asset:1', type: 'DERIVED_FROM' },
      { source: 'fragment:2', target: 'concept:derivative', type: 'MENTIONS' },
    ]);
  });

  it('keeps the whole document graph in the global lens', () => {
    const viewModel = buildLearningDocumentGraphViewModel(graph);
    const lens = buildLearningGlobalGraphLens(viewModel);

    expect(lens.graph.nodes).toHaveLength(6);
    expect(lens.graph.edges).toHaveLength(5);
    expect(lens.generatedNodeIds).toEqual([]);
    expect(lens.highlightedNodeIds).toEqual([]);
  });

  it('derives selection details and related fragment ordering by chunk index', () => {
    const viewModel = buildLearningGraphViewModel({
      ...graph,
      edges: [
        ...graph.edges.filter((edge) => edge.target !== 'ghost:1'),
        { source: 'fragment:3', target: 'concept:limits', type: 'MENTIONS' },
      ],
      nodes: [
        ...graph.nodes,
        {
          assetId: 1,
          chapterLabel: 'Section 3',
          chunkIndex: 0,
          fragmentId: 1002,
          id: 'fragment:3',
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
      'fragment:3',
      'fragment:1',
    ]);
  });

  it('uses safe fragment labels and descriptions when source math is truncated', () => {
    const rawFragmentText =
      '4: Stolz定理 $$ \\text { 极限 } \\lim _{x \\rightarrow + \\infty } \\frac {1+ \\fra';
    const viewModel = buildLearningGraphViewModel({
      edges: [{ source: 'fragment:stolz', target: 'concept:limits', type: 'MENTIONS' }],
      nodes: [
        {
          assetId: 1,
          chapterLabel: 'Section 5',
          chunkIndex: 4,
          fragmentId: 1005,
          id: 'fragment:stolz',
          label: rawFragmentText,
          semanticSummary: rawFragmentText,
          type: 'Fragment',
        },
        { concept: '极限', id: 'concept:limits', label: '极限', type: 'Concept' },
      ],
      provider: 'fallback',
    });

    const selection = getLearningGraphSelection(viewModel, 'fragment:stolz');
    const runtimeFragment = viewModel.graph.nodes.find((node) => node.id === 'fragment:stolz');

    expect(runtimeFragment?.label).toBe('Section 5');
    expect(runtimeFragment?.label).not.toContain('$$');
    expect(runtimeFragment?.label).not.toContain('\\lim');
    expect(selection?.title).toBe('Section 5');
    expect(selection?.description).toContain('Stolz定理');
    expect(selection?.description).not.toContain('$$');
    expect(selection?.description).not.toContain('\\lim');
    expect(selection?.description).not.toContain('\\frac');
  });

  it('derives the latest explore focus from rendered messages', () => {
    const focus = resolveLearningExploreGraphFocus([
      {
        cards: [],
        id: 'message-guide-1',
        presentation: null,
        role: 'assistant',
        streaming: false,
        text: '这是一条旧消息',
      },
      {
        cards: [],
        id: 'message-user-1',
        presentation: null,
        role: 'user',
        streaming: false,
        text: '极限和导数有什么关系？',
      },
      {
        cards: [],
        id: 'message-explore-1',
        presentation: {
          answer: {
            content: '导数以极限为定义基础。',
          },
          bridgeActions: [],
          evidence: [
            {
              excerpt: '导数的定义依赖函数增量比的极限。',
              fragmentId: 1001,
              sourceTitle: '微积分期中复习',
            },
          ],
          followups: [],
          kind: 'explore',
          relatedConcepts: ['极限'],
        },
        role: 'assistant',
        streaming: false,
        text: '导数以极限为定义基础。',
      },
    ]);

    expect(focus).toMatchObject({
      question: '极限和导数有什么关系？',
      relatedConcepts: ['极限'],
    });
    expect(focus?.evidence[0]).toMatchObject({
      fragmentId: 1001,
    });
  });

  it('keeps the whole document graph and appends explore-generated nodes', () => {
    const viewModel = buildLearningDocumentGraphViewModel(graph);

    const lens = buildLearningExploreGraphLens(viewModel, {
      evidence: [
        {
          excerpt: '导数的定义依赖函数增量比的极限。',
          fragmentId: 1001,
          sourceTitle: '微积分期中复习',
        },
      ],
      question: '极限和无穷小有什么关系？',
      relatedConcepts: ['极限', '无穷小'],
    });

    expect(lens.graph.nodes.map((node) => node.id)).toEqual([
      'book:profile',
      'asset:1',
      'fragment:1',
      'fragment:2',
      'concept:limits',
      'concept:derivative',
      'explore:concept:无穷小',
    ]);
    expect(lens.graph.edges).toEqual(
      expect.arrayContaining([
        { source: 'explore:concept:无穷小', target: 'book:profile', type: 'EXPLORE_EXTENDS' },
      ])
    );
    expect(lens.generatedNodeIds).toEqual(['explore:concept:无穷小']);
    expect(lens.highlightedNodeIds).toEqual(
      expect.arrayContaining(['fragment:1', 'concept:limits', 'explore:concept:无穷小'])
    );
  });

  it('derives guide progress states from hidden lesson steps', () => {
    const documentViewModel = buildLearningDocumentGraphViewModel(graph);
    const fullViewModel = buildLearningGraphViewModel(graph);
    const lens = buildLearningGuideGraphLens(documentViewModel, fullViewModel, {
      completedSteps: [
        {
          completedAt: '2026-04-19T10:00:00Z',
          confidence: 0.82,
          stepIndex: 0,
        },
      ],
      currentStepIndex: 1,
    });

    expect(lens.guideStatusByNodeId['concept:limits']).toBe('completed');
    expect(lens.guideStatusByNodeId['fragment:1']).toBe('completed');
    expect(lens.guideStatusByNodeId['concept:derivative']).toBe('current');
    expect(lens.guideStatusByNodeId['fragment:2']).toBe('current');
  });

  it('surfaces semantic node labels, confidence, and provenance metadata', () => {
    const semanticGraph = buildLearningGraphViewModel({
      edges: [
        { source: 'asset:1', target: 'section:1:limits', type: 'CONTAINS' },
        { source: 'section:1:limits', target: 'fragment:1', type: 'CONTAINS' },
        { source: 'fragment:1', target: 'definition:limits', type: 'EVIDENCE_FOR' },
        { source: 'definition:limits', target: 'concept:limits', type: 'DEFINES' },
        { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
      ],
      nodes: [
        { id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        {
          confidence: 0.92,
          extractor: 'structured-graph-v2',
          id: 'section:1:limits',
          label: '第一章 极限',
          provenance: { assetId: 1, sectionId: 'section:1:limits' },
          type: 'Section',
        },
        {
          assetId: 1,
          chapterLabel: '第一章 极限',
          chunkIndex: 0,
          fragmentId: 1001,
          id: 'fragment:1',
          label: '函数极限的定义',
          provenance: {
            assetId: 1,
            fragmentId: 1001,
            sectionId: 'section:1:limits',
          },
          semanticSummary: '函数极限的定义',
          type: 'Fragment',
        },
        {
          confidence: 0.92,
          extractor: 'structured-graph-v2',
          id: 'definition:limits',
          label: '函数极限的定义',
          provenance: {
            assetId: 1,
            fragmentId: 1001,
            sectionId: 'section:1:limits',
          },
          type: 'Definition',
        },
        { concept: '极限', id: 'concept:limits', label: '极限', type: 'Concept' },
      ],
      provider: 'neo4j',
    });

    const selection = getLearningGraphSelection(semanticGraph, 'definition:limits');

    expect(selection?.typeLabel).toBe('定义');
    expect(selection?.metadata).toEqual(
      expect.arrayContaining([
        '置信度 92%',
        '抽取器 structured-graph-v2',
        '证据片段 #1001',
      ])
    );

    const presentation = buildLearningGraphSelectionPresentation(
      'global',
      selection!,
      buildLearningGlobalGraphLens(semanticGraph)
    );

    expect(presentation.sections[0]).toEqual(
      expect.objectContaining({
        title: '图谱位置',
      })
    );
  });
});

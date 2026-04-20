import type {
  LearningCompletedStep,
  LearningCitation,
  LearningExplorePresentation,
  LearningGraph,
  LearningGraphEdge,
  LearningGraphNode,
} from '@/lib/api/types';
import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

type LearningGraphNodeBuckets = {
  asset: LearningGraphNode[];
  fragment: LearningGraphNode[];
  step: LearningGraphNode[];
};

export type LearningGraphViewModel = {
  edgeKeysByNodeId: Record<string, string[]>;
  graph: LearningGraph;
  linkedNodeIdsByNodeId: Record<string, string[]>;
  nodeById: Record<string, LearningGraphNode>;
  relatedAssetsByNodeId: Record<string, LearningGraphNode[]>;
  relatedFragmentsByNodeId: Record<string, LearningGraphNode[]>;
  relatedStepsByNodeId: Record<string, LearningGraphNode[]>;
};

export type LearningGraphSelection = {
  description: string | null;
  metadata: string[];
  neighborCount: number;
  node: LearningGraphNode;
  relatedAssets: LearningGraphNode[];
  relatedFragments: LearningGraphNode[];
  relatedSteps: LearningGraphNode[];
  title: string;
  typeLabel: string;
};

export type LearningExploreGraphFocus = {
  evidence: LearningCitation[];
  question: string | null;
  relatedConcepts: string[];
};

export type LearningGraphMode = 'explore' | 'global' | 'guide';

export type LearningGuideNodeStatus = 'completed' | 'current' | 'pending';

export type LearningGuideProgressSnapshot = {
  completedSteps: LearningCompletedStep[];
  currentStepIndex: number | null;
};

export type LearningGraphLens = LearningExploreGraphFocus & {
  generatedNodeIds: string[];
  graph: LearningGraph;
  guideStatusByNodeId: Record<string, LearningGuideNodeStatus>;
  highlightedNodeIds: string[];
  mode: LearningGraphMode;
  relatedStepTitlesByNodeId: Record<string, string[]>;
  viewModel: LearningGraphViewModel;
};

export type LearningGraphSelectionPresentation = {
  description: string | null;
  eyebrow: string;
  metadata: string[];
  relatedFragments: LearningGraphNode[];
  sections: Array<{
    lines: string[];
    title: string;
  }>;
  statusLabel: string | null;
  title: string;
  typeLabel: string;
};

function isGraphNodeOfType(node: LearningGraphNode | undefined, type: string) {
  return node?.type === type;
}

function buildEdgeKey(edge: LearningGraphEdge) {
  return `${edge.source}::${edge.target}::${edge.type}`;
}

function normalizeGraphText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeGraphSlug(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]+/gu, '')
    .toLowerCase();
}

function dedupeNodes(nodes: LearningGraphNode[]) {
  const nodeById = new Map<string, LearningGraphNode>();

  for (const node of nodes) {
    if (!node.id || nodeById.has(node.id)) {
      continue;
    }
    nodeById.set(node.id, node);
  }

  return [...nodeById.values()];
}

function rankNodes(nodes: LearningGraphNode[]) {
  return [...nodes].sort((left, right) => {
    const leftChunkIndex =
      typeof left.chunkIndex === 'number' ? left.chunkIndex : Number.MAX_SAFE_INTEGER;
    const rightChunkIndex =
      typeof right.chunkIndex === 'number' ? right.chunkIndex : Number.MAX_SAFE_INTEGER;

    if (leftChunkIndex !== rightChunkIndex) {
      return leftChunkIndex - rightChunkIndex;
    }

    return String(left.label ?? left.id).localeCompare(String(right.label ?? right.id), 'zh-Hans-CN');
  });
}

function collectRelatedBuckets(
  nodeId: string,
  nodeById: Record<string, LearningGraphNode>,
  linkedNodeIdsByNodeId: Record<string, string[]>
): LearningGraphNodeBuckets {
  const buckets: LearningGraphNodeBuckets = {
    asset: [],
    fragment: [],
    step: [],
  };

  const visited = new Map<string, number>([[nodeId, 0]]);
  const queue: Array<{ depth: number; id: string }> = [{ depth: 0, id: nodeId }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.depth >= 2) {
      continue;
    }

    for (const nextId of linkedNodeIdsByNodeId[current.id] ?? []) {
      const nextDepth = current.depth + 1;
      const previousDepth = visited.get(nextId);

      if (previousDepth != null && previousDepth <= nextDepth) {
        continue;
      }
      visited.set(nextId, nextDepth);

      const node = nodeById[nextId];
      if (!node) {
        continue;
      }

      if (node.type === 'Fragment') {
        buckets.fragment.push(node);
      }
      if (node.type === 'SourceAsset') {
        buckets.asset.push(node);
      }
      if (node.type === 'LessonStep') {
        buckets.step.push(node);
      }

      queue.push({ depth: nextDepth, id: nextId });
    }
  }

  return {
    asset: rankNodes(dedupeNodes(buckets.asset)),
    fragment: rankNodes(dedupeNodes(buckets.fragment)),
    step: rankNodes(dedupeNodes(buckets.step)),
  };
}

function buildNodeMetadata(
  node: LearningGraphNode,
  provider: string,
  neighborCount: number
) {
  const metadata: string[] = [];

  if (node.type === 'Fragment') {
    if (typeof node.chapterLabel === 'string' && node.chapterLabel.trim()) {
      metadata.push(node.chapterLabel.trim());
    }
    if (typeof node.chunkIndex === 'number') {
      metadata.push(`片段 ${node.chunkIndex + 1}`);
    }
  }

  if (node.type === 'LessonStep') {
    if (typeof node.objective === 'string' && node.objective.trim()) {
      metadata.push(node.objective.trim());
    }
    if (Array.isArray(node.keywords) && node.keywords.length > 0) {
      metadata.push(`关键词 ${node.keywords.join(' / ')}`);
    }
  }

  if (node.type === 'SourceAsset') {
    if (typeof node.fileName === 'string' && node.fileName.trim()) {
      metadata.push(node.fileName.trim());
    }
    if (typeof node.assetKind === 'string' && node.assetKind.trim()) {
      metadata.push(node.assetKind.trim());
    }
  }

  if (node.type === 'Book') {
    metadata.push(`图谱来源 ${provider}`);
  }

  metadata.push(`关联节点 ${neighborCount} 个`);

  return metadata;
}

function buildNodeDescription(node: LearningGraphNode) {
  if (node.type === 'Fragment') {
    return typeof node.semanticSummary === 'string' ? node.semanticSummary : String(node.label ?? '');
  }

  if (node.type === 'LessonStep') {
    if (typeof node.guidingQuestion === 'string' && node.guidingQuestion.trim()) {
      return node.guidingQuestion.trim();
    }
    return typeof node.objective === 'string' ? node.objective : null;
  }

  return null;
}

function resolveNodeTypeLabel(type: string) {
  switch (type) {
    case 'Book':
      return '资料';
    case 'Concept':
      return '概念';
    case 'Fragment':
      return '来源片段';
    case 'LessonStep':
      return '导学步骤';
    case 'SourceAsset':
      return '来源文件';
    default:
      return type;
  }
}

function filterLearningGraphNodes(
  graph: LearningGraph,
  predicate: (node: LearningGraphNode) => boolean
) {
  const nodes = graph.nodes.filter(predicate);
  const visibleNodeIds = new Set(nodes.map((node) => node.id));

  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    ),
    nodes,
  };
}

function buildExploreConceptNodeId(concept: string) {
  const slug = normalizeGraphSlug(concept);
  return `explore:concept:${slug || concept.trim()}`;
}

function getCitationFragmentId(citation: LearningCitation) {
  const rawValue = (citation as any)?.fragmentId ?? (citation as any)?.fragment_id ?? null;
  return typeof rawValue === 'number' ? rawValue : null;
}

function matchExploreEvidenceNodeIds(
  viewModel: LearningGraphViewModel,
  evidence: LearningCitation[]
) {
  const matchingNodeIds = new Set<string>();

  for (const citation of evidence) {
    const fragmentId = getCitationFragmentId(citation);
    const excerpt = normalizeGraphText(citation.excerpt);
    const sourceTitle = normalizeGraphText(citation.sourceTitle);

    for (const node of viewModel.graph.nodes) {
      if (node.type === 'Fragment') {
        if (fragmentId != null && node.fragmentId === fragmentId) {
          matchingNodeIds.add(node.id);
          continue;
        }

        const semanticSummary = normalizeGraphText(node.semanticSummary);
        if (excerpt && semanticSummary && (excerpt.includes(semanticSummary) || semanticSummary.includes(excerpt))) {
          matchingNodeIds.add(node.id);
        }
      }

      if (node.type === 'SourceAsset') {
        const fileName = normalizeGraphText(node.fileName ?? node.label);
        if (sourceTitle && fileName && sourceTitle === fileName) {
          matchingNodeIds.add(node.id);
        }
      }
    }
  }

  return [...matchingNodeIds];
}

function matchExploreConceptNodeIds(
  viewModel: LearningGraphViewModel,
  relatedConcepts: string[]
) {
  const normalizedConcepts = new Set(
    relatedConcepts.map((concept) => normalizeGraphText(concept)).filter(Boolean)
  );

  return viewModel.graph.nodes
    .filter((node) => {
      if (node.type !== 'Concept') {
        return false;
      }

      return normalizedConcepts.has(normalizeGraphText(node.concept ?? node.label));
    })
    .map((node) => node.id);
}

function buildSubgraphFromNodeIds(
  graph: LearningGraph,
  includedNodeIds: Set<string>
) {
  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => includedNodeIds.has(edge.source) && includedNodeIds.has(edge.target)
    ),
    nodes: graph.nodes.filter((node) => includedNodeIds.has(node.id)),
  };
}

function getNodeStepIndex(node: LearningGraphNode | undefined) {
  const value = (node as any)?.stepIndex ?? (node as any)?.index ?? null;
  return typeof value === 'number' ? value : null;
}

function buildRelatedStepTitlesByNodeId(
  documentViewModel: LearningGraphViewModel,
  fullViewModel?: LearningGraphViewModel | null
) {
  const sourceViewModel = fullViewModel ?? documentViewModel;
  const titlesByNodeId: Record<string, string[]> = {};

  for (const node of documentViewModel.graph.nodes) {
    const titles = (sourceViewModel.relatedStepsByNodeId[node.id] ?? [])
      .map((stepNode) => String(stepNode.title ?? stepNode.label ?? '').trim())
      .filter(Boolean);
    titlesByNodeId[node.id] = [...new Set(titles)];
  }

  return titlesByNodeId;
}

function buildEmptyGuideStatusByNodeId(viewModel: LearningGraphViewModel) {
  const statusByNodeId: Record<string, LearningGuideNodeStatus> = {};

  for (const node of viewModel.graph.nodes) {
    if (node.type === 'Book') {
      continue;
    }
    statusByNodeId[node.id] = 'pending';
  }

  return statusByNodeId;
}

function collectGuideStepNodeIds(stepNodeId: string, fullViewModel: LearningGraphViewModel) {
  const nodeIds = new Set<string>();

  for (const linkedNodeId of fullViewModel.linkedNodeIdsByNodeId[stepNodeId] ?? []) {
    const linkedNode = fullViewModel.nodeById[linkedNodeId];
    if (!linkedNode || linkedNode.type === 'LessonStep' || linkedNode.type === 'Book') {
      continue;
    }
    nodeIds.add(linkedNodeId);
  }

  for (const fragment of fullViewModel.relatedFragmentsByNodeId[stepNodeId] ?? []) {
    nodeIds.add(fragment.id);
  }

  for (const asset of fullViewModel.relatedAssetsByNodeId[stepNodeId] ?? []) {
    nodeIds.add(asset.id);
  }

  return [...nodeIds];
}

export function buildLearningGraphViewModel(graph: LearningGraph): LearningGraphViewModel {
  const nodes = dedupeNodes(graph.nodes);
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const linkedNodeIds = new Map<string, Set<string>>();
  const edgeKeys = new Map<string, Set<string>>();

  const edges = graph.edges.filter((edge) => nodeById[edge.source] && nodeById[edge.target]);

  for (const node of nodes) {
    linkedNodeIds.set(node.id, new Set());
    edgeKeys.set(node.id, new Set());
  }

  for (const edge of edges) {
    linkedNodeIds.get(edge.source)?.add(edge.target);
    linkedNodeIds.get(edge.target)?.add(edge.source);

    const edgeKey = buildEdgeKey(edge);
    edgeKeys.get(edge.source)?.add(edgeKey);
    edgeKeys.get(edge.target)?.add(edgeKey);
  }

  const linkedNodeIdsByNodeId = Object.fromEntries(
    [...linkedNodeIds.entries()].map(([nodeId, ids]) => [nodeId, [...ids]])
  );
  const edgeKeysByNodeId = Object.fromEntries(
    [...edgeKeys.entries()].map(([nodeId, ids]) => [nodeId, [...ids]])
  );

  const relatedFragmentsByNodeId: Record<string, LearningGraphNode[]> = {};
  const relatedAssetsByNodeId: Record<string, LearningGraphNode[]> = {};
  const relatedStepsByNodeId: Record<string, LearningGraphNode[]> = {};

  for (const node of nodes) {
    if (isGraphNodeOfType(node, 'Fragment')) {
      relatedFragmentsByNodeId[node.id] = [node];
    } else {
      relatedFragmentsByNodeId[node.id] = collectRelatedBuckets(
        node.id,
        nodeById,
        linkedNodeIdsByNodeId
      ).fragment;
    }

    if (isGraphNodeOfType(node, 'SourceAsset')) {
      relatedAssetsByNodeId[node.id] = [node];
    } else {
      relatedAssetsByNodeId[node.id] = collectRelatedBuckets(
        node.id,
        nodeById,
        linkedNodeIdsByNodeId
      ).asset;
    }

    if (isGraphNodeOfType(node, 'LessonStep')) {
      relatedStepsByNodeId[node.id] = [node];
    } else {
      relatedStepsByNodeId[node.id] = collectRelatedBuckets(
        node.id,
        nodeById,
        linkedNodeIdsByNodeId
      ).step;
    }
  }

  return {
    edgeKeysByNodeId,
    graph: {
      ...graph,
      edges,
      nodes,
    },
    linkedNodeIdsByNodeId,
    nodeById,
    relatedAssetsByNodeId,
    relatedFragmentsByNodeId,
    relatedStepsByNodeId,
  };
}

export function buildLearningDocumentGraphViewModel(graph: LearningGraph) {
  return buildLearningGraphViewModel(
    filterLearningGraphNodes(graph, (node) => node.type !== 'LessonStep')
  );
}

export const buildLearningExploreGraphViewModel = buildLearningDocumentGraphViewModel;

export function resolveLearningExploreGraphFocus(
  messages: LearningWorkspaceRenderedMessage[] = []
): LearningExploreGraphFocus | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const presentation = message.presentation as LearningExplorePresentation | null | undefined;

    if (message.role !== 'assistant' || presentation?.kind !== 'explore') {
      continue;
    }

    const question =
      [...messages.slice(0, index)]
        .reverse()
        .find((item) => item.role === 'user' && item.text.trim())?.text.trim() ?? null;

    return {
      evidence: presentation.evidence ?? [],
      question,
      relatedConcepts: (presentation.relatedConcepts ?? []).filter(Boolean),
    };
  }

  return null;
}

export function buildLearningGlobalGraphLens(
  viewModel: LearningGraphViewModel
): LearningGraphLens {
  return {
    evidence: [],
    generatedNodeIds: [],
    graph: viewModel.graph,
    guideStatusByNodeId: {},
    highlightedNodeIds: [],
    mode: 'global',
    question: null,
    relatedConcepts: [],
    relatedStepTitlesByNodeId: buildRelatedStepTitlesByNodeId(viewModel),
    viewModel,
  };
}

export function buildLearningExploreGraphLens(
  viewModel: LearningGraphViewModel,
  focus: LearningExploreGraphFocus | null
): LearningGraphLens {
  const evidence = focus?.evidence ?? [];
  const question = focus?.question ?? null;
  const relatedConcepts = focus?.relatedConcepts ?? [];
  const matchedEvidenceNodeIds = matchExploreEvidenceNodeIds(viewModel, evidence);
  const matchedConceptNodeIds = matchExploreConceptNodeIds(viewModel, relatedConcepts);
  const matchedConceptNames = new Set(
    matchedConceptNodeIds.map((nodeId) =>
      normalizeGraphText(viewModel.nodeById[nodeId]?.concept ?? viewModel.nodeById[nodeId]?.label)
    )
  );
  const unmatchedConcepts = relatedConcepts.filter(
    (concept) => !matchedConceptNames.has(normalizeGraphText(concept))
  );

  const bookAnchorNodeId =
    viewModel.graph.nodes.find((node) => node.type === 'Book')?.id ?? viewModel.graph.nodes[0]?.id ?? null;

  const generatedNodes = unmatchedConcepts.map<LearningGraphNode>((concept) => ({
    description: '来自最近一轮 Explore 发散出的概念',
    id: buildExploreConceptNodeId(concept),
    isExploreGenerated: true,
    label: concept,
    type: 'Concept',
  }));
  const generatedEdges = bookAnchorNodeId
    ? generatedNodes.map<LearningGraphEdge>((node) => ({
        source: node.id,
        target: bookAnchorNodeId,
        type: 'EXPLORE_EXTENDS',
      }))
    : [];
  const graph = {
    ...viewModel.graph,
    edges: [...viewModel.graph.edges, ...generatedEdges],
    nodes: [...viewModel.graph.nodes, ...generatedNodes],
  };
  const lensViewModel = buildLearningGraphViewModel(graph);
  const generatedNodeIds = generatedNodes.map((node) => node.id);
  const highlightedNodeIds = [
    ...matchedEvidenceNodeIds,
    ...matchedConceptNodeIds,
    ...generatedNodeIds,
  ];

  return {
    evidence,
    generatedNodeIds,
    graph,
    guideStatusByNodeId: {},
    highlightedNodeIds: [...new Set(highlightedNodeIds)],
    mode: 'explore',
    question,
    relatedConcepts,
    relatedStepTitlesByNodeId: buildRelatedStepTitlesByNodeId(lensViewModel),
    viewModel: lensViewModel,
  };
}

export function buildLearningGuideGraphLens(
  documentViewModel: LearningGraphViewModel,
  fullViewModel: LearningGraphViewModel,
  progress: LearningGuideProgressSnapshot | null | undefined
): LearningGraphLens {
  const guideStatusByNodeId = buildEmptyGuideStatusByNodeId(documentViewModel);
  const completedStepIndexes = new Set((progress?.completedSteps ?? []).map((step) => step.stepIndex));

  for (const stepNode of fullViewModel.graph.nodes) {
    if (stepNode.type !== 'LessonStep') {
      continue;
    }

    const stepIndex = getNodeStepIndex(stepNode);
    if (stepIndex == null) {
      continue;
    }

    const status: LearningGuideNodeStatus | null = completedStepIndexes.has(stepIndex)
      ? 'completed'
      : progress?.currentStepIndex === stepIndex
        ? 'current'
        : null;

    if (!status) {
      continue;
    }

    for (const nodeId of collectGuideStepNodeIds(stepNode.id, fullViewModel)) {
      if (!documentViewModel.nodeById[nodeId]) {
        continue;
      }

      const previousStatus = guideStatusByNodeId[nodeId];
      if (previousStatus === 'completed') {
        continue;
      }

      guideStatusByNodeId[nodeId] = status;
    }
  }

  return {
    evidence: [],
    generatedNodeIds: [],
    graph: documentViewModel.graph,
    guideStatusByNodeId,
    highlightedNodeIds: Object.entries(guideStatusByNodeId)
      .filter(([, status]) => status === 'completed' || status === 'current')
      .map(([nodeId]) => nodeId),
    mode: 'guide',
    question: null,
    relatedConcepts: [],
    relatedStepTitlesByNodeId: buildRelatedStepTitlesByNodeId(documentViewModel, fullViewModel),
    viewModel: documentViewModel,
  };
}

function resolveGuideStatusLabel(status: LearningGuideNodeStatus) {
  switch (status) {
    case 'completed':
      return '已点亮';
    case 'current':
      return '正在学习';
    case 'pending':
    default:
      return '待学习';
  }
}

export function buildLearningGraphSelectionPresentation(
  mode: LearningGraphMode,
  selection: LearningGraphSelection,
  lens: LearningGraphLens
): LearningGraphSelectionPresentation {
  const relatedFragments = selection.relatedFragments.slice(0, 3);

  if (mode === 'explore') {
    const isGenerated = lens.generatedNodeIds.includes(selection.node.id);
    const relationLines = [
      isGenerated
        ? '来自最近一轮 Explore 发散出的概念'
        : lens.highlightedNodeIds.includes(selection.node.id)
          ? '当前探索直接命中了这个节点'
          : '这个节点位于基础图谱中，但当前探索还没有直接命中它',
    ];

    if (lens.question) {
      relationLines.push(`当前问题：${lens.question}`);
    }

    return {
      description: selection.description,
      eyebrow: 'Explore',
      metadata: selection.metadata,
      relatedFragments,
      sections: [
        {
          lines: relationLines,
          title: '探索关系',
        },
      ],
      statusLabel: isGenerated ? '探索新增' : null,
      title: selection.title.trim(),
      typeLabel: selection.typeLabel,
    };
  }

  if (mode === 'guide') {
    const status = lens.guideStatusByNodeId[selection.node.id] ?? 'pending';
    const stepTitles = lens.relatedStepTitlesByNodeId[selection.node.id] ?? [];

    return {
      description: selection.description,
      eyebrow: 'Guide',
      metadata: selection.metadata,
      relatedFragments,
      sections: [
        {
          lines: [resolveGuideStatusLabel(status)],
          title: '学习状态',
        },
        ...(stepTitles.length > 0
          ? [
              {
                lines: stepTitles.slice(0, 3),
                title: '相关导学',
              },
            ]
          : []),
      ],
      statusLabel: resolveGuideStatusLabel(status),
      title: selection.title.trim(),
      typeLabel: selection.typeLabel,
    };
  }

  return {
    description: selection.description,
    eyebrow: 'Global',
    metadata: selection.metadata,
    relatedFragments,
    sections: [
      {
        lines: [
          `直接连接 ${selection.neighborCount} 个节点`,
          selection.relatedAssets.length > 0
            ? `关联 ${selection.relatedAssets.length} 份来源文件`
            : '这个节点当前没有映射到额外来源文件',
        ],
        title: '图谱位置',
      },
    ],
    statusLabel: null,
    title: selection.title.trim(),
    typeLabel: selection.typeLabel,
  };
}

export function getLearningGraphSelection(
  viewModel: LearningGraphViewModel | null | undefined,
  nodeId: string | null | undefined
): LearningGraphSelection | null {
  if (!viewModel || !nodeId) {
    return null;
  }

  const node = viewModel.nodeById[nodeId];
  if (!node) {
    return null;
  }

  const neighborCount = (viewModel.linkedNodeIdsByNodeId[nodeId] ?? []).length;

  return {
    description: buildNodeDescription(node),
    metadata: buildNodeMetadata(node, viewModel.graph.provider, neighborCount),
    neighborCount,
    node,
    relatedAssets: viewModel.relatedAssetsByNodeId[nodeId] ?? [],
    relatedFragments: viewModel.relatedFragmentsByNodeId[nodeId] ?? [],
    relatedSteps: viewModel.relatedStepsByNodeId[nodeId] ?? [],
    title: String(node.label ?? node.id),
    typeLabel: resolveNodeTypeLabel(node.type),
  };
}

export type { LearningGraph, LearningGraphEdge, LearningGraphNode } from '@/lib/api/types';

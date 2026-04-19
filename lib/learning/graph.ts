import type { LearningGraph, LearningGraphEdge, LearningGraphNode } from '@/lib/api/types';

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

function isGraphNodeOfType(node: LearningGraphNode | undefined, type: string) {
  return node?.type === type;
}

function buildEdgeKey(edge: LearningGraphEdge) {
  return `${edge.source}::${edge.target}::${edge.type}`;
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

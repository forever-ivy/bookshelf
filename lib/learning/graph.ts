import type {
  LearningCompletedStep,
  LearningCitation,
  LearningExplorePresentation,
  LearningGraph,
  LearningGraphEdge,
  LearningGraphNode,
} from '@/lib/api/types';
import {
  learningTextHasMalformedMath,
  sanitizeLearningRichTextForDisplay,
  sanitizeLearningTextForDisplay,
} from '@/lib/learning/text-formatting';
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
  neighborLabels: string[];
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

export type LearningGraphMode = 'explore' | 'global' | 'guide' | 'mindmap';

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

const MINDMAP_EDGE_TYPE = 'MINDMAP_CHILD';
const MINDMAP_VISIBLE_NODE_TYPES = new Set([
  'Book',
  'Claim',
  'Concept',
  'Definition',
  'Formula',
  'Method',
  'Section',
  'SourceAsset',
  'Theorem',
]);
const MINDMAP_SEMANTIC_NODE_TYPES = new Set([
  'Claim',
  'Definition',
  'Formula',
  'Method',
  'Theorem',
]);
const MINDMAP_TYPE_ORDER: Record<string, number> = {
  Book: 0,
  SourceAsset: 1,
  Section: 2,
  Concept: 3,
  Definition: 4,
  Theorem: 5,
  Formula: 6,
  Method: 7,
  Claim: 8,
};
const MINDMAP_CONCEPT_EDGE_TYPES = new Set([
  'ABOUT',
  'DEFINES',
  'DEPENDS_ON',
  'PROVES',
  'SUPPORTS',
  'USES',
]);
const MINDMAP_EVIDENCE_EDGE_TYPES = new Set(['EVIDENCE_FOR', 'MENTIONS']);

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

function sanitizeGraphPreviewText(value: unknown) {
  return sanitizeLearningTextForDisplay(value);
}

function resolveFragmentSelectionTitle(node: LearningGraphNode) {
  const chapterLabel =
    typeof node.chapterLabel === 'string' && node.chapterLabel.trim()
      ? node.chapterLabel.trim()
      : null;
  const chunkLabel =
    typeof node.chunkIndex === 'number' ? `片段 ${node.chunkIndex + 1}` : null;
  const preferredFallback = chapterLabel ?? chunkLabel ?? String(node.id);
  const preferredCandidate = sanitizeGraphPreviewText(node.semanticSummary ?? node.label);

  if (!preferredCandidate) {
    return preferredFallback;
  }

  const looksTooLong = preferredCandidate.length > 48;
  const looksStructured = /[#\n]/.test(String(node.semanticSummary ?? node.label ?? ''));
  const looksMathHeavy = learningTextHasMalformedMath(
    String(node.semanticSummary ?? node.label ?? '')
  );

  if (looksTooLong || looksStructured || looksMathHeavy) {
    return preferredFallback;
  }

  return preferredCandidate;
}

function resolveGraphNodeDisplayLabel(node: LearningGraphNode) {
  if (node.type === 'Fragment') {
    return resolveFragmentSelectionTitle(node);
  }

  return sanitizeLearningTextForDisplay(node.label ?? node.id) || String(node.id);
}

function sanitizeGraphNodeForDisplay(node: LearningGraphNode): LearningGraphNode {
  return {
    ...node,
    label: resolveGraphNodeDisplayLabel(node),
  };
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

function readNodeOrder(node: LearningGraphNode) {
  for (const key of ['sectionOrder', 'sectionIndex', 'order', 'chunkIndex', 'stepIndex']) {
    const value = node[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function rankMindMapNodes(nodes: LearningGraphNode[]) {
  return [...nodes].sort((left, right) => {
    const leftTypeOrder = MINDMAP_TYPE_ORDER[left.type] ?? 99;
    const rightTypeOrder = MINDMAP_TYPE_ORDER[right.type] ?? 99;

    if (leftTypeOrder !== rightTypeOrder) {
      return leftTypeOrder - rightTypeOrder;
    }

    const leftOrder = readNodeOrder(left);
    const rightOrder = readNodeOrder(right);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.label ?? left.id).localeCompare(String(right.label ?? right.id), 'zh-Hans-CN');
  });
}

function isMindMapVisibleNode(node: LearningGraphNode) {
  return MINDMAP_VISIBLE_NODE_TYPES.has(node.type) && node.isExploreGenerated !== true;
}

function isMindMapSemanticNode(node: LearningGraphNode | undefined) {
  return !!node && MINDMAP_SEMANTIC_NODE_TYPES.has(node.type);
}

function getNodeProvenance(node: LearningGraphNode | undefined) {
  return node?.provenance && typeof node.provenance === 'object'
    ? (node.provenance as Record<string, unknown>)
    : null;
}

function edgeTouchesNode(edge: LearningGraphEdge, nodeId: string) {
  return edge.source === nodeId || edge.target === nodeId;
}

function getOtherEdgeNodeId(edge: LearningGraphEdge, nodeId: string) {
  if (edge.source === nodeId) {
    return edge.target;
  }
  if (edge.target === nodeId) {
    return edge.source;
  }
  return null;
}

function collectConnectedNodes(
  viewModel: LearningGraphViewModel,
  nodeId: string,
  options: {
    edgeTypes?: Set<string>;
    nodeType?: string;
    predicate?: (node: LearningGraphNode, edge: LearningGraphEdge) => boolean;
  } = {}
) {
  const nodes: LearningGraphNode[] = [];

  for (const edge of viewModel.graph.edges) {
    if (!edgeTouchesNode(edge, nodeId)) {
      continue;
    }
    if (options.edgeTypes && !options.edgeTypes.has(edge.type)) {
      continue;
    }

    const otherNodeId = getOtherEdgeNodeId(edge, nodeId);
    const otherNode = otherNodeId ? viewModel.nodeById[otherNodeId] : null;
    if (!otherNode) {
      continue;
    }
    if (options.nodeType && otherNode.type !== options.nodeType) {
      continue;
    }
    if (options.predicate && !options.predicate(otherNode, edge)) {
      continue;
    }

    nodes.push(otherNode);
  }

  return rankMindMapNodes(dedupeNodes(nodes));
}

function resolveFragmentSectionId(
  fragment: LearningGraphNode | undefined,
  viewModel: LearningGraphViewModel
) {
  if (!fragment) {
    return null;
  }

  const provenance = getNodeProvenance(fragment);
  const provenanceSectionId =
    typeof provenance?.sectionId === 'string' ? provenance.sectionId.trim() : null;
  if (provenanceSectionId && viewModel.nodeById[provenanceSectionId]?.type === 'Section') {
    return provenanceSectionId;
  }

  return (
    collectConnectedNodes(viewModel, fragment.id, {
      edgeTypes: new Set(['CONTAINS']),
      nodeType: 'Section',
    })[0]?.id ??
    collectConnectedNodes(viewModel, fragment.id, {
      nodeType: 'Section',
    })[0]?.id ??
    null
  );
}

function resolveFragmentAssetId(
  fragment: LearningGraphNode | undefined,
  viewModel: LearningGraphViewModel
) {
  if (!fragment) {
    return null;
  }

  return (
    collectConnectedNodes(viewModel, fragment.id, {
      nodeType: 'SourceAsset',
    })[0]?.id ?? null
  );
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
  const confidence =
    typeof node.confidence === 'number' && Number.isFinite(node.confidence)
      ? Math.round(node.confidence * 100)
      : null;
  const provenance =
    node.provenance && typeof node.provenance === 'object'
      ? (node.provenance as Record<string, unknown>)
      : null;

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

  if (node.type === 'Section') {
    if (typeof node.sectionLevel === 'number') {
      metadata.push(`章节层级 L${node.sectionLevel}`);
    }
  }

  if (node.type === 'Book') {
    metadata.push(`图谱来源 ${provider}`);
  }

  if (confidence != null) {
    metadata.push(`置信度 ${confidence}%`);
  }

  if (typeof node.extractor === 'string' && node.extractor.trim()) {
    metadata.push(`抽取器 ${node.extractor.trim()}`);
  }

  const fragmentId =
    typeof provenance?.fragmentId === 'number'
      ? provenance.fragmentId
      : typeof node.fragmentId === 'number'
        ? node.fragmentId
        : null;
  if (fragmentId != null && node.type !== 'Fragment') {
    metadata.push(`证据片段 #${fragmentId}`);
  }

  if (
    typeof provenance?.sectionId === 'string' &&
    provenance.sectionId.trim() &&
    node.type !== 'Section'
  ) {
    metadata.push(`章节 ${provenance.sectionId.trim()}`);
  }

  metadata.push(`关联节点 ${neighborCount} 个`);

  return metadata;
}

function buildNodeDescription(node: LearningGraphNode) {
  if (typeof node.description === 'string' && node.description.trim()) {
    return sanitizeLearningRichTextForDisplay(node.description);
  }

  if (node.type === 'Fragment') {
    return sanitizeLearningRichTextForDisplay(
      typeof node.semanticSummary === 'string' ? node.semanticSummary : String(node.label ?? '')
    );
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
    case 'Claim':
      return '结论';
    case 'Concept':
      return '概念';
    case 'Definition':
      return '定义';
    case 'Formula':
      return '公式';
    case 'Fragment':
      return '来源片段';
    case 'LessonStep':
      return '导学步骤';
    case 'Method':
      return '方法';
    case 'Section':
      return '章节';
    case 'SourceAsset':
      return '来源文件';
    case 'Theorem':
      return '定理';
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

function collectConceptEvidenceFragments(
  concept: LearningGraphNode,
  viewModel: LearningGraphViewModel
) {
  const fragments = new Map<string, LearningGraphNode>();

  for (const fragment of collectConnectedNodes(viewModel, concept.id, {
    edgeTypes: MINDMAP_EVIDENCE_EDGE_TYPES,
    nodeType: 'Fragment',
  })) {
    fragments.set(fragment.id, fragment);
  }

  for (const semanticNode of collectConnectedNodes(viewModel, concept.id, {
    predicate: (node, edge) =>
      isMindMapSemanticNode(node) &&
      (MINDMAP_CONCEPT_EDGE_TYPES.has(edge.type) || edge.type === 'RELATED_TO'),
  })) {
    for (const fragment of collectConnectedNodes(viewModel, semanticNode.id, {
      edgeTypes: new Set(['EVIDENCE_FOR']),
      nodeType: 'Fragment',
    })) {
      fragments.set(fragment.id, fragment);
    }
  }

  return rankNodes([...fragments.values()]);
}

function collectSemanticEvidenceFragments(
  semanticNode: LearningGraphNode,
  viewModel: LearningGraphViewModel
) {
  return rankNodes(
    collectConnectedNodes(viewModel, semanticNode.id, {
      edgeTypes: new Set(['EVIDENCE_FOR']),
      nodeType: 'Fragment',
    })
  );
}

function resolveMindMapParentFromFragments(
  fragments: LearningGraphNode[],
  viewModel: LearningGraphViewModel,
  fallbackIds: {
    assetId: string | null;
    bookId: string | null;
    sectionId: string | null;
  }
) {
  for (const fragment of fragments) {
    const sectionId = resolveFragmentSectionId(fragment, viewModel);
    if (sectionId) {
      return sectionId;
    }
  }

  for (const fragment of fragments) {
    const assetId = resolveFragmentAssetId(fragment, viewModel);
    if (assetId) {
      return assetId;
    }
  }

  return fallbackIds.sectionId ?? fallbackIds.assetId ?? fallbackIds.bookId;
}

function buildMindMapGraph(sourceViewModel: LearningGraphViewModel): LearningGraph {
  const visibleNodes = rankMindMapNodes(
    sourceViewModel.graph.nodes.filter(isMindMapVisibleNode)
  );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const bookNodes = visibleNodes.filter((node) => node.type === 'Book');
  const assetNodes = visibleNodes.filter((node) => node.type === 'SourceAsset');
  const sectionNodes = visibleNodes.filter((node) => node.type === 'Section');
  const conceptNodes = visibleNodes.filter((node) => node.type === 'Concept');
  const semanticNodes = visibleNodes.filter((node) => isMindMapSemanticNode(node));
  const primaryBookId = bookNodes[0]?.id ?? null;
  const primaryAssetId = assetNodes[0]?.id ?? null;
  const primarySectionId = sectionNodes[0]?.id ?? null;
  const parentByChildId = new Map<string, string>();
  const edges: LearningGraphEdge[] = [];

  function addMindMapEdge(parentId: string | null | undefined, childId: string | null | undefined) {
    if (!parentId || !childId || parentId === childId) {
      return;
    }
    if (!visibleNodeIds.has(parentId) || !visibleNodeIds.has(childId)) {
      return;
    }
    if (parentByChildId.has(childId)) {
      return;
    }

    parentByChildId.set(childId, parentId);
    edges.push({
      source: parentId,
      target: childId,
      type: MINDMAP_EDGE_TYPE,
    });
  }

  for (const asset of assetNodes) {
    const parentBookId =
      collectConnectedNodes(sourceViewModel, asset.id, { nodeType: 'Book' })[0]?.id ??
      primaryBookId;
    addMindMapEdge(parentBookId, asset.id);
  }

  for (const section of sectionNodes) {
    const parentAssetId =
      collectConnectedNodes(sourceViewModel, section.id, {
        edgeTypes: new Set(['CONTAINS']),
        nodeType: 'SourceAsset',
      })[0]?.id ??
      collectConnectedNodes(sourceViewModel, section.id, { nodeType: 'SourceAsset' })[0]?.id ??
      primaryAssetId ??
      primaryBookId;
    addMindMapEdge(parentAssetId, section.id);
  }

  for (const concept of conceptNodes) {
    const parentId = resolveMindMapParentFromFragments(
      collectConceptEvidenceFragments(concept, sourceViewModel),
      sourceViewModel,
      {
        assetId: primaryAssetId,
        bookId: primaryBookId,
        sectionId: primarySectionId,
      }
    );
    addMindMapEdge(parentId, concept.id);
  }

  for (const semanticNode of semanticNodes) {
    const parentConceptId =
      collectConnectedNodes(sourceViewModel, semanticNode.id, {
        nodeType: 'Concept',
        predicate: (_node, edge) =>
          MINDMAP_CONCEPT_EDGE_TYPES.has(edge.type) || edge.type === 'RELATED_TO',
      })[0]?.id ?? null;
    const fallbackParentId = resolveMindMapParentFromFragments(
      collectSemanticEvidenceFragments(semanticNode, sourceViewModel),
      sourceViewModel,
      {
        assetId: primaryAssetId,
        bookId: primaryBookId,
        sectionId: primarySectionId,
      }
    );
    addMindMapEdge(parentConceptId ?? fallbackParentId, semanticNode.id);
  }

  for (const node of visibleNodes) {
    if (node.type === 'Book' || parentByChildId.has(node.id)) {
      continue;
    }

    if (node.type === 'SourceAsset') {
      addMindMapEdge(primaryBookId, node.id);
      continue;
    }
    if (node.type === 'Section') {
      addMindMapEdge(primaryAssetId ?? primaryBookId, node.id);
      continue;
    }
    if (node.type === 'Concept') {
      addMindMapEdge(primarySectionId ?? primaryAssetId ?? primaryBookId, node.id);
      continue;
    }
    addMindMapEdge(conceptNodes[0]?.id ?? primarySectionId ?? primaryAssetId ?? primaryBookId, node.id);
  }

  return {
    ...sourceViewModel.graph,
    edges,
    nodes: visibleNodes,
  };
}

function buildMindMapViewModel(sourceViewModel: LearningGraphViewModel): LearningGraphViewModel {
  const projectedViewModel = buildLearningGraphViewModel(buildMindMapGraph(sourceViewModel));
  const relatedFragmentsByNodeId: Record<string, LearningGraphNode[]> = {};
  const relatedAssetsByNodeId: Record<string, LearningGraphNode[]> = {};
  const relatedStepsByNodeId: Record<string, LearningGraphNode[]> = {};

  for (const node of projectedViewModel.graph.nodes) {
    relatedFragmentsByNodeId[node.id] = sourceViewModel.relatedFragmentsByNodeId[node.id] ?? [];
    relatedAssetsByNodeId[node.id] =
      node.type === 'SourceAsset'
        ? [node]
        : sourceViewModel.relatedAssetsByNodeId[node.id] ?? [];
    relatedStepsByNodeId[node.id] = sourceViewModel.relatedStepsByNodeId[node.id] ?? [];
  }

  return {
    ...projectedViewModel,
    relatedAssetsByNodeId,
    relatedFragmentsByNodeId,
    relatedStepsByNodeId,
  };
}

function collectExploreTraceNodeIds(
  viewModel: LearningGraphViewModel,
  seedNodeIds: string[]
) {
  const highlighted = new Set<string>();

  for (const seedNodeId of seedNodeIds) {
    if (!seedNodeId) {
      continue;
    }
    highlighted.add(seedNodeId);

    for (const linkedNodeId of viewModel.linkedNodeIdsByNodeId[seedNodeId] ?? []) {
      const linkedNode = viewModel.nodeById[linkedNodeId];
      if (!linkedNode || linkedNode.type === 'Book') {
        continue;
      }
      highlighted.add(linkedNodeId);
    }
  }

  return [...highlighted];
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
  const nodes = dedupeNodes(graph.nodes).map(sanitizeGraphNodeForDisplay);
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

export function buildLearningMindMapGraphLens(
  sourceViewModel: LearningGraphViewModel
): LearningGraphLens {
  const viewModel = buildMindMapViewModel(sourceViewModel);

  return {
    evidence: [],
    generatedNodeIds: [],
    graph: viewModel.graph,
    guideStatusByNodeId: {},
    highlightedNodeIds: [],
    mode: 'mindmap',
    question: null,
    relatedConcepts: [],
    relatedStepTitlesByNodeId: buildRelatedStepTitlesByNodeId(viewModel, sourceViewModel),
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
  const highlightedNodeIds = collectExploreTraceNodeIds(lensViewModel, [
    ...matchedEvidenceNodeIds,
    ...matchedConceptNodeIds,
    ...generatedNodeIds,
  ]);

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

  if (mode === 'mindmap') {
    const relatedKnowledgeLines = selection.neighborLabels.slice(0, 5);

    return {
      description: selection.description,
      eyebrow: '思维导图',
      metadata: selection.metadata,
      relatedFragments,
      sections: [
        {
          lines: [
            selection.neighborCount > 0
              ? `连接 ${selection.neighborCount} 个导图节点`
              : '这是当前导图的叶子节点',
            selection.relatedAssets.length > 0
              ? `关联 ${selection.relatedAssets.length} 份来源文件`
              : '暂未映射到来源文件',
          ],
          title: '导图位置',
        },
        ...(relatedKnowledgeLines.length > 0
          ? [
              {
                lines: relatedKnowledgeLines,
                title: '相关知识点',
              },
            ]
          : []),
      ],
      statusLabel: null,
      title: selection.title.trim(),
      typeLabel: selection.typeLabel,
    };
  }

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
  const neighborLabels = rankNodes(
    (viewModel.linkedNodeIdsByNodeId[nodeId] ?? [])
      .map((linkedNodeId) => viewModel.nodeById[linkedNodeId])
      .filter((node): node is LearningGraphNode => !!node)
  )
    .map((node) => String(node.label ?? node.id).trim())
    .filter(Boolean);

  return {
    description: buildNodeDescription(node),
    metadata: buildNodeMetadata(node, viewModel.graph.provider, neighborCount),
    neighborLabels,
    neighborCount,
    node,
    relatedAssets: viewModel.relatedAssetsByNodeId[nodeId] ?? [],
    relatedFragments: viewModel.relatedFragmentsByNodeId[nodeId] ?? [],
    relatedSteps: viewModel.relatedStepsByNodeId[nodeId] ?? [],
    title:
      node.type === 'Fragment'
        ? resolveFragmentSelectionTitle(node)
        : String(node.label ?? node.id),
    typeLabel: resolveNodeTypeLabel(node.type),
  };
}

export type { LearningGraph, LearningGraphEdge, LearningGraphNode } from '@/lib/api/types';

import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeTheme,
} from '@/lib/learning/graph-bridge';

type RuntimeNodeLike = {
  id: string;
  label: string;
  summaryLabel?: string;
  type: string;
};

type MindMapGraphInput = {
  edges: Array<{ source: string; target: string; type: string }>;
  nodes: RuntimeNodeLike[];
};

const MINDMAP_COLUMN_GAP = 228;
const MINDMAP_ROW_GAP = 108;

function collectMindMapChildren(graph: MindMapGraphInput) {
  const childrenById: Record<string, string[]> = Object.fromEntries(
    graph.nodes.map((node) => [node.id, [] as string[]])
  );

  for (const edge of graph.edges) {
    if (
      edge.type !== 'MINDMAP_CHILD' ||
      !childrenById[edge.source] ||
      !childrenById[edge.target]
    ) {
      continue;
    }
    childrenById[edge.source].push(edge.target);
  }

  return childrenById;
}

function collectMindMapRoots(graph: MindMapGraphInput) {
  const parentById = new Map<string, string>();

  for (const edge of graph.edges) {
    if (edge.type !== 'MINDMAP_CHILD') {
      continue;
    }
    if (!parentById.has(edge.target)) {
      parentById.set(edge.target, edge.source);
    }
  }

  return graph.nodes
    .map((node) => node.id)
    .filter((nodeId) => !parentById.has(nodeId));
}

function collapseNodeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function summarizeLearningMindMapText(value: string, maxLength = 8) {
  const collapsed = collapseNodeText(value);
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength)}…`;
}

export function resolveLearningGraph2DNodeText(
  node: RuntimeNodeLike,
  mode: LearningGraphHydratePayload['mode']
) {
  if (mode === 'mindmap') {
    const preferredText =
      typeof node.summaryLabel === 'string' && node.summaryLabel.trim()
        ? node.summaryLabel
        : node.label;
    return summarizeLearningMindMapText(preferredText);
  }

  return collapseNodeText(node.label);
}

export function buildLearningGraphMindMapLayout(graph: MindMapGraphInput) {
  const visibleNodeIds = new Set(graph.nodes.map((node) => node.id));
  const childrenIndex = collectMindMapChildren(graph);
  const positions: Record<string, { x: number; y: number }> = {};
  const roots = collectMindMapRoots(graph);
  let cursor = 0;

  function assign(nodeId: string, depth: number): number {
    const childIds = (childrenIndex[nodeId] ?? []).filter((childId) => visibleNodeIds.has(childId));
    const x = depth * MINDMAP_COLUMN_GAP;

    if (childIds.length === 0) {
      const y = cursor * MINDMAP_ROW_GAP;
      positions[nodeId] = { x, y };
      cursor += 1;
      return y;
    }

    const childCenters = childIds.map((childId) => assign(childId, depth + 1));
    const centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    positions[nodeId] = { x, y: centerY };
    return centerY;
  }

  for (const rootId of roots) {
    assign(rootId, 0);
    cursor += 1;
  }

  const rootAnchorY = roots.length > 0 ? positions[roots[0]]?.y ?? 0 : 0;
  for (const nodeId of Object.keys(positions)) {
    positions[nodeId] = {
      x: positions[nodeId].x,
      y: positions[nodeId].y - rootAnchorY,
    };
  }

  return positions;
}

export function createLearningGraphMindMapCollapsedState(graph: MindMapGraphInput) {
  const roots = collectMindMapRoots(graph);
  const childrenById = collectMindMapChildren(graph);
  const collapsedById: Record<string, boolean> = {};

  function traverse(nodeId: string, depth: number) {
    const childIds = childrenById[nodeId] ?? [];
    collapsedById[nodeId] = childIds.length > 0 ? depth >= 2 : false;
    childIds.forEach((childId) => traverse(childId, depth + 1));
  }

  roots.forEach((rootId) => traverse(rootId, 0));
  return collapsedById;
}

export function expandLearningGraphMindMapPath(
  graph: MindMapGraphInput,
  collapsedById: Record<string, boolean>,
  targetNodeId: string | null
) {
  if (!targetNodeId) {
    return collapsedById;
  }

  const parentById = new Map<string, string>();
  for (const edge of graph.edges) {
    if (edge.type !== 'MINDMAP_CHILD' || parentById.has(edge.target)) {
      continue;
    }
    parentById.set(edge.target, edge.source);
  }

  let currentNodeId = targetNodeId;
  let changed = false;
  const nextState = { ...collapsedById };

  while (parentById.has(currentNodeId)) {
    const parentNodeId = parentById.get(currentNodeId);
    if (!parentNodeId) {
      break;
    }

    if (nextState[parentNodeId]) {
      nextState[parentNodeId] = false;
      changed = true;
    }

    currentNodeId = parentNodeId;
  }

  return changed ? nextState : collapsedById;
}

export function isLearningGraphMindMapToggleHit(args: {
  boxWidth: number;
  graphPoint: { x: number; y: number };
  nodeCenter: { x: number; y: number };
}) {
  const badgeCenterX = args.nodeCenter.x + args.boxWidth / 2 + 14;
  const badgeCenterY = args.nodeCenter.y;
  const deltaX = args.graphPoint.x - badgeCenterX;
  const deltaY = args.graphPoint.y - badgeCenterY;

  return deltaX * deltaX + deltaY * deltaY <= 11 * 11;
}

export function buildLearningGraphMindMapVisibility(
  graph: MindMapGraphInput,
  collapsedById: Record<string, boolean>
) {
  const visibleNodeIds = new Set<string>();
  const visibleEdgeKeys = new Set<string>();
  const childrenById = collectMindMapChildren(graph);
  const nodeById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  const roots = collectMindMapRoots(graph);

  function traverse(nodeId: string) {
    if (visibleNodeIds.has(nodeId)) {
      return;
    }

    visibleNodeIds.add(nodeId);
    if (collapsedById[nodeId]) {
      return;
    }

    for (const childId of childrenById[nodeId] ?? []) {
      visibleEdgeKeys.add(`${nodeId}::${childId}::MINDMAP_CHILD`);
      traverse(childId);
    }
  }

  roots.forEach((rootId) => traverse(rootId));

  return {
    edges: graph.edges.filter((edge) =>
      visibleEdgeKeys.has(`${edge.source}::${edge.target}::${edge.type}`)
    ),
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id) && nodeById[node.id]),
  };
}

type LabelVisibilityArgs = {
  generatedNodeIds: string[];
  guideStatusByNodeId: Record<string, string>;
  highlightedNodeIds: string[];
  mode: LearningGraphHydratePayload['mode'];
  nodeDegree: number;
  selectedNeighborhoodNodeIds: Set<string> | null;
  selectedNodeId: string | null;
};

type NodeVisualStateArgs = Omit<LabelVisibilityArgs, 'nodeDegree'> & {
  theme: LearningGraphRuntimeTheme;
};

function resolveNodeColor(type: string, theme: LearningGraphRuntimeTheme) {
  switch (type) {
    case 'Book':
    case 'Claim':
    case 'Concept':
      return theme.primary;
    case 'Definition':
    case 'LessonStep':
      return theme.step;
    case 'Formula':
      return theme.explore;
    case 'Fragment':
      return theme.fragment;
    case 'Method':
      return theme.success;
    case 'Section':
    case 'SourceAsset':
      return theme.source;
    case 'Theorem':
      return theme.warning;
    default:
      return theme.textSoft;
  }
}

function isGlobalAnchorNode(node: RuntimeNodeLike, nodeDegree: number) {
  return (
    nodeDegree >= 4 &&
    (node.type === 'Concept' || node.type === 'LessonStep')
  );
}

export function resolveLearningGraph2DLabelVisibility(
  node: RuntimeNodeLike,
  args: LabelVisibilityArgs
) {
  if (args.mode === 'mindmap') {
    return node.type !== 'Fragment';
  }

  if (args.selectedNeighborhoodNodeIds?.has(node.id)) {
    return true;
  }

  if (node.type === 'Book' || node.type === 'SourceAsset' || node.type === 'Section') {
    return true;
  }

  if (args.mode === 'explore') {
    if (
      args.highlightedNodeIds.includes(node.id) ||
      args.generatedNodeIds.includes(node.id)
    ) {
      return true;
    }
  }

  if (args.mode === 'guide') {
    const guideStatus = args.guideStatusByNodeId[node.id];
    if (guideStatus === 'completed' || guideStatus === 'current') {
      return true;
    }
  }

  if (args.mode === 'global' && isGlobalAnchorNode(node, args.nodeDegree)) {
    return true;
  }

  return args.selectedNodeId === node.id;
}

export function resolveLearningGraph2DNodeVisualState(
  node: RuntimeNodeLike,
  args: NodeVisualStateArgs
) {
  const generated = args.generatedNodeIds.includes(node.id);
  const active = args.selectedNodeId === node.id;
  const highlighted = args.highlightedNodeIds.includes(node.id);
  const guideStatus = args.guideStatusByNodeId[node.id];

  let color = resolveNodeColor(node.type, args.theme);
  let emphasis: 'completed' | 'current' | 'generated' | 'normal' = 'normal';
  let opacity = 0.88;

  if (args.mode === 'mindmap') {
    if (args.selectedNeighborhoodNodeIds) {
      opacity = args.selectedNeighborhoodNodeIds.has(node.id)
        ? Math.max(opacity, active ? 1 : 0.94)
        : 0.22;
    }

    return {
      active,
      color,
      emphasis,
      generated: false,
      highlighted: false,
      opacity,
    };
  }

  if (args.mode === 'explore') {
    opacity = highlighted ? 0.96 : 0.56;
    if (generated) {
      color = args.theme.explore;
      emphasis = 'generated';
      opacity = 0.98;
    }
  }

  if (args.mode === 'guide') {
    if (guideStatus === 'completed') {
      color = args.theme.success;
      emphasis = 'completed';
      opacity = 0.94;
    } else if (guideStatus === 'current') {
      color = args.theme.warning;
      emphasis = 'current';
      opacity = 0.98;
    } else {
      opacity = node.type === 'Book' ? 0.78 : 0.34;
    }
  }

  if (args.selectedNeighborhoodNodeIds) {
    opacity = args.selectedNeighborhoodNodeIds.has(node.id)
      ? Math.max(opacity, active ? 1 : 0.92)
      : Math.min(opacity, 0.18);
  }

  return {
    active,
    color,
    emphasis,
    generated,
    highlighted,
    opacity,
  };
}

export function resolveLearningGraph2DViewportAction(
  reason: 'clearSelection' | 'focusNode' | 'hydrate'
) {
  if (reason === 'hydrate') {
    return 'fit' as const;
  }

  return 'preserve' as const;
}

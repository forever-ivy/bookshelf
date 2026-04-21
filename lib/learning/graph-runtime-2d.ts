import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeTheme,
} from '@/lib/learning/graph-bridge';

type RuntimeNodeLike = {
  id: string;
  label: string;
  type: string;
};

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

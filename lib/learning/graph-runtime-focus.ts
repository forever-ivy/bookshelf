type LearningGraphViewportNode = {
  id: string;
  type: string;
  x?: number;
  y?: number;
};

type LearningGraphViewportController = {
  centerAt: (x?: number, y?: number, durationMs?: number) => unknown;
  zoom: (scale: number, durationMs?: number) => unknown;
  zoomToFit: (durationMs?: number, padding?: number) => unknown;
};

type LearningGraphViewportSyncOptions = {
  resetWhenMissing: boolean;
};

const FOCUS_CENTER_DURATION_MS = 700;
const FOCUS_ZOOM_DURATION_MS = 900;
const RESET_DURATION_MS = 360;
const RESET_PADDING_PX = 56;

export function resolveLearningGraphFocusZoom(nodeType: string) {
  switch (nodeType) {
    case 'Book':
      return 1.4;
    case 'SourceAsset':
    case 'LessonStep':
      return 1.7;
    case 'Concept':
      return 2.35;
    case 'Fragment':
      return 2.75;
    default:
      return 2;
  }
}

export function focusLearningGraphNode(
  graph: LearningGraphViewportController | null | undefined,
  node: LearningGraphViewportNode | null | undefined
) {
  if (!graph || !node || typeof node.x !== 'number' || typeof node.y !== 'number') {
    return false;
  }

  graph.centerAt(node.x, node.y, FOCUS_CENTER_DURATION_MS);
  graph.zoom(resolveLearningGraphFocusZoom(node.type), FOCUS_ZOOM_DURATION_MS);
  return true;
}

export function resetLearningGraphViewport(graph: LearningGraphViewportController | null | undefined) {
  if (!graph) {
    return false;
  }

  graph.zoomToFit(RESET_DURATION_MS, RESET_PADDING_PX);
  return true;
}

export function syncLearningGraphViewportSelection(
  graph: LearningGraphViewportController | null | undefined,
  node: LearningGraphViewportNode | null | undefined,
  options: LearningGraphViewportSyncOptions
) {
  if (focusLearningGraphNode(graph, node)) {
    return 'focused' as const;
  }

  if (options.resetWhenMissing && resetLearningGraphViewport(graph)) {
    return 'reset' as const;
  }

  return 'idle' as const;
}

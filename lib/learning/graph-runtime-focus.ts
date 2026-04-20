export type LearningGraphViewportNode = {
  id: string;
  type: string;
  x?: number;
  y?: number;
  z?: number;
};

type LearningGraphCameraPosition = {
  x: number;
  y: number;
  z: number;
};

type LearningGraphViewportController = {
  cameraPosition: (
    position: LearningGraphCameraPosition,
    lookAt: LearningGraphCameraPosition,
    durationMs?: number
  ) => unknown;
  zoomToFit: (durationMs?: number, padding?: number) => unknown;
};

type LearningGraphViewportSyncOptions = {
  cameraFocusDistanceByNodeType: Record<string, number>;
  cameraFocusDurationMs: number;
  resetWhenMissing: boolean;
};

type LearningGraphCameraTarget = {
  durationMs: number;
  lookAt: LearningGraphCameraPosition;
  position: LearningGraphCameraPosition;
};

const RESET_DURATION_MS = 360;
const RESET_PADDING_PX = 56;

function resolveLearningGraphFocusDistance(
  nodeType: string,
  distanceByNodeType: Record<string, number>
) {
  return distanceByNodeType[nodeType] ?? distanceByNodeType.Default ?? 160;
}

export function buildLearningGraphCameraTarget(
  node: LearningGraphViewportNode | null | undefined,
  distanceByNodeType: Record<string, number>,
  durationMs: number
): LearningGraphCameraTarget | null {
  if (
    !node ||
    typeof node.x !== 'number' ||
    typeof node.y !== 'number'
  ) {
    return null;
  }

  const x = node.x;
  const y = node.y;
  const z = typeof node.z === 'number' ? node.z : 0;
  const distance = resolveLearningGraphFocusDistance(node.type, distanceByNodeType);
  const vectorLength = Math.hypot(x, y, z) || 1;
  const distanceRatio = 1 + distance / vectorLength;

  return {
    durationMs,
    lookAt: { x, y, z },
    position: {
      x: x * distanceRatio,
      y: y * distanceRatio,
      z: z * distanceRatio,
    },
  };
}

export function resetLearningGraphViewport(
  graph: Pick<LearningGraphViewportController, 'zoomToFit'> | null | undefined
) {
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
  const target = buildLearningGraphCameraTarget(
    node,
    options.cameraFocusDistanceByNodeType,
    options.cameraFocusDurationMs
  );

  if (graph && target) {
    graph.cameraPosition(target.position, target.lookAt, target.durationMs);
    return 'focused' as const;
  }

  if (options.resetWhenMissing && resetLearningGraphViewport(graph)) {
    return 'reset' as const;
  }

  return 'idle' as const;
}

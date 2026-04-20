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
  currentCameraPosition?: LearningGraphCameraPosition | null;
  resetWhenMissing: boolean;
};

type LearningGraphCameraTarget = {
  durationMs: number;
  lookAt: LearningGraphCameraPosition;
  position: LearningGraphCameraPosition;
};

const RESET_DURATION_MS = 360;
const RESET_PADDING_PX = 72;

function resolveLearningGraphFocusDistance(
  nodeType: string,
  distanceByNodeType: Record<string, number>
) {
  return distanceByNodeType[nodeType] ?? distanceByNodeType.Default ?? 160;
}

export function buildLearningGraphCameraTarget(
  node: LearningGraphViewportNode | null | undefined,
  distanceByNodeType: Record<string, number>,
  durationMs: number,
  currentCameraPosition?: LearningGraphCameraPosition | null
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

  // If we have a current camera position, approach from the current viewing angle
  // instead of from the origin direction. This preserves spatial context.
  let dirX: number;
  let dirY: number;
  let dirZ: number;

  if (currentCameraPosition) {
    dirX = currentCameraPosition.x - x;
    dirY = currentCameraPosition.y - y;
    dirZ = currentCameraPosition.z - z;
  } else {
    dirX = x;
    dirY = y;
    dirZ = z;
  }

  const dirLength = Math.hypot(dirX, dirY, dirZ) || 1;
  const normalizedX = dirX / dirLength;
  const normalizedY = dirY / dirLength;
  const normalizedZ = dirZ / dirLength;

  return {
    durationMs,
    lookAt: { x, y, z },
    position: {
      x: x + normalizedX * distance,
      y: y + normalizedY * distance,
      z: z + normalizedZ * distance,
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
    options.cameraFocusDurationMs,
    options.currentCameraPosition
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

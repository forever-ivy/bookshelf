import {
  buildLearningGraphCameraTarget,
  resetLearningGraphViewport,
  syncLearningGraphViewportSelection,
  type LearningGraphViewportNode,
} from '@/lib/learning/graph-runtime-focus';

describe('learning graph runtime focus helpers', () => {
  it('builds a click-to-focus camera target for a selected node', () => {
    const target = buildLearningGraphCameraTarget(
      {
        id: 'concept:limits',
        type: 'Concept',
        x: 120,
        y: -40,
        z: 60,
      },
      {
        Book: 220,
        Concept: 140,
        Default: 160,
        Fragment: 110,
        LessonStep: 150,
        SourceAsset: 170,
      },
      900
    );

    expect(target).toEqual({
      durationMs: 900,
      lookAt: { x: 120, y: -40, z: 60 },
      position: expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
      }),
    });
    expect(target?.position.x).toBeGreaterThan(120);
    expect(target?.position.z).toBeGreaterThan(60);
  });

  it('returns null when the node has no coordinates yet', () => {
    const target = buildLearningGraphCameraTarget(
      {
        id: 'concept:limits',
        type: 'Concept',
      },
      {
        Book: 220,
        Concept: 140,
        Default: 160,
        Fragment: 110,
        LessonStep: 150,
        SourceAsset: 170,
      },
      900
    );

    expect(target).toBeNull();
  });

  it('moves the camera toward a selected node', () => {
    const graph = {
      cameraPosition: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const focused = syncLearningGraphViewportSelection(
      graph,
      {
        id: 'concept:limits',
        type: 'Concept',
        x: 128,
        y: -36,
        z: 42,
      } as LearningGraphViewportNode,
      {
        cameraFocusDistanceByNodeType: {
          Book: 220,
          Concept: 140,
          Default: 160,
          Fragment: 110,
          LessonStep: 150,
          SourceAsset: 170,
        },
        cameraFocusDurationMs: 900,
        resetWhenMissing: false,
      }
    );

    expect(focused).toBe('focused');
    expect(graph.cameraPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
      }),
      { x: 128, y: -36, z: 42 },
      900
    );
    expect(graph.zoomToFit).not.toHaveBeenCalled();
  });

  it('resets the viewport back to the full graph', () => {
    const graph = {
      zoomToFit: jest.fn(),
    };

    resetLearningGraphViewport(graph);

    expect(graph.zoomToFit).toHaveBeenCalledWith(360, 56);
  });

  it('keeps the current viewport when selection is cleared interactively', () => {
    const graph = {
      cameraPosition: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const result = syncLearningGraphViewportSelection(graph, null, {
      cameraFocusDistanceByNodeType: {
        Book: 220,
        Concept: 140,
        Default: 160,
        Fragment: 110,
        LessonStep: 150,
        SourceAsset: 170,
      },
      cameraFocusDurationMs: 900,
      resetWhenMissing: false,
    });

    expect(result).toBe('idle');
    expect(graph.cameraPosition).not.toHaveBeenCalled();
    expect(graph.zoomToFit).not.toHaveBeenCalled();
  });

  it('resets to the full graph when hydrate starts without a selected node', () => {
    const graph = {
      cameraPosition: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const result = syncLearningGraphViewportSelection(graph, null, {
      cameraFocusDistanceByNodeType: {
        Book: 220,
        Concept: 140,
        Default: 160,
        Fragment: 110,
        LessonStep: 150,
        SourceAsset: 170,
      },
      cameraFocusDurationMs: 900,
      resetWhenMissing: true,
    });

    expect(result).toBe('reset');
    expect(graph.zoomToFit).toHaveBeenCalledWith(360, 56);
  });
});

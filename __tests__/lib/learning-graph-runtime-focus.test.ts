import {
  focusLearningGraphNode,
  syncLearningGraphViewportSelection,
  resetLearningGraphViewport,
  resolveLearningGraphFocusZoom,
} from '@/lib/learning/graph-runtime-focus';

describe('learning graph runtime focus helpers', () => {
  it('pans and zooms toward a selected node', () => {
    const graph = {
      centerAt: jest.fn(),
      zoom: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const focused = focusLearningGraphNode(graph, {
      id: 'concept:limits',
      type: 'Concept',
      x: 128,
      y: -36,
    });

    expect(focused).toBe(true);
    expect(graph.centerAt).toHaveBeenCalledWith(128, -36, 700);
    expect(graph.zoom).toHaveBeenCalledWith(2.35, 900);
    expect(graph.zoomToFit).not.toHaveBeenCalled();
  });

  it('does not focus when the node has no coordinates yet', () => {
    const graph = {
      centerAt: jest.fn(),
      zoom: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const focused = focusLearningGraphNode(graph, {
      id: 'concept:limits',
      type: 'Concept',
    });

    expect(focused).toBe(false);
    expect(graph.centerAt).not.toHaveBeenCalled();
    expect(graph.zoom).not.toHaveBeenCalled();
  });

  it('zooms different node types to different reading distances', () => {
    expect(resolveLearningGraphFocusZoom('Book')).toBe(1.4);
    expect(resolveLearningGraphFocusZoom('SourceAsset')).toBe(1.7);
    expect(resolveLearningGraphFocusZoom('Concept')).toBe(2.35);
    expect(resolveLearningGraphFocusZoom('Fragment')).toBe(2.75);
    expect(resolveLearningGraphFocusZoom('Unknown')).toBe(2);
  });

  it('resets the viewport back to the full graph', () => {
    const graph = {
      centerAt: jest.fn(),
      zoom: jest.fn(),
      zoomToFit: jest.fn(),
    };

    resetLearningGraphViewport(graph);

    expect(graph.zoomToFit).toHaveBeenCalledWith(360, 56);
    expect(graph.centerAt).not.toHaveBeenCalled();
    expect(graph.zoom).not.toHaveBeenCalled();
  });

  it('keeps the current viewport when selection is cleared interactively', () => {
    const graph = {
      centerAt: jest.fn(),
      zoom: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const result = syncLearningGraphViewportSelection(graph, null, {
      resetWhenMissing: false,
    });

    expect(result).toBe('idle');
    expect(graph.centerAt).not.toHaveBeenCalled();
    expect(graph.zoom).not.toHaveBeenCalled();
    expect(graph.zoomToFit).not.toHaveBeenCalled();
  });

  it('resets to the full graph when hydrate starts without a selected node', () => {
    const graph = {
      centerAt: jest.fn(),
      zoom: jest.fn(),
      zoomToFit: jest.fn(),
    };

    const result = syncLearningGraphViewportSelection(graph, null, {
      resetWhenMissing: true,
    });

    expect(result).toBe('reset');
    expect(graph.zoomToFit).toHaveBeenCalledWith(360, 56);
  });
});

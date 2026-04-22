import React from 'react';
import { createRoot } from 'react-dom/client';
import ForceGraph2D from 'react-force-graph-2d';

import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeInputMessage,
  LearningGraphRuntimeOutputMessage,
} from '../../lib/learning/graph-bridge';
import {
  buildLearningGraphMindMapLayout,
  buildLearningGraphMindMapVisibility,
  createLearningGraphMindMapCollapsedState,
  expandLearningGraphMindMapPath,
  isLearningGraphMindMapToggleHit,
  resolveLearningGraph2DLabelVisibility,
  resolveLearningGraph2DNodeText,
  resolveLearningGraph2DNodeVisualState,
  resolveLearningGraph2DViewportAction,
} from '../../lib/learning/graph-runtime-2d';
import { readLearningGraphBootstrapPayload } from '../../lib/learning/graph-runtime';

type RuntimeLink = {
  __key: string;
  source: string;
  target: string;
  type: string;
};

type RuntimeNode = {
  fx?: number;
  fy?: number;
  id: string;
  label: string;
  summaryLabel?: string;
  type: string;
  x?: number;
  y?: number;
};

type RuntimeGraphRef = {
  d3Force: (
    forceName: string
  ) =>
    | {
        distance?: (value: (link: RuntimeLink) => number) => void;
        strength?: (value: (node: RuntimeNode) => number) => void;
      }
    | undefined;
  d3VelocityDecay: (value: number) => void;
  graph2ScreenCoords: (x: number, y: number) => { x: number; y: number };
  refresh?: () => unknown;
  zoomToFit: (durationMs?: number, padding?: number) => unknown;
};

let sharedTextMeasureContext: CanvasRenderingContext2D | null = null;

function resolveRuntimeLinkEndpointId(endpoint: RuntimeLink['source']) {
  if (typeof endpoint === 'string') {
    return endpoint;
  }

  return (endpoint as { id?: string })?.id ?? null;
}

function buildEdgeKey(edge: { source: string; target: string; type: string }) {
  return `${edge.source}::${edge.target}::${edge.type}`;
}

function buildMindMapCollapsedState(payload: LearningGraphHydratePayload | null) {
  if (!payload || payload.mode !== 'mindmap') {
    return {};
  }

  return expandLearningGraphMindMapPath(
    payload.graph,
    createLearningGraphMindMapCollapsedState(payload.graph),
    payload.selectedNodeId
  );
}

function parseHexColor(value: string) {
  const normalized = value.trim().replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null;
  }

  return {
    b: Number.parseInt(expanded.slice(4, 6), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    r: Number.parseInt(expanded.slice(0, 2), 16),
  };
}

function mixColorWithWhite(color: string, ratio: number) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  const clampRatio = Math.max(0, Math.min(1, ratio));
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * clampRatio);

  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
}

function resolveMindMapNodeSurface(
  node: RuntimeNode,
  visualState: ReturnType<typeof resolveLearningGraph2DNodeVisualState>,
  theme: LearningGraphHydratePayload['theme']
) {
  const fillMix =
    node.type === 'Book'
      ? 0.74
      : node.type === 'SourceAsset'
        ? 0.8
        : node.type === 'Section'
          ? 0.84
          : 0.88;

  return {
    badgeFill: visualState.active ? visualState.color : mixColorWithWhite(visualState.color, 0.78),
    badgeText: visualState.active ? '#ffffff' : '#35518F',
    borderColor: visualState.active ? visualState.color : mixColorWithWhite(visualState.color, 0.38),
    fillColor: mixColorWithWhite(visualState.color, fillMix),
    shadowColor: 'rgba(64, 84, 128, 0.14)',
    textColor: theme.text,
  };
}

function postToNative(message: LearningGraphRuntimeOutputMessage) {
  const bridge = (window as Window & {
    ReactNativeWebView?: { postMessage: (value: string) => void };
  }).ReactNativeWebView;

  if (!bridge?.postMessage) {
    return;
  }

  bridge.postMessage(JSON.stringify(message));
}

function postStatus(phase: string, detail?: string) {
  postToNative({
    detail,
    phase,
    type: 'status',
  });
}

function formatRuntimeError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error ?? 'unknown error');
}

function getSharedTextMeasureContext() {
  if (sharedTextMeasureContext) {
    return sharedTextMeasureContext;
  }

  const canvas = document.createElement('canvas');
  sharedTextMeasureContext = canvas.getContext('2d');
  return sharedTextMeasureContext;
}

class RuntimeErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
  },
  {
    error: Error | null;
  }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    postToNative({
      message: formatRuntimeError(error),
      type: 'runtimeError',
    });
  }

  render() {
    if (this.state.error) {
      return null;
    }

    return this.props.children;
  }
}

function buildNodeRadius(
  node: RuntimeNode,
  hydratePayload: LearningGraphHydratePayload,
  selectedNeighborhoodNodeIds: Set<string> | null,
  selectedNodeId: string | null
) {
  const baseRadius = hydratePayload.config.nodeSizes[node.type] ?? 6;

  if (selectedNodeId === node.id) {
    return baseRadius + 2;
  }

  if (selectedNeighborhoodNodeIds?.has(node.id)) {
    return baseRadius + 1;
  }

  return baseRadius;
}

function drawPolygonPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation = -Math.PI / 2
) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / sides;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (index === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }
  ctx.closePath();
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const safeRadius = Math.min(radius, halfWidth, halfHeight);

  ctx.beginPath();
  ctx.moveTo(x - halfWidth + safeRadius, y - halfHeight);
  ctx.lineTo(x + halfWidth - safeRadius, y - halfHeight);
  ctx.quadraticCurveTo(x + halfWidth, y - halfHeight, x + halfWidth, y - halfHeight + safeRadius);
  ctx.lineTo(x + halfWidth, y + halfHeight - safeRadius);
  ctx.quadraticCurveTo(x + halfWidth, y + halfHeight, x + halfWidth - safeRadius, y + halfHeight);
  ctx.lineTo(x - halfWidth + safeRadius, y + halfHeight);
  ctx.quadraticCurveTo(x - halfWidth, y + halfHeight, x - halfWidth, y + halfHeight - safeRadius);
  ctx.lineTo(x - halfWidth, y - halfHeight + safeRadius);
  ctx.quadraticCurveTo(x - halfWidth, y - halfHeight, x - halfWidth + safeRadius, y - halfHeight);
  ctx.closePath();
}

function drawCapsulePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  drawRoundedRectPath(ctx, x, y, width, height, height / 2);
}

function drawNodeShapePath(
  ctx: CanvasRenderingContext2D,
  node: RuntimeNode,
  x: number,
  y: number,
  radius: number
) {
  switch (node.type) {
    case 'SourceAsset':
      drawRoundedRectPath(ctx, x, y, radius * 3.2, radius * 2.05, radius * 0.55);
      return;
    case 'Section':
      drawCapsulePath(ctx, x, y, radius * 3.8, radius * 1.75);
      return;
    case 'LessonStep':
    case 'Definition':
      drawPolygonPath(ctx, x, y, radius * 1.2, 4, Math.PI / 4);
      return;
    case 'Formula':
      drawPolygonPath(ctx, x, y, radius * 1.12, 4);
      return;
    case 'Method':
      drawPolygonPath(ctx, x, y, radius * 1.16, 6);
      return;
    case 'Theorem':
      drawPolygonPath(ctx, x, y, radius * 1.22, 3);
      return;
    case 'Claim':
      drawPolygonPath(ctx, x, y, radius * 1.14, 8);
      return;
    case 'Fragment':
    case 'Book':
    case 'Concept':
    default:
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.closePath();
      return;
  }
}

function fillAndStrokeCurrentPath(
  ctx: CanvasRenderingContext2D,
  options: {
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeOpacity?: number;
    strokeWidth: number;
  }
) {
  ctx.save();
  ctx.globalAlpha = options.fillOpacity;
  ctx.fillStyle = options.fillColor;
  ctx.fill();
  if (options.strokeWidth > 0) {
    ctx.globalAlpha = options.strokeOpacity ?? 1;
    ctx.lineWidth = options.strokeWidth;
    ctx.strokeStyle = options.strokeColor;
    ctx.stroke();
  }
  ctx.restore();
}

function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  node: RuntimeNode,
  x: number,
  y: number,
  radius: number,
  active: boolean,
  accentColor: string,
  globalScale: number
) {
  const nodeText = resolveLearningGraph2DNodeText(node, 'global');
  const fontSize = Math.max(9, Math.min(13, 13 / Math.max(globalScale, 0.75)));
  const paddingX = 7;
  const paddingY = 4;

  ctx.save();
  ctx.font = `${active ? '700' : '500'} ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
  const labelWidth = ctx.measureText(nodeText).width;
  const boxWidth = labelWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const labelCenterX = x;
  const labelCenterY = y - radius - boxHeight * 0.95;

  drawRoundedRectPath(ctx, labelCenterX, labelCenterY, boxWidth, boxHeight, 8);
  fillAndStrokeCurrentPath(ctx, {
    fillColor: '#0f141a',
    fillOpacity: active ? 0.82 : 0.66,
    strokeColor: active ? accentColor : 'rgba(255, 255, 255, 0.14)',
    strokeOpacity: 1,
    strokeWidth: active ? 1.8 : 0.8,
  });

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nodeText, labelCenterX, labelCenterY + 0.5);
  ctx.restore();
}

function measureMindMapNodeBox(
  ctx: CanvasRenderingContext2D | null,
  node: RuntimeNode,
  globalScale: number,
  active: boolean
) {
  const nodeText = resolveLearningGraph2DNodeText(node, 'mindmap');
  const fontSize = Math.max(11, Math.min(15, 15 / Math.max(globalScale, 0.9)));
  const paddingX = 16;
  const paddingY = 10;
  const measureContext = ctx ?? getSharedTextMeasureContext();

  if (measureContext) {
    measureContext.save();
    measureContext.font = `${active ? '700' : '500'} ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
  }
  const textWidth = measureContext?.measureText(nodeText).width ?? nodeText.length * fontSize;
  measureContext?.restore();

  return {
    fontSize,
    height: Math.max(34, fontSize + paddingY * 2),
    radius: 12,
    text: nodeText,
    width: Math.max(70, Math.min(164, textWidth + paddingX * 2)),
  };
}

function drawMindMapNodeBox(
  ctx: CanvasRenderingContext2D,
  node: RuntimeNode,
  globalScale: number,
  active: boolean,
  visualState: ReturnType<typeof resolveLearningGraph2DNodeVisualState>,
  theme: LearningGraphHydratePayload['theme'],
  options?: {
    collapsed?: boolean;
    hasChildren?: boolean;
  }
) {
  const x = typeof node.x === 'number' ? node.x : 0;
  const y = typeof node.y === 'number' ? node.y : 0;
  const box = measureMindMapNodeBox(ctx, node, globalScale, active);
  const surface = resolveMindMapNodeSurface(node, visualState, theme);

  if (active) {
    drawRoundedRectPath(ctx, x, y, box.width + 10, box.height + 10, box.radius + 2);
    fillAndStrokeCurrentPath(ctx, {
      fillColor: visualState.color,
      fillOpacity: 0,
      strokeColor: visualState.color,
      strokeOpacity: 0.72,
      strokeWidth: 2,
    });
  }

  ctx.save();
  ctx.shadowBlur = active ? 22 : 16;
  ctx.shadowColor = surface.shadowColor;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  drawRoundedRectPath(ctx, x, y, box.width, box.height, box.radius);
  fillAndStrokeCurrentPath(ctx, {
    fillColor: surface.fillColor,
    fillOpacity: 1,
    strokeColor: surface.borderColor,
    strokeOpacity: 1,
    strokeWidth: active ? 2 : 1.2,
  });
  ctx.restore();

  ctx.save();
  ctx.font = `${active ? '700' : '500'} ${box.fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
  ctx.fillStyle = surface.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(box.text, x, y + 0.5);
  ctx.restore();

  if (options?.hasChildren) {
    const badgeX = x + box.width / 2 + 14;
    const badgeY = y;
    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 11, 0, Math.PI * 2);
    ctx.fillStyle = surface.badgeFill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = surface.borderColor;
    ctx.stroke();
    ctx.fillStyle = surface.badgeText;
    ctx.font = `700 12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.collapsed ? '+' : '−', badgeX, badgeY + 0.5);
    ctx.restore();
  }
}

function drawMindMapLink(
  ctx: CanvasRenderingContext2D,
  link: RuntimeLink,
  globalScale: number,
  selectedNeighborhoodNodeIds: Set<string> | null,
  selectedNodeId: string | null,
  childNodeIdsByNodeId: Record<string, string[]>
) {
  const sourceNode =
    typeof link.source === 'string' ? null : (link.source as unknown as RuntimeNode);
  const targetNode =
    typeof link.target === 'string' ? null : (link.target as unknown as RuntimeNode);

  if (!sourceNode || !targetNode) {
    return;
  }

  const sourceBox = measureMindMapNodeBox(
    ctx,
    sourceNode,
    globalScale,
    selectedNodeId === sourceNode.id
  );
  const targetBox = measureMindMapNodeBox(
    ctx,
    targetNode,
    globalScale,
    selectedNodeId === targetNode.id
  );
  const sourceHasChildren = (childNodeIdsByNodeId[sourceNode.id] ?? []).length > 0;
  const startX = sourceNode.x ?? 0;
  const endX = targetNode.x ?? 0;
  const startY = sourceNode.y ?? 0;
  const endY = targetNode.y ?? 0;
  const fromX = startX + sourceBox.width / 2 + (sourceHasChildren ? 24 : 10);
  const toX = endX - targetBox.width / 2 - 10;
  const controlOffset = Math.max(36, (toX - fromX) * 0.32);
  const highlighted =
    !selectedNeighborhoodNodeIds ||
    (selectedNeighborhoodNodeIds.has(sourceNode.id) &&
      selectedNeighborhoodNodeIds.has(targetNode.id));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromX, startY);
  ctx.bezierCurveTo(fromX + controlOffset, startY, toX - controlOffset, endY, toX, endY);
  ctx.lineCap = 'round';
  ctx.lineWidth = highlighted ? 2 : 1.25;
  ctx.strokeStyle = highlighted ? '#6F86D7' : '#B9C7E8';
  ctx.stroke();
  ctx.restore();
}

function paintPointerArea(
  ctx: CanvasRenderingContext2D,
  node: RuntimeNode,
  color: string,
  radius: number,
  hydratePayload?: LearningGraphHydratePayload
) {
  const x = typeof node.x === 'number' ? node.x : 0;
  const y = typeof node.y === 'number' ? node.y : 0;

  ctx.save();
  if (hydratePayload?.mode === 'mindmap') {
    const box = measureMindMapNodeBox(ctx, node, 1, false);
    drawRoundedRectPath(ctx, x, y, box.width + 8, box.height + 8, box.radius + 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }
  drawNodeShapePath(ctx, node, x, y, radius + 6);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawNodeObject(
  node: RuntimeNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  hydratePayload: LearningGraphHydratePayload,
  nodeDegree: number,
  selectedNodeId: string | null,
  selectedNeighborhoodNodeIds: Set<string> | null,
  options?: {
    collapsed?: boolean;
    hasChildren?: boolean;
  }
) {
  const radius = buildNodeRadius(node, hydratePayload, selectedNeighborhoodNodeIds, selectedNodeId);
  const visualState = resolveLearningGraph2DNodeVisualState(node, {
    generatedNodeIds: hydratePayload.generatedNodeIds,
    guideStatusByNodeId: hydratePayload.guideStatusByNodeId,
    highlightedNodeIds: hydratePayload.highlightedNodeIds,
    mode: hydratePayload.mode,
    selectedNeighborhoodNodeIds,
    selectedNodeId,
    theme: hydratePayload.theme,
  });
  const x = typeof node.x === 'number' ? node.x : 0;
  const y = typeof node.y === 'number' ? node.y : 0;

  ctx.save();

  if (hydratePayload.mode === 'mindmap') {
    drawMindMapNodeBox(
      ctx,
      node,
      globalScale,
      visualState.active,
      visualState,
      hydratePayload.theme,
      options
    );
    ctx.restore();
    return;
  }

  if (visualState.active || visualState.generated || visualState.emphasis !== 'normal') {
    drawNodeShapePath(ctx, node, x, y, radius * (visualState.active ? 1.65 : 1.45));
    fillAndStrokeCurrentPath(ctx, {
      fillColor: visualState.color,
      fillOpacity: visualState.active ? 0.18 : 0.1,
      strokeColor: visualState.color,
      strokeOpacity: 0.42,
      strokeWidth: visualState.active ? 3 : 2,
    });
  }

  drawNodeShapePath(ctx, node, x, y, radius);
  fillAndStrokeCurrentPath(ctx, {
    fillColor: visualState.color,
    fillOpacity: visualState.opacity,
    strokeColor: visualState.active ? '#ffffff' : visualState.color,
    strokeOpacity: visualState.active ? 0.95 : 0.78,
    strokeWidth: visualState.active ? 2.4 : 1.2,
  });

  if (node.type === 'Book') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.38, 0, Math.PI * 2);
    ctx.strokeStyle = visualState.color;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  const showLabel = resolveLearningGraph2DLabelVisibility(node, {
    generatedNodeIds: hydratePayload.generatedNodeIds,
    guideStatusByNodeId: hydratePayload.guideStatusByNodeId,
    highlightedNodeIds: hydratePayload.highlightedNodeIds,
    mode: hydratePayload.mode,
    nodeDegree,
    selectedNeighborhoodNodeIds,
    selectedNodeId,
  });

  if (showLabel) {
    drawNodeLabel(ctx, node, x, y, radius, visualState.active, visualState.color, globalScale);
  }

  ctx.restore();
}

function App() {
  const graphRef = React.useRef<RuntimeGraphRef | null>(null);
  const bootstrapPayload = React.useMemo(
    () => readLearningGraphBootstrapPayload(window as unknown as Record<string, unknown>),
    []
  );
  const [viewport, setViewport] = React.useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });
  const [hydratePayload, setHydratePayload] = React.useState<LearningGraphHydratePayload | null>(
    bootstrapPayload
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    bootstrapPayload?.selectedNodeId ?? null
  );
  const [collapsedByNodeId, setCollapsedByNodeId] = React.useState<Record<string, boolean>>(() =>
    buildMindMapCollapsedState(bootstrapPayload)
  );
  const [hydrateToken, setHydrateToken] = React.useState(bootstrapPayload ? 1 : 0);
  const graphScaleRef = React.useRef(1);

  React.useEffect(() => {
    if (!bootstrapPayload) {
      return;
    }

    postStatus('bootstrap', `nodes=${bootstrapPayload.graph.nodes.length}`);
  }, [bootstrapPayload]);

  React.useEffect(() => {
    function handleRuntimeError(event: ErrorEvent) {
      postToNative({
        message:
          event.error != null
            ? formatRuntimeError(event.error)
            : event.message || 'unknown error',
        type: 'runtimeError',
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      postToNative({
        message: `Unhandled rejection: ${formatRuntimeError(event.reason)}`,
        type: 'runtimeError',
      });
    }

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  React.useEffect(() => {
    function handleResize() {
      setViewport({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  React.useEffect(() => {
    function handleMessage(event: MessageEvent<string>) {
      if (!event?.data) {
        return;
      }

      let message: LearningGraphRuntimeInputMessage | null = null;
      try {
        message = JSON.parse(event.data) as LearningGraphRuntimeInputMessage;
      } catch {
        message = null;
      }

      if (!message) {
        return;
      }

      if (message.type === 'hydrate') {
        setHydratePayload(message.payload);
        setSelectedNodeId(message.payload.selectedNodeId);
        setCollapsedByNodeId(buildMindMapCollapsedState(message.payload));
        setHydrateToken((value) => value + 1);
        postStatus('hydrate', `nodes=${message.payload.graph.nodes.length}`);
        return;
      }

      if (message.type === 'focusNode') {
        setSelectedNodeId(message.nodeId);
        postStatus('focusNode', message.nodeId);
        return;
      }

      if (message.type === 'clearSelection') {
        setSelectedNodeId(null);
        postStatus('clearSelection');
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage as EventListener);
    postToNative({ type: 'ready' });

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('message', handleMessage as EventListener);
    };
  }, []);

  React.useEffect(() => {
    if (!hydratePayload || hydratePayload.mode !== 'mindmap' || !selectedNodeId) {
      return;
    }

    setCollapsedByNodeId((current) =>
      expandLearningGraphMindMapPath(hydratePayload.graph, current, selectedNodeId)
    );
  }, [hydratePayload, selectedNodeId]);

  const graphData = React.useMemo(() => {
    if (!hydratePayload) {
      return {
        links: [] as RuntimeLink[],
        nodes: [] as RuntimeNode[],
      };
    }

    const fullGraph = {
      edges: hydratePayload.graph.edges,
      nodes: hydratePayload.graph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        summaryLabel:
          typeof (node as { summaryLabel?: unknown }).summaryLabel === 'string'
            ? (node as { summaryLabel: string }).summaryLabel
            : undefined,
        type: node.type,
      })),
    };
    const visibleGraph =
      hydratePayload.mode === 'mindmap'
        ? buildLearningGraphMindMapVisibility(fullGraph, collapsedByNodeId)
        : fullGraph;
    const links = visibleGraph.edges.map((edge) => ({
      __key: buildEdgeKey(edge),
      source: edge.source,
      target: edge.target,
      type: edge.type,
    }));
    const baseNodes = visibleGraph.nodes;

    if (hydratePayload.mode !== 'mindmap') {
      return {
        links,
        nodes: baseNodes,
      };
    }

    const layout = buildLearningGraphMindMapLayout({
      edges: hydratePayload.graph.edges,
      nodes: baseNodes,
    });

    return {
      links,
      nodes: baseNodes.map((node) => ({
        ...node,
        fx: layout[node.id]?.x ?? 0,
        fy: layout[node.id]?.y ?? 0,
        x: layout[node.id]?.x ?? 0,
        y: layout[node.id]?.y ?? 0,
      })),
    };
  }, [collapsedByNodeId, hydratePayload]);

  const childNodeIdsByNodeId = React.useMemo(() => {
    if (!hydratePayload || hydratePayload.mode !== 'mindmap') {
      return {} as Record<string, string[]>;
    }

    const childIdsByNodeId = Object.fromEntries(
      hydratePayload.graph.nodes.map((node) => [node.id, [] as string[]])
    );

    for (const edge of hydratePayload.graph.edges) {
      if (
        edge.type !== 'MINDMAP_CHILD' ||
        !childIdsByNodeId[edge.source] ||
        !childIdsByNodeId[edge.target]
      ) {
        continue;
      }

      childIdsByNodeId[edge.source].push(edge.target);
    }

    return childIdsByNodeId;
  }, [hydratePayload]);

  const selectedNeighborhoodNodeIds = React.useMemo(() => {
    if (!hydratePayload || !selectedNodeId) {
      return null;
    }

    return new Set([
      selectedNodeId,
      ...(hydratePayload.linkedNodeIdsByNodeId[selectedNodeId] ?? []),
    ]);
  }, [hydratePayload, selectedNodeId]);

  const highlightedEdgeKeys = React.useMemo(() => {
    if (!hydratePayload || !selectedNodeId) {
      return null;
    }

    return new Set(hydratePayload.edgeKeysByNodeId[selectedNodeId] ?? []);
  }, [hydratePayload, selectedNodeId]);

  const modeHighlightedNodeIds = React.useMemo(
    () => new Set(hydratePayload?.highlightedNodeIds ?? []),
    [hydratePayload]
  );

  const degreeByNodeId = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(hydratePayload?.linkedNodeIdsByNodeId ?? {}).map(([nodeId, linkedIds]) => [
          nodeId,
          linkedIds.length,
        ])
      ),
    [hydratePayload]
  );

  React.useEffect(() => {
    if (!hydratePayload) {
      return;
    }

    try {
      postStatus('effect:start');
      const graph = graphRef.current;
      if (!graph) {
        postStatus('effect:missingGraphRef');
        return;
      }

      graph.d3VelocityDecay(hydratePayload.config.velocityDecay);
      postStatus('effect:velocityDecay');

      const chargeForce = graph.d3Force('charge');
      if (chargeForce?.strength) {
        chargeForce.strength((node: RuntimeNode) => {
          switch (node.type) {
            case 'Book':
              return -300;
            case 'Section':
            case 'SourceAsset':
              return -240;
            case 'LessonStep':
            case 'Definition':
            case 'Theorem':
            case 'Method':
              return -190;
            case 'Claim':
            case 'Concept':
            case 'Formula':
              return -130;
            case 'Fragment':
              return -50;
            default:
              return -95;
          }
        });
      }
      postStatus('effect:chargeForce');

      const linkForce = graph.d3Force('link');
      if (linkForce?.distance) {
        linkForce.distance((link: RuntimeLink) => hydratePayload.config.linkDistances[link.type] ?? 80);
      }
      postStatus('effect:linkForce');

      graph.refresh?.();

      if (resolveLearningGraph2DViewportAction('hydrate') === 'fit') {
        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            graph.zoomToFit(800, 72);
            postStatus('viewport:zoomToFit');
          }, 60);
        });
      }
    } catch (error) {
      postToNative({
        message: formatRuntimeError(error),
        type: 'runtimeError',
      });
    }
  }, [hydratePayload, hydrateToken]);

  React.useEffect(() => {
    if (!hydratePayload) {
      return;
    }

    try {
      graphRef.current?.refresh?.();
      postStatus('viewport:preserve', selectedNodeId ?? undefined);
    } catch (error) {
      postToNative({
        message: formatRuntimeError(error),
        type: 'runtimeError',
      });
    }
  }, [hydratePayload, selectedNeighborhoodNodeIds, selectedNodeId]);

  if (!hydratePayload) {
    return null;
  }

  return (
    <RuntimeErrorBoundary>
      <ForceGraph2D
        autoPauseRedraw={false}
        backgroundColor={hydratePayload.theme.background}
        cooldownTicks={hydratePayload.config.cooldownTicks}
        d3AlphaDecay={0.03}
        enableNodeDrag={hydratePayload.mode !== 'mindmap'}
        graphData={graphData}
        height={viewport.height}
        linkColor={(link) => {
          const current = link as RuntimeLink;
          if (hydratePayload.mode === 'mindmap') {
            return '#7C8DB8';
          }
          if (!highlightedEdgeKeys) {
            const sourceId = resolveRuntimeLinkEndpointId(current.source);
            const targetId = resolveRuntimeLinkEndpointId(current.target);
            if (hydratePayload.mode === 'global') {
              return 'rgba(83, 113, 145, 0.42)';
            }
            if (
              modeHighlightedNodeIds.has(String(sourceId)) ||
              modeHighlightedNodeIds.has(String(targetId))
            ) {
              return hydratePayload.theme.edge;
            }
            return 'rgba(78, 99, 121, 0.16)';
          }

          return highlightedEdgeKeys.has(current.__key)
            ? hydratePayload.theme.edge
            : 'rgba(78, 99, 121, 0.08)';
        }}
        linkCurvature={(link) => {
          const current = link as RuntimeLink;
          if (hydratePayload.mode === 'mindmap') {
            return 0;
          }
          return current.source === current.target ? 0.25 : 0;
        }}
        linkCanvasObject={(link, ctx, globalScale) => {
          if (hydratePayload.mode !== 'mindmap') {
            return;
          }

          drawMindMapLink(
            ctx,
            link as RuntimeLink,
            globalScale,
            selectedNeighborhoodNodeIds,
            selectedNodeId,
            childNodeIdsByNodeId
          );
        }}
        linkDirectionalArrowLength={0}
        linkDirectionalArrowRelPos={1}
        linkWidth={(link) => {
          const current = link as RuntimeLink;
          if (hydratePayload.mode === 'mindmap') {
            return 0;
          }
          const emphasized =
            current.type === 'NEXT_STEP' ||
            current.type === 'TEACHES' ||
            current.type === 'TESTS';

          if (!highlightedEdgeKeys) {
            const sourceId = resolveRuntimeLinkEndpointId(current.source);
            const targetId = resolveRuntimeLinkEndpointId(current.target);
            if (hydratePayload.mode === 'global') {
              return emphasized ? 1.8 : 0.9;
            }
            if (
              modeHighlightedNodeIds.has(String(sourceId)) ||
              modeHighlightedNodeIds.has(String(targetId))
            ) {
              return emphasized ? 2.6 : 1.6;
            }
            return emphasized ? 1.2 : 0.56;
          }

          return highlightedEdgeKeys.has(current.__key) ? (emphasized ? 3.2 : 2.2) : 0.35;
        }}
        nodeCanvasObject={(node, ctx, globalScale) =>
          drawNodeObject(
            node as RuntimeNode,
            ctx,
            globalScale,
            hydratePayload,
            degreeByNodeId[(node as RuntimeNode).id] ?? 0,
            selectedNodeId,
            selectedNeighborhoodNodeIds,
            {
              collapsed: collapsedByNodeId[(node as RuntimeNode).id] ?? false,
              hasChildren: (childNodeIdsByNodeId[(node as RuntimeNode).id] ?? []).length > 0,
            }
          )
        }
        nodeCanvasObjectMode={() => 'replace'}
        nodeLabel={() => ''}
        nodePointerAreaPaint={(node, color, ctx) =>
          paintPointerArea(
            ctx,
            node as RuntimeNode,
            color,
            buildNodeRadius(
              node as RuntimeNode,
              hydratePayload,
              selectedNeighborhoodNodeIds,
              selectedNodeId
            ),
            hydratePayload
          )
        }
        onZoom={(transform) => {
          graphScaleRef.current = transform.k;
        }}
        onBackgroundClick={() => {
          const now = Date.now();
          const lastTap = (window as Window & { __lastBgTap?: number }).__lastBgTap ?? 0;
          (window as Window & { __lastBgTap?: number }).__lastBgTap = now;
          if (now - lastTap < 350) {
            graphRef.current?.zoomToFit(800, 72);
            (window as Window & { __lastBgTap?: number }).__lastBgTap = 0;
          }
          setSelectedNodeId(null);
          postToNative({ type: 'backgroundTap' });
        }}
        onNodeClick={(node, event) => {
          const current = node as RuntimeNode;
          const hasChildren = (childNodeIdsByNodeId[current.id] ?? []).length > 0;
          const graph = graphRef.current;

          if (hydratePayload.mode === 'mindmap' && hasChildren && graph) {
            const box = measureMindMapNodeBox(
              null,
              current,
              graphScaleRef.current,
              selectedNodeId === current.id
            );
            const nodeScreen = graph.graph2ScreenCoords(current.x ?? 0, current.y ?? 0);
            const clickX = typeof event.offsetX === 'number' ? event.offsetX : event.layerX;
            const clickY = typeof event.offsetY === 'number' ? event.offsetY : event.layerY;

            if (
              typeof clickX === 'number' &&
              typeof clickY === 'number' &&
              isLearningGraphMindMapToggleHit({
                boxWidth: box.width,
                graphPoint: { x: clickX, y: clickY },
                nodeCenter: nodeScreen,
              })
            ) {
              setCollapsedByNodeId((state) => ({
                ...state,
                [current.id]: !state[current.id],
              }));
              return;
            }
          }

          setSelectedNodeId(current.id);
          postToNative({ nodeId: current.id, type: 'nodeTap' });
        }}
        ref={graphRef as React.MutableRefObject<any>}
        width={viewport.width}
      />
    </RuntimeErrorBoundary>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}

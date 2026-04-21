import React from 'react';
import { createRoot } from 'react-dom/client';
import ForceGraph2D from 'react-force-graph-2d';

import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeInputMessage,
  LearningGraphRuntimeOutputMessage,
} from '../../lib/learning/graph-bridge';
import {
  resolveLearningGraph2DLabelVisibility,
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
  id: string;
  label: string;
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
  refresh?: () => unknown;
  zoomToFit: (durationMs?: number, padding?: number) => unknown;
};

function resolveRuntimeLinkEndpointId(endpoint: RuntimeLink['source']) {
  if (typeof endpoint === 'string') {
    return endpoint;
  }

  return (endpoint as { id?: string })?.id ?? null;
}

function buildEdgeKey(edge: { source: string; target: string; type: string }) {
  return `${edge.source}::${edge.target}::${edge.type}`;
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
  const fontSize = Math.max(9, Math.min(13, 13 / Math.max(globalScale, 0.75)));
  const paddingX = 7;
  const paddingY = 4;

  ctx.save();
  ctx.font = `${active ? '700' : '500'} ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
  const labelWidth = ctx.measureText(node.label).width;
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
  ctx.fillText(node.label, labelCenterX, labelCenterY + 0.5);
  ctx.restore();
}

function paintPointerArea(
  ctx: CanvasRenderingContext2D,
  node: RuntimeNode,
  color: string,
  radius: number
) {
  const x = typeof node.x === 'number' ? node.x : 0;
  const y = typeof node.y === 'number' ? node.y : 0;

  ctx.save();
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
  selectedNeighborhoodNodeIds: Set<string> | null
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
  const [hydrateToken, setHydrateToken] = React.useState(bootstrapPayload ? 1 : 0);

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

  const graphData = React.useMemo(() => {
    if (!hydratePayload) {
      return {
        links: [] as RuntimeLink[],
        nodes: [] as RuntimeNode[],
      };
    }

    return {
      links: hydratePayload.graph.edges.map((edge) => ({
        __key: buildEdgeKey(edge),
        source: edge.source,
        target: edge.target,
        type: edge.type,
      })),
      nodes: hydratePayload.graph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
      })),
    };
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
        enableNodeDrag
        graphData={graphData}
        height={viewport.height}
        linkColor={(link) => {
          const current = link as RuntimeLink;
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
          return current.source === current.target ? 0.25 : 0;
        }}
        linkDirectionalArrowLength={0}
        linkDirectionalArrowRelPos={1}
        linkWidth={(link) => {
          const current = link as RuntimeLink;
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
            selectedNeighborhoodNodeIds
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
            )
          )
        }
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
        onNodeClick={(node) => {
          const current = node as RuntimeNode;
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

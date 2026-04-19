import React from 'react';
import { createRoot } from 'react-dom/client';
import ForceGraph2D from 'react-force-graph-2d';

import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeInputMessage,
  LearningGraphRuntimeOutputMessage,
  LearningGraphRuntimeTheme,
} from '../../lib/learning/graph-bridge';
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

function buildEdgeKey(edge: { source: string; target: string; type: string }) {
  return `${edge.source}::${edge.target}::${edge.type}`;
}

function postToNative(message: LearningGraphRuntimeOutputMessage) {
  const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (value: string) => void } })
    .ReactNativeWebView;

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

function resolveNodeColor(type: string, theme: LearningGraphRuntimeTheme) {
  switch (type) {
    case 'Book':
      return theme.primary;
    case 'Concept':
      return theme.primary;
    case 'Fragment':
      return theme.fragment;
    case 'LessonStep':
      return theme.step;
    case 'SourceAsset':
      return theme.source;
    default:
      return theme.textSoft;
  }
}

function resolveLabelVisibility(
  node: RuntimeNode,
  zoom: number,
  selectedNodeId: string | null,
  conceptLabelZoom: number
) {
  if (node.type === 'Book' || node.type === 'SourceAsset' || node.type === 'LessonStep') {
    return true;
  }

  if (node.type === 'Concept') {
    return selectedNodeId === node.id || zoom >= conceptLabelZoom;
  }

  if (node.type === 'Fragment') {
    return selectedNodeId === node.id;
  }

  return false;
}

function App() {
  const graphRef = React.useRef<any>(null);
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

  const highlightedNodeIds = React.useMemo(() => {
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
              return -220;
            case 'SourceAsset':
            case 'LessonStep':
              return -180;
            case 'Concept':
              return -110;
            case 'Fragment':
              return -45;
            default:
              return -90;
          }
        });
      }
      postStatus('effect:chargeForce');

      const linkForce = graph.d3Force('link');
      if (linkForce?.distance) {
        linkForce.distance((link: RuntimeLink) => {
          return hydratePayload.config.linkDistances[link.type] ?? 80;
        });
      }
      postStatus('effect:linkForce');

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          try {
            graph.zoomToFit?.(300, 56);
            postStatus('effect:zoomToFit');
          } catch (error) {
            postToNative({
              message: formatRuntimeError(error),
              type: 'runtimeError',
            });
          }
        }, 60);
      });
    } catch (error) {
      postToNative({
        message: formatRuntimeError(error),
        type: 'runtimeError',
      });
    }
  }, [hydratePayload, hydrateToken]);

  if (!hydratePayload) {
    return null;
  }

  return (
    <RuntimeErrorBoundary>
      <ForceGraph2D
        backgroundColor={hydratePayload.theme.background}
        cooldownTicks={hydratePayload.config.cooldownTicks}
        enableNodeDrag={false}
        graphData={graphData}
        height={viewport.height}
        linkColor={(link) => {
          if (!highlightedEdgeKeys) {
            return hydratePayload.theme.edge;
          }

          return highlightedEdgeKeys.has((link as RuntimeLink).__key)
            ? hydratePayload.theme.edge
            : 'rgba(102, 98, 88, 0.08)';
        }}
        linkCurvature={(link) => {
          const current = link as RuntimeLink;
          return current.source === current.target ? 0.25 : 0;
        }}
        linkWidth={(link) => {
          const current = link as RuntimeLink;
          const emphasized =
            current.type === 'NEXT_STEP' ||
            current.type === 'TEACHES' ||
            current.type === 'TESTS';

          if (!highlightedEdgeKeys) {
            return emphasized ? 2 : 1;
          }

          return highlightedEdgeKeys.has(current.__key) ? (emphasized ? 2.2 : 1.4) : 0.6;
        }}
        nodeCanvasObject={(node, canvasContext, globalScale) => {
          const current = node as RuntimeNode;
          const radius = hydratePayload.config.nodeSizes[current.type] ?? 6;
          const highlighted = highlightedNodeIds?.has(current.id) ?? true;
          const active = selectedNodeId === current.id;
          const alpha = !highlightedNodeIds ? 0.94 : highlighted ? (active ? 1 : 0.92) : 0.16;

          canvasContext.save();
          canvasContext.globalAlpha = alpha;
          canvasContext.beginPath();
          canvasContext.arc(current.x ?? 0, current.y ?? 0, radius, 0, 2 * Math.PI, false);
          canvasContext.fillStyle = resolveNodeColor(current.type, hydratePayload.theme);
          canvasContext.fill();

          if (active || current.type === 'Book') {
            canvasContext.lineWidth = active ? 2 : 1.5;
            canvasContext.strokeStyle = hydratePayload.theme.surface ?? '#FFFFFF';
            canvasContext.stroke();
          }

          if (
            resolveLabelVisibility(
              current,
              globalScale,
              selectedNodeId,
              hydratePayload.config.conceptLabelZoom
            )
          ) {
            const fontSize = current.type === 'Book' ? 12 : current.type === 'Fragment' ? 10 : 11;
            canvasContext.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
            canvasContext.fillStyle = hydratePayload.theme.text;
            canvasContext.fillText(
              current.label,
              (current.x ?? 0) + radius + 4,
              (current.y ?? 0) + fontSize / 2
            );
          }

          canvasContext.restore();
        }}
        nodePointerAreaPaint={(node, color, canvasContext) => {
          const current = node as RuntimeNode;
          const radius = (hydratePayload.config.nodeSizes[current.type] ?? 6) + 6;
          canvasContext.fillStyle = color;
          canvasContext.beginPath();
          canvasContext.arc(current.x ?? 0, current.y ?? 0, radius, 0, 2 * Math.PI, false);
          canvasContext.fill();
        }}
        onBackgroundClick={() => {
          setSelectedNodeId(null);
          postToNative({ type: 'backgroundTap' });
        }}
        onNodeClick={(node) => {
          const current = node as RuntimeNode;
          setSelectedNodeId(current.id);
          postToNative({ nodeId: current.id, type: 'nodeTap' });
        }}
        ref={graphRef}
        width={viewport.width}
      />
    </RuntimeErrorBoundary>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}

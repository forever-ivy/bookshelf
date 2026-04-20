import React from 'react';
import { createRoot } from 'react-dom/client';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';

import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeInputMessage,
  LearningGraphRuntimeOutputMessage,
} from '../../lib/learning/graph-bridge';
import {
  resolveLearningGraph3DLabelVisibility,
  resolveLearningGraph3DNodeVisualState,
} from '../../lib/learning/graph-runtime-3d';
import { readLearningGraphBootstrapPayload } from '../../lib/learning/graph-runtime';
import { syncLearningGraphViewportSelection } from '../../lib/learning/graph-runtime-focus';

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
  z?: number;
};

type RuntimeGraphRef = {
  cameraPosition: (
    position: { x: number; y: number; z: number },
    lookAt?: { x: number; y: number; z: number },
    durationMs?: number
  ) => unknown;
  controls?: () => Record<string, unknown>;
  d3Force: (forceName: string) => { distance?: (value: (link: RuntimeLink) => number) => void; strength?: (value: (node: RuntimeNode) => number) => void } | undefined;
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

function buildLabelTextHeight(node: RuntimeNode) {
  switch (node.type) {
    case 'Book':
      return 12;
    case 'SourceAsset':
      return 9;
    case 'Fragment':
      return 6.5;
    default:
      return 8;
  }
}

function buildNodeObject(
  node: RuntimeNode,
  hydratePayload: LearningGraphHydratePayload,
  selectedNodeId: string | null,
  selectedNeighborhoodNodeIds: Set<string> | null
) {
  const radius = buildNodeRadius(node, hydratePayload, selectedNeighborhoodNodeIds, selectedNodeId);
  const visualState = resolveLearningGraph3DNodeVisualState(node, {
    generatedNodeIds: hydratePayload.generatedNodeIds,
    guideStatusByNodeId: hydratePayload.guideStatusByNodeId,
    highlightedNodeIds: hydratePayload.highlightedNodeIds,
    mode: hydratePayload.mode,
    selectedNeighborhoodNodeIds,
    selectedNodeId,
    theme: hydratePayload.theme,
  });
  const group = new Group();
  const sphere = new Mesh(
    new SphereGeometry(radius, 18, 18),
    new MeshStandardMaterial({
      color: visualState.color,
      emissive: visualState.color,
      emissiveIntensity: visualState.active ? 0.36 : visualState.emphasis !== 'normal' ? 0.16 : 0.05,
      metalness: 0.1,
      opacity: visualState.opacity,
      roughness: visualState.active ? 0.36 : 0.52,
      transparent: visualState.opacity < 1,
    })
  );
  group.add(sphere);

  if (visualState.generated || visualState.emphasis !== 'normal' || visualState.active) {
    const shell = new Mesh(
      new SphereGeometry(
        radius *
          (visualState.active
            ? 1.42
            : visualState.generated
              ? 1.34
              : 1.22),
        16,
        16
      ),
      new MeshBasicMaterial({
        color: visualState.generated ? hydratePayload.theme.explore : visualState.color,
        opacity: visualState.active ? 0.78 : 0.48,
        transparent: true,
        wireframe: true,
      })
    );
    group.add(shell);
  }

  const showLabel = resolveLearningGraph3DLabelVisibility(node, {
    generatedNodeIds: hydratePayload.generatedNodeIds,
    guideStatusByNodeId: hydratePayload.guideStatusByNodeId,
    highlightedNodeIds: hydratePayload.highlightedNodeIds,
    mode: hydratePayload.mode,
    selectedNeighborhoodNodeIds,
    selectedNodeId,
  });

  if (showLabel) {
    const textHeight = buildLabelTextHeight(node);
    const sprite = new SpriteText(node.label, textHeight, hydratePayload.theme.text);
    sprite.material.depthWrite = false;
    sprite.borderRadius = 4;
    sprite.borderWidth = visualState.active ? 1 : 0;
    sprite.borderColor = visualState.color;
    sprite.fontWeight = visualState.active ? '700' : '500';
    sprite.padding = 1;
    sprite.position.set(0, radius + textHeight * 0.9, 0);
    group.add(sprite);
  }

  return group;
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

  const runtimeNodeById = React.useMemo(
    () => Object.fromEntries(graphData.nodes.map((node) => [node.id, node])),
    [graphData.nodes]
  );

  const syncViewportToSelection = React.useCallback(
    (targetNodeId: string | null, retryCount = 0) => {
      const graph = graphRef.current;
      if (!graph || !hydratePayload) {
        postStatus('viewport:missingGraphRef');
        return;
      }

      const targetNode = targetNodeId ? runtimeNodeById[targetNodeId] ?? null : null;
      if (
        targetNodeId &&
        (!targetNode ||
          typeof targetNode.x !== 'number' ||
          typeof targetNode.y !== 'number' ||
          typeof targetNode.z !== 'number')
      ) {
        if (retryCount < 6) {
          window.setTimeout(() => {
            syncViewportToSelection(targetNodeId, retryCount + 1);
          }, 90);
          return;
        }
      }

      const status = syncLearningGraphViewportSelection(graph, targetNode, {
        cameraFocusDistanceByNodeType: hydratePayload.config.cameraFocusDistanceByNodeType,
        cameraFocusDurationMs: hydratePayload.config.cameraFocusDurationMs,
        resetWhenMissing: !targetNodeId,
      });

      if (status === 'focused' && targetNodeId) {
        postStatus('viewport:focusNode', targetNodeId);
        return;
      }

      if (status === 'reset') {
        postStatus(targetNodeId ? 'viewport:resetAfterMiss' : 'viewport:zoomToFit');
        return;
      }

      postStatus('viewport:preserve');
    },
    [hydratePayload, runtimeNodeById]
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
        linkForce.distance((link: RuntimeLink) => hydratePayload.config.linkDistances[link.type] ?? 80);
      }
      postStatus('effect:linkForce');

      const controls = graph.controls?.();
      if (controls && typeof controls === 'object') {
        (controls as { dynamicDampingFactor?: number }).dynamicDampingFactor = 0.12;
        (controls as { rotateSpeed?: number }).rotateSpeed = 2.2;
        (controls as { zoomSpeed?: number }).zoomSpeed = 1.05;
      }

      graph.refresh?.();

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          try {
            syncViewportToSelection(hydratePayload.selectedNodeId);
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
  }, [hydratePayload, hydrateToken, syncViewportToSelection]);

  React.useEffect(() => {
    if (!hydratePayload) {
      return;
    }

    try {
      graphRef.current?.refresh?.();
      syncViewportToSelection(selectedNodeId);
    } catch (error) {
      postToNative({
        message: formatRuntimeError(error),
        type: 'runtimeError',
      });
    }
  }, [hydratePayload, selectedNeighborhoodNodeIds, selectedNodeId, syncViewportToSelection]);

  if (!hydratePayload) {
    return null;
  }

  return (
    <RuntimeErrorBoundary>
      <ForceGraph3D
        backgroundColor={hydratePayload.theme.background}
        controlType={hydratePayload.config.controlType}
        cooldownTicks={hydratePayload.config.cooldownTicks}
        enableNodeDrag={false}
        graphData={graphData}
        height={viewport.height}
        linkColor={(link) => {
          const current = link as RuntimeLink;
          if (!highlightedEdgeKeys) {
            const sourceId = resolveRuntimeLinkEndpointId(current.source);
            const targetId = resolveRuntimeLinkEndpointId(current.target);
            if (hydratePayload.mode === 'global') {
              return 'rgba(83, 113, 145, 0.46)';
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
            : 'rgba(78, 99, 121, 0.14)';
        }}
        linkCurvature={(link) => {
          const current = link as RuntimeLink;
          return current.source === current.target ? 0.25 : 0;
        }}
        linkOpacity={1}
        linkResolution={10}
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
              return emphasized ? 1.3 : 0.72;
            }
            if (
              modeHighlightedNodeIds.has(String(sourceId)) ||
              modeHighlightedNodeIds.has(String(targetId))
            ) {
              return emphasized ? 2.1 : 1.35;
            }
            return emphasized ? 1.1 : 0.48;
          }

          return highlightedEdgeKeys.has(current.__key) ? (emphasized ? 2.2 : 1.45) : 0.42;
        }}
        nodeLabel={() => ''}
        nodeThreeObject={(node) =>
          buildNodeObject(
            node as RuntimeNode,
            hydratePayload,
            selectedNodeId,
            selectedNeighborhoodNodeIds
          )
        }
        onBackgroundClick={() => {
          setSelectedNodeId(null);
          postToNative({ type: 'backgroundTap' });
        }}
        onNodeClick={(node) => {
          const current = node as RuntimeNode;
          setSelectedNodeId(current.id);
          postToNative({ nodeId: current.id, type: 'nodeTap' });
        }}
        ref={graphRef as React.MutableRefObject<any>}
        showNavInfo={false}
        width={viewport.width}
      />
    </RuntimeErrorBoundary>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}

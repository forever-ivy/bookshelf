import React from 'react';
import { createRoot } from 'react-dom/client';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import {
  AdditiveBlending,
  DodecahedronGeometry,
  FogExp2,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
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
      return 24;
    case 'SourceAsset':
      return 18;
    case 'Fragment':
      return 13;
    default:
      return 16;
  }
}

function buildNodeGeometry(type: string, radius: number) {
  switch (type) {
    case 'Book':
      return new IcosahedronGeometry(radius, 1);
    case 'Concept':
      return new OctahedronGeometry(radius);
    case 'LessonStep':
      return new DodecahedronGeometry(radius);
    case 'SourceAsset':
      return new IcosahedronGeometry(radius, 0);
    case 'Fragment':
    default:
      return new SphereGeometry(radius, 20, 20);
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
  const glowColor = visualState.generated ? hydratePayload.theme.explore : visualState.color;

  // 1. Inner bright core — energy orb center
  const coreRadius = radius * 0.35;
  const core = new Mesh(
    new SphereGeometry(coreRadius, 12, 12),
    new MeshBasicMaterial({
      color: visualState.color,
      fog: false,
      opacity: visualState.active ? 0.95 : 0.8,
      transparent: true,
    })
  );
  group.add(core);

  // 2. Main body — type-specific crystal geometry
  const body = new Mesh(
    buildNodeGeometry(node.type, radius),
    new MeshStandardMaterial({
      color: visualState.color,
      emissive: visualState.color,
      emissiveIntensity: visualState.active ? 0.6 : visualState.emphasis !== 'normal' ? 0.3 : 0.12,
      metalness: 0.35,
      opacity: visualState.opacity,
      roughness: visualState.active ? 0.18 : 0.32,
      transparent: visualState.opacity < 1,
    })
  );
  group.add(body);

  // 3. Inner glow shell — close aura
  const innerGlowScale = visualState.active
    ? 1.4
    : visualState.generated
      ? 1.35
      : visualState.emphasis !== 'normal'
        ? 1.25
        : 1.15;
  const innerGlowOpacity = visualState.active
    ? 0.32
    : visualState.generated
      ? 0.24
      : visualState.emphasis !== 'normal'
        ? 0.18
        : 0.06;
  const innerGlow = new Mesh(
    new SphereGeometry(radius * innerGlowScale, 16, 16),
    new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: glowColor,
      depthWrite: false,
      fog: false,
      opacity: innerGlowOpacity,
      transparent: true,
    })
  );
  group.add(innerGlow);

  // 4. Outer glow shell — far aura for volumetric presence
  const outerGlowScale = visualState.active
    ? 2.0
    : visualState.generated
      ? 1.8
      : visualState.emphasis !== 'normal'
        ? 1.6
        : 1.45;
  const outerGlowOpacity = visualState.active
    ? 0.14
    : visualState.generated
      ? 0.1
      : visualState.emphasis !== 'normal'
        ? 0.07
        : 0.025;
  const outerGlow = new Mesh(
    new SphereGeometry(radius * outerGlowScale, 12, 12),
    new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: glowColor,
      depthWrite: false,
      fog: false,
      opacity: outerGlowOpacity,
      transparent: true,
    })
  );
  group.add(outerGlow);

  // 5. Wireframe cage for selected/emphasized nodes
  if (visualState.generated || visualState.emphasis !== 'normal' || visualState.active) {
    const wireScale = visualState.active ? 1.9 : visualState.generated ? 1.75 : 1.5;
    const wireShell = new Mesh(
      buildNodeGeometry(node.type, radius * wireScale),
      new MeshBasicMaterial({
        color: glowColor,
        opacity: visualState.active ? 0.55 : 0.28,
        transparent: true,
        wireframe: true,
      })
    );
    group.add(wireShell);
  }

  // 6. Label
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
    const sprite = new SpriteText(node.label, textHeight, '#ffffff');
    sprite.material.depthWrite = false;
    sprite.backgroundColor = visualState.active
      ? 'rgba(0, 0, 0, 0.65)'
      : 'rgba(0, 0, 0, 0.4)';
    sprite.borderRadius = 8;
    sprite.borderWidth = visualState.active ? 2 : 0.5;
    sprite.borderColor = visualState.active ? visualState.color : 'rgba(255, 255, 255, 0.12)';
    sprite.fontWeight = visualState.active ? '700' : '500';
    sprite.padding = 4;
    sprite.position.set(0, radius + textHeight * 1.2, 0);
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
  const autoRotateTimerRef = React.useRef<number | null>(null);

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

  const getCurrentCameraPosition = React.useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return null;
    try {
      const pos = (graph as any).camera?.()?.position;
      if (pos && typeof pos.x === 'number') {
        return { x: pos.x, y: pos.y, z: pos.z };
      }
    } catch {
      // camera access may not be available
    }
    return null;
  }, []);

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
        currentCameraPosition: getCurrentCameraPosition(),
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
    [getCurrentCameraPosition, hydratePayload, runtimeNodeById]
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
        (controls as any).enableDamping = true;
        (controls as any).dampingFactor = 0.22;
        (controls as any).rotateSpeed = 1.4;
        (controls as any).zoomSpeed = 0.85;
        (controls as any).autoRotate = true;
        (controls as any).autoRotateSpeed = 0.3;
        (controls as any).minDistance = 40;
        (controls as any).maxDistance = 800;
      }

      // Add fog for depth perception
      try {
        const scene = (graph as any).scene?.();
        if (scene) {
          scene.fog = new FogExp2(hydratePayload.theme.background, 0.0018);
        }
      } catch {
        // Scene access may not be available
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

  // Auto-rotation management: pause when a node is selected, resume when idle
  React.useEffect(() => {
    if (autoRotateTimerRef.current) {
      clearTimeout(autoRotateTimerRef.current);
      autoRotateTimerRef.current = null;
    }

    if (selectedNodeId) {
      const controls = graphRef.current?.controls?.() as any;
      if (controls) {
        controls.autoRotate = false;
      }
    } else {
      autoRotateTimerRef.current = window.setTimeout(() => {
        const controls = graphRef.current?.controls?.() as any;
        if (controls) {
          controls.autoRotate = true;
        }
      }, 3000);
    }

    return () => {
      if (autoRotateTimerRef.current) {
        clearTimeout(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }
    };
  }, [selectedNodeId]);

  if (!hydratePayload) {
    return null;
  }

  return (
    <RuntimeErrorBoundary>
      <ForceGraph3D
        backgroundColor={hydratePayload.theme.background}
        controlType={hydratePayload.config.controlType}
        cooldownTicks={hydratePayload.config.cooldownTicks}
        d3AlphaDecay={0.025}
        enableNodeDrag
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
            : 'rgba(78, 99, 121, 0.06)';
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

          return highlightedEdgeKeys.has(current.__key) ? (emphasized ? 3.0 : 2.0) : 0.3;
        }}
        linkDirectionalParticleColor={hydratePayload.theme.primary}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={1.2}
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
          const now = Date.now();
          const lastTap = (window as any).__lastBgTap ?? 0;
          (window as any).__lastBgTap = now;
          if (now - lastTap < 350) {
            // Double-tap: zoom to fit
            graphRef.current?.zoomToFit(800, 72);
            (window as any).__lastBgTap = 0;
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
        showNavInfo={false}
        warmupTicks={30}
        width={viewport.width}
      />
    </RuntimeErrorBoundary>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}

import type { LearningGraphMode, LearningGuideNodeStatus } from '@/lib/learning/graph';
import type { LearningGraph } from '@/lib/api/types';

export type LearningGraphRuntimeTheme = {
  background: string;
  borderSoft: string;
  edge: string;
  explore: string;
  fragment: string;
  primary: string;
  source: string;
  success: string;
  surface: string;
  step: string;
  text: string;
  textSoft: string;
  warning: string;
};

export type LearningGraphRuntimeConfig = {
  conceptLabelZoom: number;
  cooldownTicks: number;
  linkDistances: Record<string, number>;
  nodeSizes: Record<string, number>;
  velocityDecay: number;
};

export type LearningGraphHydratePayload = {
  config: LearningGraphRuntimeConfig;
  edgeKeysByNodeId: Record<string, string[]>;
  generatedNodeIds: string[];
  graph: LearningGraph;
  guideStatusByNodeId: Record<string, LearningGuideNodeStatus>;
  highlightedNodeIds: string[];
  linkedNodeIdsByNodeId: Record<string, string[]>;
  mode: LearningGraphMode;
  selectedNodeId: string | null;
  theme: LearningGraphRuntimeTheme;
};

export type LearningGraphRuntimeInputMessage =
  | {
      payload: LearningGraphHydratePayload;
      type: 'hydrate';
    }
  | {
      nodeId: string;
      type: 'focusNode';
    }
  | {
      type: 'clearSelection';
    };

export type LearningGraphRuntimeOutputMessage =
  | {
      type: 'backgroundTap';
    }
  | {
      nodeId: string;
      type: 'nodeTap';
    }
  | {
      detail?: string;
      phase: string;
      type: 'status';
    }
  | {
      message: string;
      type: 'runtimeError';
    }
  | {
      type: 'ready';
    };

import React from 'react';

import type {
  LearningStudyMode,
  LearningWorkspaceContextValue,
  LearningWorkspaceInfoPanel,
  LearningWorkspaceTab,
} from '@/components/learning/learning-workspace-provider';

export const LearningWorkspaceContext =
  React.createContext<LearningWorkspaceContextValue | null>(null);

export type {
  LearningStudyMode,
  LearningWorkspaceContextValue,
  LearningWorkspaceInfoPanel,
  LearningWorkspaceTab,
};

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import {
  LearningWorkspaceInfoSheetContent,
  type LearningWorkspaceInfoPanel,
} from '@/components/learning/learning-workspace-info-sheet';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';

function resolveInfoPanel(panel: string | string[] | undefined): LearningWorkspaceInfoPanel | null {
  const normalized = Array.isArray(panel) ? panel[0] : panel;

  if (normalized === 'sources' || normalized === 'path' || normalized === 'highlights') {
    return normalized;
  }

  return null;
}

export default function LearningWorkspaceInfoSheetRoute() {
  const { panel } = useLocalSearchParams<{ panel?: string | string[] }>();
  const {
    highlightCards,
    profile,
    sourceCards,
    sourceSummary,
    workspaceSession,
  } = useLearningWorkspaceScreen();
  const resolvedPanel = resolveInfoPanel(panel);

  if (!profile || !workspaceSession || !resolvedPanel) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <LearningWorkspaceInfoSheetContent
        completedSteps={workspaceSession.completedSteps}
        currentStepIndex={workspaceSession.currentStepIndex}
        highlightCards={highlightCards}
        panel={resolvedPanel}
        sourceCards={sourceCards}
        sourceSummary={sourceSummary}
        steps={profile.curriculum}
      />
    </View>
  );
}

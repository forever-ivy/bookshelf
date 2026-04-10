import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import {
  TutorWorkspaceInfoSheetContent,
  type TutorWorkspaceInfoPanel,
} from '@/components/tutor/tutor-workspace-info-sheet';
import { useTutorWorkspaceScreen } from '@/components/tutor/tutor-workspace-provider';

function resolveInfoPanel(panel: string | string[] | undefined): TutorWorkspaceInfoPanel | null {
  const normalized = Array.isArray(panel) ? panel[0] : panel;

  if (normalized === 'sources' || normalized === 'path' || normalized === 'highlights') {
    return normalized;
  }

  return null;
}

export default function TutorWorkspaceInfoSheetRoute() {
  const { panel } = useLocalSearchParams<{ panel?: string | string[] }>();
  const {
    highlightCards,
    profile,
    sourceCards,
    sourceSummary,
    workspaceSession,
  } = useTutorWorkspaceScreen();
  const resolvedPanel = resolveInfoPanel(panel);

  if (!profile || !workspaceSession || !resolvedPanel) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <TutorWorkspaceInfoSheetContent
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

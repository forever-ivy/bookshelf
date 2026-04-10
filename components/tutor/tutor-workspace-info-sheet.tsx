import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { TutorProgressRail } from '@/components/tutor/tutor-progress-rail';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { TutorCompletedStep, TutorCurriculumStep } from '@/lib/api';
import type {
  TutorWorkspaceInsightCard,
  TutorWorkspaceSourceCard,
} from '@/lib/tutor/mock-chat';

export type TutorWorkspaceInfoPanel = 'highlights' | 'path' | 'sources';

function WorkspaceSourceCard({
  excerpt,
  meta,
  title,
}: TutorWorkspaceSourceCard) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceKnowledge,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
      }}>
      <Text
        style={{
          color: theme.colors.textSoft,
          ...theme.typography.medium,
          fontSize: 11,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        }}>
        {meta}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.semiBold,
          fontSize: 15,
        }}>
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 13,
          lineHeight: 20,
        }}>
        {excerpt}
      </Text>
    </View>
  );
}

function WorkspaceSignalCard({
  body,
  title,
  tone,
}: TutorWorkspaceInsightCard) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'success'
      ? {
          backgroundColor: theme.colors.successSoft,
          color: theme.colors.success,
        }
      : tone === 'warning'
        ? {
            backgroundColor: theme.colors.warningSoft,
            color: theme.colors.warning,
          }
        : {
            backgroundColor: theme.colors.primarySoft,
            color: theme.colors.primaryStrong,
          };

  return (
    <View
      style={{
        backgroundColor: palette.backgroundColor,
        borderRadius: theme.radii.lg,
        gap: 4,
        padding: theme.spacing.lg,
      }}>
      <Text
        style={{
          color: palette.color,
          ...theme.typography.semiBold,
          fontSize: 14,
        }}>
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 13,
          lineHeight: 19,
        }}>
        {body}
      </Text>
    </View>
  );
}

function getPanelTitle(panel: TutorWorkspaceInfoPanel) {
  switch (panel) {
    case 'sources':
      return '当前来源';
    case 'path':
      return '导学路径';
    case 'highlights':
      return '学习提示';
  }
}

function getPanelDescription(
  panel: TutorWorkspaceInfoPanel,
  sourceSummary: string
) {
  switch (panel) {
    case 'sources':
      return sourceSummary;
    case 'path':
      return '按当前节奏看一眼整条导学路径，知道自己已经走到哪里。';
    case 'highlights':
      return '把导师正在盯的重点、通过标准和下一步推进点收在这里。';
  }
}

export function TutorWorkspaceInfoSheetContent({
  completedSteps,
  currentStepIndex,
  highlightCards,
  panel,
  sourceCards,
  sourceSummary,
  steps,
}: {
  completedSteps: TutorCompletedStep[];
  currentStepIndex: number;
  highlightCards: TutorWorkspaceInsightCard[];
  panel: TutorWorkspaceInfoPanel | null;
  sourceCards: TutorWorkspaceSourceCard[];
  sourceSummary: string;
  steps: TutorCurriculumStep[];
}) {
  const { theme } = useAppTheme();

  if (!panel) {
    return null;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        gap: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
      style={{
        flex: 1,
      }}>
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 24,
            }}>
            {getPanelTitle(panel)}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 21,
            }}>
            {getPanelDescription(panel, sourceSummary)}
          </Text>
        </View>
      </View>

      <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.md }}>
        {panel === 'sources'
          ? sourceCards.map((card) => <WorkspaceSourceCard key={card.id} {...card} />)
          : null}

        {panel === 'path' ? (
          <TutorProgressRail
            completedSteps={completedSteps}
            currentStepIndex={currentStepIndex}
            steps={steps}
          />
        ) : null}

        {panel === 'highlights'
          ? highlightCards.map((card) => <WorkspaceSignalCard key={card.id} {...card} />)
          : null}
      </View>
    </ScrollView>
  );
}

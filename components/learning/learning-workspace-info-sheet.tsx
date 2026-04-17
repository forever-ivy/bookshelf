import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { LearningProgressRail } from '@/components/learning/learning-progress-rail';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningCompletedStep, LearningCurriculumStep } from '@/lib/api';
import type {
  LearningWorkspaceInsightCard,
  LearningWorkspaceSourceCard,
} from '@/lib/learning/workspace';

export type LearningWorkspaceInfoPanel = 'highlights' | 'path' | 'sources';

function WorkspaceSourceCard({
  excerpt,
  meta,
  title,
}: LearningWorkspaceSourceCard) {
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
}: LearningWorkspaceInsightCard) {
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

function getPanelTitle(panel: LearningWorkspaceInfoPanel) {
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
  panel: LearningWorkspaceInfoPanel,
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

export function LearningWorkspaceInfoSheetContent({
  completedSteps,
  currentStepIndex,
  highlightCards,
  panel,
  sourceCards,
  sourceSummary,
  steps,
}: {
  completedSteps: LearningCompletedStep[];
  currentStepIndex: number;
  highlightCards: LearningWorkspaceInsightCard[];
  panel: LearningWorkspaceInfoPanel | null;
  sourceCards: LearningWorkspaceSourceCard[];
  sourceSummary: string;
  steps: LearningCurriculumStep[];
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
          <LearningProgressRail
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

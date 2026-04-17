import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';

type LearningWorkspaceLoadingAction = {
  label: string;
  onPress: () => void;
  testID?: string;
  variant?: 'accent' | 'prominent' | 'soft';
};

export function LearningWorkspaceLoadingState({
  description,
  primaryAction,
  secondaryAction,
  title,
  tone = 'neutral',
}: {
  description: string;
  primaryAction?: LearningWorkspaceLoadingAction;
  secondaryAction?: LearningWorkspaceLoadingAction;
  title: string;
  tone?: 'danger' | 'neutral' | 'warning';
}) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'danger'
      ? {
          accent: theme.colors.warning,
          backgroundColor: theme.colors.surfaceKnowledge,
        }
      : {
          accent: theme.colors.primaryStrong,
          backgroundColor: theme.colors.surfaceKnowledge,
        };

  return (
    <PageShell mode="workspace">
      <View
        style={{
          backgroundColor: palette.backgroundColor,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}>
        <Text
          style={{
            color: palette.accent,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}>
          导学工作区
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 26,
            lineHeight: 32,
          }}>
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          {description}
        </Text>

        {primaryAction || secondaryAction ? (
          <View style={{ gap: theme.spacing.sm }}>
            {primaryAction ? (
              <PillButton
                fullWidth
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                testID={primaryAction.testID}
                variant={primaryAction.variant ?? 'accent'}
              />
            ) : null}
            {secondaryAction ? (
              <PillButton
                fullWidth
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                testID={secondaryAction.testID}
                variant={secondaryAction.variant ?? 'soft'}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </PageShell>
  );
}

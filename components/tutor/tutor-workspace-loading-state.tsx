import React from 'react';
import { Text, View } from 'react-native';

import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';

export function TutorWorkspaceLoadingState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <PageShell mode="workspace">
      <View
        style={{
          backgroundColor: theme.colors.surfaceKnowledge,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}>
        <Text
          style={{
            color: theme.colors.primaryStrong,
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
      </View>
    </PageShell>
  );
}

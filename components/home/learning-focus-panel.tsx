import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { homeLearningFocus } from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export function LearningFocusPanel() {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceKnowledge,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        boxShadow: theme.shadows.card,
        gap: theme.spacing.lg,
        overflow: 'hidden',
        padding: theme.spacing.xl,
      }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.knowledgeStrong,
            ...theme.typography.semiBold,
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          知识工作台
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 28,
            lineHeight: 32,
          }}>
          {homeLearningFocus.title}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          {homeLearningFocus.summary}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        {homeLearningFocus.bullets.map((item) => (
          <View
            key={item}
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
            }}>
            <View
              style={{
                backgroundColor: theme.colors.knowledgeStrong,
                borderRadius: theme.radii.pill,
                height: 8,
                marginTop: 7,
                width: 8,
              }}
            />
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.medium,
                flex: 1,
                fontSize: 14,
                lineHeight: 20,
              }}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      <PillButton icon="spark" label={homeLearningFocus.action} />
    </View>
  );
}

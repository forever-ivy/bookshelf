import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { TutorCompletedStep, TutorCurriculumStep } from '@/lib/api';

export function TutorProgressRail({
  completedSteps,
  currentStepIndex,
  steps,
}: {
  completedSteps: TutorCompletedStep[];
  currentStepIndex: number;
  steps: TutorCurriculumStep[];
}) {
  const { theme } = useAppTheme();
  const completedIndices = new Set(completedSteps.map((item) => item.stepIndex));

  return (
    <View
      style={{
        gap: theme.spacing.lg,
      }}>
      {steps.map((step, index) => {
        const isCompleted = completedIndices.has(index);
        const isCurrent = !isCompleted && index === currentStepIndex;

        return (
          <View key={step.id} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ alignItems: 'center', width: 20 }}>
              <View
                style={{
                  backgroundColor: isCompleted
                    ? theme.colors.success
                    : isCurrent
                      ? theme.colors.primaryStrong
                      : theme.colors.surfaceMuted,
                  borderColor: isCurrent ? theme.colors.primaryStrong : 'transparent',
                  borderRadius: theme.radii.pill,
                  borderWidth: isCurrent ? 2 : 0,
                  height: 12,
                  marginTop: 5,
                  width: 12,
                }}
              />
              {index < steps.length - 1 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.borderSoft,
                    flex: 1,
                    marginTop: 6,
                    width: 1,
                  }}
                />
              ) : null}
            </View>

            <View style={{ flex: 1, gap: 4, paddingBottom: index < steps.length - 1 ? theme.spacing.sm : 0 }}>
              <Text
                style={{
                  color: isCurrent ? theme.colors.primaryStrong : theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 14,
                }}>
                {step.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 19,
                }}>
                {step.goal ?? step.guidingQuestion ?? '等待继续推进'}
              </Text>
              <Text
                style={{
                  color: isCompleted ? theme.colors.success : theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 11,
                }}>
                {isCompleted ? '已完成' : isCurrent ? '进行中' : '待开始'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

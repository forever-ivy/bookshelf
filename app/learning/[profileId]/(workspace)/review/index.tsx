import { Stack } from 'expo-router';
import { CheckCircle2, Target } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { PillButton } from '@/components/base/pill-button';
import {
  LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE,
  LEARNING_WORKSPACE_TOP_CHROME_OFFSET,
  LearningWorkspaceScaffold,
} from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLearningReport } from '@/lib/api/learning';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const CheckCircleIcon = CheckCircle2 as IconComponent;
const TargetIcon = Target as IconComponent;

export default function LearningWorkspaceReviewScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const { navigateToStudyMode, profile, workspaceSession } = useLearningWorkspaceScreen();
  const topChromePadding =
    insets.top +
    LEARNING_WORKSPACE_TOP_CHROME_OFFSET +
    LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE +
    theme.spacing.lg;

  const { data: reportData } = useQuery({
    queryKey: ['learning', 'report', workspaceSession?.id],
    queryFn: () => getLearningReport(workspaceSession!.id, token),
    enabled: !!workspaceSession?.id && !!token,
  });

  const totalSteps = profile?.curriculum.length || 1;
  const completedSteps = workspaceSession?.completedStepsCount || 0;
  const sessionMastery = reportData?.report?.masteryScore ?? reportData?.masteryScore ?? null;
  const progressRatio = sessionMastery != null ? sessionMastery / 100 : completedSteps / totalSteps;
  const weakPoints = reportData?.report?.weakPoints ?? reportData?.weakPoints ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShadowVisible: false, title: '' }} />
      <LearningWorkspaceScaffold showHeader={false} subtitle="阶段复盘">
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topChromePadding }]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          <View style={{ gap: theme.spacing.sm }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 36,
                letterSpacing: -1,
                lineHeight: 42,
              }}>
              阶段复盘
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              把这轮学习的掌握度、当前停留的位置和下一步建议收在一起，方便回到主线继续推进。
            </Text>
          </View>

          <View
            style={[
              styles.primaryCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
              },
            ]}>
            <Text
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.semiBold,
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}>
              Current Mastery
            </Text>

            <View style={styles.masteryScoreRow}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 80,
                  letterSpacing: -2,
                  lineHeight: 82,
                }}>
                {Math.round(progressRatio * 100)}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.semiBold,
                  fontSize: 28,
                  marginBottom: 10,
                }}>
                %
              </Text>
            </View>

            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {sessionMastery != null
                ? `当前回答质量对应 ${Math.round(progressRatio * 100)} 分掌握度，已完成 ${completedSteps}/${totalSteps} 个学习阶段。`
                : `还没有生成百分制掌握度，当前已完成 ${completedSteps}/${totalSteps} 个学习阶段。`}
            </Text>

            <View
              style={[
                styles.progressBarBg,
                { backgroundColor: theme.colors.borderSoft },
              ]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: theme.colors.primaryStrong, width: `${progressRatio * 100}%` },
                ]}
              />
            </View>
          </View>

          <View
            style={[
              styles.secondaryCard,
              {
                backgroundColor: theme.colors.surfaceTint,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.semiBold,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}>
                Learning Journey
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 28,
                  letterSpacing: -0.7,
                  lineHeight: 33,
                }}>
                {completedSteps >= totalSteps
                  ? '当前学习旅程已完成'
                  : `当前停留在「${workspaceSession?.currentStepTitle ?? '返回主线'}」`}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 21,
                }}>
                已完成的步骤会保留，当前步骤会被高亮，便于你判断是继续深入还是先回到主线收束。
              </Text>
            </View>

            <View style={styles.stepsList}>
              {profile?.curriculum.map((step, index) => {
                const isCompleted = index < completedSteps;
                const isCurrent = index === completedSteps;

                return (
                  <View
                    key={step.id ?? index}
                    style={[
                      styles.stepRow,
                      index !== 0
                        ? {
                            borderTopColor: theme.colors.borderSoft,
                            borderTopWidth: 1,
                          }
                        : null,
                    ]}>
                    <View style={styles.stepIcon}>
                      {isCompleted ? (
                        <CheckCircleIcon color={theme.colors.success} size={22} />
                      ) : isCurrent ? (
                        <TargetIcon color={theme.colors.primaryStrong} size={22} />
                      ) : (
                        <View
                          style={[
                            styles.emptyCircle,
                            { borderColor: theme.colors.textSoft },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.stepInfo}>
                      <Text
                        style={{
                          color:
                            isCompleted || isCurrent ? theme.colors.text : theme.colors.textSoft,
                          ...theme.typography.semiBold,
                          fontSize: 15,
                          lineHeight: 22,
                        }}>
                        {step.title}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {weakPoints.length > 0 ? (
            <View
              style={[
                styles.primaryCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                },
              ]}>
              <View style={{ gap: theme.spacing.xs }}>
                <Text
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.semiBold,
                    fontSize: 11,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}>
                  Weak Points
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.heading,
                    fontSize: 28,
                    letterSpacing: -0.7,
                    lineHeight: 33,
                  }}>
                  需要加强
                </Text>
              </View>
              <View style={styles.weakPointsList}>
                {weakPoints.map((concept: string, index: number) => (
                  <Text
                    key={`${concept}-${index}`}
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.medium,
                      fontSize: 14,
                      lineHeight: 21,
                    }}>
                    • {concept}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.primaryCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
              },
            ]}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 28,
                  letterSpacing: -0.7,
                  lineHeight: 33,
                }}>
                下一步操作
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 21,
                }}>
                建议先回到 Guide 主线，把这轮自由探索里已经确认的内容收编回当前步骤。
              </Text>
            </View>

            <View style={{ paddingTop: theme.spacing.xs }}>
              <PillButton label="继续 Guide 主线" onPress={() => navigateToStudyMode('guide')} variant="glass" />
            </View>
          </View>
        </ScrollView>
      </LearningWorkspaceScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  emptyCircle: {
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    opacity: 0.3,
    width: 22,
  },
  masteryScoreRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  primaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 20,
    padding: 20,
  },
  progressBarBg: {
    borderRadius: 8,
    height: 12,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    borderRadius: 8,
    height: '100%',
  },
  scrollContent: {
    gap: 28,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  secondaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 20,
    padding: 20,
  },
  stepIcon: {
    marginTop: 2,
  },
  stepInfo: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
  },
  stepsList: {
    gap: 0,
  },
  weakPointsList: {
    gap: 8,
  },
});

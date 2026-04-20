import { Compass, History, Network } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const CompassIcon = Compass as IconComponent;
const HistoryIcon = History as IconComponent;
const NetworkIcon = Network as IconComponent;

function OverviewActionCard({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <View
        style={[
          styles.actionIconWrap,
          {
            backgroundColor: theme.colors.primarySoft,
          },
        ]}>
        {icon}
      </View>
      <Text
        style={[
          styles.actionTitle,
          {
            color: theme.colors.text,
            fontFamily: theme.typography.semiBold.fontFamily,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.actionDescription,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.body.fontFamily,
          },
        ]}>
        {description}
      </Text>
    </Pressable>
  );
}

export default function LearningWorkspaceOverviewRoute() {
  const { theme } = useAppTheme();
  const {
    closeWorkspace,
    highlightCards,
    navigateToStudyMode,
    navigateToTab,
    openInfoSheet,
    profile,
    sourceCount,
    sourceSummary,
    workspaceGate,
    workspaceSession,
  } = useLearningWorkspaceScreen();

  if (workspaceGate.kind !== 'ready' || !profile || !workspaceSession) {
    return (
      <LearningWorkspaceLoadingState
        description={workspaceGate.description}
        secondaryAction={{
          label: '返回导学本库',
          onPress: closeWorkspace,
        }}
        title={workspaceGate.title}
        visualState={workspaceGate.kind === 'loading' ? 'skeleton' : 'copy'}
      />
    );
  }

  const currentStep = profile.curriculum[workspaceSession.currentStepIndex] ?? null;

  return (
    <PageShell mode="workspace" insetBottom={80}>
      <View style={styles.topRow}>
        <SecondaryBackButton label="返回学习区" variant="inline" />
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
        <Text
          style={[
            styles.summaryEyebrow,
            {
              color: theme.colors.primaryStrong,
              fontFamily: theme.typography.semiBold.fontFamily,
            },
          ]}>
          导学概览
        </Text>
        <Text
          style={[
            styles.summaryTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.bold.fontFamily,
            },
          ]}>
          {profile.title}
        </Text>
        <Text
          style={[
            styles.summaryDescription,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.body.fontFamily,
            },
          ]}>
          {sourceSummary}
        </Text>

        <View style={styles.summaryMetrics}>
          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: theme.colors.surfaceTint,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <Text
              style={[
                styles.metricLabel,
                {
                  color: theme.colors.textSoft,
                  fontFamily: theme.typography.semiBold.fontFamily,
                },
              ]}>
              当前进度
            </Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color: theme.colors.text,
                  fontFamily: theme.typography.bold.fontFamily,
                },
              ]}>
              {workspaceSession.progressLabel}
            </Text>
          </View>
          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: theme.colors.surfaceTint,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <Text
              style={[
                styles.metricLabel,
                {
                  color: theme.colors.textSoft,
                  fontFamily: theme.typography.semiBold.fontFamily,
                },
              ]}>
              当前重点
            </Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color: theme.colors.text,
                  fontFamily: theme.typography.bold.fontFamily,
                },
              ]}>
              {workspaceSession.currentStepTitle ?? '继续主线'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryActions}>
          <PillButton
            fullWidth
            label="继续 Explore"
            onPress={() => navigateToStudyMode('explore')}
            variant="accent"
          />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle
          description="从概览页继续当前主题的深挖，或者切到图谱、复盘查看全局。"
          title="继续方式"
        />
        <View style={styles.actionGrid}>
          <OverviewActionCard
            description="从当前步骤发散提问，再把结论收编回主线。"
            icon={<CompassIcon color={theme.colors.primaryStrong} size={18} />}
            onPress={() => navigateToStudyMode('explore')}
            title={currentStep ? `继续探索：${currentStep.title}` : '继续 Explore'}
          />
          <OverviewActionCard
            description={`查看 ${sourceCount} 份来源如何被组织成概念图谱。`}
            icon={<NetworkIcon color={theme.colors.primaryStrong} size={18} />}
            onPress={() => navigateToTab('graph')}
            title="图谱"
          />
          <OverviewActionCard
            description="回看已完成节点、掌握度和下一步建议。"
            icon={<HistoryIcon color={theme.colors.primaryStrong} size={18} />}
            onPress={() => navigateToTab('review')}
            title="复盘"
          />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle
          description="概览只保留最值得看的摘要，详细内容继续走 info sheet。"
          title="重点摘要"
        />
        <View style={styles.summaryList}>
          {highlightCards.slice(0, 3).map((card) => (
            <View
              key={card.id}
              style={[
                styles.highlightCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderSoft,
                },
              ]}>
              <Text
                style={[
                  styles.highlightTitle,
                  {
                    color: theme.colors.text,
                    fontFamily: theme.typography.semiBold.fontFamily,
                  },
                ]}>
                {card.title}
              </Text>
              <Text
                style={[
                  styles.highlightBody,
                  {
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.body.fontFamily,
                  },
                ]}>
                {card.body}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.sheetActions}>
          <PillButton label="学习提示" onPress={() => openInfoSheet('highlights')} variant="soft" />
          <PillButton label="导学路径" onPress={() => openInfoSheet('path')} variant="soft" />
          <PillButton label="当前来源" onPress={() => openInfoSheet('sources')} variant="soft" />
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    borderRadius: 22,
    borderWidth: 1,
    flexBasis: '48%',
    gap: 10,
    minHeight: 154,
    padding: 18,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionTitle: {
    fontSize: 16,
  },
  highlightBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  highlightCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  highlightTitle: {
    fontSize: 14,
  },
  metricCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 92,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 17,
    lineHeight: 22,
  },
  sectionBlock: {
    gap: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryActions: {
    gap: 10,
  },
  summaryCard: {
    borderRadius: 26,
    borderWidth: 1,
    gap: 18,
    padding: 22,
  },
  summaryDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  summaryEyebrow: {
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryList: {
    gap: 12,
  },
  summaryMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  topRow: {
    marginBottom: -8,
  },
});

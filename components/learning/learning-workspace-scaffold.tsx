import { EllipsisVertical, Network, BookOpen, Compass, History, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import {
  useLearningWorkspaceScreen,
  type LearningWorkspaceInfoPanel,
  type LearningWorkspaceMode,
} from '@/components/learning/learning-workspace-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const MODE_ITEMS: Array<{
  icon: IconComponent;
  label: string;
  mode: LearningWorkspaceMode;
}> = [
  { icon: BookOpen as IconComponent, label: 'Guide', mode: 'guide' },
  { icon: Compass as IconComponent, label: 'Explore', mode: 'explore' },
  { icon: Network as IconComponent, label: '图谱', mode: 'graph' },
  { icon: History as IconComponent, label: '复盘', mode: 'review' },
];

const CloseIcon = X as IconComponent;
const MenuIcon = EllipsisVertical as IconComponent;

function resolveInfoPanelForMode(mode: LearningWorkspaceMode): LearningWorkspaceInfoPanel {
  if (mode === 'graph') {
    return 'sources';
  }

  if (mode === 'review') {
    return 'path';
  }

  return 'highlights';
}

export function LearningWorkspaceScaffold({
  children,
  footer,
  mode,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  mode: LearningWorkspaceMode;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    activeMode,
    closeWorkspace,
    isRetryPending,
    navigateToMode,
    openInfoSheet,
    profile,
    retryGenerate,
    workspaceGate,
    workspaceSession,
  } = useLearningWorkspaceScreen();

  if (workspaceGate.kind !== 'ready' || !profile || !workspaceSession) {
    return (
      <LearningWorkspaceLoadingState
        description={workspaceGate.description}
        primaryAction={
          workspaceGate.kind === 'not_started'
            ? {
                label: isRetryPending ? '重新触发中...' : '重新触发生成',
                onPress: () => {
                  void retryGenerate(profile?.id);
                },
              }
            : workspaceGate.kind === 'failed'
              ? {
                  label: isRetryPending ? '重新生成中...' : '重新生成',
                  onPress: () => {
                    void retryGenerate(profile?.id);
                  },
                }
              : undefined
        }
        secondaryAction={{
          label: '返回导学本库',
          onPress: closeWorkspace,
        }}
        title={workspaceGate.title}
        tone={workspaceGate.kind === 'failed' ? 'danger' : 'neutral'}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundWorkspace }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.backgroundWorkspace,
            borderBottomColor: theme.colors.borderSoft,
            paddingTop: Math.max(insets.top, theme.spacing.lg),
          },
        ]}>
        <Pressable
          accessibilityLabel="返回导学本库"
          accessibilityRole="button"
          hitSlop={8}
          onPress={closeWorkspace}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
          testID="learning-workspace-close-button">
          <CloseIcon color={theme.colors.text} size={18} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.headerText}>
          <Text
            numberOfLines={1}
            style={[
              styles.progressLabel,
              { color: theme.colors.textSoft, fontFamily: theme.typography.semiBold.fontFamily },
            ]}>
            {workspaceSession.progressLabel}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              { color: theme.colors.text, fontFamily: theme.typography.bold.fontFamily },
            ]}>
            {profile.title}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="打开导学详情"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => openInfoSheet(resolveInfoPanelForMode(mode))}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
          testID="learning-workspace-info-button">
          <MenuIcon color={theme.colors.text} size={18} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.content}>{children}</View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}

      <View
        style={[
          styles.modeBarOuter,
          {
            backgroundColor: theme.colors.backgroundWorkspace,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          },
        ]}>
        <View
          style={[
            styles.modeBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}>
          {MODE_ITEMS.map((item) => {
            const isActive = activeMode === item.mode;
            const Icon = item.icon;

            return (
              <Pressable
                key={item.mode}
                accessibilityLabel={`切换到${item.label}`}
                accessibilityRole="button"
                onPress={() => navigateToMode(item.mode)}
                style={({ pressed }) => [
                  styles.modeButton,
                  {
                    backgroundColor: isActive ? theme.colors.primarySoft : 'transparent',
                    opacity: pressed && !isActive ? 0.7 : 1,
                  },
                ]}
                testID={`learning-workspace-tab-${item.mode}`}>
                <Icon
                  color={isActive ? theme.colors.primaryStrong : theme.colors.textSoft}
                  size={18}
                  strokeWidth={2.15}
                />
                <Text
                  style={{
                    color: isActive ? theme.colors.primaryStrong : theme.colors.textSoft,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerText: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  modeBar: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  modeBarOuter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 18,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  progressLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
  },
});

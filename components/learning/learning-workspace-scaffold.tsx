import { EllipsisVertical, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const CloseIcon = X as IconComponent;
const MenuIcon = EllipsisVertical as IconComponent;

export const LEARNING_WORKSPACE_TAB_BAR_CLEARANCE = 56;

export function LearningWorkspaceScaffold({
  children,
  footer,
  showHeader = true,
  subtitle,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  showHeader?: boolean;
  subtitle?: string;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    closeWorkspace,
    isRetryPending,
    openOverview,
    profile,
    retryGenerate,
    workspaceGate,
    workspaceSession,
  } = useLearningWorkspaceScreen();
  const footerBottomOffset = LEARNING_WORKSPACE_TAB_BAR_CLEARANCE + insets.bottom;

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
      {showHeader ? (
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
              {subtitle ?? workspaceSession.progressLabel}
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
            accessibilityLabel="打开导学概览"
            accessibilityRole="button"
            hitSlop={8}
            onPress={openOverview}
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
      ) : null}

      <View style={styles.content}>{children}</View>

      {footer ? (
        <View
          testID="learning-workspace-footer"
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.backgroundWorkspace,
              marginBottom: footerBottomOffset,
              paddingBottom: theme.spacing.md,
            },
          ]}>
          {footer}
        </View>
      ) : null}
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
  progressLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
  },
});

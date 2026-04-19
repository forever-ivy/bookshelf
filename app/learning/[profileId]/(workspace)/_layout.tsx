import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ellipsis } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LEARNING_WORKSPACE_TOP_CHROME_OFFSET,
} from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { LiquidGlassIconButton } from '@/components/navigation/liquid-glass-icon-button';
import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function LearningWorkspaceTabsLayout() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    closeWorkspace,
    openOverview,
    workspaceGate,
  } = useLearningWorkspaceScreen();
  const floatingChromeTop = insets.top + LEARNING_WORKSPACE_TOP_CHROME_OFFSET;

  return (
    <View style={styles.container}>
      <NativeTabs
        disableTransparentOnScrollEdge
        minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="graph">
          <NativeTabs.Trigger.Icon
            md="device_hub"
            sf={{ default: 'point.3.connected.trianglepath.dotted', selected: 'point.3.connected.trianglepath.dotted' }}
          />
          <NativeTabs.Trigger.Label>图谱</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="review">
          <NativeTabs.Trigger.Icon
            md="history"
            sf={{ default: 'clock.arrow.trianglehead.counterclockwise.rotate.90', selected: 'clock.arrow.trianglehead.counterclockwise.rotate.90' }}
          />
          <NativeTabs.Trigger.Label>复盘</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="study" role="search">
          <NativeTabs.Trigger.Icon
            md="auto_awesome"
            sf={{ default: 'sparkles', selected: 'sparkles' }}
          />
          <NativeTabs.Trigger.Label>学习</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      {workspaceGate.kind === 'ready' ? (
        <View
          pointerEvents="box-none"
          style={[styles.floatingChrome, { top: floatingChromeTop }]}
          testID="learning-workspace-floating-chrome">
          <SecondaryBackButton
            label="返回导学本库"
            onPress={closeWorkspace}
            testID="learning-workspace-close-glass"
          />
          <LiquidGlassIconButton
            accessibilityLabel="打开导学概览"
            fallbackIcon={<Ellipsis color={theme.colors.text} size={22} strokeWidth={2.2} />}
            onPress={openOverview}
            swiftSystemImage="ellipsis"
            testID="learning-workspace-info-glass"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingChrome: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 120,
  },
});

import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function LearningWorkspaceTabsLayout() {
  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      minimizeBehavior="never">
      <NativeTabs.Trigger name="study">
        <NativeTabs.Trigger.Icon
          md="auto_awesome"
          sf={{ default: 'sparkles', selected: 'sparkles' }}
        />
        <NativeTabs.Trigger.Label>学习</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
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
    </NativeTabs>
  );
}

import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { getNativeTabIconProps } from '@/components/base/app-icon';
import { AppSessionGate } from '@/components/navigation/app-session-gate';
import { useAppSession } from '@/hooks/use-app-session';

export default function TabsLayout() {
  const session = useAppSession();

  return (
    <AppSessionGate sessionState={session}>
      <NativeTabs
        disableTransparentOnScrollEdge
        minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('home')} />
          <NativeTabs.Trigger.Label>首页</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="borrowing">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('borrowing')} />
          <NativeTabs.Trigger.Label>借阅</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="me">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('profile')} />
          <NativeTabs.Trigger.Label>我的</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search" role="search">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('search')} />
          <NativeTabs.Trigger.Label>找书</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </AppSessionGate>
  );
}

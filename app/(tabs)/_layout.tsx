import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { getNativeTabIconProps } from '@/components/base/app-icon';
import { AppSessionGate } from '@/components/navigation/app-session-gate';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabsLayout() {
  const session = useAppSession();
  const { theme } = useAppTheme();

  return (
    <AppSessionGate sessionState={session}>
      <NativeTabs
        backgroundColor={theme.colors.surface}
        blurEffect="systemMaterial"
        iconColor={{
          default: theme.colors.textSoft,
          selected: theme.colors.primaryStrong,
        }}
        minimizeBehavior="onScrollDown"
        labelStyle={{
          default: {
            color: theme.colors.textSoft,
            fontSize: 12,
            fontWeight: '500',
          },
          selected: {
            color: theme.colors.primaryStrong,
            fontSize: 12,
            fontWeight: '700',
          },
        }}
        tintColor={theme.colors.primaryStrong}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('home')} />
          <NativeTabs.Trigger.Label>首页</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search" role="search">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('search')} />
          <NativeTabs.Trigger.Label>找书</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="borrowing">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('borrowing')} />
          <NativeTabs.Trigger.Label>借阅</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="me">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('profile')} />
          <NativeTabs.Trigger.Label>我的</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </AppSessionGate>
  );
}

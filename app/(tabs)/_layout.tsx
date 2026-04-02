import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { getNativeTabIconProps } from '@/components/base/app-icon';
import { AppSessionGate } from '@/components/navigation/app-session-gate';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabsLayout() {
  const session = useAppSession();
  const { isDark, theme } = useAppTheme();

  return (
    <AppSessionGate sessionState={session}>
      <NativeTabs
        backgroundColor={theme.colors.tabBarBackground}
        blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        disableTransparentOnScrollEdge
        iconColor={{
          default: theme.colors.tabBarInactive,
          selected: theme.colors.tabBarActive,
        }}
        labelStyle={{
          default: {
            color: theme.colors.tabBarInactive,
            fontSize: 12,
            fontWeight: '600',
          },
          selected: {
            color: theme.colors.tabBarActive,
            fontSize: 12,
            fontWeight: '600',
          },
        }}
        minimizeBehavior="onScrollDown"
        shadowColor={theme.colors.borderSoft}
        tintColor={theme.colors.tabBarActive}>
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('home')} />
          <NativeTabs.Trigger.Label>首页</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="borrowing">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('borrowing')} />
          <NativeTabs.Trigger.Label>借阅</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search" role="search">
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps('search')} />
          <NativeTabs.Trigger.Label>找书</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </AppSessionGate>
  );
}

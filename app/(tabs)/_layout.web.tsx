import { Tabs } from 'expo-router';
import React from 'react';

import { AppIcon } from '@/components/base/app-icon';
import { AppSessionGate } from '@/components/navigation/app-session-gate';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function WebTabsLayout() {
  const session = useAppSession();
  const { theme } = useAppTheme();

  return (
    <AppSessionGate sessionState={session}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.colors.background,
          },
          tabBarActiveTintColor: theme.colors.primaryStrong,
          tabBarInactiveTintColor: theme.colors.textSoft,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            paddingBottom: 2,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderSoft,
            height: 76,
            paddingBottom: 10,
            paddingTop: 8,
          },
        }}>
        <Tabs.Screen
          name="(home)"
          options={{
            tabBarIcon: ({ color }) => <AppIcon color={color} name="home" />,
            title: '首页',
          }}
        />
        <Tabs.Screen
          name="borrowing"
          options={{
            tabBarIcon: ({ color }) => <AppIcon color={color} name="borrowing" />,
            title: '借阅',
          }}
        />
        <Tabs.Screen
          name="tutor"
          options={{
            tabBarIcon: ({ color }) => <AppIcon color={color} name="tutor" />,
            title: '导学',
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ color }) => <AppIcon color={color} name="search" />,
            title: '找书',
          }}
        />
      </Tabs>
    </AppSessionGate>
  );
}

import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

function TutorWorkspaceTabsChrome() {
  return (
    <>
      <NativeTabs minimizeBehavior="onScrollDown" sidebarAdaptable={false}>
        <NativeTabs.Trigger name="sources">
          <NativeTabs.Trigger.Icon sf="books.vertical.fill" md="menu_book" />
          <NativeTabs.Trigger.Label>来源</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="more">
          <NativeTabs.Trigger.Icon
            md="more_horiz"
            sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }}
          />
          <NativeTabs.Trigger.Label>更多</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(search)" role="search">
          <NativeTabs.Trigger.Icon
            md="auto_awesome"
            sf={{ default: 'apple.intelligence', selected: 'apple.intelligence' }}
          />
          <NativeTabs.Trigger.Label>导学</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

export default function TutorWorkspaceTabsLayout() {
  return <TutorWorkspaceTabsChrome />;
}

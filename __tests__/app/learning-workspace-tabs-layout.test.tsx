import { render, screen } from '@testing-library/react-native';
import React from 'react';

import LearningWorkspaceTabsLayout from '@/app/learning/[profileId]/(workspace)/_layout';

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const NativeTabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'learning-workspace-native-tabs-root' }, children);

  const Trigger: any = ({
    children,
    name,
    role,
  }: {
    children: React.ReactNode;
    name?: string;
    role?: string;
  }) =>
    React.createElement(
      View,
      {
        accessibilityLabel: role,
        testID: name ? `learning-workspace-native-tab-${name}` : undefined,
      },
      children
    );

  Trigger.Icon = () => null;
  Trigger.Label = ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children);
  NativeTabs.Trigger = Trigger;

  return {
    NativeTabs,
  };
});

describe('LearningWorkspaceTabsLayout', () => {
  it('registers graph, review, and a search-role study tab in that order', () => {
    const view = render(<LearningWorkspaceTabsLayout />);
    const triggerNodes = view.UNSAFE_root.findAll(
      (node) =>
        typeof node.props?.testID === 'string' &&
        node.props.testID.startsWith('learning-workspace-native-tab-')
    );

    expect(screen.getByTestId('learning-workspace-native-tabs-root')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-study')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-graph')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-review')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-study').props.accessibilityLabel).toBe(
      'search'
    );
    expect([...new Set(triggerNodes.map((node) => node.props.testID))]).toEqual([
      'learning-workspace-native-tab-graph',
      'learning-workspace-native-tab-review',
      'learning-workspace-native-tab-study',
    ]);
    expect(screen.getByText('学习')).toBeTruthy();
    expect(screen.getByText('图谱')).toBeTruthy();
    expect(screen.getByText('复盘')).toBeTruthy();
  });
});

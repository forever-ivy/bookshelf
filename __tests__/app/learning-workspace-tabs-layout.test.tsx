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
  }: {
    children: React.ReactNode;
    name?: string;
  }) =>
    React.createElement(
      View,
      {
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
  it('registers fixed native tabs for study, graph, and review', () => {
    render(<LearningWorkspaceTabsLayout />);

    expect(screen.getByTestId('learning-workspace-native-tabs-root')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-study')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-graph')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-review')).toBeTruthy();
    expect(screen.getByText('学习')).toBeTruthy();
    expect(screen.getByText('图谱')).toBeTruthy();
    expect(screen.getByText('复盘')).toBeTruthy();
  });
});

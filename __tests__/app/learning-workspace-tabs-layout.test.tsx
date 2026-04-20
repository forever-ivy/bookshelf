import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import LearningWorkspaceTabsLayout from '@/app/learning/[profileId]/(workspace)/_layout';
import { LEARNING_WORKSPACE_TOP_CHROME_OFFSET } from '@/components/learning/learning-workspace-scaffold';

const mockCloseWorkspace = jest.fn();
const mockOpenDocumentViewer = jest.fn();
let mockWorkspaceScreen: any;

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const NativeTabs = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    minimizeBehavior?: string;
  }) =>
    React.createElement(View, { testID: 'learning-workspace-native-tabs-root', ...props }, children);
  NativeTabs.displayName = 'MockLearningWorkspaceNativeTabs';

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
  Trigger.displayName = 'MockLearningWorkspaceTabTrigger';

  const MockTriggerIcon = () => null;
  MockTriggerIcon.displayName = 'MockLearningWorkspaceTabTriggerIcon';
  Trigger.Icon = MockTriggerIcon;
  const MockTriggerLabel = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);
  MockTriggerLabel.displayName = 'MockLearningWorkspaceTabTriggerLabel';
  Trigger.Label = MockTriggerLabel;
  NativeTabs.Trigger = Trigger;
  const BottomAccessory: any = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'learning-workspace-native-tabs-bottom-accessory' }, children);
  BottomAccessory.displayName = 'MockLearningWorkspaceBottomAccessory';
  BottomAccessory.usePlacement = () => 'regular';
  NativeTabs.BottomAccessory = BottomAccessory;

  return {
    NativeTabs,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/components/learning/learning-workspace-provider', () => ({
  useLearningWorkspaceScreen: () => mockWorkspaceScreen,
}));

jest.mock('@/components/navigation/secondary-back-button', () => ({
  SecondaryBackButton: ({
    onPress,
    testID,
  }: {
    onPress?: () => void;
    testID?: string;
  }) => {
    const React = require('react');
    const { Pressable } = require('react-native');

    return React.createElement(Pressable, { onPress, testID });
  },
}));

jest.mock('@/components/navigation/liquid-glass-icon-button', () => ({
  LiquidGlassIconButton: ({
    onPress,
    testID,
  }: {
    onPress?: () => void;
    testID?: string;
  }) => {
    const React = require('react');
    const { Pressable } = require('react-native');

    return React.createElement(Pressable, { onPress, testID });
  },
}));

describe('LearningWorkspaceTabsLayout', () => {
  beforeEach(() => {
    mockCloseWorkspace.mockReset();
    mockOpenDocumentViewer.mockReset();
    mockWorkspaceScreen = {
      activeTab: 'study',
      closeWorkspace: mockCloseWorkspace,
      openDocumentViewer: mockOpenDocumentViewer,
      workspaceGate: {
        description: 'ready',
        kind: 'ready',
        title: '导学本已准备好',
      },
    };
  });

  it('registers graph and a search-role study tab in that order', () => {
    const view = render(<LearningWorkspaceTabsLayout />);
    const triggerNodes = view.UNSAFE_root.findAll(
      (node) =>
        typeof node.props?.testID === 'string' &&
        node.props.testID.startsWith('learning-workspace-native-tab-')
    );

    expect(screen.getByTestId('learning-workspace-native-tabs-root')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-study')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-native-tab-graph')).toBeTruthy();
    expect(screen.queryByTestId('learning-workspace-native-tab-review')).toBeNull();
    expect(screen.getByTestId('learning-workspace-native-tab-study').props.accessibilityLabel).toBe(
      'search'
    );
    expect([...new Set(triggerNodes.map((node) => node.props.testID))]).toEqual([
      'learning-workspace-native-tab-graph',
      'learning-workspace-native-tab-study',
    ]);
    expect(screen.getByText('学习')).toBeTruthy();
    expect(screen.getByText('图谱')).toBeTruthy();
    expect(screen.queryByText('复盘')).toBeNull();
  });

  it('matches the home tabs minimize behavior for native tab animation', () => {
    render(<LearningWorkspaceTabsLayout />);

    expect(screen.getByTestId('learning-workspace-native-tabs-root').props.minimizeBehavior).toBe(
      'onScrollDown'
    );
  });

  it('renders one shared floating glass chrome layer above the tabs', () => {
    render(<LearningWorkspaceTabsLayout />);

    expect(screen.getByTestId('learning-workspace-floating-chrome')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('learning-workspace-floating-chrome').props.style).top
    ).toBe(LEARNING_WORKSPACE_TOP_CHROME_OFFSET);
    expect(screen.getByTestId('learning-workspace-close-glass')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-info-glass')).toBeTruthy();

    fireEvent.press(screen.getByTestId('learning-workspace-close-glass'));
    fireEvent.press(screen.getByTestId('learning-workspace-info-glass'));

    expect(mockCloseWorkspace).toHaveBeenCalledTimes(1);
    expect(mockOpenDocumentViewer).toHaveBeenCalledTimes(1);
  });

  it('keeps the shared floating chrome on the graph tab because the graph control only aligns visually with it', () => {
    mockWorkspaceScreen.activeTab = 'graph';

    render(<LearningWorkspaceTabsLayout />);

    expect(screen.getByTestId('learning-workspace-floating-chrome')).toBeTruthy();
  });
});

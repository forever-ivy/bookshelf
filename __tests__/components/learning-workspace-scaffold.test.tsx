import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  LearningWorkspaceScaffold,
  LEARNING_WORKSPACE_TAB_BAR_CLEARANCE,
} from '@/components/learning/learning-workspace-scaffold';
import { appTheme } from '@/constants/app-theme';

const mockInsets = {
  bottom: 34,
  left: 0,
  right: 0,
  top: 0,
};

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

jest.mock('@/components/learning/learning-workspace-provider', () => ({
  useLearningWorkspaceScreen: () => ({
    closeWorkspace: jest.fn(),
    isRetryPending: false,
    openOverview: jest.fn(),
    profile: {
      title: 'Translator-20Interview-20Pr...',
    },
    retryGenerate: jest.fn(),
    workspaceGate: {
      description: 'ready',
      kind: 'ready',
      title: '导学本已准备好',
    },
    workspaceSession: {
      progressLabel: '主线学习',
    },
  }),
}));

describe('LearningWorkspaceScaffold', () => {
  it('lifts the entire footer above the native tab bar so the composer remains visible', () => {
    const view = render(
      <LearningWorkspaceScaffold footer={<Text>footer</Text>} subtitle="主线学习">
        <Text>content</Text>
      </LearningWorkspaceScaffold>
    );

    const footerNode = view.UNSAFE_root.find(
      (node) => node.props?.testID === 'learning-workspace-footer'
    );
    const flattened = StyleSheet.flatten(footerNode.props.style);

    expect(flattened.marginBottom).toBeGreaterThanOrEqual(
      LEARNING_WORKSPACE_TAB_BAR_CLEARANCE + mockInsets.bottom
    );
    expect(flattened.paddingBottom).toBe(appTheme.spacing.md);
  });

  it('omits the footer wrapper entirely when no footer is provided', () => {
    const view = render(
      <LearningWorkspaceScaffold subtitle="主线学习">
        <Text>content</Text>
      </LearningWorkspaceScaffold>
    );

    const footerNodes = view.UNSAFE_root.findAll(
      (node) => node.props?.testID === 'learning-workspace-footer'
    );

    expect(footerNodes).toHaveLength(0);
  });
});

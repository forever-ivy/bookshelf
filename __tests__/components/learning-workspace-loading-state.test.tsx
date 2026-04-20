import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

describe('LearningWorkspaceLoadingState', () => {
  it('can replace loading copy with skeleton blocks while keeping the return action visible', () => {
    render(
      <LearningWorkspaceLoadingState
        description="正在加载导学本资料与当前工作区。"
        secondaryAction={{
          label: '返回导学本库',
          onPress: jest.fn(),
        }}
        title="正在准备导学本"
        visualState="skeleton"
      />
    );

    expect(screen.getByTestId('learning-workspace-loading-skeleton-eyebrow')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-loading-skeleton-title-1')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-loading-skeleton-title-2')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-loading-skeleton-description-1')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-loading-skeleton-description-2')).toBeTruthy();
    expect(screen.queryByText('正在准备导学本')).toBeNull();
    expect(screen.queryByText('正在加载导学本资料与当前工作区。')).toBeNull();
    expect(screen.getByText('返回导学本库')).toBeTruthy();
  });

  it('keeps failed states as copy-first cards', () => {
    render(
      <LearningWorkspaceLoadingState
        description="这份资料暂时没能生成成功，你可以重新触发生成。"
        primaryAction={{
          label: '重新生成',
          onPress: jest.fn(),
        }}
        secondaryAction={{
          label: '返回导学本库',
          onPress: jest.fn(),
        }}
        title="生成失败"
        tone="danger"
      />
    );

    expect(screen.getByText('生成失败')).toBeTruthy();
    expect(screen.getByText('这份资料暂时没能生成成功，你可以重新触发生成。')).toBeTruthy();
    expect(screen.getByText('重新生成')).toBeTruthy();
    expect(screen.queryByTestId('learning-workspace-loading-skeleton-eyebrow')).toBeNull();
  });
});

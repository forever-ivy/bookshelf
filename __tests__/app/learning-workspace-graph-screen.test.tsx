import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import LearningWorkspaceGraphScreen from '@/app/learning/[profileId]/(workspace)/graph';
import { getLearningGraph } from '@/lib/api/learning';

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/components/learning/learning-workspace-scaffold', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE: 58,
    LEARNING_WORKSPACE_TOP_CHROME_OFFSET: 20,
    LearningWorkspaceScaffold: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'learning-graph-scaffold' }, children),
  };
});

jest.mock('@/components/learning/learning-workspace-provider', () => ({
  useLearningWorkspaceScreen: () => ({
    profile: {
      id: 6001,
      title: 'test.pdf',
    },
    sourceCards: [
      {
        excerpt: '上传资料来源摘要',
        id: 'source-1',
        meta: '上传资料',
        title: 'test.pdf',
      },
    ],
    sourceSummary: '上传资料来源摘要',
  }),
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({
    theme: require('@/constants/app-theme').appTheme,
  }),
}));

jest.mock('@/lib/api/learning', () => ({
  getLearningGraph: jest.fn(),
}));

describe('LearningWorkspaceGraphScreen', () => {
  const mockGetLearningGraph = getLearningGraph as jest.MockedFunction<typeof getLearningGraph>;

  beforeEach(() => {
    mockGetLearningGraph.mockReset();
  });

  it('renders graph stats and updates the details panel from WebView events', async () => {
    mockGetLearningGraph.mockResolvedValue({
      edges: [
        { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
        { source: 'step:0', target: 'concept:limits', type: 'TESTS' },
      ],
      nodes: [
        { id: 'book:profile', label: 'test.pdf', type: 'Book' },
        { assetKind: 'upload', fileName: 'test.pdf', id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        {
          assetId: 1,
          chapterLabel: 'Section 1',
          chunkIndex: 0,
          id: 'fragment:1',
          label: '函数极限的定义',
          semanticSummary: '函数极限的定义',
          type: 'Fragment',
        },
        { id: 'concept:limits', label: '极限', type: 'Concept' },
        {
          guidingQuestion: '极限最先该怎么理解？',
          id: 'step:0',
          keywords: ['极限'],
          label: '建立整体认知',
          objective: '先搭整体框架',
          title: '建立整体认知',
          type: 'LessonStep',
        },
      ],
      provider: 'fallback',
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LearningWorkspaceGraphScreen />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('5 个节点')).toBeTruthy();
      expect(screen.getByText('4 条连线')).toBeTruthy();
    });

    expect(screen.getByText('点击图谱中的节点查看细节与相关来源。')).toBeTruthy();
    expect(screen.getByTestId('learning-graph-webview')).toBeTruthy();

    fireEvent(screen.getByTestId('learning-graph-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          nodeId: 'concept:limits',
          type: 'nodeTap',
        }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText('极限')).toBeTruthy();
      expect(screen.getByText('关联节点 2 个')).toBeTruthy();
      expect(screen.getByText('函数极限的定义')).toBeTruthy();
    });

    fireEvent(screen.getByTestId('learning-graph-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'backgroundTap',
        }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText('点击图谱中的节点查看细节与相关来源。')).toBeTruthy();
    });
  });

  it('falls back when the graph is empty', async () => {
    mockGetLearningGraph.mockResolvedValue({
      edges: [],
      nodes: [],
      provider: 'fallback',
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LearningWorkspaceGraphScreen />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('还没有可展示的图谱数据')).toBeTruthy();
      expect(screen.getByText('上传资料来源摘要')).toBeTruthy();
    });
  });
});

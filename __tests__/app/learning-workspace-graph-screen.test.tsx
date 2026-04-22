import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import LearningWorkspaceGraphScreen from '@/app/learning/[profileId]/(workspace)/graph';
import { getLearningGraph } from '@/lib/api/learning';

let mockWorkspaceScreen: any;
let mockLearningSessions: any[];

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

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
    },
    FadeInDown: {
      duration: () => ({
        springify: () => undefined,
      }),
    },
    FadeInUp: {
      duration: () => ({
        springify: () => undefined,
      }),
    },
    Layout: {
      springify: () => ({
        damping: () => ({
          mass: () => ({
            stiffness: () => undefined,
          }),
        }),
      }),
    },
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    withSpring: (value: unknown) => value,
  };
});

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
  useLearningWorkspaceScreen: () => mockWorkspaceScreen,
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

jest.mock('@/hooks/use-library-app-data', () => ({
  useLearningSessionsQuery: () => ({
    data: mockLearningSessions,
  }),
}));

jest.mock('@/lib/api/learning', () => ({
  getLearningGraph: jest.fn(),
}));

describe('LearningWorkspaceGraphScreen', () => {
  const mockGetLearningGraph = getLearningGraph as jest.MockedFunction<typeof getLearningGraph>;

  beforeEach(() => {
    mockGetLearningGraph.mockReset();
    mockLearningSessions = [];
    mockWorkspaceScreen = {
      profile: {
        curriculum: [
          { id: 'step-0', title: '建立整体认知' },
          { id: 'step-1', title: '连接导数概念' },
        ],
        id: 6001,
        title: 'test.pdf',
      },
      renderedMessages: [],
      sourceCards: [
        {
          excerpt: '上传资料来源摘要',
          id: 'source-1',
          meta: '上传资料',
          title: 'test.pdf',
        },
      ],
      sourceSummary: '上传资料来源摘要',
      workspaceSession: {
        currentStepIndex: 0,
        currentStepTitle: null,
        focusContext: null,
        id: 301,
        sessionKind: 'explore',
      },
    };
  });

  it('renders a stable mind map without global or explore tabs', async () => {
    mockGetLearningGraph.mockResolvedValue({
      edges: [
        { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
        { source: 'asset:1', target: 'section:1:limits', type: 'CONTAINS' },
        { source: 'section:1:limits', target: 'fragment:1', type: 'CONTAINS' },
        { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
        { source: 'fragment:1', target: 'definition:limits', type: 'EVIDENCE_FOR' },
        { source: 'definition:limits', target: 'concept:limits', type: 'DEFINES' },
        { source: 'fragment:2', target: 'asset:1', type: 'DERIVED_FROM' },
        { source: 'fragment:2', target: 'concept:derivative', type: 'MENTIONS' },
        { source: 'step:0', target: 'concept:limits', type: 'TESTS' },
        { source: 'fragment:1', target: 'step:0', type: 'EVIDENCE_FOR' },
        { source: 'step:1', target: 'concept:derivative', type: 'TESTS' },
        { source: 'fragment:2', target: 'step:1', type: 'EVIDENCE_FOR' },
      ],
      nodes: [
        { id: 'book:profile', label: 'test.pdf', type: 'Book' },
        { assetKind: 'upload', fileName: 'test.pdf', id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        {
          confidence: 0.93,
          extractor: 'structured-graph-v2',
          id: 'section:1:limits',
          label: '第一章 极限',
          provenance: {
            assetId: 1,
            sectionId: 'section:1:limits',
          },
          type: 'Section',
        },
        {
          assetId: 1,
          chapterLabel: 'Section 1',
          chunkIndex: 0,
          fragmentId: 1,
          id: 'fragment:1',
          label: '函数极限的定义',
          provenance: {
            assetId: 1,
            fragmentId: 1,
            sectionId: 'section:1:limits',
          },
          semanticSummary: '函数极限的定义',
          type: 'Fragment',
        },
        {
          assetId: 1,
          chapterLabel: 'Section 2',
          chunkIndex: 1,
          fragmentId: 2,
          id: 'fragment:2',
          label: '导数的定义',
          semanticSummary: '导数的定义',
          type: 'Fragment',
        },
        { id: 'concept:limits', label: '极限', type: 'Concept' },
        { id: 'concept:derivative', label: '导数', type: 'Concept' },
        {
          confidence: 0.93,
          extractor: 'structured-graph-v2',
          id: 'definition:limits',
          label: '函数极限的定义与性质总结',
          provenance: {
            assetId: 1,
            fragmentId: 1,
            sectionId: 'section:1:limits',
          },
          type: 'Definition',
        },
        {
          guidingQuestion: '极限最先该怎么理解？',
          id: 'step:0',
          keywords: ['极限'],
          label: '建立整体认知',
          objective: '先搭整体框架',
          stepIndex: 0,
          title: '建立整体认知',
          type: 'LessonStep',
        },
        {
          guidingQuestion: '导数和极限怎么接上？',
          id: 'step:1',
          keywords: ['导数'],
          label: '连接导数概念',
          objective: '把导数接回整体图谱',
          stepIndex: 1,
          title: '连接导数概念',
          type: 'LessonStep',
        },
      ],
      provider: 'fallback',
    });
    mockLearningSessions = [
      {
        completedSteps: [{ completedAt: '2026-04-19T10:00:00Z', confidence: 0.82, stepIndex: 0 }],
        completedStepsCount: 1,
        currentStepIndex: 1,
        currentStepTitle: '连接导数概念',
        id: 201,
        learningProfileId: 6001,
        progressLabel: '1 / 2 步',
        sessionKind: 'guide',
        status: 'active',
        updatedAt: '2026-04-19T10:05:00Z',
      },
    ];
    mockWorkspaceScreen.renderedMessages = [
      {
        cards: [],
        id: 'message-user-1',
        presentation: null,
        role: 'user',
        streaming: false,
        text: '极限和无穷小有什么关系？',
      },
      {
        cards: [],
        id: 'message-explore-1',
        presentation: {
          answer: {
            content: '无穷小通常会和极限一起理解。',
          },
          bridgeActions: [],
          evidence: [
            {
              excerpt: '函数极限的定义',
              fragmentId: 1,
              sourceTitle: 'test.pdf',
            },
          ],
          followups: [],
          kind: 'explore',
          relatedConcepts: ['极限', '无穷小'],
        },
        role: 'assistant',
        streaming: false,
        text: '无穷小通常会和极限一起理解。',
      },
    ];

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
      expect(screen.getByTestId('learning-graph-scaffold')).toBeTruthy();
      expect(screen.queryByTestId('learning-graph-mode-tabs-overlay')).toBeNull();
      expect(screen.queryByTestId('learning-graph-mode-tabs')).toBeNull();
      expect(screen.queryByTestId('learning-graph-focus-strip')).toBeNull();
      expect(screen.queryByText('Global')).toBeNull();
      expect(screen.queryByText('Explore')).toBeNull();
      expect(screen.getByTestId('learning-graph-webview')).toBeTruthy();
    });

    const runtimeHtml = screen.getByTestId('learning-graph-webview').props.source?.html;
    expect(runtimeHtml).toContain('"mode":"mindmap"');
    expect(runtimeHtml).toContain('section:1:limits');
    expect(runtimeHtml).not.toContain('fragment:1');
    expect(runtimeHtml).not.toContain('explore:concept:无穷小');
    expect(runtimeHtml).toContain('函数极限的定义与…');

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
      expect(screen.getByText('思维导图')).toBeTruthy();
      expect(screen.getByText('导图位置')).toBeTruthy();
      expect(screen.getByText('相关知识点')).toBeTruthy();
      expect(screen.getAllByText('函数极限的定义').length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId('learning-graph-selection-swift-scroll-view')).toBeNull();
    expect(screen.queryByTestId('swift-scroll-view')).toBeNull();
    expect(screen.getByTestId('learning-graph-selection-scroll').props.contentContainerStyle).toEqual(
      expect.objectContaining({
        flexGrow: 1,
      })
    );
    expect(screen.getByTestId('learning-graph-selection-content').props.style).toEqual(
      expect.objectContaining({
        alignSelf: 'stretch',
      })
    );
    expect(screen.getByTestId('swift-rn-host').props.style).toBeUndefined();
    expect(screen.getByTestId('swift-rn-host').props.matchContents).toBeUndefined();
    expect(screen.getByText('极限').props.allowFontScaling).toBe(false);
    expect(screen.getByText('导图位置').props.allowFontScaling).toBe(false);
    expect(
      screen.getAllByText('函数极限的定义').every((node) => node.props.allowFontScaling === false)
    ).toBe(true);

    fireEvent(screen.getByTestId('learning-graph-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          nodeId: 'definition:limits',
          type: 'nodeTap',
        }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText('定义')).toBeTruthy();
      expect(screen.getByText('置信度 93%')).toBeTruthy();
      expect(screen.getByText('抽取器 structured-graph-v2')).toBeTruthy();
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
      expect(screen.getByText('暂无可展示的图谱')).toBeTruthy();
      expect(screen.getByText('上传资料来源摘要')).toBeTruthy();
    });
  });

  it('avoids showing raw markdown and malformed latex as fragment titles and previews', async () => {
    const rawFragmentText =
      '# 微积分A(1)期中复习讲座 # 零、自测题目： $\\{ c_{n,k} \\}$ E k n $\\left\\{ a_{n';
    mockGetLearningGraph.mockResolvedValue({
      edges: [
        { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
      ],
      nodes: [
        { id: 'book:profile', label: 'test.pdf', type: 'Book' },
        { assetKind: 'upload', fileName: 'test.pdf', id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        { id: 'concept:limits', label: '极限', type: 'Concept' },
        {
          assetId: 1,
          chapterLabel: 'Section 1',
          chunkIndex: 0,
          fragmentId: 1,
          id: 'fragment:1',
          label: rawFragmentText,
          semanticSummary: rawFragmentText,
          type: 'Fragment',
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
      expect(screen.getByTestId('learning-graph-webview')).toBeTruthy();
    });

    const runtimeHtml = screen.getByTestId('learning-graph-webview').props.source?.html;

    expect(runtimeHtml).toContain('concept:limits');
    expect(runtimeHtml).not.toContain('fragment:1');
    expect(runtimeHtml).not.toContain(rawFragmentText);
    expect(runtimeHtml).not.toContain('\\left');

    fireEvent(screen.getByTestId('learning-graph-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          nodeId: 'fragment:1',
          type: 'nodeTap',
        }),
      },
    });

    expect(screen.queryByText('来源片段')).toBeNull();

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
      expect(screen.getAllByText('Section 1').length).toBeGreaterThan(0);
      expect(screen.getByText('证据来源')).toBeTruthy();
    });

    expect(
      screen.queryByText('# 微积分A(1)期中复习讲座 # 零、自测题目： $\\{ c_{n,k} \\}$ E k n $\\left\\{ a_{n')
    ).toBeNull();
  });

  it('strips markdown markers when malformed fragment content falls back to plain text', async () => {
    mockGetLearningGraph.mockResolvedValue({
      edges: [
        { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'asset:1', type: 'DERIVED_FROM' },
        { source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' },
      ],
      nodes: [
        { id: 'book:profile', label: 'test.pdf', type: 'Book' },
        { assetKind: 'upload', fileName: 'test.pdf', id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        { id: 'concept:limits', label: '极限', type: 'Concept' },
        {
          assetId: 1,
          chapterLabel: 'Section 2',
          chunkIndex: 1,
          fragmentId: 2,
          id: 'fragment:1',
          label: '# 标题 **加粗** $\\left\\{ x',
          semanticSummary: '# 标题 **加粗** $\\left\\{ x',
          type: 'Fragment',
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
      expect(screen.getByTestId('learning-graph-webview')).toBeTruthy();
    });

    fireEvent(screen.getByTestId('learning-graph-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          nodeId: 'concept:limits',
          type: 'nodeTap',
        }),
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/标题 加粗/).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/#/)).toBeNull();
    expect(screen.queryByText(/\*\*/)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/\\/)).toBeNull();
  });

  it('renders graph detail markdown and formulas through the rich html sheet body', async () => {
    mockGetLearningGraph.mockResolvedValue({
      edges: [
        { source: 'asset:1', target: 'book:profile', type: 'DERIVED_FROM' },
        { source: 'concept:series', target: 'asset:1', type: 'DERIVED_FROM' },
      ],
      nodes: [
        { id: 'book:profile', label: 'test.pdf', type: 'Book' },
        { assetKind: 'upload', fileName: 'test.pdf', id: 'asset:1', label: 'test.pdf', type: 'SourceAsset' },
        {
          description: ['## 收敛条件', '', '- 先判断定义域', '- 迭代式：$x_{n+1}=x_n-\\frac{f(x_n)}{f\'(x_n)}$'].join(
            '\n'
          ),
          id: 'concept:series',
          label: '牛顿法',
          type: 'Concept',
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
      expect(screen.getByTestId('learning-graph-webview')).toBeTruthy();
    });

    fireEvent(screen.getByTestId('learning-graph-webview'), 'message', {
      nativeEvent: {
        data: JSON.stringify({
          nodeId: 'concept:series',
          type: 'nodeTap',
        }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText('牛顿法')).toBeTruthy();
    });

    const detailBody = screen.getByTestId('learning-graph-detail-rich-text');
    expect(detailBody.props.source.html).toContain('<h2>收敛条件</h2>');
    expect(detailBody.props.source.html).toContain('<ul>');
    expect(detailBody.props.source.html).toContain('<math');
    expect(detailBody.props.source.html).not.toContain('## 收敛条件');
  });
});

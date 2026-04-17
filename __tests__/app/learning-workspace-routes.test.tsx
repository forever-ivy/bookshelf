import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import LearningWorkspaceExploreLegacyRoute from '@/app/learning/[profileId]/explore';
import LearningWorkspaceGuideLegacyRoute from '@/app/learning/[profileId]/guide';
import LearningWorkspaceEntryRoute from '@/app/learning/[profileId]/index';
import LearningWorkspaceOverviewRoute from '@/app/learning/[profileId]/overview';
import LearningWorkspaceStudyRoute from '@/app/learning/[profileId]/(workspace)/study';
import {
  LearningWorkspaceProvider,
  useLearningWorkspaceScreen,
} from '@/components/learning/learning-workspace-provider';
import { streamLearningSessionReply } from '@/lib/api/learning';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockUseLocalSearchParams = jest.fn<any, any>(() => ({ profileId: '101' }));
const mockUsePathname = jest.fn(() => '/learning/101');
const mockStartSessionMutateAsync = jest.fn();
const mockGenerateProfileMutateAsync = jest.fn();

let mockSessionMessagesData = [
  {
    content: '我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？',
    createdAt: '2026-04-08T08:00:00Z',
    id: 801,
    role: 'assistant' as const,
    learningSessionId: 301,
  },
  {
    content: '我理解它是从带标签的数据里学规律。',
    createdAt: '2026-04-08T08:02:00Z',
    id: 802,
    role: 'user' as const,
    learningSessionId: 301,
  },
];
let mockProfileData: any = {
  bookId: 1,
  createdAt: '2026-04-08T08:00:00Z',
  curriculum: [
    {
      goal: '先建立阅读地图。',
      guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
      id: 'step-1',
      title: '建立整体框架',
    },
    {
      goal: '把关键概念说清楚。',
      guidingQuestion: '你会怎么向同学解释“监督学习”和“标签数据”？',
      id: 'step-2',
      title: '用自己的话解释概念',
    },
  ],
  id: 101,
  latestJob: {
    attemptCount: 1,
    id: 9,
    status: 'completed',
  },
  persona: {
    coachingFocus: '先搭框架，再逼自己用自己的话解释。',
    greeting: '我们先把这本书真正学进去。',
    name: '周老师',
    style: '先追问，再给脚手架提示',
  },
  sourceSummary: '从馆藏书摘要拆出的导学提要。',
  sourceType: 'book' as const,
  sources: [
    {
      fileName: 'book-1.md',
      id: 7,
      kind: 'book_synthetic' as const,
      metadata: { bookId: 1, bookTitle: '机器学习从零到一' },
      parseStatus: 'parsed' as const,
      profileId: 101,
    },
  ],
  status: 'ready' as const,
  title: '机器学习从零到一',
  updatedAt: '2026-04-08T08:30:00Z',
};
let mockSessionsData: any[] = [
  {
    completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
    completedStepsCount: 1,
    conversationSessionId: 401,
    createdAt: '2026-04-08T08:00:00Z',
    currentStepIndex: 1,
    currentStepTitle: '用自己的话解释概念',
    id: 301,
    lastMessagePreview: '先试着说说什么是标签数据。',
    progressLabel: '1 / 2 步',
    status: 'active',
    learningProfileId: 101,
    updatedAt: '2026-04-08T08:30:00Z',
  },
];

function resetReadyWorkspace() {
  mockProfileData = {
    bookId: 1,
    createdAt: '2026-04-08T08:00:00Z',
    curriculum: [
      {
        goal: '先建立阅读地图。',
        guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
        id: 'step-1',
        title: '建立整体框架',
      },
      {
        goal: '把关键概念说清楚。',
        guidingQuestion: '你会怎么向同学解释“监督学习”和“标签数据”？',
        id: 'step-2',
        title: '用自己的话解释概念',
      },
    ],
    id: 101,
    latestJob: {
      attemptCount: 1,
      id: 9,
      status: 'completed',
    },
    persona: {
      coachingFocus: '先搭框架，再逼自己用自己的话解释。',
      greeting: '我们先把这本书真正学进去。',
      name: '周老师',
      style: '先追问，再给脚手架提示',
    },
    sourceSummary: '从馆藏书摘要拆出的导学提要。',
    sourceType: 'book',
    sources: [
      {
        fileName: 'book-1.md',
        id: 7,
        kind: 'book_synthetic',
        metadata: { bookId: 1, bookTitle: '机器学习从零到一' },
        parseStatus: 'parsed',
        profileId: 101,
      },
    ],
    status: 'ready',
    title: '机器学习从零到一',
    updatedAt: '2026-04-08T08:30:00Z',
  };
  mockSessionMessagesData = [
    {
      content: '我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？',
      createdAt: '2026-04-08T08:00:00Z',
      id: 801,
      role: 'assistant',
      learningSessionId: 301,
    },
    {
      content: '我理解它是从带标签的数据里学规律。',
      createdAt: '2026-04-08T08:02:00Z',
      id: 802,
      role: 'user',
      learningSessionId: 301,
    },
  ];
  mockSessionsData = [
    {
      completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
      completedStepsCount: 1,
      conversationSessionId: 401,
      createdAt: '2026-04-08T08:00:00Z',
      currentStepIndex: 1,
      currentStepTitle: '用自己的话解释概念',
      id: 301,
      lastMessagePreview: '先试着说说什么是标签数据。',
      progressLabel: '1 / 2 步',
      status: 'active',
      learningProfileId: 101,
      updatedAt: '2026-04-08T08:30:00Z',
    },
  ];
}

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('redirect', {
      href,
      testID: 'route-redirect',
    });
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  usePathname: () => mockUsePathname(),
  useRouter: () => mockRouter,
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useGenerateLearningProfileMutation: () => ({
    isPending: false,
    mutateAsync: mockGenerateProfileMutateAsync,
  }),
  useStartLearningSessionMutation: () => ({
    isPending: false,
    mutateAsync: mockStartSessionMutateAsync,
  }),
  useLearningProfileQuery: () => ({
    data: mockProfileData,
    isPending: false,
    refetch: jest.fn(async () => ({ data: mockProfileData })),
  }),
  useLearningSessionMessagesQuery: () => ({
    data: mockSessionMessagesData,
    refetch: jest.fn(async () => ({ data: mockSessionMessagesData })),
  }),
  useLearningSessionsQuery: () => ({
    data: mockSessionsData,
    refetch: jest.fn(async () => ({ data: mockSessionsData })),
  }),
}));

jest.mock('@/lib/api/learning', () => ({
  streamLearningSessionReply: jest.fn(),
  submitLearningBridgeAction: jest.fn(async () => ({ ok: true })),
}));

function renderWithWorkspaceProvider(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LearningWorkspaceProvider profileId={101}>{ui}</LearningWorkspaceProvider>
    </QueryClientProvider>
  );
}

function WorkspaceProbe() {
  const {
    activeTab,
    handleSend,
    latestEvaluation,
    latestSessionSignal,
    renderedMessages,
    studyMode,
    navigateToStudyMode,
    navigateToTab,
    workspaceGate,
  } = useLearningWorkspaceScreen();

  return (
    <View>
      <Text>{workspaceGate.title}</Text>
      <Text>{`active-tab:${activeTab}`}</Text>
      <Text>{`study-mode:${studyMode}`}</Text>
      {renderedMessages.map((message) => (
        <Text key={message.id}>{message.text}</Text>
      ))}
      {latestEvaluation ? <Text>{latestEvaluation.reasoning}</Text> : null}
      {latestSessionSignal ? <Text>{latestSessionSignal.transitionLabel}</Text> : null}
      <Pressable onPress={() => navigateToStudyMode('guide')} testID="workspace-probe-go-guide" />
      <Pressable onPress={() => navigateToTab('graph')} testID="workspace-probe-go-graph" />
      <Pressable
        onPress={() => {
          void handleSend('帮我总结这一节的核心线索');
        }}
        testID="workspace-probe-send"
      />
    </View>
  );
}

describe('learning workspace routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetReadyWorkspace();
    mockUseLocalSearchParams.mockReturnValue({ profileId: '101' });
    mockUsePathname.mockReturnValue('/learning/101');
    mockStartSessionMutateAsync.mockResolvedValue({
      firstStep: {
        guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
        id: 'step-1',
        title: '建立整体框架',
      },
      session: {
        completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
        completedStepsCount: 1,
        conversationSessionId: 401,
        createdAt: '2026-04-08T08:00:00Z',
        currentStepIndex: 1,
        currentStepTitle: '用自己的话解释概念',
        id: 301,
        lastMessagePreview: '先试着说说什么是标签数据。',
        progressLabel: '1 / 2 步',
        status: 'active',
        learningProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
      welcomeMessage: {
        content: '我们开始吧。',
        createdAt: '2026-04-08T08:00:00Z',
        id: 900,
        role: 'assistant',
        learningSessionId: 301,
      },
    });
    mockGenerateProfileMutateAsync.mockResolvedValue({
      jobs: [{ attemptCount: 1, id: 10, status: 'queued' }],
      triggered: true,
    });
    (streamLearningSessionReply as jest.Mock).mockReset();
  });

  it('redirects the entry route to guide by default', () => {
    renderWithWorkspaceProvider(<LearningWorkspaceEntryRoute />);

    expect(screen.getByTestId('route-redirect').props.href).toBe('/learning/101/guide');
  });

  it('redirects the legacy guide and explore routes into study mode routes', () => {
    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceGuideLegacyRoute />
        <LearningWorkspaceExploreLegacyRoute />
      </>
    );

    const redirects = screen.getAllByTestId('route-redirect').map((node) => node.props.href);

    expect(redirects).toContain('/learning/101/study?mode=guide');
    expect(redirects).toContain('/learning/101/study?mode=explore');
  });

  it('starts a session automatically when the profile is ready but no active session exists', async () => {
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith(101);
    });

    expect(screen.getByText('用自己的话解释概念')).toBeTruthy();
    expect(screen.getByText('1 / 2 步')).toBeTruthy();
  });

  it('shows a not-started state and lets the user retry generation', async () => {
    mockProfileData = {
      ...mockProfileData,
      latestJob: {
        attemptCount: 0,
        id: 10,
        status: 'queued',
      },
      status: 'queued',
    };
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    expect(screen.getByText('还未真正开始处理')).toBeTruthy();
    expect(screen.getByText('重新触发生成')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('重新触发生成'));
    });

    expect(mockGenerateProfileMutateAsync).toHaveBeenCalledWith(101);
  });

  it('shows a processing state while background generation is running', () => {
    mockProfileData = {
      ...mockProfileData,
      latestJob: {
        attemptCount: 1,
        id: 10,
        status: 'processing',
      },
      status: 'processing',
    };
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    expect(screen.getByText('后台处理中')).toBeTruthy();
    expect(screen.getByText('资料正在后台解析和整理，完成后会自动进入工作区。')).toBeTruthy();
  });

  it('shows the failed state with retry and return actions', async () => {
    mockProfileData = {
      ...mockProfileData,
      failureMessage: '学习任务没有真正启动，请检查后台 worker。',
      latestJob: {
        attemptCount: 1,
        errorMessage: '学习任务没有真正启动，请检查后台 worker。',
        id: 10,
        status: 'failed',
      },
      status: 'failed',
    };
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    expect(screen.getByText('生成失败')).toBeTruthy();
    expect(screen.getByText('学习任务没有真正启动，请检查后台 worker。')).toBeTruthy();
    expect(screen.getByText('重新生成')).toBeTruthy();
    expect(screen.getByText('返回导学本库')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('重新生成'));
    });
    expect(mockGenerateProfileMutateAsync).toHaveBeenCalledWith(101);

    fireEvent.press(screen.getByText('返回导学本库'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/learning');
  });

  it('can recover after retry generation and show the ready guide workspace again', async () => {
    mockProfileData = {
      ...mockProfileData,
      latestJob: {
        attemptCount: 0,
        id: 10,
        status: 'queued',
      },
      status: 'queued',
    };
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });

    const view = renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    await act(async () => {
      fireEvent.press(screen.getByText('重新触发生成'));
    });

    expect(mockGenerateProfileMutateAsync).toHaveBeenCalledWith(101);

    mockProfileData = {
      ...mockProfileData,
      latestJob: {
        attemptCount: 1,
        id: 10,
        status: 'completed',
      },
      status: 'ready',
    };
    mockSessionsData = [
      {
        completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
        completedStepsCount: 1,
        conversationSessionId: 401,
        createdAt: '2026-04-08T08:00:00Z',
        currentStepIndex: 1,
        currentStepTitle: '用自己的话解释概念',
        id: 301,
        lastMessagePreview: '先试着说说什么是标签数据。',
        progressLabel: '1 / 2 步',
        status: 'active',
        learningProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
    ];

    view.rerender(
        <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: {
                retry: false,
              },
            },
          })
        }>
        <LearningWorkspaceProvider profileId={101}>
          <LearningWorkspaceStudyRoute />
        </LearningWorkspaceProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('用自己的话解释概念')).toBeTruthy();
    expect(screen.getByText('深度探索')).toBeTruthy();
  });

  it('tracks active tab and study mode separately and uses replace-based study/tab navigation', () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    expect(screen.getByText('active-tab:study')).toBeTruthy();
    expect(screen.getByText('study-mode:explore')).toBeTruthy();

    fireEvent.press(screen.getByTestId('workspace-probe-go-guide'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/learning/101/study?mode=guide');

    fireEvent.press(screen.getByTestId('workspace-probe-go-graph'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/learning/101/graph');
  });

  it('uses a direct close action inside the workspace', () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    fireEvent.press(screen.getByTestId('learning-workspace-close-button'));

    expect(mockRouter.replace).toHaveBeenCalledWith('/learning');
  });

  it('streams learning replies from the backend and consumes assistant.final events', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
      yield { delta: '先抓住模型、数据和目标。', type: 'assistant.delta' };
      yield {
        evaluation: {
          confidence: 0.86,
          meetsCriteria: true,
          passed: true,
          masteryScore: 86,
          missingConcepts: [],
          reasoning: '回答已经覆盖当前步骤的关键线索。',
          stepIndex: 1,
        },
        type: 'evaluation',
      };
      yield {
        session: {
          completedSteps: [
            { completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 },
            { completedAt: '2026-04-08T08:31:00Z', confidence: 0.86, stepIndex: 1 },
          ],
          completedStepsCount: 2,
          conversationSessionId: 401,
          createdAt: '2026-04-08T08:00:00Z',
          currentStepIndex: 1,
          currentStepTitle: '用自己的话解释概念',
          id: 301,
          lastMessagePreview: '先抓住模型、数据和目标。',
          progressLabel: '2 / 2 步',
          status: 'completed',
          learningProfileId: 101,
          updatedAt: '2026-04-08T08:31:00Z',
        },
        type: 'session.updated',
      };
      yield {
        message: {
          content: '先抓住模型、数据和目标。',
          createdAt: '2026-04-08T08:31:00Z',
          id: 880,
          role: 'assistant',
          learningSessionId: 301,
        },
        type: 'assistant.final',
      };
    });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('workspace-probe-send'));
    });

    expect(streamLearningSessionReply).toHaveBeenCalledWith(
      301,
      { content: '帮我总结这一节的核心线索' },
      'reader-token'
    );
    expect(screen.getAllByText('先抓住模型、数据和目标。').length).toBeGreaterThan(0);
    expect(screen.getByText('回答已经覆盖当前步骤的关键线索。')).toBeTruthy();
    expect(screen.getAllByText('当前导学本的所有步骤都已完成。').length).toBeGreaterThan(0);
  });

  it('does not show a failure toast when the stream errors after assistant.final already arrived', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
      yield {
        message: {
          content: '这是已经完整返回的导师总结。',
          createdAt: '2026-04-08T08:31:00Z',
          id: 881,
          role: 'assistant',
          learningSessionId: 301,
        },
        type: 'assistant.final',
      };
      throw new Error('stream tail closed unexpectedly');
    });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('workspace-probe-send'));
    });

    expect(screen.getAllByText('这是已经完整返回的导师总结。').length).toBeGreaterThan(0);
    expect(toast.error).not.toHaveBeenCalledWith('导学回复失败，请稍后再试。');
  });

  it('does not show a failure toast when the stream breaks before assistant.final but the synced history already contains a new assistant reply', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
      yield { delta: '导师正在组织回答…', type: 'assistant.delta' };
      mockSessionMessagesData = [
        ...mockSessionMessagesData,
        {
          content: '帮我总结这一节的核心线索',
          createdAt: '2026-04-08T08:31:00Z',
          id: 803,
          role: 'user',
          learningSessionId: 301,
        },
        {
          content: '这是后端已经落库的导师总结。',
          createdAt: '2026-04-08T08:31:01Z',
          id: 804,
          role: 'assistant',
          learningSessionId: 301,
        },
      ];
      throw new Error('native stream interrupted before final frame arrived');
    });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('workspace-probe-send'));
    });

    expect(toast.error).not.toHaveBeenCalledWith('导学回复失败，请稍后再试。');
  });

  it('renders overview as a secondary workspace summary route', () => {
    mockUsePathname.mockReturnValue('/learning/101/overview');
    mockUseLocalSearchParams.mockReturnValue({ profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceOverviewRoute />);

    expect(screen.getByText('机器学习从零到一')).toBeTruthy();
  });
});

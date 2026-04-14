import { act, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Platform } from 'react-native';

import TutorWorkspaceGuideRoute from '@/app/tutor/[profileId]/(workspace)/(search)/index';
import TutorWorkspaceMoreRoute from '@/app/tutor/[profileId]/(workspace)/more';
import TutorWorkspaceSourcesRoute from '@/app/tutor/[profileId]/(workspace)/sources';
import { TutorWorkspaceProvider } from '@/components/tutor/tutor-workspace-provider';
import { streamTutorSessionReply } from '@/lib/api/tutor';

const mockRouterPush = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({ profileId: '101' }));
const expectedHeaderActionKey =
  Platform.OS === 'ios' ? 'unstable_headerRightItems' : 'headerRight';
let mockSearchBarProps: Record<string, unknown> | null = null;
let mockSessionMessagesData = [
  {
    content: '我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？',
    createdAt: '2026-04-08T08:00:00Z',
    id: 801,
    role: 'assistant' as const,
    tutorSessionId: 301,
  },
  {
    content: '我理解它是从带标签的数据里学规律。',
    createdAt: '2026-04-08T08:02:00Z',
    id: 802,
    role: 'user' as const,
    tutorSessionId: 301,
  },
];
let mockProfileData = {
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/components/navigation/secondary-back-button', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    SecondaryBackButton: ({
      label,
      testID,
    }: {
      label?: string;
      testID?: string;
    }) => React.createElement(Text, { testID }, label ?? '退出'),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text, View } = jest.requireActual('react-native') as typeof import('react-native');

  const Screen = ({
    children,
    options,
  }: {
    children?: React.ReactNode;
    options?: {
      headerLeft?: () => React.ReactNode;
      headerRight?: () => React.ReactNode;
      unstable_headerRightItems?: (props?: Record<string, unknown>) => Record<string, unknown>[];
      title?: string;
    };
  }) =>
    React.createElement(
      View as React.ComponentType<any>,
      { options, testID: 'workspace-stack-screen' },
      options?.headerLeft ? options.headerLeft() : null,
      options?.title ? React.createElement(Text, null, options.title) : null,
      options?.headerRight ? options.headerRight() : null,
      children
    );

  const SearchBar = (props: Record<string, unknown>) => {
    mockSearchBarProps = props;

    return React.createElement(
      View as React.ComponentType<any>,
      { placeholder: props.placeholder, testID: 'workspace-search-bar' },
      typeof props.placeholder === 'string' ? React.createElement(Text, null, props.placeholder) : null
    );
  };

  return {
    Redirect: ({ href }: { href: string }) => React.createElement(View, { testID: `redirect-${href}` }),
    Stack: {
      SearchBar,
      Screen,
    },
    useLocalSearchParams: () => mockUseLocalSearchParams(),
    usePathname: () => '/tutor/101',
    useRouter: () => ({
      push: mockRouterPush,
      replace: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useStartTutorSessionMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(async () => ({
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
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
      welcomeMessage: {
        content: '我们开始吧。',
        createdAt: '2026-04-08T08:00:00Z',
        id: 900,
        role: 'assistant',
        tutorSessionId: 301,
      },
    })),
  }),
  useTutorProfileQuery: () => ({
    data: mockProfileData,
    isPending: false,
  }),
  useTutorSessionMessagesQuery: () => ({
    data: mockSessionMessagesData,
    refetch: jest.fn(async () => ({ data: mockSessionMessagesData })),
  }),
  useTutorSessionsQuery: () => ({
    data: [
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
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
    ],
    refetch: jest.fn(async () => ({ data: [] })),
  }),
}));

jest.mock('@/lib/api/tutor', () => ({
  streamTutorSessionReply: jest.fn(),
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
      <TutorWorkspaceProvider profileId={101}>{ui}</TutorWorkspaceProvider>
    </QueryClientProvider>
  );
}

function pressHeaderMenu(
  options: {
    headerRight?: () => React.ReactNode;
    unstable_headerRightItems?: (props?: Record<string, unknown>) => Record<string, unknown>[];
  },
  testID: string
) {
  if (Platform.OS === 'ios') {
    const item = options.unstable_headerRightItems?.({})?.[0];

    expect(item).toEqual(
      expect.objectContaining({
        icon: {
          name: 'ellipsis.circle',
          type: 'sfSymbol',
        },
        label: expect.any(String),
        onPress: expect.any(Function),
        type: 'button',
        variant: 'plain',
      })
    );

    (item?.onPress as (() => void) | undefined)?.();
    return;
  }

  screen.getByTestId(testID).props.onPress();
}

describe('tutor workspace routes', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockSearchBarProps = null;
    mockSessionMessagesData = [
      {
        content: '我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？',
        createdAt: '2026-04-08T08:00:00Z',
        id: 801,
        role: 'assistant',
        tutorSessionId: 301,
      },
      {
        content: '我理解它是从带标签的数据里学规律。',
        createdAt: '2026-04-08T08:02:00Z',
        id: 802,
        role: 'user',
        tutorSessionId: 301,
      },
    ];
    (streamTutorSessionReply as jest.Mock).mockReset();
  });

  it('renders the guide route content by default', () => {
    renderWithWorkspaceProvider(<TutorWorkspaceGuideRoute />);
    const screenOptions = screen.getByTestId('workspace-stack-screen').props.options;

    expect(screen.getByTestId('tutor-workspace-guide-exit-button')).toBeTruthy();
    expect(screenOptions).toEqual(
      expect.objectContaining({
        [expectedHeaderActionKey]: expect.any(Function),
      })
    );
    expect(screen.getByText('导学')).toBeTruthy();
    expect(screen.getByTestId('workspace-search-bar')).toBeTruthy();
    expect(screen.getByText('继续你的学习')).toBeTruthy();
    expect(
      screen.getByText('我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？')
    ).toBeTruthy();

    pressHeaderMenu(screenOptions, 'tutor-workspace-guide-menu-button');

    expect(mockRouterPush).toHaveBeenCalledWith({
      params: { panel: 'path', profileId: '101' },
      pathname: '/tutor/[profileId]/info-sheet',
    });
  });

  it('streams tutor replies from the backend sse client and updates workspace signals', async () => {
    (streamTutorSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
      yield { delta: '先抓住模型、数据和目标。', type: 'assistant.delta' };
      yield {
        evaluation: {
          confidence: 0.86,
          meetsCriteria: true,
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
          tutorProfileId: 101,
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
          tutorSessionId: 301,
        },
        type: 'assistant.done',
      };
    });

    renderWithWorkspaceProvider(<TutorWorkspaceGuideRoute />);

    await act(async () => {
      const onSearchButtonPress = mockSearchBarProps?.onSearchButtonPress as
        | ((event: { nativeEvent: { text: string } }) => void)
        | undefined;

      onSearchButtonPress?.({ nativeEvent: { text: '帮我总结这一节的核心线索' } });
    });

    expect(streamTutorSessionReply).toHaveBeenCalledWith(
      301,
      { content: '帮我总结这一节的核心线索' },
      'reader-token'
    );
    expect(screen.getByText('工作区状态')).toBeTruthy();
    expect(screen.getByText('先抓住模型、数据和目标。')).toBeTruthy();
    expect(screen.getByText('步骤已推进')).toBeTruthy();
    expect(screen.getByText(/本轮置信度 86%/)).toBeTruthy();
  });

  it('renders the sources route from backend source documents instead of local placeholders', () => {
    renderWithWorkspaceProvider(<TutorWorkspaceSourcesRoute />);
    const screenOptions = screen.getByTestId('workspace-stack-screen').props.options;

    expect(screen.getByTestId('tutor-workspace-sources-exit-button')).toBeTruthy();
    expect(screenOptions).toEqual(
      expect.objectContaining({
        [expectedHeaderActionKey]: expect.any(Function),
      })
    );
    expect(screen.getByText('当前主来源')).toBeTruthy();
    expect(screen.getByText('book-1.md')).toBeTruthy();
    expect(screen.getByText(/已解析/)).toBeTruthy();
    expect(screen.queryByText('还没有额外文件')).toBeNull();
    expect(screen.queryByText('添加文件来源')).toBeNull();

    pressHeaderMenu(screenOptions, 'tutor-workspace-sources-menu-button');

    expect(mockRouterPush).toHaveBeenCalledWith({
      params: { panel: 'sources', profileId: '101' },
      pathname: '/tutor/[profileId]/info-sheet',
    });
  });

  it('renders the more route with the trimmed studio actions only', () => {
    renderWithWorkspaceProvider(<TutorWorkspaceMoreRoute />);
    const screenOptions = screen.getByTestId('workspace-stack-screen').props.options;

    expect(screen.getByTestId('tutor-workspace-more-exit-button')).toBeTruthy();
    expect(screenOptions).toEqual(
      expect.objectContaining({
        [expectedHeaderActionKey]: expect.any(Function),
      })
    );
    expect(screen.getByText('更多')).toBeTruthy();
    expect(screen.getByText('内容工作室')).toBeTruthy();
    expect(screen.getByText('闪卡')).toBeTruthy();
    expect(screen.getByText('测验')).toBeTruthy();
    expect(screen.getByText('思维导图')).toBeTruthy();

    pressHeaderMenu(screenOptions, 'tutor-workspace-more-menu-button');

    expect(mockRouterPush).toHaveBeenCalledWith({
      params: { panel: 'highlights', profileId: '101' },
      pathname: '/tutor/[profileId]/info-sheet',
    });
  });
});

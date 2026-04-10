import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import TutorWorkspaceGuideRoute from '@/app/tutor/[profileId]/(workspace)/(search)/index';
import TutorWorkspaceMoreRoute from '@/app/tutor/[profileId]/(workspace)/more';
import TutorWorkspaceSourcesRoute from '@/app/tutor/[profileId]/(workspace)/sources';
import { TutorWorkspaceProvider } from '@/components/tutor/tutor-workspace-provider';

const mockSendMessage = jest.fn(async () => {});
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
      View,
      { options, testID: 'workspace-stack-screen' },
      options?.headerLeft ? options.headerLeft() : null,
      options?.title ? React.createElement(Text, null, options.title) : null,
      options?.headerRight ? options.headerRight() : null,
      children
    );

  const SearchBar = (props: Record<string, unknown>) => {
    mockSearchBarProps = props;

    return React.createElement(
      View,
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

jest.mock('@ai-sdk/react', () => ({
  useChat: ({ messages }: { messages?: unknown[] }) => ({
    error: undefined,
    messages: messages ?? [],
    sendMessage: mockSendMessage,
    status: 'ready',
  }),
}));

jest.mock('expo/fetch', () => ({
  fetch: global.fetch,
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useStartTutorSessionMutation: () => ({
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
        progressLabel: '1 / 4 步',
        status: 'active',
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
      welcomeMessage: '我们开始吧。',
    })),
  }),
  useTutorProfileQuery: () => ({
    data: {
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
      sourceType: 'book',
      status: 'ready',
      title: '机器学习从零到一',
      updatedAt: '2026-04-08T08:30:00Z',
    },
  }),
  useTutorSessionMessagesQuery: () => ({
    data: mockSessionMessagesData,
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
        progressLabel: '1 / 4 步',
        status: 'active',
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
    ],
  }),
}));

function renderWithWorkspaceProvider(ui: React.ReactElement) {
  return render(<TutorWorkspaceProvider profileId={101}>{ui}</TutorWorkspaceProvider>);
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

  fireEvent.press(screen.getByTestId(testID));
}

describe('tutor workspace routes', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockRouterPush.mockClear();
    mockSendMessage.mockClear();
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
    expect(screen.queryByText('当前上下文')).toBeNull();
    expect(
      screen.getByText('我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？')
    ).toBeTruthy();
    expect(screenOptions).toEqual(
      expect.objectContaining({
        headerShadowVisible: false,
        headerTitle: '',
        headerTransparent: Platform.OS === 'ios',
      })
    );

    pressHeaderMenu(screenOptions, 'tutor-workspace-guide-menu-button');

    expect(mockRouterPush).toHaveBeenCalledWith({
      params: { panel: 'path', profileId: '101' },
      pathname: '/tutor/[profileId]/info-sheet',
    });
  });

  it('sends the chat message from the native search bar submit event', async () => {
    renderWithWorkspaceProvider(<TutorWorkspaceGuideRoute />);

    await act(async () => {
      const onSearchButtonPress = mockSearchBarProps?.onSearchButtonPress as
        | ((event: { nativeEvent: { text: string } }) => void)
        | undefined;

      onSearchButtonPress?.({ nativeEvent: { text: '帮我总结这一节的核心线索' } });
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      { text: '帮我总结这一节的核心线索' },
      expect.objectContaining({
        body: expect.objectContaining({
          profile: expect.any(Object),
          session: expect.any(Object),
        }),
      })
    );
  });

  it('replays the local mock demo for the book summary prompt without calling chat transport', async () => {
    jest.useFakeTimers();
    renderWithWorkspaceProvider(<TutorWorkspaceGuideRoute />);

    await act(async () => {
      const onSearchButtonPress = mockSearchBarProps?.onSearchButtonPress as
        | ((event: { nativeEvent: { text: string } }) => void)
        | undefined;

      onSearchButtonPress?.({ nativeEvent: { text: '简述这本书的主要内容' } });
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(screen.getByText('简述这本书的主要内容')).toBeTruthy();
    expect(screen.getByTestId('tutor-assistant-thinking-indicator')).toBeTruthy();
    expect(screen.queryByText('思考 5s')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(14000);
    });

    expect(screen.queryByTestId('tutor-assistant-thinking-indicator')).toBeNull();
    expect(screen.getByText('思考 5s')).toBeTruthy();
    expect(screen.getByText('主要内容')).toBeTruthy();
    expect(screen.getByText(/机器学习从零到一 主要不是在堆概念/)).toBeTruthy();

    jest.useRealTimers();
  });

  it('renders the sources route with the primary source and a local placeholder list', () => {
    renderWithWorkspaceProvider(<TutorWorkspaceSourcesRoute />);
    const screenOptions = screen.getByTestId('workspace-stack-screen').props.options;

    expect(screen.getByTestId('tutor-workspace-sources-exit-button')).toBeTruthy();
    expect(screenOptions).toEqual(
      expect.objectContaining({
        [expectedHeaderActionKey]: expect.any(Function),
      })
    );
    expect(screen.getAllByText('来源').length).toBeGreaterThan(0);
    expect(screen.getByText('当前主来源')).toBeTruthy();
    expect(screen.getByText('已添加来源')).toBeTruthy();
    expect(screen.getByText('还没有额外文件')).toBeTruthy();
    fireEvent.press(screen.getByText('添加文件来源'));
    expect(screen.getByText('附加文件 1')).toBeTruthy();
    expect(screen.getByText('BOOK')).toBeTruthy();
    expect(screen.getAllByText('机器学习从零到一').length).toBeGreaterThan(0);
    expect(screenOptions).toEqual(
      expect.objectContaining({
        headerShadowVisible: false,
        headerTitle: '',
        headerTransparent: Platform.OS === 'ios',
      })
    );

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
    expect(screen.queryByText('工作区动作')).toBeNull();
    expect(screen.queryByText('查看导学路径')).toBeNull();
    expect(screen.queryByText('清空会话')).toBeNull();
    expect(screen.queryByText('重命名导学本')).toBeNull();
    expect(screen.queryByText('删除导学本')).toBeNull();
    expect(screen.queryByText('音频导览')).toBeNull();
    expect(screen.queryByText('视频导览')).toBeNull();
    expect(screen.queryByText('幻灯片')).toBeNull();
    expect(screenOptions).toEqual(
      expect.objectContaining({
        headerShadowVisible: false,
        headerTitle: '',
        headerTransparent: Platform.OS === 'ios',
      })
    );

    pressHeaderMenu(screenOptions, 'tutor-workspace-more-menu-button');

    expect(mockRouterPush).toHaveBeenCalledWith({
      params: { panel: 'highlights', profileId: '101' },
      pathname: '/tutor/[profileId]/info-sheet',
    });
  });

  it('shows starter prompts when the session has no history', () => {
    mockSessionMessagesData = [];

    renderWithWorkspaceProvider(<TutorWorkspaceGuideRoute />);

    expect(screen.getByText('我们先把这本书真正学进去。')).toBeTruthy();
    expect(screen.getByText('试着用一句话总结这份资料要解决什么问题')).toBeTruthy();
    expect(screen.getByText('把当前这一步讲给一个刚入门的同学听')).toBeTruthy();
  });

});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { appTheme } from '@/constants/app-theme';
import LearningWorkspaceExploreLegacyRoute from '@/app/learning/[profileId]/explore';
import LearningWorkspaceGuideLegacyRoute from '@/app/learning/[profileId]/guide';
import LearningWorkspaceEntryRoute from '@/app/learning/[profileId]/index';
import LearningWorkspaceOverviewRoute from '@/app/learning/[profileId]/overview';
import LearningWorkspaceStudyRoute from '@/app/learning/[profileId]/(workspace)/study';
import {
  buildOptimisticUserHistoryMessage,
  LearningWorkspaceProvider,
  resolveScopedLearningWorkspaceState,
  useLearningWorkspaceScreen,
} from '@/components/learning/learning-workspace-provider';
import {
  LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE,
  LEARNING_WORKSPACE_TOP_CHROME_OFFSET,
} from '@/components/learning/learning-workspace-scaffold';
import { streamLearningSessionReply } from '@/lib/api/learning';
import { useLearningConversationStore } from '@/stores/learning-conversation-store';

const mockRouter = {
  back: jest.fn(),
  canDismiss: jest.fn(() => false),
  canGoBack: jest.fn(() => false),
  dismiss: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockUseLocalSearchParams = jest.fn<any, any>(() => ({ profileId: '101' }));
const mockUsePathname = jest.fn(() => '/learning/101');
const mockStartSessionMutateAsync = jest.fn();
const mockGenerateProfileMutateAsync = jest.fn();
const mockSubmitLearningBridgeAction = jest.fn(async (..._args: unknown[]) => ({ ok: true }));

type MockHeaderItem = {
  element?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  type?: 'button' | string;
};

function createActiveSession(overrides: Record<string, unknown> = {}) {
  return {
    completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
    completedStepsCount: 1,
    conversationSessionId: 401,
    createdAt: '2026-04-08T08:00:00Z',
    currentStepIndex: 1,
    currentStepTitle: '用自己的话解释概念',
    id: 301,
    lastMessagePreview: '先试着说说什么是标签数据。',
    progressLabel: '1 / 2 步',
    sessionKind: 'explore',
    status: 'active',
    learningProfileId: 101,
    updatedAt: '2026-04-08T08:30:00Z',
    ...overrides,
  };
}

function createGuideSession(overrides: Record<string, unknown> = {}) {
  return createActiveSession({
    sessionKind: 'guide',
    ...overrides,
  });
}

function createLinkedExploreSession(overrides: Record<string, unknown> = {}) {
  return createActiveSession({
    focusContext: { stepTitle: '建立整体框架' },
    sourceSessionId: 301,
    ...overrides,
  });
}

let mockSessionMessagesData: any[] = [
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
let mockSessionsData: any[] = [createActiveSession()];
let mockSafeAreaTop = 0;
const originalPlatformOS = Platform.OS;
const originalPlatformVersion = Platform.Version;

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
  mockSessionsData = [createActiveSession()];
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
    top: mockSafeAreaTop,
  }),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Pressable, TextInput, View } = jest.requireActual('react-native') as typeof import('react-native');
  let mockStackSearchBarProps:
    | {
        onChangeText?: (event: { nativeEvent: { text: string } }) => void;
        onSearchButtonPress?: (event: { nativeEvent: { text: string } }) => void;
        placeholder?: string;
      }
    | undefined;

  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, { testID: 'learning-study-stack' }, children);
  Stack.displayName = 'MockLearningStudyStack';

  const MockStackScreen = ({
    options,
  }: {
    options?: {
      headerLeft?: (props?: Record<string, unknown>) => React.ReactNode;
      headerRight?: (props?: Record<string, unknown>) => React.ReactNode;
      unstable_headerLeftItems?: () => MockHeaderItem[];
      unstable_headerRightItems?: () => MockHeaderItem[];
      headerSearchBarOptions?: {
        onChangeText?: (event: { nativeEvent: { text: string } }) => void;
        onSearchButtonPress?: (event: { nativeEvent: { text: string } }) => void;
        placeholder?: string;
      };
    };
  }) => {
    const headerSearchBarOptions = options?.headerSearchBarOptions;
    const unstableHeaderLeftItems =
      typeof options?.unstable_headerLeftItems === 'function' ? options.unstable_headerLeftItems() : [];
    const unstableHeaderRightItems =
      typeof options?.unstable_headerRightItems === 'function'
        ? options.unstable_headerRightItems()
        : [];

    return React.createElement(
      View,
      null,
      unstableHeaderLeftItems.map((item, index) =>
        item.type === 'button'
          ? React.createElement(Pressable, {
              accessibilityLabel: item.label,
              key: `left-${index}`,
              onPress: item.onPress,
              testID: `learning-study-native-header-left-item-${index}`,
            })
          : React.createElement(View, { key: `left-${index}` }, item.element ?? null)
      ),
      unstableHeaderRightItems.map((item, index) =>
        item.type === 'button'
          ? React.createElement(Pressable, {
              accessibilityLabel: item.label,
              key: `right-${index}`,
              onPress: item.onPress,
              testID: `learning-study-native-header-right-item-${index}`,
            })
          : React.createElement(View, { key: `right-${index}` }, item.element ?? null)
      ),
      typeof options?.headerLeft === 'function' ? options.headerLeft({}) : null,
      typeof options?.headerRight === 'function' ? options.headerRight({}) : null,
      headerSearchBarOptions
        ? React.createElement(TextInput, {
            onChangeText: (value: string) =>
              headerSearchBarOptions.onChangeText?.({ nativeEvent: { text: value } }),
            onSubmitEditing: (event: { nativeEvent: { text: string } }) =>
              headerSearchBarOptions.onSearchButtonPress?.({
                nativeEvent: { text: String(event.nativeEvent?.text ?? '') },
              }),
            placeholder: headerSearchBarOptions.placeholder,
            testID: 'learning-study-native-search-bar',
          })
        : null
    );
  };
  MockStackScreen.displayName = 'MockLearningStudyStackScreen';
  Stack.Screen = MockStackScreen;
  const MockStackSearchBar = (props: typeof mockStackSearchBarProps) => {
    mockStackSearchBarProps = props;
    return null;
  };
  MockStackSearchBar.displayName = 'MockStackSearchBar';
  Stack.SearchBar = MockStackSearchBar;
  const Toolbar = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);
  Toolbar.displayName = 'MockToolbar';
  const MockToolbarButton = ({
    accessibilityLabel,
    onPress,
    testID,
  }: {
    accessibilityLabel?: string;
    onPress?: () => void;
    testID?: string;
  }) =>
    React.createElement(Pressable, {
      accessibilityLabel,
      onPress,
      testID,
    });
  MockToolbarButton.displayName = 'MockToolbarButton';
  Toolbar.Button = MockToolbarButton;
  const MockToolbarSearchBarSlot = () =>
    mockStackSearchBarProps
      ? React.createElement(
          View,
          {
            testID: 'learning-study-search-bar-slot',
          },
          React.createElement(TextInput, {
            onChangeText: (value: string) =>
              mockStackSearchBarProps?.onChangeText?.({ nativeEvent: { text: value } }),
            onSubmitEditing: (event: { nativeEvent: { text: string } }) =>
              mockStackSearchBarProps?.onSearchButtonPress?.({
                nativeEvent: { text: String(event.nativeEvent?.text ?? '') },
              }),
            placeholder: mockStackSearchBarProps.placeholder,
            testID: 'learning-study-native-search-bar',
          })
        )
      : null;
  MockToolbarSearchBarSlot.displayName = 'MockToolbarSearchBarSlot';
  Toolbar.SearchBarSlot = MockToolbarSearchBarSlot;
  const MockToolbarSpacer = () => null;
  MockToolbarSpacer.displayName = 'MockToolbarSpacer';
  Toolbar.Spacer = MockToolbarSpacer;
  Stack.Toolbar = Toolbar;

  return {
    Redirect: Object.assign(({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }), { displayName: 'MockRedirect' }),
    Stack,
    useLocalSearchParams: () => mockUseLocalSearchParams(),
    usePathname: () => mockUsePathname(),
    useRouter: () => mockRouter,
  };
});

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
  submitLearningBridgeAction: (...args: unknown[]) => mockSubmitLearningBridgeAction(...args),
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
    workspaceSession,
  } = useLearningWorkspaceScreen();

  return (
    <View>
      <Text>{workspaceGate.title}</Text>
      <Text>{`active-tab:${activeTab}`}</Text>
      <Text>{`study-mode:${studyMode}`}</Text>
      <Text>{`workspace-session:${workspaceSession?.id ?? 'none'}`}</Text>
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
    useLearningConversationStore.getState().reset();
    mockRouter.back.mockReset();
    mockRouter.canDismiss.mockReset();
    mockRouter.canDismiss.mockReturnValue(false);
    mockRouter.canGoBack.mockReset();
    mockRouter.canGoBack.mockReturnValue(false);
    mockRouter.dismiss.mockReset();
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    resetReadyWorkspace();
    mockSafeAreaTop = 0;
    mockUseLocalSearchParams.mockReturnValue({ profileId: '101' });
    mockUsePathname.mockReturnValue('/learning/101');
    mockStartSessionMutateAsync.mockResolvedValue({
      firstStep: {
        guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
        id: 'step-1',
        title: '建立整体框架',
      },
      session: createActiveSession(),
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
    mockSubmitLearningBridgeAction.mockReset();
    mockSubmitLearningBridgeAction.mockResolvedValue({ ok: true });
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: originalPlatformVersion,
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: originalPlatformVersion,
    });
  });

  it('builds an optimistic user history message that sorts ahead of the synced assistant reply', () => {
    const userMessage = buildOptimisticUserHistoryMessage(
      301,
      { text: '帮我总结这一节的核心线索' },
      { createdAt: '2026-04-08T08:31:00Z' }
    );

    expect(new Date(userMessage.createdAt).getTime()).toBeLessThan(
      new Date('2026-04-08T08:31:00Z').getTime()
    );
    expect(userMessage.role).toBe('user');
    expect(userMessage.learningSessionId).toBe(301);
    expect(userMessage.content).toBe('帮我总结这一节的核心线索');
  });

  it('drops stale conversation state when the workspace session no longer matches the current notebook', () => {
    const scopedState = resolveScopedLearningWorkspaceState({
      expectedSessionKind: 'explore',
      latestEvaluation: {
        masteryScore: 0.82,
        missingConcepts: [],
        passed: true,
        reasoning: '旧导学本的评估',
        stepIndex: 0,
      },
      latestSessionSignal: {
        completedStepsCount: 1,
        currentStepIndex: 1,
        currentStepTitle: '旧步骤',
        progressLabel: '1 / 2 步',
        status: 'active',
        transitionLabel: '推进到旧步骤',
      },
      latestStatus: {
        label: '旧导学本状态',
        tone: 'warning',
      },
      messages: [
        {
          cards: [],
          id: 'history-assistant-1',
          presentation: null,
          role: 'assistant',
          streaming: false,
          text: '这是另一个导学本里的回答',
        },
      ],
      profileId: 202,
      storeSessionId: 301,
      workspaceSession: createActiveSession(),
    });

    expect(scopedState.workspaceSession).toBeNull();
    expect(scopedState.renderedMessages).toEqual([]);
    expect(scopedState.latestEvaluation).toBeNull();
    expect(scopedState.latestSessionSignal).toBeNull();
    expect(scopedState.latestStatus).toBeNull();
  });

  it('redirects the entry route to explore by default', () => {
    renderWithWorkspaceProvider(<LearningWorkspaceEntryRoute />);

    expect(screen.getByTestId('route-redirect').props.href).toBe('/learning/101/explore');
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

  it('keeps explicit guide study mode on the study route without forcing an explore redirect', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });
    mockSessionsData = [createGuideSession({ id: 305 })];

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    expect(screen.getByText('study-mode:guide')).toBeTruthy();
    expect(screen.getByText('workspace-session:305')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/learning/101/study?mode=explore');
  });

  it('starts a session automatically when the profile is ready but no active session exists', async () => {
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith({
        profileId: 101,
        sessionKind: 'explore',
      });
    });
    expect(mockSubmitLearningBridgeAction).not.toHaveBeenCalled();
  });

  it('starts a standalone explore session instead of bridging when only a guide session exists', async () => {
    mockSessionsData = [createGuideSession()];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith({
        profileId: 101,
        sessionKind: 'explore',
      });
    });
    expect(mockSubmitLearningBridgeAction).not.toHaveBeenCalled();
  });

  it('starts a guide session when guide mode opens without an active guide session', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });
    mockSessionsData = [createActiveSession()];

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith({
        profileId: 101,
        sessionKind: 'guide',
      });
    });
  });

  it('ignores linked explore sessions and starts a standalone explore session', async () => {
    mockSessionsData = [
      createLinkedExploreSession({
        id: 302,
        conversationSessionId: 402,
      }),
    ];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith({
        profileId: 101,
        sessionKind: 'explore',
      });
    });
    expect(mockSubmitLearningBridgeAction).not.toHaveBeenCalled();
  });

  it('routes explore replies through the native search bar instead of a footer composer', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield {
        message: {
          content: '先把这一节拆成目标、概念和例子三层。',
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

    expect(screen.getByTestId('learning-study-native-search-bar').props.placeholder).toBe(
      '继续发散，追问细节...'
    );
    expect(screen.queryByTestId('learning-workspace-footer')).toBeNull();
    expect(screen.queryByTestId('learning-workspace-composer-input')).toBeNull();

    fireEvent.changeText(screen.getByTestId('learning-study-native-search-bar'), '我理解这一节在解释监督学习的目标。');

    await act(async () => {
      fireEvent(screen.getByTestId('learning-study-native-search-bar'), 'submitEditing', {
        nativeEvent: {
          text: '我理解这一节在解释监督学习的目标。',
        },
      });
    });

    expect(streamLearningSessionReply).toHaveBeenCalledWith(
      301,
      { content: '我理解这一节在解释监督学习的目标。' },
      'reader-token'
    );
  });

  it('shows starter prompts in the study body when explore has no messages and can send from them', async () => {
    mockSessionMessagesData = [];
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* (sessionId: number, input: { content: string }) {
      yield {
        message: {
          content: `assistant:${input.content}`,
          createdAt: '2026-04-08T08:31:00Z',
          id: 882,
          role: 'assistant',
          learningSessionId: sessionId,
          presentation: {
            answer: { content: `assistant:${input.content}` },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            relatedConcepts: [],
          },
        },
        type: 'assistant.final',
      };
    });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    const prompt = '你会怎么向同学解释“监督学习”和“标签数据”？';
    expect(screen.getByText(prompt)).toBeTruthy();
    expect(screen.getByText('用一句话说出这本书真正要解决的问题')).toBeTruthy();
    expect(screen.getByText('说说你现在最不确定的一个概念或步骤')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText(prompt));
    });

    expect(streamLearningSessionReply).toHaveBeenCalledWith(
      301,
      { content: prompt },
      'reader-token'
    );
  });

  it('shows a loading state and auto-triggers generation when a profile has not actually started processing yet', async () => {
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
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    expect(screen.getAllByText('后台处理中').length).toBeGreaterThan(0);
    expect(screen.getByText('导学任务已经创建，正在为这份资料启动解析与整理。')).toBeTruthy();
    await waitFor(() => {
      expect(mockGenerateProfileMutateAsync).toHaveBeenCalledWith(101);
    });
  });

  it('shows a processing state while background generation is running even before attempt count increments', () => {
    mockProfileData = {
      ...mockProfileData,
      latestJob: {
        attemptCount: 0,
        id: 10,
        status: 'processing',
      },
      status: 'processing',
    };
    mockSessionsData = [];

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

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
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

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

  it('can recover after retry generation and show the ready explore workspace again', async () => {
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
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    const view = renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    await waitFor(() => {
      expect(mockGenerateProfileMutateAsync).toHaveBeenCalledWith(101);
    });

    mockProfileData = {
      ...mockProfileData,
      latestJob: {
        attemptCount: 1,
        id: 10,
        status: 'completed',
      },
      status: 'ready',
    };
    mockSessionsData = [createActiveSession()];

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

    expect(screen.queryByText('围绕“用自己的话解释概念”发散探索')).toBeNull();
    expect(screen.queryByText('Explore 工作区')).toBeNull();
  });

  it('tracks active tab and study mode separately and lets study switch between explore and guide', () => {
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

  it('does not render the in-body overview action in explore mode', () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    expect(screen.queryByText('查看导学概览')).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('renders the native search bar without the old explore summary card or footer composer', () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    expect(screen.getByTestId('learning-study-native-search-bar')).toBeTruthy();
    expect(screen.queryByTestId('learning-workspace-page-title')).toBeNull();
    expect(screen.queryByText('查看导学概览')).toBeNull();
    expect(screen.queryByTestId('learning-study-native-header-left-item-0')).toBeNull();
    expect(screen.queryByTestId('learning-study-native-header-right-item-0')).toBeNull();
    expect(screen.queryByTestId('learning-workspace-footer')).toBeNull();
  });

  it('renders an android composer fallback and submits through the same explore stream', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 35,
    });
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield {
        message: {
          content: 'assistant:继续发散',
          createdAt: '2026-04-08T08:31:00Z',
          id: 884,
          role: 'assistant',
          learningSessionId: 301,
          presentation: {
            answer: { content: 'assistant:继续发散' },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            relatedConcepts: [],
          },
        },
        type: 'assistant.final',
      };
    });

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    expect(screen.queryByTestId('learning-study-native-search-bar')).toBeNull();
    fireEvent.changeText(screen.getByTestId('learning-workspace-composer-input'), '继续发散');

    await act(async () => {
      fireEvent.press(screen.getByTestId('learning-workspace-composer-send'));
    });

    expect(streamLearningSessionReply).toHaveBeenCalledWith(
      301,
      { content: '继续发散' },
      'reader-token'
    );
  });

  it('keeps the optimistic user message visible while explore is streaming a reply', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'writing', type: 'status' };
      yield {
        delta: '我先根据资料梳理这一轮回答。',
        type: 'explore.answer.delta',
      };
      yield {
        message: {
          content: '我先根据资料梳理这一轮回答。',
          createdAt: '2026-04-08T08:31:00Z',
          id: 885,
          role: 'assistant',
          learningSessionId: 301,
          presentation: {
            answer: { content: '我先根据资料梳理这一轮回答。' },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            relatedConcepts: [],
          },
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

    expect(screen.getAllByText('帮我总结这一节的核心线索').length).toBeGreaterThan(0);
    expect(screen.getAllByText('我先根据资料梳理这一轮回答。').length).toBeGreaterThan(0);
  });

  it('keeps the optimistic user message visible after assistant.final even when synced history only contains the assistant turn', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield {
        message: {
          content: '这是已经整理好的总结。',
          createdAt: '2026-04-08T08:31:00Z',
          id: 886,
          role: 'assistant',
          learningSessionId: 301,
          presentation: {
            answer: { content: '这是已经整理好的总结。' },
            bridgeActions: [],
            evidence: [],
            followups: [],
            kind: 'explore',
            relatedConcepts: [],
          },
        },
        type: 'assistant.final',
      };
    });

    const view = renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('workspace-probe-send'));
    });

    mockSessionMessagesData = [
      ...mockSessionMessagesData,
      {
        content: '这是已经整理好的总结。',
        createdAt: '2026-04-08T08:31:00Z',
        id: 886,
        role: 'assistant',
        learningSessionId: 301,
        presentation: {
          answer: { content: '这是已经整理好的总结。' },
          bridgeActions: [],
          evidence: [],
          followups: [],
          kind: 'explore',
          relatedConcepts: [],
        },
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
          <>
            <LearningWorkspaceStudyRoute />
            <WorkspaceProbe />
          </>
        </LearningWorkspaceProvider>
      </QueryClientProvider>
    );

    expect(screen.getAllByText('帮我总结这一节的核心线索').length).toBeGreaterThan(0);
    expect(screen.getAllByText('这是已经整理好的总结。').length).toBeGreaterThan(0);
  });

  it('keeps study content below the floating chrome', () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    mockSafeAreaTop = 44;

    renderWithWorkspaceProvider(<LearningWorkspaceStudyRoute />);

    const screenContainer = screen.getByTestId('learning-workspace-screen');

    expect(StyleSheet.flatten(screenContainer.props.contentContainerStyle).paddingTop).toBe(
      mockSafeAreaTop + LEARNING_WORKSPACE_TOP_CHROME_OFFSET + LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE + appTheme.spacing.lg
    );
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

  it('streams guide replies on the guide study route and keeps the latest turn visible', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'guide', profileId: '101' });
    mockSessionsData = [createGuideSession({ id: 305 })];
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'reasoning', type: 'status' };
      yield { delta: '先把这道例题的已知条件和目标分开。', type: 'teacher.delta' };
      yield {
        evaluation: {
          confidence: 0.74,
          masteryScore: 74,
          missingConcepts: [],
          passed: true,
          reasoning: '这轮回答已经把例题的切入点说清楚了。',
          stepIndex: 1,
        },
        type: 'evaluation',
      };
      yield {
        message: {
          content: '先把这道例题的已知条件和目标分开。',
          createdAt: '2026-04-08T08:31:00Z',
          id: 990,
          role: 'assistant',
          learningSessionId: 305,
          presentation: {
            bridgeActions: [],
            evidence: [],
            examiner: {
              confidence: 0.74,
              feedback: null,
              masteryScore: 74,
              missingConcepts: [],
              passed: true,
              reasoning: '这轮回答已经把例题的切入点说清楚了。',
              stepIndex: 1,
            },
            followups: [],
            kind: 'guide',
            peer: null,
            relatedConcepts: [],
            step: null,
            teacher: {
              content: '先把这道例题的已知条件和目标分开。',
            },
          },
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
      305,
      { content: '帮我总结这一节的核心线索' },
      'reader-token'
    );
    expect(screen.getAllByText('帮我总结这一节的核心线索').length).toBeGreaterThan(0);
    expect(screen.getAllByText('先把这道例题的已知条件和目标分开。').length).toBeGreaterThan(0);
  });

  it('does not auto-bridge guide sessions on open', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    mockSessionsData = [createGuideSession()];

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith({
        profileId: 101,
        sessionKind: 'explore',
      });
    });
    expect(mockSubmitLearningBridgeAction).not.toHaveBeenCalled();
  });

  it('starts a standalone explore session for legacy sessions without sessionKind', async () => {
    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    mockSessionsData = [createActiveSession({ sessionKind: undefined })];

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    await waitFor(() => {
      expect(mockStartSessionMutateAsync).toHaveBeenCalledWith({
        profileId: 101,
        sessionKind: 'explore',
      });
    });
    expect(mockSubmitLearningBridgeAction).not.toHaveBeenCalled();
  });

  it('follows backend session redirects by switching to explore and replaying the original input', async () => {
    const originalInput = '我理解这一步了，想顺手看一个真实应用场景';
    const redirectedSession = {
      completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
      completedStepsCount: 1,
      conversationSessionId: 402,
      createdAt: '2026-04-08T08:32:00Z',
      currentStepIndex: 1,
      currentStepTitle: '用自己的话解释概念',
      focusContext: { stepTitle: '用自己的话解释概念' },
      id: 302,
      lastMessagePreview: null,
      learningProfileId: 101,
      progressLabel: '1 / 2 步',
      sessionKind: 'explore' as const,
      sourceSessionId: 301,
      status: 'active' as const,
      updatedAt: '2026-04-08T08:32:00Z',
    };

    mockUsePathname.mockReturnValue('/learning/101/study');
    mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
    mockRouter.replace.mockImplementation((href: string) => {
      if (href === '/learning/101/study?mode=explore') {
        mockUsePathname.mockReturnValue('/learning/101/study');
        mockUseLocalSearchParams.mockReturnValue({ mode: 'explore', profileId: '101' });
      }
    });
    (streamLearningSessionReply as jest.Mock).mockImplementation(
      async function* (sessionId: number, input: { content: string }) {
        if (sessionId === 301) {
          yield {
            session: redirectedSession,
            targetMode: 'explore' as const,
            type: 'session.redirect' as const,
          };
          return;
        }

        yield {
          message: {
            content: `explore:${input.content}`,
            createdAt: '2026-04-08T08:33:00Z',
            id: 883,
            learningSessionId: sessionId,
            presentation: {
              answer: { content: `explore:${input.content}` },
              bridgeActions: [],
              evidence: [],
              followups: [],
              kind: 'explore' as const,
              relatedConcepts: [],
            },
            role: 'assistant',
          },
          type: 'assistant.final' as const,
        };
      }
    );

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    fireEvent.changeText(screen.getByTestId('learning-study-native-search-bar'), originalInput);

    await act(async () => {
      fireEvent(screen.getByTestId('learning-study-native-search-bar'), 'submitEditing', {
        nativeEvent: {
          text: originalInput,
        },
      });
    });

    await waitFor(() => {
      expect(streamLearningSessionReply).toHaveBeenNthCalledWith(
        1,
        301,
        { content: originalInput },
        'reader-token'
      );
    });
    await waitFor(() => {
      expect(streamLearningSessionReply).toHaveBeenNthCalledWith(
        2,
        302,
        { content: originalInput },
        'reader-token'
      );
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/learning/101/study?mode=explore');
    expect(screen.getByText('study-mode:explore')).toBeTruthy();
    expect(screen.getAllByText(`explore:${originalInput}`).length).toBeGreaterThan(0);
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

  it('keeps streamed explore content and avoids a failure toast when the tail breaks before assistant.final', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
      yield {
        delta: '我先确认用户是要概览还是逐段拆解。',
        type: 'explore.reasoning.delta',
      };
      yield {
        delta: '这是已经显示出来的 Explore 回答。',
        type: 'explore.answer.delta',
      };
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

    expect(
      screen.getAllByText('我们先不急着背定义，先说说你眼里“监督学习”的目标是什么？').length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('这是已经显示出来的 Explore 回答。').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('learning-conversation-reasoning-toggle'));

    expect(screen.getByText('我先确认用户是要概览还是逐段拆解。')).toBeTruthy();
    expect(toast.error).not.toHaveBeenCalledWith('导学回复失败，请稍后再试。');
  });

  it('keeps visible explore reasoning when the stream breaks before any answer delta arrives', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
      yield {
        delta: '我先确认这个问题依赖的是哪一段上下文，再决定怎么展开。',
        type: 'explore.reasoning.delta',
      };
      throw new Error('native stream interrupted before answer delta arrived');
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

    fireEvent.press(screen.getByTestId('learning-conversation-reasoning-toggle'));

    expect(
      screen.getByText('我先确认这个问题依赖的是哪一段上下文，再决定怎么展开。')
    ).toBeTruthy();
    expect(toast.error).not.toHaveBeenCalledWith('Explore 回复失败，请稍后再试。');
  });

  it('shows an inline model request error when the stream ends without assistant.final', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
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

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('模型请求错误');
    });
    expect(screen.getByText('模型请求错误')).toBeTruthy();
  });

  it('keeps the latest optimistic user turn after an interrupted stream when leaving and reopening the same explore session', async () => {
    const interruptedInput = '讲下这个例题';
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'retrieving', type: 'status' };
    });

    const view = renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    fireEvent.changeText(screen.getByTestId('learning-study-native-search-bar'), interruptedInput);

    await act(async () => {
      fireEvent(screen.getByTestId('learning-study-native-search-bar'), 'submitEditing', {
        nativeEvent: {
          text: interruptedInput,
        },
      });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('模型请求错误');
    });

    view.unmount();

    renderWithWorkspaceProvider(
      <>
        <LearningWorkspaceStudyRoute />
        <WorkspaceProbe />
      </>
    );

    expect(screen.getAllByText(interruptedInput).length).toBeGreaterThan(0);
  });

  it('shows a model request error when the stream emits an explicit error event', async () => {
    (streamLearningSessionReply as jest.Mock).mockImplementation(async function* () {
      yield { phase: 'reasoning', type: 'status' };
      yield { code: 'learning_model_request_error', message: '模型请求错误', type: 'error' };
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

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('模型请求错误');
    });
    expect(screen.getByText('模型请求错误')).toBeTruthy();
  });

  it('renders overview as a secondary workspace summary route', () => {
    mockUsePathname.mockReturnValue('/learning/101/overview');
    mockUseLocalSearchParams.mockReturnValue({ profileId: '101' });

    renderWithWorkspaceProvider(<LearningWorkspaceOverviewRoute />);

    expect(screen.getByText('机器学习从零到一')).toBeTruthy();
    expect(screen.getByText('继续 Explore')).toBeTruthy();
    expect(screen.queryByText('继续 Guide')).toBeNull();
  });
});

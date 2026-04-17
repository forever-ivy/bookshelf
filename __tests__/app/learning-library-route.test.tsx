import { render, screen } from '@testing-library/react-native';
import React from 'react';

import LearningRoute from '@/app/(tabs)/learning';
import { LearningNotebookCard } from '@/components/learning/learning-notebook-card';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    FadeInUp: {
      delay: () => ({
        duration: () => ({}),
      }),
    },
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children),
    },
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  const Link = ({ children, href }: { children: React.ReactNode; href?: string }) =>
    React.createElement(View as React.ComponentType<Record<string, unknown>>, { href, testID: 'mock-link' }, children);
  Link.Preview = function LinkPreview() {
    return null;
  };
  Link.Trigger = function LinkTrigger({ children }: { children: React.ReactNode }) {
    return React.createElement(View, null, children);
  };

  const Screen = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, { testID: 'shared-stack-screen' }, children);

  return {
    Link,
    Stack: {
      Screen,
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    openProfileSheet: jest.fn(),
  }),
}));

jest.mock('@/lib/app/artwork', () => ({
  appArtwork: {
    notionLearningProgress: 1,
  },
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useCreateLearningProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useUploadLearningProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useLearningProfilesQuery: () => ({
    data: [
      {
        bookId: 1,
        createdAt: '2026-04-08T08:00:00Z',
        curriculum: [
          { id: 'step-1', title: '建立整体框架' },
          { id: 'step-2', title: '用自己的话解释概念' },
        ],
        id: 101,
        latestJob: {
          attemptCount: 1,
          id: 9,
          status: 'completed',
        },
        persona: {
          greeting: '我们先把这本书真正学进去。',
          name: '周老师',
        },
        sources: [],
        sourceType: 'book',
        status: 'ready',
        title: '机器学习从零到一',
        updatedAt: '2026-04-08T08:30:00Z',
      },
      {
        bookId: null,
        createdAt: '2026-04-08T09:00:00Z',
        curriculum: [],
        failureMessage: null,
        id: 102,
        latestJob: {
          attemptCount: 0,
          id: 10,
          status: 'queued',
        },
        persona: {
          greeting: '先把实验资料拆出重点。',
          name: '资料陪练助教',
        },
        sources: [],
        sourceType: 'upload',
        status: 'queued',
        title: '实验手册导学',
        updatedAt: '2026-04-08T09:15:00Z',
      },
      {
        bookId: null,
        createdAt: '2026-04-08T09:00:00Z',
        curriculum: [],
        failureMessage: '学习任务没有真正启动，请检查后台 worker。',
        id: 103,
        latestJob: {
          attemptCount: 1,
          errorMessage: '学习任务没有真正启动，请检查后台 worker。',
          id: 11,
          status: 'failed',
        },
        persona: {
          greeting: '先把资料任务说清楚。',
          name: '资料陪练助教',
        },
        sources: [],
        sourceType: 'upload',
        status: 'failed',
        title: 'failed-outline.pdf',
        updatedAt: '2026-04-08T09:20:00Z',
      },
    ],
  }),
  useLearningSessionsQuery: () => ({
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
        learningProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
    ],
  }),
}));

describe('learning library route', () => {
  it('renders a notebook-style library from profiles and sessions without a dashboard query', () => {
    render(<LearningRoute />);

    expect(screen.getByText('精选导学本')).toBeTruthy();
    expect(screen.getByText('最近打开')).toBeTruthy();
    expect(screen.getAllByText('新建导学本')).toHaveLength(1);
    expect(screen.getByText('定制你的导师')).toBeTruthy();
    expect(screen.getAllByTestId('learning-notebook-poster-card')).toHaveLength(2);
    expect(screen.getAllByTestId('learning-notebook-list-card')).toHaveLength(3);
    expect(screen.queryByText('我的导师')).toBeNull();
  });

  it('links library notebook cards to direct guide entry routes', () => {
    render(<LearningRoute />);

    const hrefs = screen.getAllByTestId('mock-link').map((node) => node.props.href).filter(Boolean);

    expect(hrefs).toContain('/learning/101/guide');
    expect(hrefs).toContain('/learning/102/guide');
    expect(hrefs).toContain('/learning/103/guide');
  });

  it('links notebook cards to the standalone learning workspace route so the root tabs can disappear', () => {
    render(
      <LearningNotebookCard
        href="/learning/101/guide"
        profile={{
          bookId: 1,
          createdAt: '2026-04-08T08:00:00Z',
          curriculum: [{ id: 'step-1', title: '建立整体框架' }],
          id: 101,
          latestJob: {
            attemptCount: 1,
            id: 9,
            status: 'completed',
          },
          persona: {
            greeting: '我们先把这本书真正学进去。',
            name: '周老师',
          },
          sources: [],
          sourceType: 'book',
          status: 'ready',
          title: '机器学习从零到一',
          updatedAt: '2026-04-08T08:30:00Z',
        }}
        session={null}
        variant="list"
      />
    );

    expect(screen.getByTestId('learning-notebook-list-card')).toBeTruthy();
  });

  it('shows a waiting-to-start placeholder when generation has not actually begun', () => {
    render(
      <LearningNotebookCard
        href="/learning/102/guide"
        profile={{
          bookId: null,
          createdAt: '2026-04-08T09:00:00Z',
          curriculum: [],
          id: 102,
          latestJob: {
            attemptCount: 0,
            id: 10,
            status: 'queued',
          },
          persona: {
            greeting: '我已经按资料内容搭好一个预习路径，我们从第一步开始。',
            name: '资料陪练助教',
          },
          sources: [],
          sourceType: 'upload',
          status: 'queued',
          title: 'course-outline.pdf',
          updatedAt: '2026-04-08T09:15:00Z',
        }}
        session={null}
        variant="list"
      />
    );

    expect(screen.getByText('course-outline.pdf')).toBeTruthy();
    expect(screen.getByText('等待触发')).toBeTruthy();
    expect(screen.getByText('可重试')).toBeTruthy();
  });

  it('shows a failure placeholder that invites the user to retry', () => {
    render(
      <LearningNotebookCard
        href="/learning/103/guide"
        profile={{
          bookId: null,
          createdAt: '2026-04-08T09:00:00Z',
          curriculum: [],
          failureMessage: '学习任务没有真正启动，请检查后台 worker。',
          id: 103,
          latestJob: {
            attemptCount: 1,
            errorMessage: '学习任务没有真正启动，请检查后台 worker。',
            id: 11,
            status: 'failed',
          },
          persona: {
            greeting: '我们先从资料目标开始。',
            name: '资料陪练助教',
          },
          sources: [],
          sourceType: 'upload',
          status: 'failed',
          title: 'failed-outline.pdf',
          updatedAt: '2026-04-08T09:15:00Z',
        }}
        session={null}
        variant="list"
      />
    );

    expect(screen.getByText('failed-outline.pdf')).toBeTruthy();
    expect(screen.getByText('生成失败，可重试')).toBeTruthy();
    expect(screen.getAllByText('学习任务没有真正启动，请检查后台 worker。').length).toBeGreaterThan(0);
  });
});

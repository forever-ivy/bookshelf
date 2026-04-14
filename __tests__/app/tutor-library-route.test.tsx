import { render, screen } from '@testing-library/react-native';
import React from 'react';

import TutorRoute from '@/app/(tabs)/tutor';
import { TutorNotebookCard } from '@/components/tutor/tutor-notebook-card';

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

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
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
    notionTutorProgress: 1,
  },
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useCreateTutorProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useUploadTutorProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useTutorDashboardQuery: () => ({
    data: {
      continueSession: {
        completedSteps: [{ completedAt: '2026-04-08T08:00:00Z', confidence: 0.82, stepIndex: 0 }],
        completedStepsCount: 1,
        conversationSessionId: 401,
        createdAt: '2026-04-08T08:00:00Z',
        currentStepIndex: 1,
        currentStepTitle: '用自己的话解释概念',
        id: 301,
        lastMessagePreview: '先试着说说什么是标签数据。',
        personaName: '周老师',
        profileId: 101,
        progressLabel: '1 / 4 步',
        status: 'active',
        title: '机器学习从零到一',
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
      recentProfiles: [],
      suggestions: [],
    },
    isFetching: false,
  }),
  useTutorProfilesQuery: () => ({
    data: [
      {
        bookId: 1,
        createdAt: '2026-04-08T08:00:00Z',
        curriculum: [
          { id: 'step-1', title: '建立整体框架' },
          { id: 'step-2', title: '用自己的话解释概念' },
        ],
        id: 101,
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
        curriculum: [{ id: 'step-1', title: '看清资料任务' }],
        id: 102,
        persona: {
          greeting: '先把实验资料拆出重点。',
          name: '实验课助教',
        },
        sources: [],
        sourceType: 'upload',
        status: 'processing',
        title: '实验手册导学',
        updatedAt: '2026-04-08T09:15:00Z',
      },
    ],
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

describe('tutor library route', () => {
  it('renders a notebook-style library instead of the old tutor management layout', () => {
    render(<TutorRoute />);

    expect(screen.getByText('精选导学本')).toBeTruthy();
    expect(screen.getByText('最近打开')).toBeTruthy();
    expect(screen.getAllByText('新建导学本')).toHaveLength(1);
    expect(screen.getByText('定制你的导师')).toBeTruthy();
    expect(screen.getAllByTestId('tutor-notebook-poster-card')).toHaveLength(2);
    expect(screen.getAllByTestId('tutor-notebook-list-card')).toHaveLength(2);
    expect(screen.queryByText('我的导师')).toBeNull();
  });

  it('links notebook cards to the standalone tutor workspace route so the root tabs can disappear', () => {
    render(
      <TutorNotebookCard
        href="/tutor/101"
        profile={{
          bookId: 1,
          createdAt: '2026-04-08T08:00:00Z',
          curriculum: [{ id: 'step-1', title: '建立整体框架' }],
          id: 101,
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

    expect(screen.getByTestId('tutor-notebook-list-card')).toBeTruthy();
  });

  it('shows a parsing placeholder for newly uploaded notebooks while the document is still being processed', () => {
    render(
      <TutorNotebookCard
        href="/tutor/102"
        profile={{
          bookId: null,
          createdAt: '2026-04-08T09:00:00Z',
          curriculum: [],
          id: 102,
          persona: {
            greeting: '我已经按资料内容搭好一个预习路径，我们从第一步开始。',
            name: '资料陪练助教',
          },
          sources: [],
          sourceType: 'upload',
          status: 'processing',
          title: 'course-outline.pdf',
          updatedAt: '2026-04-08T09:15:00Z',
        }}
        session={null}
        variant="list"
      />
    );

    expect(screen.getByText('course-outline.pdf')).toBeTruthy();
    expect(screen.getByText('正在解析文档，请稍后')).toBeTruthy();
  });
});

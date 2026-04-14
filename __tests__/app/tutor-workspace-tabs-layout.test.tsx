import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import TutorWorkspaceTabsLayout from '@/app/tutor/[profileId]/(workspace)/_layout';
import { TutorWorkspaceProvider } from '@/components/tutor/tutor-workspace-provider';

let mockPathname = '/tutor/101';
let mockRenderedIcons: { md?: string; sf?: string | { default?: string; selected?: string } }[] = [];
let mockNativeTabsProps: Record<string, unknown> | undefined;
let mockRenderedTriggers: { name?: string; role?: string }[] = [];

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text, View } = jest.requireActual('react-native') as typeof import('react-native');

  function MockNativeTabs({
    children,
    ...props
  }: {
    children: React.ReactNode;
    sidebarAdaptable?: boolean;
  }) {
    mockNativeTabsProps = props;
    return React.createElement(View, { testID: 'workspace-native-tabs-root' }, children);
  }

  function MockTrigger({
    children,
    name,
    role,
  }: {
    children: React.ReactNode;
    name?: string;
    role?: string;
  }) {
    mockRenderedTriggers.push({ name, role });
    return React.createElement(
      View,
      {
        testID: name ? `workspace-native-tab-${name}` : undefined,
      },
      children
    );
  }

  function MockBottomAccessory({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return React.createElement(View, { testID: 'workspace-native-tabs-accessory' }, children);
  }

  function RecordingTriggerIcon(props: {
    md?: string;
    sf?: string | { default?: string; selected?: string };
  }) {
    mockRenderedIcons.push(props);
    return null;
  }

  function MockTriggerLabel({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(Text, null, children);
  }

  const NativeTabs: any = MockNativeTabs;
  const Trigger: any = MockTrigger;
  NativeTabs.BottomAccessory = MockBottomAccessory;
  NativeTabs.BottomAccessory.usePlacement = () => 'regular';
  Trigger.Icon = RecordingTriggerIcon;
  Trigger.Label = MockTriggerLabel;
  NativeTabs.Trigger = Trigger;

  return {
    NativeTabs,
  };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    profileId: '101',
  }),
  usePathname: () => mockPathname,
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useStartTutorSessionMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useTutorProfileQuery: () => ({
    data: {
      curriculum: [
        {
          goal: '先建立阅读地图。',
          guidingQuestion: '如果只用一句话介绍这本书，它最核心的任务是什么？',
          id: 'step-1',
          title: '建立整体框架',
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
    },
  }),
  useTutorSessionMessagesQuery: () => ({
    data: [],
    refetch: jest.fn(async () => ({ data: [] })),
  }),
  useTutorSessionsQuery: () => ({
    data: [
      {
        completedSteps: [],
        completedStepsCount: 0,
        currentStepIndex: 0,
        currentStepTitle: '建立整体框架',
        id: 301,
        progressLabel: '0 / 2 步',
        status: 'active',
        tutorProfileId: 101,
        updatedAt: '2026-04-08T08:30:00Z',
      },
    ],
    refetch: jest.fn(async () => ({ data: [] })),
  }),
}));

describe('tutor workspace tabs layout', () => {
  beforeEach(() => {
    mockPathname = '/tutor/101';
    mockRenderedIcons = [];
    mockNativeTabsProps = undefined;
    mockRenderedTriggers = [];
  });

  function renderLayout() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <TutorWorkspaceProvider profileId={101}>
          <TutorWorkspaceTabsLayout />
        </TutorWorkspaceProvider>
      </QueryClientProvider>
    );
  }

  it('orders the native tabs as 来源 / 更多 / 导学, keeps 导学 as search-role, and forces bottom tabs on large screens', () => {
    renderLayout();

    expect(screen.getByTestId('workspace-native-tabs-root')).toBeTruthy();
    expect(screen.getByTestId('workspace-native-tab-sources')).toBeTruthy();
    expect(screen.getByTestId('workspace-native-tab-more')).toBeTruthy();
    expect(screen.getByTestId('workspace-native-tab-(search)')).toBeTruthy();
    expect(screen.getByText('导学')).toBeTruthy();
    expect(screen.getByText('来源')).toBeTruthy();
    expect(screen.getByText('更多')).toBeTruthy();
    expect(mockRenderedTriggers).toEqual([
      { name: 'sources', role: undefined },
      { name: 'more', role: undefined },
      { name: '(search)', role: 'search' },
    ]);
    expect(mockNativeTabsProps).toEqual(
      expect.objectContaining({
        minimizeBehavior: 'onScrollDown',
        sidebarAdaptable: false,
      })
    );
    expect(mockRenderedIcons[1]).toEqual({
      md: 'more_horiz',
      sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' },
    });
  });

  it('keeps the guide tab free of a custom bottom accessory so the native search tab can take over', () => {
    renderLayout();

    expect(screen.queryByTestId('workspace-native-tabs-accessory')).toBeNull();
    expect(screen.queryByPlaceholderText('Ask 1 source...')).toBeNull();
  });

  it('does not render a custom accessory on the sources tab either, leaving the native tab bar as the only bottom chrome', () => {
    mockPathname = '/tutor/101/sources';

    renderLayout();

    expect(screen.queryByTestId('workspace-native-tabs-accessory')).toBeNull();
    expect(screen.queryByText('Add a source')).toBeNull();
  });
});

import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

import { appTheme } from '@/constants/app-theme';

let mockOpenProfileSheet = jest.fn();

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const chain = {
    delay: () => chain,
    duration: () => chain,
  };

  return {
    __esModule: true,
    FadeInUp: chain,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children),
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  const renderCustomHeaderItems = (
    resolver?: (props?: Record<string, unknown>) => Array<{
      element?: React.ReactNode;
      type?: string;
    }>
  ) =>
    typeof resolver === 'function'
      ? resolver({}).map((item, index) =>
          item?.type === 'custom'
            ? React.createElement(React.Fragment, { key: `custom-header-item-${index}` }, item.element ?? null)
            : null
        )
      : null;

  const Screen = ({
    options,
  }: {
    options?: {
      headerLeft?: (props?: Record<string, unknown>) => React.ReactNode;
      headerRight?: (props?: Record<string, unknown>) => React.ReactNode;
      unstable_headerLeftItems?: (props?: Record<string, unknown>) => Array<{
        element?: React.ReactNode;
        type?: string;
      }>;
      unstable_headerRightItems?: (props?: Record<string, unknown>) => Array<{
        element?: React.ReactNode;
        type?: string;
      }>;
    };
  }) =>
    React.createElement(
      View,
      {
        options,
        testID: 'home-stack-screen',
      },
      typeof options?.headerLeft === 'function' ? options.headerLeft({}) : null,
      renderCustomHeaderItems(options?.unstable_headerLeftItems),
      typeof options?.headerRight === 'function' ? options.headerRight({}) : null,
      renderCustomHeaderItems(options?.unstable_headerRightItems)
    );

  Screen.Title = ({
    children,
    large,
  }: {
    children?: React.ReactNode;
    large?: boolean;
  }) =>
    React.createElement(
      Text,
      {
        testID: large ? 'home-stack-title-large' : 'home-stack-title',
      },
      children
    );

  const Toolbar = ({
    children,
    placement,
  }: {
    children?: React.ReactNode;
    placement?: string;
  }) =>
    React.createElement(
      View,
      {
        placement,
        testID: `home-stack-toolbar-${placement ?? 'bottom'}`,
      },
      children
    );

  Toolbar.Button = ({
    hidden,
    icon,
  }: {
    hidden?: boolean;
    icon?: string;
  }) =>
    React.createElement(View, {
      hidden,
      icon,
      testID: 'home-stack-toolbar-button',
    });

  Toolbar.View = ({
    children,
    hidden,
    testID,
  }: {
    children?: React.ReactNode;
    hidden?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      View,
      {
        hidden,
        testID: testID ?? 'home-stack-toolbar-view',
      },
      children
    );

  return {
    Link,
    Stack: {
      Screen,
      Toolbar,
    },
  };
});

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    openProfileSheet: mockOpenProfileSheet,
  }),
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: jest.fn(),
    identity: {
      accountId: 1,
      profileId: 1,
      role: 'reader',
    },
    isAuthenticated: true,
    onboarding: {
      completed: true,
      needsInterestSelection: false,
      needsProfileBinding: false,
    },
    profile: { displayName: '陈知行' },
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

jest.mock('@/lib/api/client', () => {
  const actual = jest.requireActual('@/lib/api/client');

  return {
    ...actual,
    hasLibraryService: () => true,
  };
});

jest.mock('@/hooks/use-library-app-data', () => ({
  useAchievementsQuery: () => ({
    data: {
      currentPoints: 860,
      streakLabel: '连续学习 9 天',
      summary: {
        aiAssists: 14,
        completedOrders: 7,
        readingDays: 28,
        totalBorrowedBooks: 28,
      },
    },
  }),
  useActiveOrdersQuery: () => ({
    data: [],
  }),
  useBookDetailQueries: () => [],
  useHomeFeedQuery: () => ({
    data: {
      quickActions: [],
      systemBooklists: [],
      todayRecommendations: [],
    },
  }),
  useNotificationsQuery: () => ({
    data: [
      { body: '配送更新', id: 'note-1', kind: 'delivery', title: '配送更新' },
      { body: '推荐更新', id: 'note-2', kind: 'achievement', title: '推荐更新' },
    ],
  }),
  usePersonalizedRecommendationsQuery: () => ({
    data: [],
  }),
}));

import HomeRoute from '@/app/(tabs)/(home)';

function getHomeHeaderItems() {
  const options = screen.getByTestId('home-stack-screen').props.options as {
    unstable_headerLeftItems?: (props?: Record<string, unknown>) => Array<Record<string, unknown>>;
    unstable_headerRightItems?: (props?: Record<string, unknown>) => Array<Record<string, unknown>>;
  };

  return {
    leftItems: options.unstable_headerLeftItems?.({}) ?? [],
    rightItems: options.unstable_headerRightItems?.({}) ?? [],
  };
}

describe('HomeRoute native header visibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T09:00:00+08:00'));
    mockOpenProfileSheet = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the home title and profile action at the top, hides them when scrolled down, and restores them when returning to top', () => {
    const view = render(<HomeRoute />);
    const scrollView = view.UNSAFE_getByType(ScrollView);
    const initialHeaderItems = getHomeHeaderItems();

    expect(screen.getByTestId('home-header-inline-title-slot')).toBeTruthy();
    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByTestId('home-header-profile-slot')).toBeTruthy();
    expect(screen.getByTestId('toolbar-profile-action-badge-label').props.children).toBe('2');
    expect(initialHeaderItems.leftItems).toEqual([
      expect.objectContaining({
        hidesSharedBackground: true,
        type: 'custom',
      }),
    ]);
    expect(initialHeaderItems.rightItems).toEqual([
      expect.objectContaining({
        hidesSharedBackground: true,
        type: 'custom',
      }),
    ]);

    act(() => {
      scrollView.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 72,
          },
        },
      });
    });

    expect(getHomeHeaderItems()).toEqual({
      leftItems: [],
      rightItems: [],
    });
    expect(screen.queryByTestId('home-header-inline-title-slot')).toBeNull();
    expect(screen.queryByTestId('home-header-profile-slot')).toBeNull();

    act(() => {
      scrollView.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 0,
          },
        },
      });
    });

    const restoredHeaderItems = getHomeHeaderItems();

    expect(restoredHeaderItems.leftItems).toHaveLength(1);
    expect(restoredHeaderItems.rightItems).toHaveLength(1);
    expect(screen.getByTestId('home-header-profile-slot')).toBeTruthy();
  });
});

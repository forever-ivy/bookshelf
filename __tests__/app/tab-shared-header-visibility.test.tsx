import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

import { appTheme } from '@/constants/app-theme';

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
  const { Text, TextInput, View } = require('react-native');

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
    children,
    options,
  }: {
    children?: React.ReactNode;
    options?: {
      headerLeft?: (props?: Record<string, unknown>) => React.ReactNode;
      headerRight?: (props?: Record<string, unknown>) => React.ReactNode;
      headerSearchBarOptions?: { placeholder?: string };
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
      { options, testID: 'shared-stack-screen' },
      typeof options?.headerLeft === 'function' ? options.headerLeft({}) : null,
      renderCustomHeaderItems(options?.unstable_headerLeftItems),
      typeof options?.headerRight === 'function' ? options.headerRight({}) : null,
      renderCustomHeaderItems(options?.unstable_headerRightItems),
      options?.headerSearchBarOptions
        ? React.createElement(TextInput, {
            placeholder: options.headerSearchBarOptions.placeholder,
            testID: 'shared-native-search-bar',
          })
        : null,
      children
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
        testID: large ? 'shared-stack-title-large' : 'shared-stack-title',
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
      { testID: `shared-stack-toolbar-${placement ?? 'bottom'}` },
      children
    );
  Toolbar.Button = ({
    hidden,
  }: {
    hidden?: boolean;
  }) =>
    React.createElement(View, {
      hidden,
      testID: 'shared-stack-toolbar-button',
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
        testID: testID ?? 'shared-stack-toolbar-view',
      },
      children
    );

  return {
    Link,
    Stack: {
      Screen,
      Toolbar,
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
    notionBorrowSuccess: 1,
    notionNoResults: 1,
    notionTutorProgress: 1,
  },
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBorrowOrdersQuery: () => ({
    data: [],
    error: null,
    isError: false,
    isFetching: false,
  }),
  useMyOrdersQuery: () => ({
    data: [],
    isFetching: false,
  }),
  useMyOverviewQuery: () => ({
    data: {
      recentOrders: [],
      recentReadingEvents: [],
      stats: {
        activeOrdersCount: 0,
        lastActiveAt: '2026-04-01',
        readingEventCount: 0,
      },
    },
    isFetching: false,
  }),
  useOrderHistoryQuery: () => ({
    data: [],
    isFetching: false,
  }),
  useCancelBorrowOrderMutation: () => ({
    error: null,
    mutate: jest.fn(),
  }),
  useRenewBorrowOrderMutation: () => ({
    error: null,
    mutate: jest.fn(),
  }),
  useReturnRequestMutation: () => ({
    mutate: jest.fn(),
  }),
  useReturnRequestsQuery: () => ({
    data: [],
    isFetching: false,
  }),
  useCatalogCategoriesQuery: () => ({
    data: [
      { id: 1, name: '人工智能' },
      { id: 2, name: '管理学' },
    ],
    isFetching: false,
  }),
  useCatalogBookSearchPageQuery: () => ({
    data: {
      hasMore: false,
      items: [],
    },
    error: null,
    isFetching: false,
  }),
  useExplicitBookSearchQuery: () => ({
    data: {
      hasMore: false,
      items: [],
    },
    error: null,
    isFetching: false,
  }),
  useNotificationsQuery: () => ({
    data: [
      { body: '配送更新', id: 'note-1', kind: 'delivery', title: '配送更新' },
      { body: '推荐更新', id: 'note-2', kind: 'achievement', title: '推荐更新' },
    ],
    isFetching: false,
  }),
  useDismissNotificationMutation: () => ({
    mutateAsync: jest.fn(),
  }),
  useRecommendationSearchQuery: () => ({
    data: [],
    error: null,
    isFetching: false,
  }),
  useCreateTutorProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useTutorDashboardQuery: () => ({
    data: {
      continueSession: null,
      suggestions: [
        {
          description: '先从资料的第一步目标开始，把概念说成自己的语言。',
          id: 'suggestion-1',
          title: '从第一步开始导学',
        },
      ],
    },
    isFetching: false,
  }),
  useTutorProfilesQuery: () => ({
    data: [],
  }),
  useTutorSessionsQuery: () => ({
    data: [],
  }),
}));

import BorrowingRoute from '@/app/(tabs)/borrowing';
import SearchRoute from '@/app/(tabs)/search';
import TutorRoute from '@/app/(tabs)/tutor';

function findPrimaryScrollView(view: ReturnType<typeof render>) {
  return view.UNSAFE_getAllByType(ScrollView).find((node) => !node.props.horizontal);
}

function getSharedHeaderItems(view: ReturnType<typeof render>) {
  const options = view.getByTestId('shared-stack-screen').props.options as {
    headerSearchBarOptions?: { placeholder?: string };
    unstable_headerLeftItems?: (props?: Record<string, unknown>) => Array<Record<string, unknown>>;
    unstable_headerRightItems?: (props?: Record<string, unknown>) => Array<Record<string, unknown>>;
  };

  return {
    leftItems: options.unstable_headerLeftItems?.({}) ?? [],
    rightItems: options.unstable_headerRightItems?.({}) ?? [],
    searchPlaceholder: options.headerSearchBarOptions?.placeholder,
  };
}

describe('shared tab header visibility', () => {
  it('hides the borrowing title and profile action when scrolled down, then restores them at the top', () => {
    const view = render(<BorrowingRoute />);
    const scrollView = findPrimaryScrollView(view);
    const initialHeaderItems = getSharedHeaderItems(view);

    expect(scrollView).toBeTruthy();
    expect(screen.getByTestId('borrowing-header-inline-title-slot')).toBeTruthy();
    expect(screen.getAllByText('借阅').length).toBeGreaterThan(0);
    expect(screen.getByTestId('borrowing-header-profile-slot')).toBeTruthy();
    expect(screen.queryByTestId('toolbar-profile-action-badge-label')).toBeNull();
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
      scrollView?.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 72,
          },
        },
      });
    });

    expect(getSharedHeaderItems(view)).toEqual({
      leftItems: [],
      rightItems: [],
      searchPlaceholder: undefined,
    });
    expect(screen.queryByTestId('borrowing-header-inline-title-slot')).toBeNull();
    expect(screen.queryByTestId('borrowing-header-profile-slot')).toBeNull();

    act(() => {
      scrollView?.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 0,
          },
        },
      });
    });

    const restoredHeaderItems = getSharedHeaderItems(view);

    expect(restoredHeaderItems.leftItems).toHaveLength(1);
    expect(restoredHeaderItems.rightItems).toHaveLength(1);
    expect(screen.getByTestId('borrowing-header-profile-slot')).toBeTruthy();
  });

  it('hides the search title and profile action when scrolled down, then restores them at the top', () => {
    const view = render(<SearchRoute />);
    const scrollView = findPrimaryScrollView(view);
    const initialHeaderItems = getSharedHeaderItems(view);

    expect(scrollView).toBeTruthy();
    expect(screen.getByTestId('search-header-inline-title-slot')).toBeTruthy();
    expect(screen.getByText('找书')).toBeTruthy();
    expect(screen.getByTestId('search-header-profile-slot')).toBeTruthy();
    expect(screen.queryByTestId('toolbar-profile-action-badge-label')).toBeNull();
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
    expect(initialHeaderItems.searchPlaceholder).toBe('搜索书名、作者、更多信息');

    act(() => {
      scrollView?.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 72,
          },
        },
      });
    });

    expect(getSharedHeaderItems(view)).toEqual({
      leftItems: [],
      rightItems: [],
      searchPlaceholder: '搜索书名、作者、更多信息',
    });
    expect(screen.queryByTestId('search-header-inline-title-slot')).toBeNull();
    expect(screen.queryByTestId('search-header-profile-slot')).toBeNull();

    act(() => {
      scrollView?.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 0,
          },
        },
      });
    });

    const restoredHeaderItems = getSharedHeaderItems(view);

    expect(restoredHeaderItems.leftItems).toHaveLength(1);
    expect(restoredHeaderItems.rightItems).toHaveLength(1);
    expect(screen.getByTestId('search-header-profile-slot')).toBeTruthy();
  });

  it('hides the tutor title and profile action when scrolled down, then restores them at the top', () => {
    const view = render(<TutorRoute />);
    const scrollView = findPrimaryScrollView(view);
    const initialHeaderItems = getSharedHeaderItems(view);

    expect(scrollView).toBeTruthy();
    expect(screen.getByTestId('tutor-header-inline-title-slot')).toBeTruthy();
    expect(screen.getAllByText('导学').length).toBeGreaterThan(0);
    expect(screen.getByTestId('tutor-header-profile-slot')).toBeTruthy();
    expect(screen.getByTestId('tutor-artwork')).toBeTruthy();
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
      scrollView?.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 72,
          },
        },
      });
    });

    expect(getSharedHeaderItems(view)).toEqual({
      leftItems: [],
      rightItems: [],
      searchPlaceholder: undefined,
    });
    expect(screen.queryByTestId('tutor-header-inline-title-slot')).toBeNull();
    expect(screen.queryByTestId('tutor-header-profile-slot')).toBeNull();

    act(() => {
      scrollView?.props.onScroll({
        nativeEvent: {
          contentOffset: {
            y: 0,
          },
        },
      });
    });

    const restoredHeaderItems = getSharedHeaderItems(view);

    expect(restoredHeaderItems.leftItems).toHaveLength(1);
    expect(restoredHeaderItems.rightItems).toHaveLength(1);
    expect(screen.getByTestId('tutor-header-profile-slot')).toBeTruthy();
  });
});

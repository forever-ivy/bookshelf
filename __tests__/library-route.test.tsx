import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
    },
    View: AnimatedView,
  };
});

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: `redirect-${href}` });
  },
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: (
    selector: (state: {
      connection: { baseUrl: string; displayName: string } | null;
      currentMemberId: number | null;
      isAuthenticated: boolean;
    }) => unknown
  ) =>
    selector({
      connection: {
        baseUrl: 'https://cabinet.example.com',
        displayName: '客厅书柜',
      },
      currentMemberId: 2,
      isAuthenticated: true,
    }),
}));

jest.mock('@/lib/api/react-query/hooks', () => ({
  useBorrowLogsQuery: () => ({
    data: [],
  }),
  useMemberBooklistQuery: () => ({
    data: [],
  }),
}));

jest.mock('@/components/navigation/screen-shell', () => ({
  ScreenShell: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/cards/book-carousel-card', () => ({
  BookCarouselCard: () => null,
}));

jest.mock('@/components/surfaces/section-card', () => ({
  SectionCard: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/layout/two-column-grid', () => ({
  TwoColumnGrid: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/actions/shortcut-card', () => ({
  ShortcutCard: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, title);
  },
}));

jest.mock('@/lib/presentation/motion', () => ({
  createStaggeredFadeIn: () => undefined,
  motionTransitions: {
    gentle: undefined,
  },
}));

import LibraryRoute from '@/app/(tabs)/library/index';

describe('LibraryRoute', () => {
  it('adds the books management shortcut to the library dashboard', () => {
    const screen = render(<LibraryRoute />);

    expect(screen.getByText('图书管理')).toBeTruthy();
  });
});

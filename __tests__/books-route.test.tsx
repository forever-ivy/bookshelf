import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );
  const AnimatedText = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(Text, { ...props, ref }, props.children)
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: AnimatedText,
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
      currentAccount: { system_role?: string } | null;
      isAuthenticated: boolean;
      isPreviewMode: boolean;
    }) => unknown
  ) =>
    selector({
      connection: {
        baseUrl: 'preview://cabinet',
        displayName: '预览书柜',
      },
      currentAccount: {
        system_role: 'admin',
      },
      isAuthenticated: true,
      isPreviewMode: true,
    }),
}));

jest.mock('@/lib/api/react-query/hooks', () => ({
  useBooksQuery: () => ({
    data: [],
    error: null,
    isLoading: false,
  }),
  useCreateBookMutation: () => ({
    error: null,
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('@/components/navigation/screen-shell', () => ({
  ScreenShell: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/navigation/flow-screen-header', () => ({
  FlowScreenHeader: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, title);
  },
}));

jest.mock('@/components/surfaces/section-card', () => ({
  SectionCard: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/surfaces/state-card', () => ({
  StateCard: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, title);
  },
}));

jest.mock('@/components/base/field-input', () => ({
  FieldInput: ({ label }: { label: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, label);
  },
}));

jest.mock('@/components/actions/primary-action-button', () => ({
  PrimaryActionButton: ({ disabled, label }: { disabled?: boolean; label: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, `${label}:${disabled ? 'disabled' : 'enabled'}`);
  },
}));

jest.mock('@/lib/presentation/motion', () => ({
  createStaggeredFadeIn: () => undefined,
  motionTransitions: {
    gentle: undefined,
  },
}));

import BooksScreen from '@/app/(tabs)/library/books/index';

describe('BooksScreen', () => {
  it('keeps the create form read-only in preview mode', () => {
    const screen = render(<BooksScreen />);

    expect(screen.getByText('预览模式不可操作')).toBeTruthy();
    expect(screen.getByText('保存图书:disabled')).toBeTruthy();
  });
});

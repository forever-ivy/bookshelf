import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

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
  const { View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Link,
    useRouter: () => ({
      back: jest.fn(),
      push: jest.fn(),
    }),
  };
});

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
    profile: null,
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useActiveOrdersQuery: () => ({
    data: [
      {
        statusLabel: '进行中',
      },
    ],
  }),
  useHomeFeedQuery: () => ({
    data: {
      quickActions: [],
      systemBooklists: [],
      todayRecommendations: [],
    },
  }),
}));

import HomeRoute from '@/app/(tabs)/index';
import { appTheme } from '@/constants/app-theme';

function getHighlightedTextNode(text: string) {
  const matches = screen.getAllByText(text);
  const highlighted = matches.find((node) => typeof node.props.onTextLayout === 'function');

  expect(highlighted).toBeTruthy();

  return highlighted!;
}

describe('HomeRoute marker highlights', () => {
  it('shows the approved homepage highlights only after layout', () => {
    render(<HomeRoute />);

    expect(screen.getByText('今晚路径')).toBeTruthy();
    expect(screen.queryAllByTestId('marker-highlight-overlay')).toHaveLength(0);
    expect(
      StyleSheet.flatten(getHighlightedTextNode('今晚待开始').props.style).backgroundColor
    ).toBe(`${appTheme.colors.markerHighlightOrange}88`);
    expect(
      StyleSheet.flatten(getHighlightedTextNode('35 分钟').props.style)
    ).toMatchObject({
      textDecorationColor: '#F28A14',
      textDecorationLine: 'underline',
    });
    expect(
      StyleSheet.flatten(getHighlightedTextNode('机器学习从零到一').props.style).backgroundColor
    ).toBe(`${appTheme.colors.markerHighlightGreen}88`);

    fireEvent(getHighlightedTextNode('今晚待开始'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 18, width: 66, x: 0, y: 0 }],
      },
    });

    fireEvent(getHighlightedTextNode('35 分钟'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 52, x: 0, y: 0 }],
      },
    });

    fireEvent(getHighlightedTextNode('机器学习从零到一'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 118, x: 0, y: 0 }],
      },
    });

    expect(screen.getAllByTestId('marker-highlight-overlay')).toHaveLength(3);
    expect(screen.getAllByTestId('marker-highlight-skia-canvas')).toHaveLength(3);
  });
});

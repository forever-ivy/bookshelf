import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

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

import HomeRoute from '@/app/(tabs)/index';

describe('HomeRoute marker highlights', () => {
  it('renders the approved home phrases as marker highlights after textLayout', () => {
    render(<HomeRoute />);

    expect(screen.getByText('Tonight')).toBeTruthy();
    expect(screen.getByText('今晚路径')).toBeTruthy();
    expect(screen.queryAllByTestId('marker-highlight-overlay')).toHaveLength(0);

    fireEvent(screen.getByText('今晚最该开始的一章'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 120, x: 0, y: 0 }],
      },
    });

    fireEvent(screen.getByText('最短路径'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 19, width: 56, x: 0, y: 0 }],
      },
    });

    fireEvent(screen.getByText('直接开始'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 19, width: 56, x: 0, y: 0 }],
      },
    });

    expect(screen.getAllByTestId('marker-highlight-overlay')).toHaveLength(3);
    expect(screen.getAllByTestId('marker-highlight-rect')).toHaveLength(6);
  });
});

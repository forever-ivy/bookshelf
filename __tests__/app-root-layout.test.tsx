import { render, screen } from '@testing-library/react-native';
import React from 'react';

import RootLayout from '@/app/_layout';

let mockPathname = '/';

jest.mock('react-native-reanimated', () => ({}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'root-stack' }, children);

  Stack.Screen = () => null;

  return {
    Stack,
    usePathname: () => mockPathname,
    useRouter: () => ({
      back: jest.fn(),
    }),
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/providers/app-providers', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => children,
}));

describe('RootLayout', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('does not show the global secondary back layer on primary routes', () => {
    render(<RootLayout />);

    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
    expect(screen.getByTestId('profile-sheet-layer')).toBeTruthy();
  });

  it('shows the global secondary back layer on secondary routes', () => {
    mockPathname = '/books/42';

    render(<RootLayout />);

    expect(screen.getByTestId('secondary-back-layer')).toBeTruthy();
    expect(screen.queryByTestId('profile-sheet-layer')).toBeNull();
  });
});

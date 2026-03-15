import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, { testID: 'root-stack' }, children);
  Stack.Screen = ({
    children,
    name,
  }: {
    children?: React.ReactNode;
    name?: string;
  }) => React.createElement(View, { testID: `screen-${name}` }, children);

  return {
    Stack,
    usePathname: () => '/home',
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'gesture-root' }, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'safe-area-provider' }, children),
  };
});

jest.mock('@/providers/app-providers', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    AppProviders: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'app-providers' }, children),
  };
});

jest.mock('@/lib/app/navigation-transitions', () => ({
  flowScreenOptions: {},
  rootStackScreenOptions: {},
  scannerScreenOptions: {},
}));

import RootLayout from '@/app/_layout';

const { hideAsync: mockHideAsync } = jest.requireMock('expo-splash-screen') as {
  hideAsync: jest.Mock;
};

describe('RootLayout', () => {
  beforeEach(() => {
    mockHideAsync.mockClear();
  });

  it('hides the native splash screen once the root layout mounts', () => {
    render(<RootLayout />);

    expect(mockHideAsync).toHaveBeenCalled();
  });

  it('registers grouped connect, tabs, and modal routes instead of the old root-level task pages', () => {
    const screen = render(<RootLayout />);

    expect(screen.getByTestId('screen-index')).toBeTruthy();
    expect(screen.getByTestId('screen-(connect)')).toBeTruthy();
    expect(screen.getByTestId('screen-(tabs)')).toBeTruthy();
    expect(screen.getByTestId('screen-(modals)')).toBeTruthy();
    expect(screen.queryByTestId('screen-shelf')).toBeNull();
    expect(screen.queryByTestId('screen-store-book')).toBeNull();
    expect(screen.queryByTestId('screen-take-book')).toBeNull();
    expect(screen.queryByTestId('screen-booklist-manage')).toBeNull();
    expect(screen.queryByTestId('screen-goal-settings')).toBeNull();
    expect(screen.queryByTestId('screen-members')).toBeNull();
    expect(screen.queryByTestId('screen-member-form')).toBeNull();
    expect(screen.queryByTestId('screen-scanner')).toBeNull();
  });
});

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
  Stack.Screen = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Stack,
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
});

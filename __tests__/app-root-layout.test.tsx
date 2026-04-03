import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import RootLayout from '@/app/_layout';
import { appTheme } from '@/constants/app-theme';

let mockPathname = '/';
let mockRecordedStackScreenOptions: Record<string, unknown> | undefined;
let mockRecordedScreens: Array<{ name?: string; options?: Record<string, unknown> }> = [];

jest.mock('react-native-reanimated', () => ({}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Stack = ({
    children,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) => {
    mockRecordedStackScreenOptions = screenOptions;
    return React.createElement(View, { testID: 'root-stack' }, children);
  };

  Stack.Screen = ({
    name,
    options,
  }: {
    name?: string;
    options?: Record<string, unknown>;
  }) => {
    mockRecordedScreens.push({ name, options });
    return null;
  };

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
    mockRecordedStackScreenOptions = undefined;
    mockRecordedScreens = [];
  });

  it('configures the root stack for native headers and keeps tabs as the headerless shell', () => {
    render(<RootLayout />);

    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
    expect(screen.queryByTestId('profile-sheet-layer')).toBeNull();
    expect(mockRecordedStackScreenOptions).toEqual(
      expect.objectContaining({
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerTitleStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ color: 'transparent' }) : undefined,
        headerTintColor: appTheme.colors.text,
        headerTransparent: Platform.OS === 'ios',
      })
    );
    expect(mockRecordedScreens).toContainEqual(
      expect.objectContaining({
        name: '(tabs)',
        options: expect.objectContaining({
          headerShown: false,
        }),
      })
    );
    expect(mockRecordedScreens).toContainEqual(
      expect.objectContaining({
        name: 'login',
        options: expect.objectContaining({
          headerShown: false,
          presentation: 'card',
        }),
      })
    );
    expect(mockRecordedScreens).toContainEqual(
      expect.objectContaining({
        name: 'favorites/index',
        options: expect.objectContaining({
          presentation: 'card',
          title: '',
        }),
      })
    );
  });

  it('does not revive global overlay navigation layers on secondary routes', () => {
    mockPathname = '/books/42';

    render(<RootLayout />);

    expect(screen.queryByTestId('profile-sheet-layer')).toBeNull();
    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
  });

  it('keeps the book detail native header back-only so the page title can live in content', () => {
    render(<RootLayout />);

    const detailScreen = mockRecordedScreens.find((screenEntry) => screenEntry.name === 'books/[bookId]');

    expect(detailScreen).toBeTruthy();
    expect(detailScreen?.options).toEqual(
      expect.objectContaining({
        presentation: 'card',
        title: '',
      })
    );

    const headerLeft = detailScreen?.options?.headerLeft as (() => React.ReactNode) | undefined;

    expect(headerLeft).toBeTruthy();

    render(<>{headerLeft?.()}</>);

    expect(screen.getByTestId('secondary-inline-back-button')).toBeTruthy();
    expect(screen.queryByText('图书详情')).toBeNull();
  });
});

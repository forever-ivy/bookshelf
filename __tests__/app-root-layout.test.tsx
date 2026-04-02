import { render, screen } from '@testing-library/react-native';
import React from 'react';

import RootLayout from '@/app/_layout';
import { appThemes } from '@/constants/app-theme';

let mockPathname = '/';
let mockRecordedStackScreenOptions: Record<string, unknown> | undefined;
let mockRecordedScreens: Array<{ name?: string; options?: Record<string, unknown> }> = [];
let mockStatusBarProps: Record<string, unknown> | undefined;

const mockUseAppTheme = jest.fn(() => ({
  colorScheme: 'light' as const,
  isDark: false,
  theme: appThemes.light,
}));

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
  StatusBar: (props: Record<string, unknown>) => {
    mockStatusBarProps = props;
    return null;
  },
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

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => mockUseAppTheme(),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockRecordedStackScreenOptions = undefined;
    mockRecordedScreens = [];
    mockStatusBarProps = undefined;
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'light',
      isDark: false,
      theme: appThemes.light,
    });
  });

  it('configures the root stack for native headers and keeps tabs as the headerless shell', () => {
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });

    render(<RootLayout />);

    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
    expect(screen.queryByTestId('profile-sheet-layer')).toBeNull();
    expect(mockRecordedStackScreenOptions).toEqual(
      expect.objectContaining({
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerTintColor: appThemes.dark.colors.text,
      })
    );
    expect(mockRecordedStackScreenOptions).toEqual(
      expect.objectContaining({
        contentStyle: expect.objectContaining({
          backgroundColor: appThemes.dark.colors.background,
        }),
        headerStyle: expect.objectContaining({
          backgroundColor: appThemes.dark.colors.headerBackground,
        }),
      })
    );
    expect(mockStatusBarProps).toEqual(
      expect.objectContaining({
        style: 'light',
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
          title: '收藏图书',
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
});

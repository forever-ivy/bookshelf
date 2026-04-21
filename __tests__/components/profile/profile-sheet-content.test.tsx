import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { appTheme } from '@/constants/app-theme';
import { ProfileSheetContent } from '@/components/profile/profile-sheet-content';

const mockPush = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 24,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/components/me/me-screen-content', () => ({
  MeScreenContent: ({
    onLogout,
    onProfilePress,
  }: {
    onLogout?: () => void;
    onProfilePress?: () => void;
  }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');

    return React.createElement(
      View,
      null,
      React.createElement(Text, null, 'me-content'),
      React.createElement(
        Pressable,
        {
          onPress: onProfilePress,
          testID: 'mock-profile-press',
        },
        React.createElement(Text, null, 'profile')
      ),
      React.createElement(
        Pressable,
        {
          onPress: onLogout,
          testID: 'mock-logout-press',
        },
        React.createElement(Text, null, 'logout')
      )
    );
  },
}));

describe('ProfileSheetContent', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders a system-style sheet surface without an explicit close button', () => {
    const onDismiss = jest.fn();

    render(<ProfileSheetContent onDismiss={onDismiss} />);

    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(screen.queryByText('账户')).toBeNull();
    expect(screen.queryByText('查看资料、借阅记录与常用入口。')).toBeNull();
    expect(screen.getByText('me-content')).toBeTruthy();

    const surfaceStyle = StyleSheet.flatten(screen.getByTestId('profile-sheet-surface').props.style);
    expect(surfaceStyle.backgroundColor).toBe(appTheme.colors.backgroundStrong);
    expect(surfaceStyle.borderRadius).toBeUndefined();
    expect(surfaceStyle.borderWidth).toBeUndefined();
    expect(surfaceStyle.flex).toBe(1);
    expect(screen.getByTestId('profile-sheet-surface').props.contentInsetAdjustmentBehavior).toBe(
      'automatic'
    );
    expect(screen.getByTestId('profile-sheet-surface').props.contentContainerStyle).toEqual(
      expect.objectContaining({
        paddingBottom: 24 + appTheme.spacing.lg,
        paddingTop: appTheme.spacing.lg,
      })
    );
    expect(screen.queryByTestId('profile-sheet-close-button')).toBeNull();
  });

  it('omits the React Native scroll container when native sheet scrolling is provided externally', () => {
    render(<ProfileSheetContent onDismiss={jest.fn()} scrollMode="external-native" />);

    const surfaceStyle = StyleSheet.flatten(screen.getByTestId('profile-sheet-surface').props.style);
    const contentStackStyle = StyleSheet.flatten(
      screen.getByTestId('profile-sheet-content-stack').props.style
    );

    expect(surfaceStyle.flex).toBeUndefined();
    expect(screen.queryByTestId('profile-sheet-scroll-content')).toBeNull();
    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(screen.getByText('me-content')).toBeTruthy();
    expect(contentStackStyle.paddingTop).toBe(appTheme.spacing.lg);
  });

  it('dismisses the sheet before logout leaves the sheet content onscreen', () => {
    const onDismiss = jest.fn();

    render(<ProfileSheetContent onDismiss={onDismiss} />);

    fireEvent.press(screen.getByTestId('mock-logout-press'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

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
  MeScreenContent: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, 'me-content');
  },
}));

describe('ProfileSheetContent', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders a system-style sheet surface with a dismiss action', () => {
    const onDismiss = jest.fn();

    render(<ProfileSheetContent onDismiss={onDismiss} />);

    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(screen.getByText('管理你的借阅资料、收藏、书单和提醒。')).toBeTruthy();
    expect(screen.getByText('me-content')).toBeTruthy();

    const surfaceStyle = StyleSheet.flatten(screen.getByTestId('profile-sheet-surface').props.style);
    expect(surfaceStyle.backgroundColor).toBe(appTheme.colors.backgroundStrong);
    expect(surfaceStyle.borderRadius).toBeUndefined();
    expect(surfaceStyle.borderWidth).toBeUndefined();
    expect(surfaceStyle.flex).toBe(1);
    expect(surfaceStyle.paddingBottom).toBe(24);
    expect(screen.getByTestId('profile-sheet-scroll-content')).toBeTruthy();

    fireEvent.press(screen.getByTestId('profile-sheet-close-button'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('omits the React Native scroll container when native sheet scrolling is provided externally', () => {
    render(<ProfileSheetContent onDismiss={jest.fn()} scrollMode="external-native" />);

    const surfaceStyle = StyleSheet.flatten(screen.getByTestId('profile-sheet-surface').props.style);

    expect(surfaceStyle.flex).toBeUndefined();
    expect(screen.queryByTestId('profile-sheet-scroll-content')).toBeNull();
    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(screen.getByText('me-content')).toBeTruthy();
  });
});

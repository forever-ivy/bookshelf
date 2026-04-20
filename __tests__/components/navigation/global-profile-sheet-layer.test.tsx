import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';

import {
  GlobalProfileSheetLayer,
  shouldShowGlobalProfileSheetTrigger,
} from '@/components/navigation/global-profile-sheet-layer';
import { ProfileSheetProvider, useProfileSheet } from '@/providers/profile-sheet-provider';

let mockPathname = '/';
let latestProfileSheetProps: { scrollMode?: 'external-native' | 'react-native' } | null = null;
const originalPlatformOS = Platform.OS;

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/components/profile/profile-sheet-content', () => ({
  ProfileSheetContent: (props: { scrollMode?: 'external-native' | 'react-native' }) => {
    latestProfileSheetProps = props;
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, '个人中心');
  },
}));

function ProgrammaticOpenProbe() {
  const { openProfileSheet } = useProfileSheet();

  return (
    <Pressable onPress={openProfileSheet} testID="programmatic-profile-open">
      <Text>open</Text>
    </Pressable>
  );
}

describe('GlobalProfileSheetLayer', () => {
  beforeEach(() => {
    mockPathname = '/';
    latestProfileSheetProps = null;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it('shows a floating trigger on primary routes and opens the iOS bottom sheet when pressed', () => {
    render(
      <ProfileSheetProvider>
        <GlobalProfileSheetLayer />
      </ProfileSheetProvider>
    );

    expect(screen.getByTestId('profile-sheet-layer')).toBeTruthy();

    fireEvent.press(screen.getByTestId('profile-sheet-trigger'));

    expect(screen.getByTestId('profile-sheet-swift-sheet')).toBeTruthy();
    expect(screen.queryByTestId('profile-sheet-swift-scroll-view')).toBeNull();
    expect(screen.getByTestId('swift-rn-host').props.matchContents).toBeUndefined();
    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(latestProfileSheetProps?.scrollMode).toBe('react-native');
  });

  it('does not show the floating trigger on secondary routes', () => {
    mockPathname = '/books/42';

    render(
      <ProfileSheetProvider>
        <GlobalProfileSheetLayer />
      </ProfileSheetProvider>
    );

    expect(screen.queryByTestId('profile-sheet-layer')).toBeNull();
  });

  it('renders the Android compose bottom sheet when opened programmatically', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    render(
      <ProfileSheetProvider>
        <ProgrammaticOpenProbe />
      </ProfileSheetProvider>
    );

    fireEvent.press(screen.getByTestId('programmatic-profile-open'));

    expect(screen.getByTestId('profile-sheet-compose-sheet')).toBeTruthy();
    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(latestProfileSheetProps?.scrollMode).toBe('react-native');
  });

  it('only enables the trigger on top-level app routes', () => {
    expect(shouldShowGlobalProfileSheetTrigger('/')).toBe(true);
    expect(shouldShowGlobalProfileSheetTrigger('/search')).toBe(true);
    expect(shouldShowGlobalProfileSheetTrigger('/borrowing')).toBe(true);
    expect(shouldShowGlobalProfileSheetTrigger('/login')).toBe(false);
    expect(shouldShowGlobalProfileSheetTrigger('/profile')).toBe(false);
    expect(shouldShowGlobalProfileSheetTrigger('/books/42')).toBe(false);
  });
});

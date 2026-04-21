import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';

import {
  GlobalProfileSheetLayer,
  shouldShowGlobalProfileSheetTrigger,
} from '@/components/navigation/global-profile-sheet-layer';
import { ProfileSheetProvider, useProfileSheet } from '@/providers/profile-sheet-provider';

let mockPathname = '/';
const mockPush = jest.fn();
const mockBack = jest.fn();
const originalPlatformOS = Platform.OS;

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
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
    mockPush.mockReset();
    mockBack.mockReset();
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

  it('shows a floating trigger on primary routes and opens the bottom sheet when pressed', () => {
    render(
      <ProfileSheetProvider>
        <GlobalProfileSheetLayer />
      </ProfileSheetProvider>
    );

    expect(screen.getByTestId('profile-sheet-layer')).toBeTruthy();

    fireEvent.press(screen.getByTestId('profile-sheet-trigger'));

    expect(mockPush).toHaveBeenCalledWith('/profile-sheet');
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

  it('renders the bottom sheet when opened programmatically on Android', () => {
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

    expect(mockPush).toHaveBeenCalledWith('/profile-sheet');
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

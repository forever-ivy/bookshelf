import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

let mockRecordedScreenOptions: Record<string, unknown> | undefined;
let mockRecordedChildScreens: Array<{ name?: string; options?: Record<string, unknown> }> = [];
const expectedHeaderActionKey =
  Platform.OS === 'ios' ? 'unstable_headerRightItems' : 'headerRight';

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Stack = ({
    children,
    screenOptions,
  }: {
    children?: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) => {
    mockRecordedScreenOptions = screenOptions;
    return React.createElement(View, { testID: 'mock-stack' }, children);
  };

  Stack.Screen = ({
    name,
    options,
  }: {
    name?: string;
    options?: Record<string, unknown>;
  }) => {
    mockRecordedChildScreens.push({ name, options });
    return null;
  };

  return { Stack };
});

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    openProfileSheet: jest.fn(),
  }),
}));

import HomeTabLayout from '@/app/(tabs)/(home)/_layout';
import BorrowingTabLayout from '@/app/(tabs)/borrowing/_layout';
import SearchTabLayout from '@/app/(tabs)/search/_layout';
import LearningTabLayout from '@/app/(tabs)/learning/_layout';

describe('tab stack layouts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T09:00:00+08:00'));
    mockRecordedScreenOptions = undefined;
    mockRecordedChildScreens = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the home tab stack transparent while letting the page control its title and profile action', () => {
    render(<HomeTabLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(mockRecordedScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        headerLargeStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ backgroundColor: 'transparent' }) : undefined,
        headerTitleStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ color: 'transparent' }) : undefined,
        headerTransparent: Platform.OS === 'ios',
        headerShadowVisible: false,
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({
          headerLargeTitleShadowVisible: false,
        }),
      })
    );
  });

  it('keeps the borrowing tab stack transparent while letting the page control its title and profile action', () => {
    render(<BorrowingTabLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(mockRecordedScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        headerLargeStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ backgroundColor: 'transparent' }) : undefined,
        headerTitleStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ color: 'transparent' }) : undefined,
        headerTransparent: Platform.OS === 'ios',
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({
          headerLargeTitleShadowVisible: false,
        }),
      })
    );
  });

  it('keeps the search tab stack transparent while letting the page control its title and profile action', () => {
    render(<SearchTabLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(mockRecordedScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        headerLargeStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ backgroundColor: 'transparent' }) : undefined,
        headerShown: true,
        headerTitleStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ color: 'transparent' }) : undefined,
        headerTransparent: Platform.OS === 'ios',
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({
          headerLargeTitleShadowVisible: false,
        }),
      })
    );
  });

  it('keeps the learning tab stack aligned with the home-style transparent header structure', () => {
    render(<LearningTabLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(mockRecordedScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        headerLargeStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ backgroundColor: 'transparent' }) : undefined,
        headerTitleStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ color: 'transparent' }) : undefined,
        headerTransparent: Platform.OS === 'ios',
        headerShadowVisible: false,
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({
          headerLargeTitleShadowVisible: false,
        }),
      })
    );
  });
});

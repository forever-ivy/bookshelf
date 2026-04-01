import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

let recordedScreenOptions: Record<string, unknown> | undefined;
let mockRecordedChildScreenProps: { name?: string; options?: Record<string, unknown> }[] = [];
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
    recordedScreenOptions = screenOptions;
    return React.createElement(View, { testID: 'mock-stack' }, children);
  };
  Stack.Screen = ({
    name,
    options,
  }: {
    name?: string;
    options?: Record<string, unknown>;
  }) => {
    mockRecordedChildScreenProps.push({ name, options });
    return null;
  };

  return { Stack };
});

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    openProfileSheet: jest.fn(),
  }),
}));

import SearchGroupLayout from '@/app/search/_layout';
import SearchLayout from '@/app/(tabs)/search/_layout';

describe('search stack layouts', () => {
  beforeEach(() => {
    recordedScreenOptions = undefined;
    mockRecordedChildScreenProps = [];
  });

  it('keeps the native stack header enabled for the standalone search stack search bar', () => {
    render(<SearchGroupLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(recordedScreenOptions).toEqual(
      expect.objectContaining({
        headerTransparent: false,
        headerShown: true,
      })
    );
    expect(mockRecordedChildScreenProps).toContainEqual(
      expect.objectContaining({
        name: 'borrow-now',
        options: expect.objectContaining({
          title: '立即可借',
        }),
      })
    );
  });

  it('keeps the native stack header enabled for the tab search stack search bar', () => {
    render(<SearchLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(recordedScreenOptions).toEqual(
      expect.objectContaining({
        headerLargeStyle:
          Platform.OS === 'ios' ? expect.objectContaining({ backgroundColor: 'transparent' }) : undefined,
        headerTransparent: Platform.OS === 'ios',
        headerShown: true,
      })
    );
    expect(mockRecordedChildScreenProps).toContainEqual(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({
          headerLargeTitleShadowVisible: false,
        }),
      })
    );
  });
});

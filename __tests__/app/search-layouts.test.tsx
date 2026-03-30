import { render, screen } from '@testing-library/react-native';
import React from 'react';

let recordedScreenOptions: Record<string, unknown> | undefined;
let mockRecordedChildScreenProps: { name?: string; options?: Record<string, unknown> }[] = [];

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
          title: '',
        }),
      })
    );
  });

  it('keeps the native stack header enabled for the tab search stack search bar', () => {
    render(<SearchLayout />);

    expect(screen.getByTestId('mock-stack')).toBeTruthy();
    expect(recordedScreenOptions).toEqual(
      expect.objectContaining({
        headerTransparent: false,
        headerShown: true,
      })
    );
    expect(mockRecordedChildScreenProps).toContainEqual(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({
          title: '',
        }),
      })
    );
  });
});

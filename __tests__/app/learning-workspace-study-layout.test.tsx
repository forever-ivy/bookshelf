import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import LearningWorkspaceStudyLayout from '@/app/learning/[profileId]/(workspace)/study/_layout';

let mockRecordedScreenOptions: Record<string, unknown> | undefined;
let mockRecordedChildScreens: { name?: string; options?: Record<string, unknown> }[] = [];

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
    return React.createElement(View, { testID: 'learning-workspace-study-stack' }, children);
  };
  Stack.displayName = 'MockLearningWorkspaceStudyStack';

  const MockStackScreen = ({
    name,
    options,
  }: {
    name?: string;
    options?: Record<string, unknown>;
  }) => {
    mockRecordedChildScreens.push({ name, options });
    return null;
  };
  MockStackScreen.displayName = 'MockLearningWorkspaceStudyStackScreen';
  Stack.Screen = MockStackScreen;

  return { Stack };
});

describe('LearningWorkspaceStudyLayout', () => {
  beforeEach(() => {
    mockRecordedScreenOptions = undefined;
    mockRecordedChildScreens = [];
  });

  it('keeps the native stack header enabled and transparent for the study search bar', () => {
    render(<LearningWorkspaceStudyLayout />);

    expect(screen.getByTestId('learning-workspace-study-stack')).toBeTruthy();
    expect(mockRecordedScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerShown: true,
        headerTransparent: Platform.OS === 'ios',
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'index',
      })
    );
  });
});

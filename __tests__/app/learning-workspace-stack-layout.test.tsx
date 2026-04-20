import { render, screen } from '@testing-library/react-native';
import React from 'react';

import LearningWorkspaceStackLayout from '@/app/learning/[profileId]/_layout';

let mockRecordedScreenOptions: Record<string, unknown> | undefined;
let mockRecordedChildScreens: { name?: string; options?: Record<string, unknown> }[] = [];

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  const Stack = ({
    children,
    screenOptions,
  }: {
    children?: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) => {
    mockRecordedScreenOptions = screenOptions;
    return React.createElement(View, { testID: 'learning-workspace-stack' }, children);
  };

  Stack.Screen = function MockStackScreen(props: {
    name?: string;
    options?: Record<string, unknown>;
  }) {
    const { name, options } = props;
    mockRecordedChildScreens.push({ name, options });
    return null;
  };

  return {
    Stack,
    useLocalSearchParams: () => ({
      profileId: '101',
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/components/learning/learning-workspace-provider', () => {
  const MockLearningWorkspaceProvider = ({ children }: { children: React.ReactNode }) => children;
  MockLearningWorkspaceProvider.displayName = 'MockLearningWorkspaceProvider';

  return {
    LearningWorkspaceProvider: MockLearningWorkspaceProvider,
  };
});

describe('LearningWorkspaceStackLayout', () => {
  beforeEach(() => {
    mockRecordedScreenOptions = undefined;
    mockRecordedChildScreens = [];
  });

  it('registers the native info sheet route as a form sheet presentation', () => {
    render(<LearningWorkspaceStackLayout />);

    expect(screen.getByTestId('learning-workspace-stack')).toBeTruthy();
    expect(mockRecordedScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        headerBackButtonDisplayMode: 'minimal',
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: '(workspace)',
        options: expect.objectContaining({
          headerShown: false,
        }),
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'overview',
        options: expect.objectContaining({
          animation: 'slide_from_right',
          headerShown: false,
        }),
      })
    );
    expect(mockRecordedChildScreens).toContainEqual(
      expect.objectContaining({
        name: 'info-sheet',
        options: expect.objectContaining({
          contentStyle: expect.objectContaining({
            backgroundColor: expect.any(String),
          }),
          headerShown: false,
          presentation: 'formSheet',
          sheetAllowedDetents: [0.45, 0.75, 1],
          sheetGrabberVisible: true,
        }),
      })
    );
  });
});

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import LearningWorkspaceStudyRoute from '@/app/learning/[profileId]/(workspace)/study';

let mockWorkspaceScreen: any;

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) => children ?? null,
    {
      Screen: () => null,
      SearchBar: () => null,
    }
  ),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
    },
    FadeInDown: {
      duration: () => ({
        springify: () => ({
          damping: () => ({
            stiffness: () => undefined,
          }),
        }),
      }),
    },
    Layout: {
      springify: () => undefined,
    },
  };
});

jest.mock('@/components/learning/learning-workspace-provider', () => ({
  useLearningWorkspaceScreen: () => mockWorkspaceScreen,
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({
    theme: require('@/constants/app-theme').appTheme,
  }),
}));

jest.mock('@/components/learning/learning-conversation-scroll', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LearningConversationScroll: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/learning/learning-conversation-message', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    LearningConversationMessage: () => React.createElement(Text, null, 'message'),
  };
});

jest.mock('@/components/learning/learning-composer', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LearningComposer: () => React.createElement(View, { testID: 'learning-composer' }),
  };
});

jest.mock('@/components/learning/learning-workspace-loading-state', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LearningWorkspaceLoadingState: () =>
      React.createElement(View, { testID: 'learning-workspace-loading-state' }),
  };
});

jest.mock('@/components/base/glass-surface', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GlassSurface: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, props, children),
  };
});

describe('LearningWorkspaceStudyRoute', () => {
  beforeEach(() => {
    mockWorkspaceScreen = {
      closeWorkspace: jest.fn(),
      draft: '',
      handleSend: jest.fn(),
      isRetryPending: false,
      latestStatus: {
        label: '当前导学状态异常',
        tone: 'warning',
      },
      navigateToStudyMode: jest.fn(),
      profile: { id: 1 },
      renderedMessages: [],
      replaceWorkspaceSession: jest.fn(),
      retryGenerate: jest.fn(),
      setDraft: jest.fn(),
      starterPrompts: [],
      studyMode: 'explore',
      workspaceGate: { kind: 'ready' },
      workspaceSession: {
        id: 1,
        sessionKind: 'explore',
      },
    };
  });

  it('renders the inline warning status without relying on Animated.Layout', () => {
    render(<LearningWorkspaceStudyRoute />);

    expect(screen.getByTestId('learning-workspace-inline-status')).toBeTruthy();
    expect(screen.getByText('当前导学状态异常')).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const NativeTabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'native-tabs-root' }, children);

  const Trigger: any = ({
    children,
    name,
  }: {
    children: React.ReactNode;
    name?: string;
  }) =>
    React.createElement(
      View,
      {
        testID: name ? `native-tab-${name}` : undefined,
      },
      children
    );
  Trigger.Icon = () => null;
  Trigger.Label = ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children);
  NativeTabs.Trigger = Trigger;

  return {
    NativeTabs,
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: jest.fn(),
    identity: {
      accountId: 1,
      profileId: 1,
      role: 'reader',
    },
    isAuthenticated: true,
    onboarding: {
      completed: true,
      needsInterestSelection: false,
      needsProfileBinding: false,
    },
    profile: null,
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

jest.mock('@/components/navigation/app-session-gate', () => ({
  AppSessionGate: ({ children }: { children: React.ReactNode }) => children,
}));

import TabsLayout from '@/app/(tabs)/_layout';

describe('tabs layout', () => {
  it('adds tutor as a first-class bottom tab', () => {
    render(<TabsLayout />);

    expect(screen.getByTestId('native-tab-(home)')).toBeTruthy();
    expect(screen.getByTestId('native-tab-tutor')).toBeTruthy();
    expect(screen.getByTestId('native-tab-borrowing')).toBeTruthy();
    expect(screen.getByTestId('native-tab-search')).toBeTruthy();
    expect(screen.getByText('导学')).toBeTruthy();
  });
});

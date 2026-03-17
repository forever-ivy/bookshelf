import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: `redirect-${href}` });
  },
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: (
    selector: (state: {
      connection: { baseUrl: string; displayName: string } | null;
      currentAccount: { system_role?: string } | null;
      isAuthenticated: boolean;
    }) => unknown
  ) =>
    selector({
      connection: {
        baseUrl: 'https://cabinet.example.com',
        displayName: '客厅书柜',
      },
      currentAccount: {
        system_role: 'admin',
      },
      isAuthenticated: true,
    }),
}));

jest.mock('@/components/navigation/screen-shell', () => ({
  ScreenShell: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/background/hero-bubble-background', () => ({
  HeroBubbleBackground: () => null,
}));

jest.mock('@/components/surfaces/section-card', () => ({
  SectionCard: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/layout/two-column-grid', () => ({
  TwoColumnGrid: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, null, children);
  },
}));

jest.mock('@/components/actions/shortcut-card', () => ({
  ShortcutCard: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, title);
  },
}));

import SettingsRoute from '@/app/(tabs)/settings/index';

describe('SettingsRoute', () => {
  it('shows account audit and family settings shortcuts for admin users', () => {
    const screen = render(<SettingsRoute />);

    expect(screen.getByText('账户审计')).toBeTruthy();
    expect(screen.getByText('家庭设置')).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const chain = {
    delay: () => chain,
    duration: () => chain,
  };

  return {
    __esModule: true,
    FadeInUp: chain,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children),
    },
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

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  const Tabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'web-tabs' }, children);

  Tabs.Screen = ({
    name,
    options,
  }: {
    name: string;
    options?: { title?: string };
  }) =>
    React.createElement(
      Text,
      {
        testID: `web-tab-${name}`,
      },
      options?.title ?? name
    );

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    Link,
    Tabs,
    useRouter: () => ({
      back: jest.fn(),
      push: jest.fn(),
    }),
  };
});

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const NativeTabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'native-tabs' }, children);

  NativeTabs.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  NativeTabs.Trigger.Icon = () => null;
  NativeTabs.Trigger.Label = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);

  return {
    NativeTabs,
  };
});

import HomeRoute from '@/app/(tabs)/index';
import BorrowingRoute from '@/app/(tabs)/borrowing';
import MeRoute from '@/app/(tabs)/me';
import SearchRoute from '@/app/(tabs)/search';
import TabsLayout from '@/app/(tabs)/_layout';
import WebTabsLayout from '@/app/(tabs)/_layout.web';
import ProfileRoute from '@/app/profile';

describe('UI shell routes', () => {
  it('renders the home route hero and search entry', () => {
    render(<HomeRoute />);

    expect(screen.getByText('Tonight')).toBeTruthy();
    expect(screen.getByText('今晚路径')).toBeTruthy();
    expect(screen.getByTestId('home-artwork')).toBeTruthy();
    expect(screen.getByText('搜索书名、作者、课程或自然语言')).toBeTruthy();
    expect(screen.getByText('继续学习')).toBeTruthy();
    expect(screen.queryByTestId('brand-mark')).toBeNull();
    expect(screen.queryByTestId('illustration-home')).toBeNull();
  });

  it('renders the search route as an independent find-book workspace', () => {
    render(<SearchRoute />);

    expect(screen.getByText('找书')).toBeTruthy();
    expect(screen.getByText('筛选')).toBeTruthy();
    expect(screen.getByText('搜索结果')).toBeTruthy();
    expect(screen.getByText('没看到想找的书？')).toBeTruthy();
    expect(screen.getByTestId('search-fallback-artwork')).toBeTruthy();
    expect(screen.getByText('搜索书名、作者、课程或自然语言')).toBeTruthy();
  });

  it('renders borrowing route sections', () => {
    render(<BorrowingRoute />);

    expect(screen.getByText('借阅任务面板')).toBeTruthy();
    expect(screen.getAllByText('当前借阅').length).toBeGreaterThan(0);
    expect(screen.getAllByText('即将到期').length).toBeGreaterThan(0);
    expect(screen.getByText('历史借阅')).toBeTruthy();
    expect(screen.getByText('借阅闭环')).toBeTruthy();
    expect(screen.getByTestId('borrowing-artwork')).toBeTruthy();
  });

  it('renders the me route workspace entries', () => {
    render(<MeRoute />);

    expect(screen.getByText('今日提醒')).toBeTruthy();
    expect(screen.getByText('打开个人中心')).toBeTruthy();
    expect(screen.getAllByText('收藏与书单').length).toBeGreaterThan(0);
  });

  it('renders the profile route reading portrait sections', () => {
    render(<ProfileRoute />);

    expect(screen.getByText('阅读与学习画像')).toBeTruthy();
    expect(screen.getByText('学习偏好线索')).toBeTruthy();
    expect(screen.getByTestId('profile-artwork')).toBeTruthy();
    expect(screen.queryByTestId('illustration-profile')).toBeNull();
  });

  it('renders four tabs in native and web layouts', () => {
    render(<TabsLayout />);
    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByText('找书')).toBeTruthy();
    expect(screen.getByText('借阅')).toBeTruthy();
    expect(screen.getByText('我的')).toBeTruthy();

    render(<WebTabsLayout />);
    expect(screen.getByTestId('web-tab-index')).toBeTruthy();
    expect(screen.getByTestId('web-tab-search')).toBeTruthy();
    expect(screen.getByTestId('web-tab-borrowing')).toBeTruthy();
    expect(screen.getByTestId('web-tab-me')).toBeTruthy();
  });
});

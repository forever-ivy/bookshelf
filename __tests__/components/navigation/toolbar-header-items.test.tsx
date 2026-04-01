import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { ToolbarInlineTitle } from '@/components/navigation/toolbar-inline-title';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { appTheme } from '@/constants/app-theme';

jest.mock('@/hooks/use-library-app-data', () => ({
  useNotificationsQuery: () => ({
    data: Array.from({ length: 88 }, (_, index) => ({
      body: `消息 ${index + 1}`,
      id: `notification-${index + 1}`,
      kind: 'reminder',
      title: `通知 ${index + 1}`,
    })),
  }),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: ({
      source,
      style,
      tintColor,
      testID,
    }: {
      source?: string;
      style?: unknown;
      testID?: string;
      tintColor?: string;
    }) =>
      React.createElement(View, {
        source,
        style,
        testID,
        tintColor,
      }),
  };
});

describe('toolbar header items', () => {
  it('renders an app-store-sized inline title for the left header slot', () => {
    render(<ToolbarInlineTitle title="首页" />);

    expect(screen.getByText('首页')).toHaveStyle({
      fontSize: 30,
      lineHeight: 36,
    });
  });

  it('renders an app-store-style profile icon with a badge', () => {
    render(<ToolbarProfileAction onPress={jest.fn()} testID="toolbar-profile-action" />);

    const button = screen.getByTestId('toolbar-profile-action');
    const icon = screen.getByTestId('toolbar-profile-action-icon');
    const badge = screen.getByTestId('toolbar-profile-action-badge');
    const badgeLabel = screen.getByTestId('toolbar-profile-action-badge-label');

    expect(button).toHaveStyle({
      height: 44,
      width: 44,
    });
    expect(icon.props.source).toBe('sf:person.crop.circle');
    expect(icon.props.style).toMatchObject({
      height: 34,
      width: 34,
    });
    expect(icon.props.tintColor).toBe(appTheme.colors.systemBlue);
    expect(badge).toHaveStyle({
      backgroundColor: '#FF3B30',
    });
    const badgeStyle = StyleSheet.flatten(badge.props.style);

    expect(badgeStyle.borderWidth ?? 0).toBe(0);
    expect(badgeStyle.borderRadius).toBe(10);
    expect(badgeStyle.minWidth).toBe(20);
    expect(badgeStyle.paddingHorizontal).toBe(5);
    expect(badgeStyle.right).toBe(2);
    expect(badgeLabel.props.children).toBe('88');
  });
});

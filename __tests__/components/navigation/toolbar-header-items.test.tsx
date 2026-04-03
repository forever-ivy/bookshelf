import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ToolbarHeaderRow } from '@/components/navigation/toolbar-header-row';
import { ToolbarInlineTitle } from '@/components/navigation/toolbar-inline-title';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { appTheme } from '@/constants/app-theme';

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
  it('renders a shared header row that can add a back button for secondary pages', () => {
    render(<ToolbarHeaderRow showBackButton title="图书详情" />);

    expect(screen.getByTestId('toolbar-header-row')).toBeTruthy();
    expect(screen.getByTestId('toolbar-header-row-back-button')).toBeTruthy();
    expect(screen.getByText('图书详情')).toHaveStyle({
      fontSize: 30,
      lineHeight: 36,
    });
  });

  it('renders an app-store-sized inline title for the left header slot', () => {
    render(<ToolbarInlineTitle title="首页" />);

    expect(screen.getByText('首页')).toHaveStyle({
      fontSize: 30,
      lineHeight: 36,
    });
  });

  it('renders an app-store-style profile icon without a badge', () => {
    render(<ToolbarProfileAction onPress={jest.fn()} testID="toolbar-profile-action" />);

    const button = screen.getByTestId('toolbar-profile-action');
    const icon = screen.getByTestId('toolbar-profile-action-icon');

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
    expect(screen.queryByTestId('toolbar-profile-action-badge')).toBeNull();
    expect(screen.queryByTestId('toolbar-profile-action-badge-label')).toBeNull();
  });
});

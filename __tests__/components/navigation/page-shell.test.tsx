import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { appTheme } from '@/constants/app-theme';
import { PageShell } from '@/components/navigation/page-shell';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 8,
    left: 0,
    right: 0,
    top: 12,
  }),
}));

describe('PageShell', () => {
  it('renders an optional page title at the top-left of the page content', () => {
    render(
      <PageShell pageTitle="借阅偏好">
        <Text>页面内容</Text>
      </PageShell>
    );

    expect(screen.getByTestId('page-shell-page-title')).toBeTruthy();
    expect(screen.getByText('借阅偏好')).toHaveStyle({
      fontSize: 32,
      lineHeight: 38,
    });
  });

  it('renders content without any built-in header chrome', () => {
    render(
      <PageShell>
        <Text>页面内容</Text>
      </PageShell>
    );

    expect(screen.getByText('页面内容')).toBeTruthy();
    expect(screen.queryByTestId('page-shell-header')).toBeNull();
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
  });

  it('keeps keyboard-aware scrolling behavior as a pure container concern', () => {
    const view = render(
      <PageShell keyboardAware scrollEnabled={false} scrollViewResetKey="login">
        <Text>登录内容</Text>
      </PageShell>
    );
    const scrollView = view.UNSAFE_getByType(ScrollView);

    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.scrollEnabled).toBe(false);
  });

  it('applies mode background colors and content insets without header offsets', () => {
    const view = render(
      <PageShell insetBottom={72} mode="workspace" padded={false}>
        <Text>工作区内容</Text>
      </PageShell>
    );
    const [rootView, scrollView] = view.UNSAFE_getAllByType(ScrollView)[0].parent?.parent
      ? [view.UNSAFE_getAllByType(ScrollView)[0].parent?.parent, view.UNSAFE_getAllByType(ScrollView)[0]]
      : [null, view.UNSAFE_getByType(ScrollView)];

    expect(rootView).not.toBeNull();
    expect(StyleSheet.flatten(rootView!.props.style).backgroundColor).toBe(
      appTheme.colors.backgroundWorkspace
    );
    expect(
      StyleSheet.flatten(scrollView.props.contentContainerStyle)
    ).toEqual(
      expect.objectContaining({
        paddingBottom: 80,
        paddingHorizontal: 0,
        paddingTop: appTheme.spacing.lg,
      })
    );
  });
});

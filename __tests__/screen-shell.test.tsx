import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');

  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );
  const AnimatedScrollView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(ScrollView, { ...props, ref }, props.children)
  );

  const mockReanimated = {
    ScrollView: AnimatedScrollView,
    View: AnimatedView,
    useAnimatedScrollHandler: () => undefined,
  };

  return {
    __esModule: true,
    ...mockReanimated,
    default: mockReanimated,
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SvgXml: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

describe('ScreenShell', () => {
  function loadScreenShell() {
    let ScreenShell: typeof import('@/components/navigation/screen-shell').ScreenShell;

    jest.isolateModules(() => {
      ScreenShell = require('@/components/navigation/screen-shell').ScreenShell;
    });

    return ScreenShell!;
  }

  it('renders a top visual overlay when explicitly enabled while keeping page content visible', () => {
    const ScreenShell = loadScreenShell();
    const screen = render(
      <ScreenShell showTopOverlay>
        <Text selectable>页面正文</Text>
      </ScreenShell>
    );

    expect(screen.getByTestId('screen-shell-top-overlay')).toBeTruthy();
    expect(screen.getByTestId('screen-shell-top-blur').props.intensity).toBe(18);
    expect(screen.getByTestId('screen-shell-top-gradient').props.xml).toContain('stop-opacity="0.12"');
    expect(screen.getByTestId('screen-shell-scroll-view')).toBeTruthy();
    expect(screen.getByText('页面正文')).toBeTruthy();
  });

  it('still renders when expo-linear-gradient is unavailable', () => {
    jest.resetModules();
    jest.doMock('expo-linear-gradient', () => ({
      LinearGradient: () => {
        throw new Error('ExpoLinearGradient unavailable');
      },
    }), { virtual: true });

    const ScreenShell = loadScreenShell();

    expect(() =>
      render(
        <ScreenShell showTopOverlay>
          <Text selectable>页面正文</Text>
        </ScreenShell>
      )
    ).not.toThrow();
  });

  it('renders an optional background decoration behind the page content', () => {
    const ScreenShell = loadScreenShell();
    const screen = render(
      <ScreenShell
        backgroundDecoration={<Text testID="custom-bubble-background">装饰背景</Text>}>
        <Text selectable>页面正文</Text>
      </ScreenShell>
    );

    expect(screen.getByTestId('screen-shell-background-decoration')).toBeTruthy();
    expect(screen.getByTestId('custom-bubble-background')).toBeTruthy();
    expect(screen.getByTestId('screen-shell-scroll-view')).toBeTruthy();
    expect(screen.getByText('页面正文')).toBeTruthy();
  });

  it('does not render the custom top overlay by default', () => {
    const ScreenShell = loadScreenShell();
    const screen = render(
      <ScreenShell>
        <Text selectable>页面正文</Text>
      </ScreenShell>
    );

    expect(screen.queryByTestId('screen-shell-top-overlay')).toBeNull();
    expect(screen.getByTestId('screen-shell-scroll-view')).toBeTruthy();
    expect(screen.getByText('页面正文')).toBeTruthy();
  });
});

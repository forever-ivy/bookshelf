import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Animated, Keyboard, StyleSheet, Text } from 'react-native';

import { PageShell } from '@/components/navigation/page-shell';

const mockBack = jest.fn();
let mockPathname = '/';
const mockKeyboardListeners = {
  keyboardDidHide: new Set<(payload?: { duration?: number }) => void>(),
  keyboardDidShow: new Set<(payload?: { duration?: number }) => void>(),
  keyboardWillHide: new Set<(payload?: { duration?: number }) => void>(),
  keyboardWillShow: new Set<(payload?: { duration?: number }) => void>(),
};

function emitKeyboardEvent(
  event: keyof typeof mockKeyboardListeners,
  payload?: { duration?: number }
) {
  mockKeyboardListeners[event].forEach((listener) =>
    listener({
      duration: payload?.duration ?? 220,
    } as never)
  );
}

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 8,
    left: 0,
    right: 0,
    top: 12,
  }),
}));

describe('PageShell', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockBack.mockReset();
    mockPathname = '/';
    mockKeyboardListeners.keyboardDidHide.clear();
    mockKeyboardListeners.keyboardDidShow.clear();
    mockKeyboardListeners.keyboardWillHide.clear();
    mockKeyboardListeners.keyboardWillShow.clear();
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
      if (
        event === 'keyboardDidShow' ||
        event === 'keyboardDidHide' ||
        event === 'keyboardWillShow' ||
        event === 'keyboardWillHide'
      ) {
        mockKeyboardListeners[event].add(listener as (payload?: { duration?: number }) => void);
      }

      return {
        remove: () => {
          if (
            event === 'keyboardDidShow' ||
            event === 'keyboardDidHide' ||
            event === 'keyboardWillShow' ||
            event === 'keyboardWillHide'
          ) {
            mockKeyboardListeners[event].delete(listener as (payload?: { duration?: number }) => void);
          }
        },
      } as ReturnType<typeof Keyboard.addListener>;
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders a shared large-title header with an optional back button', () => {
    render(
      <PageShell headerTitle="图书详情" showBackButton>
        <Text>页面内容</Text>
      </PageShell>
    );

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('图书详情');
    expect(screen.getByTestId('secondary-back-button')).toBeTruthy();
    expect(screen.getByText('页面内容')).toBeTruthy();
  });

  it('pushes the title block down on secondary routes when the floating back button is showing', () => {
    mockPathname = '/profile';

    render(
      <PageShell headerTitle="阅读画像" mode="workspace">
        <Text>页面内容</Text>
      </PageShell>
    );

    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header').props.style).paddingTop).toBe(104);
    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header').props.style).gap).toBe(24);
    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header-copy').props.style).paddingLeft).toBe(0);
  });

  it('renders custom header content when provided', () => {
    render(
      <PageShell headerContent={<Text testID="custom-home-header">下午好 / 陈知行</Text>}>
        <Text>页面内容</Text>
      </PageShell>
    );

    expect(screen.getByTestId('custom-home-header')).toHaveTextContent('下午好 / 陈知行');
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
    expect(screen.getByText('页面内容')).toBeTruthy();
  });

  it('keeps the title visible when keyboard events fire without the opt-in prop', () => {
    render(
      <PageShell headerTitle="找书">
        <Text>页面内容</Text>
      </PageShell>
    );

    act(() => {
      emitKeyboardEvent('keyboardWillShow', { duration: 320 });
    });

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
  });

  it('hides the title while the keyboard is visible when opted in', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    const scheduleLayoutAnimationSpy = jest
      .spyOn(Keyboard, 'scheduleLayoutAnimation')
      .mockImplementation(() => {});

    render(
      <PageShell
        headerTitle="找书"
        hideHeaderTitleWhenKeyboardVisible
        showBackButton>
        <Text>页面内容</Text>
      </PageShell>
    );

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');

    act(() => {
      emitKeyboardEvent('keyboardWillShow', { duration: 320 });
    });

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
    expect(scheduleLayoutAnimationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 320 })
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 320, toValue: 0, useNativeDriver: true })
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 320, toValue: -8, useNativeDriver: true })
    );

    act(() => {
      jest.advanceTimersByTime(320);
    });

    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header-title-slot').props.style).height).toBe(0);
    expect(screen.getByTestId('secondary-back-button')).toBeTruthy();

    act(() => {
      emitKeyboardEvent('keyboardWillHide', { duration: 260 });
    });

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header-title-slot').props.style).height).toBe(36);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
  });
});

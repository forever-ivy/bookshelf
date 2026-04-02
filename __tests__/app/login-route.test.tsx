import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, ScrollView, StyleSheet } from 'react-native';

import LoginRoute from '@/app/login';
import { LibraryApiError } from '@/lib/api/client';
import { toast } from 'sonner-native';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

const mockSessionState = {
  bootstrapStatus: 'ready' as const,
  onboarding: null as
    | null
    | {
        completed: boolean;
        needsInterestSelection: boolean;
        needsProfileBinding: boolean;
      },
  token: null as null | string,
};
const mockSetSession = jest.fn();
const mockMutateAsync = jest.fn();
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
  const mockReact = jest.requireActual<typeof import('react')>('react');

  return {
    Redirect: ({ href }: { href: string }) =>
      mockReact.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    usePathname: () => '/login',
    useRouter: () => mockRouter,
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: mockSessionState.bootstrapStatus,
    onboarding: mockSessionState.onboarding,
    setSession: mockSetSession,
    token: mockSessionState.token,
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useLoginMutation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

describe('LoginRoute', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSessionState.bootstrapStatus = 'ready';
    mockSessionState.onboarding = null;
    mockSessionState.token = null;
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

  it('keeps the zhixu welcome layout locked until the keyboard is visible', () => {
    const view = render(<LoginRoute />);
    const scrollView = view.UNSAFE_getByType(ScrollView);

    expect(screen.getByTestId('login-background-decoration')).toBeTruthy();
    expect(screen.getByTestId('login-hero-stage')).toBeTruthy();
    expect(screen.getByTestId('login-hero-illustration')).toBeTruthy();
    expect(screen.getByText('知序')).toBeTruthy();
    expect(screen.getByText('整理你的知识')).toBeTruthy();
    expect(screen.queryByText('学号登录')).toBeNull();
    expect(screen.queryByText('手机号登录')).toBeNull();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeTruthy();
    expect(screen.getByText('继续登录')).toBeTruthy();
    expect(screen.getByText('创建新账号')).toBeTruthy();
    expect(screen.queryByText('登录与身份绑定')).toBeNull();
    expect(screen.queryByText('先用学号或手机号进入，再补全学院、专业、年级和兴趣标签。')).toBeNull();
    expect(scrollView.props.scrollEnabled).toBe(false);
    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });

  it('enables scrolling and collapses the hero artwork when the keyboard becomes visible', () => {
    const view = render(<LoginRoute />);
    const scrollView = view.UNSAFE_getByType(ScrollView);

    expect(StyleSheet.flatten(screen.getByTestId('login-hero-stage').props.style).minHeight).toBe(360);
    expect(StyleSheet.flatten(screen.getByTestId('login-hero-illustration').props.style).height).toBe(330);
    expect(scrollView.props.scrollEnabled).toBe(false);

    act(() => {
      emitKeyboardEvent('keyboardWillShow', { duration: 280 });
      jest.advanceTimersByTime(280);
    });

    expect(view.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('login-hero-stage').props.style).minHeight).toBe(224);
    expect(StyleSheet.flatten(screen.getByTestId('login-hero-illustration').props.style).height).toBe(196);
  });

  it('returns to the initial layout state after the keyboard is dismissed', () => {
    const view = render(<LoginRoute />);
    const initialScrollView = view.UNSAFE_getByType(ScrollView);

    act(() => {
      emitKeyboardEvent('keyboardWillShow', { duration: 280 });
      jest.advanceTimersByTime(280);
    });

    act(() => {
      emitKeyboardEvent('keyboardWillHide', { duration: 240 });
      jest.advanceTimersByTime(240);
    });

    expect(view.UNSAFE_getByType(ScrollView)).not.toBe(initialScrollView);
    expect(view.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
    expect(StyleSheet.flatten(screen.getByTestId('login-hero-stage').props.style).minHeight).toBe(360);
    expect(StyleSheet.flatten(screen.getByTestId('login-hero-illustration').props.style).height).toBe(330);
  });

  it('shows an inline auth error instead of throwing when login is rejected', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      new LibraryApiError('http_401', {
        code: 'http_401',
        status: 401,
      })
    );

    render(<LoginRoute />);

    fireEvent.changeText(screen.getByPlaceholderText('请输入用户名'), 'reader.ai');
    fireEvent.changeText(screen.getByPlaceholderText('请输入密码'), 'wrong-password');
    fireEvent.press(screen.getByText('继续登录'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('账号或密码不正确，请重新输入后再试。');
    });

    expect(screen.queryByText('登录没有完成')).toBeNull();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('uses precise toast copy when the username is missing', () => {
    render(<LoginRoute />);

    fireEvent.changeText(screen.getByPlaceholderText('请输入密码'), 'reader-pass');
    fireEvent.press(screen.getByText('继续登录'));

    expect(toast.error).toHaveBeenCalledWith('没账号');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('uses precise toast copy when the password is missing', () => {
    render(<LoginRoute />);

    fireEvent.changeText(screen.getByPlaceholderText('请输入用户名'), 'reader.ai');
    fireEvent.press(screen.getByText('继续登录'));

    expect(toast.error).toHaveBeenCalledWith('密码错误');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

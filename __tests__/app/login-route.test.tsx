import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

import LoginRoute from '@/app/login';
import { LibraryApiError } from '@/lib/api/client';

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
    jest.clearAllMocks();
    mockSessionState.bootstrapStatus = 'ready';
    mockSessionState.onboarding = null;
    mockSessionState.token = null;
  });

  it('renders the zhixu welcome layout with the approved slogan and hero illustration', () => {
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
      expect(screen.getByText('登录没有完成')).toBeTruthy();
    });

    expect(screen.getByText('登录状态已失效，请重新登录。')).toBeTruthy();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

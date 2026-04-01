import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import RegisterRoute from '@/app/register';
import { LibraryApiError } from '@/lib/api/client';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
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

jest.mock('expo-router', () => ({
  usePathname: () => '/register',
  useRouter: () => mockRouter,
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    onboarding: null,
    setSession: mockSetSession,
    token: null,
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useRegisterMutation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

describe('RegisterRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the public registration form for new readers', () => {
    render(<RegisterRoute />);

    expect(screen.getByPlaceholderText('请输入用户名')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入显示名称')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入密码')).toBeTruthy();
    expect(screen.getByText('注册并开始')).toBeTruthy();
  });

  it('shows an inline auth error instead of throwing when registration is rejected', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      new LibraryApiError('http_401', {
        code: 'http_401',
        status: 401,
      })
    );

    render(<RegisterRoute />);

    fireEvent.changeText(screen.getByPlaceholderText('请输入用户名'), 'reader.ai');
    fireEvent.changeText(screen.getByPlaceholderText('请输入显示名称'), '张一凡');
    fireEvent.changeText(screen.getByPlaceholderText('请输入密码'), 'wrong-password');
    fireEvent.press(screen.getByText('注册并开始'));

    await waitFor(() => {
      expect(screen.getByText('注册没有完成')).toBeTruthy();
    });

    expect(screen.getByText('登录状态已失效，请重新登录。')).toBeTruthy();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

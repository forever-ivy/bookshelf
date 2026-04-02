import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import RegisterRoute from '@/app/register';
import { appThemes } from '@/constants/app-theme';
import { LibraryApiError } from '@/lib/api/client';
import { toast } from 'sonner-native';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockSetSession = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseAppTheme = jest.fn(() => ({
  colorScheme: 'light' as const,
  isDark: false,
  theme: appThemes.light,
}));

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

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => mockUseAppTheme(),
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
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'light',
      isDark: false,
      theme: appThemes.light,
    });
  });

  it('renders the public registration form for new readers', () => {
    render(<RegisterRoute />);

    expect(screen.getByPlaceholderText('请输入用户名')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入显示名称')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入密码')).toBeTruthy();
    expect(screen.getByText('注册并开始')).toBeTruthy();
    expect(screen.getByTestId('register-hero-illustration')).toBeTruthy();
  });

  it('shows a toast error instead of rendering an inline auth card when registration is rejected', async () => {
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
      expect(toast.error).toHaveBeenCalledWith('注册信息暂时未通过校验，请检查后再试。');
    });

    expect(screen.queryByText('注册没有完成')).toBeNull();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('uses dark-mode semantic colors for form inputs and the submit button', () => {
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });

    render(<RegisterRoute />);

    expect(screen.getByPlaceholderText('请输入用户名')).toHaveProp(
      'placeholderTextColor',
      appThemes.dark.colors.inputPlaceholder
    );
    expect(screen.getByPlaceholderText('请输入用户名')).toHaveStyle({
      backgroundColor: appThemes.dark.colors.inputBackground,
      borderColor: appThemes.dark.colors.inputBorder,
    });
    expect(screen.getByTestId('register-submit-surface')).toHaveStyle({
      backgroundColor: appThemes.dark.colors.inverseSurface,
    });
    expect(screen.getByText('注册并开始')).toHaveStyle({
      color: appThemes.dark.colors.inverseText,
    });
  });
});

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import RegisterRoute from '@/app/register';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

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
  useRouter: () => mockRouter,
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    onboarding: null,
    setSession: jest.fn(),
    token: null,
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useRegisterMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}));

describe('RegisterRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the public registration form for new readers', () => {
    render(<RegisterRoute />);

    expect(screen.getByText('创建账号')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入显示名称')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入密码')).toBeTruthy();
    expect(screen.getByText('注册并开始')).toBeTruthy();
  });
});

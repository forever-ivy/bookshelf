import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    usePathname: () => '/onboarding/profile',
    useRouter: () => ({
      replace: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    onboarding: { completed: false, needsInterestSelection: true, needsProfileBinding: true },
    profile: null,
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useUpdateProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}));

import OnboardingProfileRoute from '@/app/onboarding/profile';

describe('OnboardingProfileRoute', () => {
  it('explains the first onboarding step in product language', () => {
    render(<OnboardingProfileRoute />);

    expect(screen.getByText('完善借阅资料')).toBeTruthy();
    expect(screen.getByText('第 1 步，共 2 步')).toBeTruthy();
    expect(screen.getByText(/填写学院、专业和年级后/)).toBeTruthy();
    expect(screen.getByText('保存并继续')).toBeTruthy();
    expect(screen.queryByText(/首页推荐、考试专区/)).toBeNull();
  });
});

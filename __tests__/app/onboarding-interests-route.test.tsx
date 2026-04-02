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
    usePathname: () => '/onboarding/interests',
    useRouter: () => ({
      replace: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    onboarding: { completed: false, needsInterestSelection: true, needsProfileBinding: false },
    profile: {
      accountId: 1,
      affiliationType: 'student',
      college: '信息学院',
      displayName: '陈知行',
      gradeYear: '2023',
      id: 1,
      interestTags: ['AI'],
      major: '人工智能',
      onboarding: { completed: false, needsInterestSelection: true, needsProfileBinding: false },
      readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
    },
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useUpdateProfileMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}));

import OnboardingInterestsRoute from '@/app/onboarding/interests';

describe('OnboardingInterestsRoute', () => {
  it('explains the second onboarding step in product language', () => {
    render(<OnboardingInterestsRoute />);

    expect(screen.getByText('第 2 步，共 2 步')).toBeTruthy();
    expect(screen.getByText(/找书、推荐借阅和专题书单会更贴近你/)).toBeTruthy();
    expect(screen.getByText('完成建档，进入首页')).toBeTruthy();
    expect(screen.getByTestId('onboarding-interest-artwork')).toBeTruthy();
    expect(screen.queryByText(/首页、推荐和书单会更贴近你的学习节奏/)).toBeNull();
  });
});

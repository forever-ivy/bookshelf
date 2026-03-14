import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );
  const AnimatedText = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(Text, { ...props, ref }, props.children)
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: AnimatedText,
    },
    View: AnimatedView,
    Text: AnimatedText,
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(View, { testID: `redirect-${href}` }),
    useLocalSearchParams: () => ({ memberId: '2' }),
    useRouter: () => ({
      back: jest.fn(),
      push: jest.fn(),
    }),
  };
});

jest.mock('@/stores/session-store', () => ({
  useSessionStore: (selector: (state: { connection: { baseUrl: string; displayName: string } | null }) => unknown) =>
    selector({
      connection: {
        baseUrl: 'preview://cabinet',
        displayName: '预览书柜',
      },
    }),
}));

jest.mock('@/lib/api/react-query/hooks', () => ({
  useUsersQuery: () => ({
    data: [{ id: 2, name: '米洛', role: 'child' }],
  }),
  useMemberStatsQuery: () => ({
    data: {
      today_ops: 1,
      total_take: 8,
      weekly_goal: 5,
      weekly_takes: 2,
    },
  }),
  useMemberBooklistQuery: () => ({
    data: [],
  }),
  useMemberBadgesQuery: () => ({
    data: {
      badges: [
        { badge_key: 'first_book', unlocked_at: '2026-03-01T10:00:00.000Z' },
        { badge_key: 'night_owl', unlocked_at: '2026-03-02T10:00:00.000Z' },
      ],
    },
  }),
}));

jest.mock('@/lib/presentation/member-presentation', () => ({
  getMemberAccentColor: () => '#FFFFFF',
  getMemberRoleLabel: () => '家庭成员',
}));

jest.mock('@/lib/presentation/profile-helpers', () => ({
  getProfileAvatarValue: () => '米',
  resolveProfileMember: () => ({
    id: 2,
    name: '米洛',
    role: 'child',
  }),
}));

jest.mock('@/lib/presentation/motion', () => ({
  createSlowFadeIn: () => undefined,
  createStaggeredFadeIn: () => undefined,
  motionTransitions: {
    gentle: undefined,
    snappy: undefined,
  },
}));

jest.mock('@/components/base/animated-count-text', () => ({
  AnimatedCountText: ({ value }: { value: number }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, value);
  },
}));

jest.mock('@/components/member/avatar-glyph', () => ({
  AvatarGlyph: ({ value }: { value: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, value);
  },
}));

jest.mock('@/components/cards/book-carousel-card', () => ({
  BookCarouselCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'profile-book-carousel' });
  },
}));

jest.mock('@/components/actions/glass-pill-button', () => ({
  GlassPillButton: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'profile-glass-pill-button' });
  },
}));

jest.mock('@/components/cards/goal-progress-card', () => ({
  GoalProgressCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'profile-goal-progress' });
  },
}));

jest.mock('@/components/surfaces/section-card', () => ({
  SectionCard: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'profile-section-card' }, children);
  },
}));

jest.mock('@/components/actions/shortcut-card', () => ({
  ShortcutCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'profile-shortcut-card' });
  },
}));

jest.mock('@/components/navigation/screen-shell', () => ({
  ScreenShell: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'profile-screen-shell' }, children);
  },
}));

jest.mock('@/components/cards/milestone', () => ({
  MilestoneBadge: ({ badgeKey }: { badgeKey: string }) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return React.createElement(
      View,
      { testID: 'profile-milestone-badge' },
      React.createElement(Text, null, badgeKey)
    );
  },
  MilestoneRail: ({ badges }: { badges: { badge_key: string }[] }) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return React.createElement(
      View,
      { testID: 'profile-milestone-rail' },
      React.createElement(Text, null, `count:${badges.length}`)
    );
  },
}));

import ProfileRoute from '@/app/(tabs)/home/profile/[memberId]';

describe('ProfileRoute', () => {
  it('renders multiple milestones inside a horizontal rail instead of stacking badge cards', () => {
    const screen = render(<ProfileRoute />);

    expect(screen.getByTestId('profile-milestone-rail')).toBeTruthy();
    expect(screen.getByText('count:2')).toBeTruthy();
    expect(screen.queryByTestId('profile-milestone-badge')).toBeNull();
  });
});

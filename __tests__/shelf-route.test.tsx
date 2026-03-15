import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
    },
    View: AnimatedView,
  };
});

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: `redirect-${href}` });
  },
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: (
    selector: (state: {
      connection: { baseUrl: string; displayName: string } | null;
      currentMemberId: number | null;
      isPreviewMode: boolean;
    }) => unknown
  ) =>
    selector({
      connection: {
        baseUrl: 'preview://cabinet',
        displayName: '预览书柜',
      },
      currentMemberId: 1,
      isPreviewMode: true,
    }),
}));

jest.mock('@/hooks/use-active-member', () => ({
  useActiveMember: () => ({
    activeMember: { id: 1, name: '米洛' },
  }),
}));

jest.mock('@/lib/api/react-query/hooks', () => ({
  useCompartmentsQuery: () => ({
    data: [
      { book: '设计心理学', cid: 1, status: 'occupied', x: 0, y: 0 },
      { book: null, cid: 2, status: 'free', x: 0, y: 1 },
    ],
    error: null,
    isLoading: false,
  }),
  useMemberBooklistQuery: () => ({
    data: [{ done: false, id: 1, note: 'note', title: '设计心理学' }],
  }),
  useTakeBookMutation: () => ({
    isPending: false,
    mutate: jest.fn(),
  }),
}));

jest.mock('@/components/navigation/screen-shell', () => ({
  ScreenShell: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'shelf-screen-shell' }, children);
  },
}));

jest.mock('@/components/navigation/flow-screen-header', () => ({
  FlowScreenHeader: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, title);
  },
}));

jest.mock('@/components/surfaces/section-card', () => ({
  SectionCard: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'shelf-section-card' }, children);
  },
}));

jest.mock('@/components/cards/book-carousel-card', () => ({
  BookCarouselCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'shelf-book-carousel' });
  },
}));

jest.mock('@/components/cards/shelf-cabinet-preview', () => ({
  ShelfCabinetPreview: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'shelf-cabinet-preview' });
  },
}));

jest.mock('@/components/actions/shortcut-card', () => ({
  ShortcutCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'shelf-shortcut-card' });
  },
}));

jest.mock('@/components/layout/two-column-grid', () => ({
  TwoColumnGrid: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'shelf-grid' }, children);
  },
}));

jest.mock('@/components/surfaces/state-card', () => ({
  StateCard: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, title);
  },
}));

jest.mock('@/lib/presentation/motion', () => ({
  createStaggeredFadeIn: () => undefined,
  motionTransitions: {
    gentle: undefined,
  },
}));

import ShelfScreen from '@/app/(tabs)/library/shelf';

describe('ShelfScreen', () => {
  it('keeps the family overview on the shelf page and mounts the immersive cabinet preview', () => {
    const screen = render(<ShelfScreen />);

    expect(screen.getByText('家庭书架')).toBeTruthy();
    expect(screen.getByTestId('shelf-book-carousel')).toBeTruthy();
    expect(screen.getByTestId('shelf-cabinet-preview')).toBeTruthy();
  });
});

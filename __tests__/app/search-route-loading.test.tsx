import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Link,
    usePathname: () => '/search',
    useRouter: () => ({
      push: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/use-library-app-data', () => ({
  useCatalogBookSearchPageQuery: () => ({
    data: undefined,
    error: null,
    isFetching: true,
  }),
  useExplicitBookSearchQuery: () => ({
    data: undefined,
    error: null,
    isFetching: false,
  }),
  useRecommendationSearchQuery: () => ({
    data: undefined,
    error: null,
    isFetching: true,
  }),
}));

import { SearchScreen } from '@/components/search/search-screen';

describe('SearchScreen loading state', () => {
  it('keeps the filter and result containers mounted with skeletons during first load', () => {
    render(<SearchScreen query="" />);

    expect(screen.getByText('筛选')).toBeTruthy();
    expect(screen.getByText('为你推荐')).toBeTruthy();
    expect(screen.getByTestId('search-results-list')).toBeTruthy();
    expect(screen.getByTestId('search-result-skeleton-1')).toBeTruthy();
    expect(screen.getByTestId('search-result-skeleton-2')).toBeTruthy();
    expect(screen.getByTestId('search-result-skeleton-3')).toBeTruthy();
    expect(screen.queryByText('这次没找到完全匹配的图书')).toBeNull();
  });
});

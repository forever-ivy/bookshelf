import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockCatalogData:
  | {
      hasMore: boolean;
      items: Array<{
        author: string;
        availabilityLabel: string;
        cabinetLabel: string;
        coverTone: 'lavender';
        etaLabel: string;
        id: number;
        recommendationReason: string | null;
        title: string;
      }>;
      limit: number;
      offset: number;
      query: string;
      total: number;
    }
  | undefined;
let mockCatalogFetching = true;
let mockRecommendationData: Array<unknown> | undefined;
let mockRecommendationFetching = true;
let mockPersonalizedRecommendationData: Array<unknown> | undefined;
let mockPersonalizedRecommendationFetching = true;

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
  useCatalogCategoriesQuery: () => ({
    data: [
      { id: 'science-tech', name: '科学技术' },
      { id: 'economics-management', name: '经济管理' },
    ],
    isFetching: false,
  }),
  useCatalogBookSearchPageQuery: () => ({
    data: mockCatalogData,
    error: null,
    isFetching: mockCatalogFetching,
  }),
  useExplicitBookSearchQuery: () => ({
    data: undefined,
    error: null,
    isFetching: false,
  }),
  usePersonalizedRecommendationsQuery: () => ({
    data: mockPersonalizedRecommendationData,
    error: null,
    isFetching: mockPersonalizedRecommendationFetching,
  }),
  useRecommendationSearchQuery: () => ({
    data: mockRecommendationData,
    error: null,
    isFetching: mockRecommendationFetching,
  }),
}));

import { SearchScreen } from '@/components/search/search-screen';

describe('SearchScreen loading state', () => {
  beforeEach(() => {
    mockCatalogData = undefined;
    mockCatalogFetching = true;
    mockPersonalizedRecommendationData = undefined;
    mockPersonalizedRecommendationFetching = true;
    mockRecommendationData = undefined;
    mockRecommendationFetching = true;
  });

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

  it('keeps showing skeletons while discovery recommendations are still loading even if catalog results arrived first', () => {
    mockCatalogData = {
      hasMore: false,
      items: [
        {
          author: '周志华',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '主馆 2 楼',
          coverTone: 'lavender',
          etaLabel: '可送达',
          id: 1,
          recommendationReason: null,
          title: '机器学习',
        },
      ],
      limit: 20,
      offset: 0,
      query: '',
      total: 1,
    };
    mockCatalogFetching = false;
    mockRecommendationData = undefined;
    mockRecommendationFetching = true;

    render(<SearchScreen query="" />);

    expect(screen.getByTestId('search-result-skeleton-1')).toBeTruthy();
    expect(screen.queryByText('机器学习')).toBeNull();
    expect(screen.queryByTestId('search-result-cell')).toBeNull();
  });

  it('renders personalized recommendations immediately for discovery mode instead of waiting on empty search', () => {
    mockCatalogData = undefined;
    mockCatalogFetching = false;
    mockPersonalizedRecommendationData = [
      {
        author: '钱伟长',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '主馆 2 楼',
        coverTone: 'lavender',
        etaLabel: '可送达',
        id: 67642,
        recommendationReason: '基于你的借阅历史生成',
        summary: '更符合读者历史兴趣的个性化推荐。',
        title: '钱伟长科学论文集',
      },
    ];
    mockPersonalizedRecommendationFetching = false;
    mockRecommendationData = undefined;
    mockRecommendationFetching = true;

    render(<SearchScreen query="" />);

    expect(screen.getByText('钱伟长科学论文集')).toBeTruthy();
    expect(screen.queryByTestId('search-result-skeleton-1')).toBeNull();
  });
});

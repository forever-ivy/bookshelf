import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
let mockFavoriteBooks = favoriteBooks;

const favoriteBooks = [
  {
    book: {
      author: '周志华',
      availabilityLabel: '馆藏充足 · 可立即借阅',
      cabinetLabel: '智能书柜 A-03',
      category: '人工智能',
      coverTone: 'lavender',
      deliveryAvailable: true,
      etaLabel: '18 分钟可送达',
      etaMinutes: 18,
      id: 11,
      matchedFields: ['title'],
      recommendationReason: '课程导读',
      shelfLabel: '主馆 2 楼',
      stockStatus: 'available',
      summary: '适合课程导读和期末复习的入门书。',
      tags: ['人工智能', '课程'],
      title: '机器学习',
    },
    id: 'fav-1',
  },
  {
    book: {
      author: '李航',
      availabilityLabel: '馆藏充足 · 可立即借阅',
      cabinetLabel: '智能书柜 B-01',
      category: '人工智能',
      coverTone: 'coral',
      deliveryAvailable: false,
      etaLabel: '到柜自取',
      etaMinutes: null,
      id: 12,
      matchedFields: [],
      recommendationReason: null,
      shelfLabel: '主馆 3 楼',
      stockStatus: 'limited',
      summary: '分类与回归方法的经典教材。',
      tags: ['统计学习'],
      title: '统计学习方法',
    },
    id: 'fav-2',
  },
  {
    book: {
      author: '陈越',
      availabilityLabel: '馆藏充足 · 可立即借阅',
      cabinetLabel: '主馆 C-11',
      category: '管理学',
      coverTone: 'mint',
      deliveryAvailable: true,
      etaLabel: '可送达',
      etaMinutes: 20,
      id: 13,
      matchedFields: ['summary'],
      recommendationReason: '猜你想要',
      shelfLabel: '主馆 1 楼',
      stockStatus: 'available',
      summary: '适合做协作与组织方法的延伸阅读。',
      tags: ['组织管理'],
      title: '组织行为学',
    },
    id: 'fav-3',
  },
];

const mockUseFavoritesQuery = jest.fn(
  (filters?: { category?: string | null; query?: string }) => {
    const normalizedQuery = filters?.query?.trim().toLowerCase() ?? '';
    const category = filters?.category?.trim() ?? '';
    const data = mockFavoriteBooks.filter((item) => {
      if (category && item.book.category !== category) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [item.book.title, item.book.author, item.book.summary, item.book.category ?? '', ...(item.book.tags ?? [])]
        .join('\n')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return {
      data,
      error: null,
      isError: false,
      isFetching: false,
    };
  }
);

const mockUseCatalogCategoriesQuery = jest.fn(() => ({
  data: [
    { id: 1, name: '人工智能' },
    { id: 2, name: '管理学' },
    { id: 3, name: '环境科学、安全科学' },
  ],
  error: null,
  isError: false,
  isFetching: false,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { TextInput, View } = require('react-native');

  const Screen = ({
    children,
    options,
  }: {
    children?: React.ReactNode;
    options?: {
      headerSearchBarOptions?: {
        onChangeText?: (value: unknown) => void;
        onSearchButtonPress?: (value: unknown) => void;
        placeholder?: string;
      };
    };
  }) =>
    React.createElement(
      View,
      { testID: 'favorites-route-screen' },
      options?.headerSearchBarOptions
        ? React.createElement(TextInput, {
            onChangeText: options.headerSearchBarOptions.onChangeText,
            placeholder: options.headerSearchBarOptions.placeholder,
            testID: 'favorites-header-search-bar',
          })
        : null,
      children
    );

  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
      Screen,
    },
    useRouter: () => mockRouter,
  };
});

jest.mock('@/components/navigation/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useCatalogCategoriesQuery: (...args: unknown[]) => mockUseCatalogCategoriesQuery(...args),
  useFavoritesQuery: (...args: unknown[]) => mockUseFavoritesQuery(...args),
}));

import FavoritesRoute from '@/app/favorites/index';

describe('FavoritesRoute', () => {
  beforeEach(() => {
    mockRouter.back.mockReset();
    mockRouter.push.mockReset();
    mockUseFavoritesQuery.mockClear();
    mockUseCatalogCategoriesQuery.mockClear();
    mockFavoriteBooks = favoriteBooks;
  });

  it('renders all favorite books with the same search filter strip', () => {
    render(<FavoritesRoute />);

    expect(screen.getByPlaceholderText('搜索收藏图书')).toBeTruthy();
    expect(screen.getByTestId('search-filter-strip')).toBeTruthy();
    expect(screen.getByText('全部')).toBeTruthy();
    expect(screen.getByText('人工智能')).toBeTruthy();
    expect(screen.getByText('管理学')).toBeTruthy();
    expect(screen.getByText('环境科学、安全科学')).toBeTruthy();
    expect(screen.queryByTestId('search-filter-chip-wanted')).toBeNull();
    expect(screen.queryByTestId('search-filter-chip-delivery')).toBeNull();
    expect(screen.queryByTestId('search-filter-chip-stocked')).toBeNull();
    expect(screen.getByText('机器学习')).toBeTruthy();
    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(screen.getByText('组织行为学')).toBeTruthy();
  });

  it('filters favorite books by query and concrete category chips', () => {
    render(<FavoritesRoute />);

    fireEvent.changeText(screen.getByTestId('favorites-header-search-bar'), '统计');

    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(screen.queryByText('机器学习')).toBeNull();
    expect(mockUseFavoritesQuery).toHaveBeenLastCalledWith({
      category: null,
      query: '统计',
    });

    fireEvent.changeText(screen.getByTestId('favorites-header-search-bar'), '');
    fireEvent.press(screen.getByText('人工智能'));

    expect(screen.getByText('机器学习')).toBeTruthy();
    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(screen.queryByText('组织行为学')).toBeNull();
    expect(mockUseFavoritesQuery).toHaveBeenLastCalledWith({
      category: '人工智能',
      query: '',
    });
  });

  it('keeps category chips driven by the dedicated catalog endpoint even when favorites are empty for that category', () => {
    render(<FavoritesRoute />);

    fireEvent.press(screen.getByText('环境科学、安全科学'));

    expect(mockUseCatalogCategoriesQuery).toHaveBeenCalled();
    expect(mockUseFavoritesQuery).toHaveBeenLastCalledWith({
      category: '环境科学、安全科学',
      query: '',
    });
    expect(screen.getByText('没有符合条件的收藏图书')).toBeTruthy();
    expect(screen.getByTestId('favorites-filter-empty-artwork')).toBeTruthy();
  });

  it('shows a welcoming illustration when the reader has not saved any favorites yet', () => {
    mockFavoriteBooks = [];

    render(<FavoritesRoute />);

    expect(screen.getByText('还没有收藏图书')).toBeTruthy();
    expect(screen.getByTestId('favorites-empty-artwork')).toBeTruthy();
  });
});

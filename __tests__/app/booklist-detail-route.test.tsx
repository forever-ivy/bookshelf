import { render, screen } from '@testing-library/react-native';
import React from 'react';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
let mockBooklistId = 'ai-intro';
let mockBooklistsData = {
  customItems: [],
  systemItems: [
    {
      books: [
        {
          author: '周志华',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '智能书柜 A-03',
          category: '人工智能',
          coverTone: 'lavender',
          deliveryAvailable: true,
          etaLabel: '可送达',
          etaMinutes: 18,
          id: 1,
          matchedFields: [],
          recommendationReason: null,
          shelfLabel: '主馆 2 楼',
          stockStatus: 'available',
          summary: '适合课程导读和期末复习的入门书。',
          tags: ['人工智能'],
          title: '机器学习从零到一',
        },
        {
          author: 'Ian Goodfellow',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '主馆 2 楼',
          category: '人工智能',
          coverTone: 'blue',
          deliveryAvailable: false,
          etaLabel: '到柜自取',
          etaMinutes: null,
          id: 2,
          matchedFields: [],
          recommendationReason: null,
          shelfLabel: '主馆 2 楼',
          stockStatus: 'limited',
          summary: '适合继续拓展模型与训练方法。',
          tags: ['深度学习'],
          title: 'Deep Learning',
        },
      ],
      description: '按从浅到深的顺序搭一条学习路径。',
      id: 'ai-intro',
      source: 'system',
      title: 'AI 入门书单',
    },
  ],
};

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({ booklistId: mockBooklistId }),
  useRouter: () => mockRouter,
}));

jest.mock('@/components/navigation/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBooklistsQuery: () => ({
    data: mockBooklistsData,
    isError: false,
    isFetching: false,
  }),
}));

import BooklistDetailRoute from '@/app/booklists/[booklistId]';

describe('BooklistDetailRoute', () => {
  beforeEach(() => {
    mockBooklistId = 'ai-intro';
    mockBooklistsData = {
      customItems: [],
      systemItems: [
        {
          books: [
            {
              author: '周志华',
              availabilityLabel: '馆藏充足 · 可立即借阅',
              cabinetLabel: '智能书柜 A-03',
              category: '人工智能',
              coverTone: 'lavender',
              deliveryAvailable: true,
              etaLabel: '可送达',
              etaMinutes: 18,
              id: 1,
              matchedFields: [],
              recommendationReason: null,
              shelfLabel: '主馆 2 楼',
              stockStatus: 'available',
              summary: '适合课程导读和期末复习的入门书。',
              tags: ['人工智能'],
              title: '机器学习从零到一',
            },
            {
              author: 'Ian Goodfellow',
              availabilityLabel: '馆藏充足 · 可立即借阅',
              cabinetLabel: '主馆 2 楼',
              category: '人工智能',
              coverTone: 'blue',
              deliveryAvailable: false,
              etaLabel: '到柜自取',
              etaMinutes: null,
              id: 2,
              matchedFields: [],
              recommendationReason: null,
              shelfLabel: '主馆 2 楼',
              stockStatus: 'limited',
              summary: '适合继续拓展模型与训练方法。',
              tags: ['深度学习'],
              title: 'Deep Learning',
            },
          ],
          description: '按从浅到深的顺序搭一条学习路径。',
          id: 'ai-intro',
          source: 'system',
          title: 'AI 入门书单',
        },
      ],
    };
  });

  it('renders the selected booklist overview and its books', () => {
    render(<BooklistDetailRoute />);

    expect(screen.getByText('AI 入门书单')).toBeTruthy();
    expect(screen.getByText('按从浅到深的顺序搭一条学习路径。')).toBeTruthy();
    expect(screen.getByText('2 本图书')).toBeTruthy();
    expect(screen.getByText('书单图书')).toBeTruthy();
    expect(screen.getByText('机器学习从零到一')).toBeTruthy();
    expect(screen.getByText('Deep Learning')).toBeTruthy();
  });

  it('shows a recovery illustration when the selected booklist cannot be found', () => {
    mockBooklistId = 'missing-booklist';

    render(<BooklistDetailRoute />);

    expect(screen.getByText('未找到这份书单')).toBeTruthy();
    expect(screen.getByTestId('booklist-not-found-artwork')).toBeTruthy();
  });

  it('shows a first-entry illustration when a booklist exists but has no books yet', () => {
    mockBooklistsData = {
      customItems: [
        {
          books: [],
          description: '准备开始整理这个主题。',
          id: 'ai-intro',
          source: 'custom',
          title: '我的 AI 书单',
        },
      ],
      systemItems: [],
    };

    render(<BooklistDetailRoute />);

    expect(screen.getByText('我的 AI 书单')).toBeTruthy();
    expect(screen.getByText('书单暂时还是空的')).toBeTruthy();
    expect(screen.getByTestId('booklist-empty-artwork')).toBeTruthy();
  });
});

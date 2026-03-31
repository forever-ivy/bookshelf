jest.mock('@/lib/api/client', () => ({
  libraryRequest: jest.fn(),
}));

import { libraryRequest } from '@/lib/api/client';
import { getHomeFeed, getRecommendationDashboard } from '@/lib/api/recommendation';

describe('recommendation contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults home feed quick actions to system-generated entries', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      exam_zone: [],
      explanation_card: {
        body: '因为这些书和你当前的课程进度相关。',
        title: '为什么推荐给你',
      },
      hot_lists: [],
      quick_actions: [
        {
          code: 'borrow_now',
          description: '优先查看当前可借并支持配送的图书。',
          meta: '3 本推荐已准备好',
          title: '一键借书',
        },
      ],
      system_booklists: [],
      today_recommendations: [],
    });

    const result = await getHomeFeed('reader-token');

    expect(result.quickActions).toEqual([
      expect.objectContaining({
        code: 'borrow_now',
        source: 'system_generated',
      }),
    ]);
  });

  it('normalizes recommendation dashboard modules into reader-facing cards and book lists', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      focus_book: {
        book_id: 5,
        title: '机器学习',
      },
      history_books: [
        {
          book_id: 5,
          title: '机器学习',
        },
      ],
      modules: {
        collaborative: {
          error: null,
          ok: true,
          results: [
            {
              author: '李航',
              available_copies: 2,
              book_id: 7,
              deliverable: true,
              explanation: '和你的借阅群体高度重合。',
              title: '统计学习方法',
            },
          ],
          source_book: {
            book_id: 5,
            title: '机器学习',
          },
        },
        hybrid: {
          error: null,
          ok: true,
          results: [],
          source_book: {
            book_id: 5,
            title: '机器学习',
          },
        },
        similar: {
          error: 'book_embedding_missing',
          ok: false,
          results: [],
          source_book: {
            book_id: 5,
            title: '机器学习',
          },
        },
      },
      personalized: [
        {
          author: '周志华',
          available_copies: 1,
          book_id: 5,
          deliverable: true,
          explanation: '与你最近的借阅主题高度相关。',
          title: '机器学习',
        },
      ],
      reader_id: 1,
      suggested_queries: ['推荐系统', '深度学习'],
    });

    const result = await getRecommendationDashboard('reader-token');

    expect(result.suggestedQueries).toEqual(['推荐系统', '深度学习']);
    expect(result.personalized[0]).toMatchObject({
      id: 5,
      title: '机器学习',
    });
    expect(result.modules.collaborative.results[0]).toMatchObject({
      id: 7,
      title: '统计学习方法',
    });
    expect(result.modules.similar.ok).toBe(false);
    expect(result.modules.similar.error).toBe('book_embedding_missing');
  });

  it('prefers real location fields in home-feed recommendations instead of the default cabinet placeholder', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      exam_zone: [],
      explanation_card: {
        body: '因为这些书和你当前的课程进度相关。',
        title: '为什么推荐给你',
      },
      hot_lists: [],
      quick_actions: [],
      system_booklists: [],
      today_recommendations: [
        {
          author: '列宁',
          available_copies: 1,
          book_id: 21608,
          cabinetLabel: 'A058',
          deliverable: true,
          explanation: '与你最近借阅的主题相关。',
          shelf_label: '东区主书柜',
          title: '帝国主义论',
        },
        {
          author: '列宁',
          available_copies: 0,
          book_id: 21589,
          deliverable: false,
          explanation: '同主题补充阅读。',
          title: '帝国主义论增订本',
        },
      ],
    });

    const result = await getHomeFeed('reader-token');

    expect(result.todayRecommendations[0]).toMatchObject({
      cabinetLabel: 'A058',
      shelfLabel: '东区主书柜',
    });
    expect(result.todayRecommendations[1]).toMatchObject({
      cabinetLabel: '位置待确认',
    });
  });
});

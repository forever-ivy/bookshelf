jest.mock('@/lib/api/client', () => ({
  libraryRequest: jest.fn(),
}));

import { libraryRequest } from '@/lib/api/client';
import { getHomeFeed } from '@/lib/api/recommendation';

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
});

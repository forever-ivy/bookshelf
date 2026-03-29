jest.mock('@/lib/api/client', () => ({
  libraryRequest: jest.fn(),
}));

import { libraryRequest } from '@/lib/api/client';
import { getBook, listBooks } from '@/lib/api/catalog';
import { searchRecommendations } from '@/lib/api/recommendation';

describe('catalog contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps official category names onto catalog list cards without exposing classification codes', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 7,
          title: '智能系统设计',
          author: '程墨',
          category: '人工智能',
          classification_code: 'TP18',
          summary: '系统化管理 AI 服务。',
        },
      ],
    });

    const result = await listBooks(undefined, 'reader-token');

    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        category: '人工智能',
      }),
    ]);
    expect(result[0]).not.toHaveProperty('classificationCode');
  });

  it('keeps detail payloads aligned with the same category semantics', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      id: 11,
      title: '环境风险治理',
      author: '周朔',
      category: '环境科学、安全科学',
      classification_code: 'X913.4',
      summary: '聚焦环境安全与风险治理实践。',
    });

    const result = await getBook(11, 'reader-token');

    expect(result.catalog).toMatchObject({
      id: 11,
      category: '环境科学、安全科学',
    });
    expect(result.catalog).not.toHaveProperty('classificationCode');
  });

  it('propagates official category names through recommendation search results without exposing classification codes', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      results: [
        {
          book_id: 13,
          title: '机器人系统调度',
          author: '乔远',
          category: '人工智能',
          classification_code: 'TP242',
          explanation: '与你最近的借阅主题高度相关。',
          summary: '面向馆内配送与任务分发的调度实践。',
          available_copies: 2,
          deliverable: true,
        },
      ],
    });

    const result = await searchRecommendations('调度', 'reader-token');

    expect(result).toEqual([
      expect.objectContaining({
        id: 13,
        category: '人工智能',
      }),
    ]);
    expect(result[0]).not.toHaveProperty('classificationCode');
  });
});

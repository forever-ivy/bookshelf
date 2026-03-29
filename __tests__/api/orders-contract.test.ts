import { getOrder } from '@/lib/api/orders';

describe('orders contract', () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'https://library.example';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = originalBaseUrl;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('translates internal order status values into reader-facing labels', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        book: {
          author: '周志华',
          id: 101,
          title: '机器学习',
        },
        due_at: '4 月 2 日',
        id: 101,
        note: 'manual_review',
        renewable: false,
        status: 'overdue',
        timeline: [{ completed: true, label: '已到期' }],
      }),
      ok: true,
    });

    const result = await getOrder(101, 'reader-token');

    expect(result.status).toBe('overdue');
    expect(result.statusLabel).toBe('已逾期');
    expect(result.note).not.toBe('manual_review');
    expect(result.note).toBe('需要馆员确认后继续处理');
  });
});

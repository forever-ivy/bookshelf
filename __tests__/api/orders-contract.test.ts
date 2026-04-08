import {
  cancelBorrowOrder,
  createBorrowOrder,
  getOrder,
  getReturnRequest,
  listBorrowOrders,
} from '@/lib/api/orders';

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

  it('requests the reader borrow-order list with status filters and normalizes the items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        items: [
          {
            book: {
              author: '程墨',
              id: 202,
              title: '系统设计',
            },
            id: 202,
            status: 'active',
            timeline: [{ completed: true, label: '待取书' }],
          },
        ],
      }),
      ok: true,
    });

    const result = await listBorrowOrders(
      {
        activeOnly: true,
        status: 'active',
      },
      'reader-token'
    );

    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v1/orders/borrow-orders?status=active&active_only=true'
    );
    expect(result[0]).toMatchObject({
      id: 202,
      status: 'active',
    });
  });

  it('normalizes reader-facing return-request detail bundles', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        order: {
          book: {
            author: '周志华',
            id: 9,
            title: '机器学习',
          },
          borrow_order: {
            id: 90,
            status: 'completed',
          },
        },
        return_request: {
          borrow_order_id: 90,
          id: 15,
          reader_id: 1,
          status: 'created',
        },
      }),
      ok: true,
    });

    const result = await getReturnRequest(15, 'reader-token');

    expect(result.returnRequest).toMatchObject({
      borrowOrderId: 90,
      id: 15,
      readerId: 1,
      status: 'created',
    });
    expect(result.order).toMatchObject({
      id: 90,
      status: 'completed',
    });
  });

  it('posts to the cancel endpoint and returns the normalized updated order', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        book: {
          author: '程墨',
          id: 301,
          title: '服务设计',
        },
        id: 301,
        status: 'cancelled',
        timeline: [{ completed: true, label: '已取消' }],
      }),
      ok: true,
    });

    const result = await cancelBorrowOrder(301, 'reader-token');

    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v1/orders/borrow-orders/301/cancel'
    );
    expect(result.status).toBe('cancelled');
    expect(result.statusLabel).toBe('已取消');
  });

  it('normalizes nested service order bundles and exposes the fulfillment phase', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        book: {
          author: '程墨',
          id: 502,
          title: '服务设计',
        },
        borrow_order: {
          due_at: '4 月 8 日',
          id: 502,
          order_mode: 'robot_delivery',
          renewable: false,
          status: 'created',
        },
        delivery_order: {
          delivery_target: '阅览室 A-12',
          status: 'awaiting_pick',
        },
        fulfillment_phase: 'dispatch_started',
        robot_task: {
          status: 'assigned',
        },
        robot_unit: {
          status: 'assigned',
        },
      }),
      ok: true,
    });

    const result = await getOrder(502, 'reader-token');

    expect(result).toMatchObject({
      dueDateLabel: '4 月 8 日',
      fulfillmentPhase: 'dispatch_started',
      id: 502,
      mode: 'robot_delivery',
      status: 'active',
      statusLabel: '正在配送',
    });
  });

  it('posts the reader provided delivery target without falling back to a default seat', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        book: {
          author: '程墨',
          id: 601,
          title: '服务设计',
        },
        borrow_order: {
          id: 601,
          order_mode: 'robot_delivery',
          status: 'created',
        },
        fulfillment_phase: 'dispatch_started',
      }),
      ok: true,
    });

    await createBorrowOrder(
      {
        bookId: 601,
        deliveryTarget: '阅览室 B-07',
        mode: 'robot_delivery',
      },
      'reader-token'
    );

    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))).toEqual({
      book_id: 601,
      delivery_target: '阅览室 B-07',
      order_mode: 'robot_delivery',
    });
  });
});

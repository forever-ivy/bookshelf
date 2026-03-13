import { createBookshelfApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/core/types';

const originalFetch = global.fetch;

describe('createBookshelfApiClient', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('requests member data from the configured cabinet', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [{ id: 1, name: 'Sarah' }] }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');
    const users = await client.getUsers();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cabinet.example.com/api/users',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(users).toEqual([{ id: 1, name: 'Sarah' }]);
  });

  it('unwraps the active member when switching readers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { id: 8, name: 'Milo' } }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');
    const user = await client.switchUser(8);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cabinet.example.com/api/users/switch',
      expect.objectContaining({
        body: JSON.stringify({ user_id: 8 }),
        method: 'POST',
      })
    );
    expect(user).toEqual({ id: 8, name: 'Milo' });
  });

  it('raises an ApiError when the cabinet rejects a request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: false, data: null, message: 'Cabinet offline' }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getCurrentUser()).rejects.toMatchObject({
      message: 'Cabinet offline',
      status: 503,
    } satisfies Partial<ApiError>);
  });

  it('uses fallback backend error fields when message is absent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: false, data: null, error: 'Missing user_id' }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.switchUser(0)).rejects.toMatchObject({
      message: 'Missing user_id',
      status: 400,
    } satisfies Partial<ApiError>);
  });

  it('rejects invalid payloads that fail runtime schema validation', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: [{ id: 1 }] }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getUsers()).rejects.toMatchObject({
      status: 500,
    } satisfies Partial<ApiError>);
  });

  it('unwraps shelf compartments from the success envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [{ book: '海边的灯塔', cid: 1, status: 'occupied', x: 0, y: 0 }],
      }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getCompartments()).resolves.toEqual([
      { book: '海边的灯塔', cid: 1, status: 'occupied', x: 0, y: 0 },
    ]);
  });

  it('returns borrow logs with the normalized title field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [{ action: 'take', action_time: '2026-03-13T10:00:00', title: '星空的秘密' }],
      }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getBorrowLogs(3)).resolves.toEqual([
      { action: 'take', action_time: '2026-03-13T10:00:00', title: '星空的秘密' },
    ]);
  });

  it('returns booklist card fields without requiring inferred metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [
          {
            assigned_by_user_id: null,
            author: null,
            book_id: null,
            category: null,
            cover_url: null,
            created_at: '2026-03-13T09:00:00',
            description: null,
            done: false,
            done_at: null,
            id: 11,
            note: '先读第一章',
            title: '没有元数据的书',
          },
        ],
      }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getMemberBooklist(3)).resolves.toEqual([
      {
        assigned_by_user_id: null,
        author: null,
        book_id: null,
        category: null,
        cover_url: null,
        created_at: '2026-03-13T09:00:00',
        description: null,
        done: false,
        done_at: null,
        id: 11,
        note: '先读第一章',
        title: '没有元数据的书',
      },
    ]);
  });

  it('uses the dedicated report schemas for weekly and monthly reports', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            books: ['海边的灯塔'],
            summary: '本周保持了稳定阅读节奏。',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            most_active: '陈一诺',
            summary: '这个月全家一起读完了很多好书。',
            top_category: '科普',
            total_books: 9,
          },
        }),
      }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getWeeklyReport(3)).resolves.toEqual({
      books: ['海边的灯塔'],
      summary: '本周保持了稳定阅读节奏。',
    });
    await expect(client.getMonthlyReport()).resolves.toEqual({
      most_active: '陈一诺',
      summary: '这个月全家一起读完了很多好书。',
      top_category: '科普',
      total_books: 9,
    });
  });
});

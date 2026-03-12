import { ApiError, createBookshelfApiClient } from '@/lib/api/client';

const originalFetch = global.fetch;

describe('createBookshelfApiClient', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('requests member data from the configured cabinet', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: 'Sarah' }],
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

  it('posts the active member id when switching readers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, user: { id: 8, name: 'Milo' } }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');
    await client.switchUser(8);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cabinet.example.com/api/users/switch',
      expect.objectContaining({
        body: JSON.stringify({ user_id: 8 }),
        method: 'POST',
      })
    );
  });

  it('raises an ApiError when the cabinet rejects a request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ message: 'Cabinet offline' }),
    }) as typeof fetch;

    const client = createBookshelfApiClient('https://cabinet.example.com');

    await expect(client.getCurrentUser()).rejects.toMatchObject({
      message: 'Cabinet offline',
      status: 503,
    } satisfies Partial<ApiError>);
  });
});

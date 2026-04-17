jest.mock('@/stores', () => ({
  readStoredSessionToken: jest.fn(async () => 'stored-token'),
  readStoredRefreshToken: jest.fn(async () => 'stored-refresh-token'),
  replaceStoredSessionTokens: jest.fn(async () => undefined),
}));

import {
  LibraryApiError,
  getAuthActionErrorMessage,
  getLibraryErrorMessage,
  isLibraryAuthError,
  libraryRequest,
} from '@/lib/api/client';
import { replaceStoredSessionTokens } from '@/stores';

describe('libraryRequest', () => {
  const originalServiceUrl = process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = originalServiceUrl;
    global.fetch = originalFetch;
  });

  it('uses fallback when the real service URL is not configured', async () => {
    delete process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;
    const fallback = jest.fn(() => ({ ok: true }));

    const result = await libraryRequest('/api/v1/recommendation/home-feed', {
      fallback,
      method: 'GET',
    });

    expect(result).toEqual({ ok: true });
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('throws instead of silently falling back when the configured service returns an error', async () => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://localhost:8000';
    const fallback = jest.fn(() => ({ ok: true }));
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({}), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        })
    ) as unknown as typeof fetch;

    await expect(
      libraryRequest('/api/v1/recommendation/home-feed', {
        fallback,
        method: 'GET',
      })
    ).rejects.toMatchObject({
      code: 'http_500',
      name: 'LibraryApiError',
      status: 500,
    });

    expect(fallback).not.toHaveBeenCalled();
  });

  it('can opt into network fallback for low-risk calls', async () => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://localhost:8000';
    const fallback = jest.fn(() => ({ ok: 'fallback' }));
    global.fetch = jest.fn(async () => {
      throw new Error('socket hang up');
    }) as unknown as typeof fetch;

    const result = await libraryRequest('/api/v1/recommendation/home-feed', {
      fallback,
      fallbackOnError: true,
      method: 'GET',
    });

    expect(result).toEqual({ ok: 'fallback' });
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('refreshes the session and retries once when a request returns 401', async () => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://localhost:8000';
    const fallback = jest.fn(() => ({ ok: true }));
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          headers: { 'Content-Type': 'application/json' },
          status: 401,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'refreshed-token',
            refresh_token: 'refreshed-refresh-token',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: 'retried' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      ) as unknown as typeof fetch;

    const result = await libraryRequest('/api/v1/recommendation/home-feed', {
      fallback,
      method: 'GET',
    });

    expect(result).toEqual({ ok: 'retried' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((global.fetch as jest.Mock).mock.calls[1]?.[0]).toBe(
      'http://localhost:8000/api/v1/auth/refresh'
    );
    expect(
      JSON.parse(String((global.fetch as jest.Mock).mock.calls[1]?.[1]?.body))
    ).toEqual({
      refresh_token: 'stored-refresh-token',
    });
    expect(replaceStoredSessionTokens).toHaveBeenCalledWith({
      accessToken: 'refreshed-token',
      refreshToken: 'refreshed-refresh-token',
    });
    expect(
      (global.fetch as jest.Mock).mock.calls[2]?.[1]?.headers?.Authorization
    ).toBe('Bearer refreshed-token');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('preserves structured backend error codes from JSON responses', async () => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://localhost:8000';
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 'password_incorrect',
            message: 'password_incorrect',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 401,
          }
        )
    ) as unknown as typeof fetch;

    await expect(
      libraryRequest('/api/v1/auth/login', {
        body: JSON.stringify({
          password: 'wrong-password',
          username: 'reader.ai',
        }),
        fallback: () => ({ ok: true }),
        method: 'POST',
      })
    ).rejects.toMatchObject({
      code: 'password_incorrect',
      name: 'LibraryApiError',
      status: 401,
    });
  });

  it('does not force a JSON content type for FormData uploads', async () => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://localhost:8000';
    const formData = new FormData();
    formData.append('title', 'AI 导学资料');
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
    ) as unknown as typeof fetch;

    await libraryRequest('/api/v1/learning/profiles/upload', {
      body: formData,
      fallback: () => ({ ok: false }),
      method: 'POST',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({
        Accept: 'application/json',
        Authorization: 'Bearer stored-token',
      })
    );
    expect((global.fetch as jest.Mock).mock.calls[0]?.[1]?.headers?.['Content-Type']).toBeUndefined();
  });
});

describe('library client helpers', () => {
  it('recognizes auth errors and exposes user-facing messages', () => {
    const error = new LibraryApiError('http_401', {
      code: 'http_401',
      status: 401,
    });

    expect(isLibraryAuthError(error)).toBe(true);
    expect(getLibraryErrorMessage(error)).toContain('登录状态已失效');
  });

  it('maps detailed login failures to precise auth copy', () => {
    expect(
      getAuthActionErrorMessage(
        new LibraryApiError('user_not_found', {
          code: 'user_not_found',
          status: 401,
        }),
        {
          action: 'login',
          fallback: '登录失败',
        }
      )
    ).toBe('没账号');

    expect(
      getAuthActionErrorMessage(
        new LibraryApiError('password_incorrect', {
          code: 'password_incorrect',
          status: 401,
        }),
        {
          action: 'login',
          fallback: '登录失败',
        }
      )
    ).toBe('密码错误');
  });

  it('maps borrow-order specific backend errors to reader-friendly copy', () => {
    expect(
      getLibraryErrorMessage(
        new LibraryApiError('book_unavailable', {
          code: 'book_unavailable',
          status: 409,
        }),
        '借阅失败'
      )
    ).toBe('这本书当前暂不可借，请换一本或稍后再试。');

    expect(
      getLibraryErrorMessage(
        new LibraryApiError('delivery_target_required', {
          code: 'delivery_target_required',
          status: 400,
        }),
        '借阅失败'
      )
    ).toBe('请先输入座位号。');
  });
});

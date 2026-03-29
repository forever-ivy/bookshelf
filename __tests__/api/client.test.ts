jest.mock('@/stores', () => ({
  readStoredSessionToken: jest.fn(async () => 'stored-token'),
}));

import {
  LibraryApiError,
  getLibraryErrorMessage,
  isLibraryAuthError,
  libraryRequest,
} from '@/lib/api/client';

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
});

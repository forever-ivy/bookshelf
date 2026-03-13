import { createHttpClient, requestJson } from '@/lib/api/core/http';
import { ApiError } from '@/lib/api/core/types';
import { z } from 'zod';

const originalFetch = global.fetch;

describe('requestJson', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('unwraps success envelopes into the business payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: true, data: { id: 3, name: '陈一诺' } }),
      ok: true,
      status: 200,
    }) as typeof fetch;

    const result = await requestJson(
      'https://cabinet.example.com',
      '/api/users/current',
      {},
      z.object({
        id: z.number(),
        name: z.string(),
      })
    );

    expect(result).toEqual({ id: 3, name: '陈一诺' });
  });

  it('reuses the shared ApiError class from core types', () => {
    const error = new ApiError('Cabinet offline', 503, '/api/users', 'CABINET_OFFLINE');

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(503);
    expect(error.code).toBe('CABINET_OFFLINE');
  });

  it('turns failure envelopes into ApiError instances', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({
        ok: false,
        data: null,
        error: {
          code: 'CABINET_OFFLINE',
          details: { retryAfter: 30 },
        },
        message: 'Cabinet offline',
      }),
      ok: false,
      status: 503,
    }) as typeof fetch;

    await expect(requestJson('https://cabinet.example.com', '/api/users')).rejects.toMatchObject({
      code: 'CABINET_OFFLINE',
      details: { retryAfter: 30 },
      message: 'Cabinet offline',
      status: 503,
    } satisfies Partial<ApiError>);
  });

  it('times out requests with a dedicated timeout error', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockImplementation((_url, options) => {
      const signal = options?.signal as AbortSignal | undefined;

      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => {
          const abortError = new Error('The request was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    }) as typeof fetch;

    const requestPromise = requestJson('https://cabinet.example.com', '/api/users', {
      timeoutMs: 5,
    });

    jest.advanceTimersByTime(5);

    await expect(requestPromise).rejects.toMatchObject({
      code: 'TIMEOUT',
      message: 'Request timed out',
      status: 408,
    } satisfies Partial<ApiError>);
  });

  it('uses plain-text error bodies when the server does not return JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'text/plain; charset=utf-8',
      },
      json: async () => {
        throw new Error('Unexpected token <');
      },
      ok: false,
      status: 502,
      text: async () => 'Bad gateway',
    }) as typeof fetch;

    await expect(requestJson('https://cabinet.example.com', '/api/weekly')).rejects.toMatchObject({
      message: 'Bad gateway',
      status: 502,
    } satisfies Partial<ApiError>);
  });

  it('rejects payloads that fail runtime schema validation', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: true, data: [{ id: 1 }] }),
      ok: true,
      status: 200,
    }) as typeof fetch;

    await expect(
      requestJson(
        'https://cabinet.example.com',
        '/api/users',
        {},
        z.array(
          z.object({
            id: z.number(),
            name: z.string(),
          })
        )
      )
    ).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      message: 'Invalid response payload',
      status: 500,
    } satisfies Partial<ApiError>);
  });

  it('builds query strings for get helper methods', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: true, data: [{ id: 1 }] }),
      ok: true,
      status: 200,
    }) as typeof fetch;

    const http = createHttpClient('https://cabinet.example.com/');

    await http.get('/api/books', {
      params: {
        q: '海边',
        limit: 10,
      },
      schema: z.array(
        z.object({
          id: z.number(),
        })
      ),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cabinet.example.com/api/books?q=%E6%B5%B7%E8%BE%B9&limit=10',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('serializes json bodies for post helper methods', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: true, data: { id: 8 } }),
      ok: true,
      status: 200,
    }) as typeof fetch;

    const http = createHttpClient('https://cabinet.example.com');

    await http.post('/api/users/switch', {
      data: { user_id: 8 },
      schema: z.object({
        id: z.number(),
      }),
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const headers = options.headers as Headers;

    expect(options.body).toBe(JSON.stringify({ user_id: 8 }));
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(options.method).toBe('POST');
  });

  it('keeps form-data uploads untouched in post helper methods', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ ok: true, data: { uploaded: true } }),
      ok: true,
      status: 200,
    }) as typeof fetch;

    const http = createHttpClient('https://cabinet.example.com');
    const formData = new FormData();
    formData.append('audio', 'fake-binary');

    await http.post('/api/voice/ingest', {
      data: formData,
      schema: z.object({
        uploaded: z.boolean(),
      }),
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const headers = options.headers as Headers;

    expect(options.body).toBe(formData);
    expect(headers.has('Content-Type')).toBe(false);
  });
});

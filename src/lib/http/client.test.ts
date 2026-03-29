import { describe, expect, it, vi } from 'vitest'

import { ERROR_MESSAGES, STORAGE_KEYS } from '@/constants/constant'
import { HttpClient } from '@/lib/http/client'
import { storageUtils } from '@/utils'

type TransportConfig = {
  url?: string
  method?: string
  headers?: Record<string, string>
  data?: unknown
  params?: Record<string, unknown>
  timeout?: number
  responseType?: string
  onUploadProgress?: (event: { loaded: number; total: number }) => void
}

describe('HttpClient', () => {
  it('injects the bearer token into request headers', async () => {
    storageUtils.set(STORAGE_KEYS.TOKEN, 'abc123')
    const request = vi.fn().mockResolvedValue({
      status: 200,
      data: { hello: 'world' },
    })
    const client = new HttpClient('http://example.com', 1000, {
      request,
    })

    await client.get('/ping')

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/ping',
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
        }),
      }),
    )
  })

  it('normalizes successful responses into ApiResponse objects', async () => {
    const client = new HttpClient('http://example.com', 1000, {
      request: vi.fn().mockResolvedValue({
        status: 200,
        data: { items: [{ id: 1 }] },
      }),
    })

    const response = await client.get<{ items: Array<{ id: number }> }>('/items')

    expect(response).toEqual({
      success: true,
      data: { items: [{ id: 1 }] },
      message: undefined,
      meta: undefined,
    })
  })

  it('clears auth state and redirects on unauthorized errors', async () => {
    storageUtils.set(STORAGE_KEYS.TOKEN, 'stale-token')
    const redirectToLogin = vi.fn()
    const toastError = vi.fn()
    const client = new HttpClient(
      'http://example.com',
      1000,
      {
        request: vi.fn().mockRejectedValue({
          response: {
            status: 401,
            data: {
              detail: 'nope',
            },
          },
        }),
      },
      {
        toastError,
        redirectToLogin,
      },
    )

    await expect(client.get('/secure')).rejects.toMatchObject({
      success: false,
      status: 401,
    })

    expect(storageUtils.get(STORAGE_KEYS.TOKEN)).toBeNull()
    expect(redirectToLogin).toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
  })

  it('refreshes the session once and retries the original request after a 401', async () => {
    storageUtils.set(STORAGE_KEYS.TOKEN, 'stale-token')
    storageUtils.set(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token')
    const request = vi.fn().mockImplementation(async (config: TransportConfig) => {
      if (config.url === '/secure' && config.headers?.Authorization === 'Bearer stale-token') {
        throw {
          response: {
            status: 401,
            data: {
              detail: 'expired',
            },
          },
        }
      }

      if (config.url === '/api/v1/auth/refresh') {
        expect(config.data).toEqual({
          refresh_token: 'refresh-token',
        })
        return {
          status: 200,
          data: {
            access_token: 'fresh-access',
            refresh_token: 'fresh-refresh',
            token_type: 'bearer',
            account: {
              id: 1,
              username: 'admin',
              role: 'admin',
            },
          },
        }
      }

      return {
        status: 200,
        data: {
          ok: true,
        },
      }
    })
    const redirectToLogin = vi.fn()
    const toastError = vi.fn()
    const client = new HttpClient(
      'http://example.com',
      1000,
      {
        request,
      },
      {
        toastError,
        redirectToLogin,
      },
    )

    const response = await client.get<{ ok: boolean }>('/secure')

    expect(response).toEqual({
      success: true,
      data: { ok: true },
      message: undefined,
      meta: undefined,
    })
    expect(storageUtils.get(STORAGE_KEYS.TOKEN)).toBe('fresh-access')
    expect(storageUtils.get(STORAGE_KEYS.REFRESH_TOKEN)).toBe('fresh-refresh')
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        url: '/secure',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-access',
        }),
      }),
    )
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('clears auth state when refresh fails after a 401', async () => {
    storageUtils.set(STORAGE_KEYS.TOKEN, 'stale-token')
    storageUtils.set(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token')
    const redirectToLogin = vi.fn()
    const toastError = vi.fn()
    const request = vi.fn().mockImplementation(async (config: TransportConfig) => {
      if (config.url === '/secure') {
        throw {
          response: {
            status: 401,
            data: {
              detail: 'expired',
            },
          },
        }
      }

      throw {
        response: {
          status: 401,
          data: {
            detail: 'refresh expired',
          },
        },
      }
    })
    const client = new HttpClient(
      'http://example.com',
      1000,
      {
        request,
      },
      {
        toastError,
        redirectToLogin,
      },
    )

    await expect(client.get('/secure')).rejects.toMatchObject({
      success: false,
      status: 401,
    })

    expect(storageUtils.get(STORAGE_KEYS.TOKEN)).toBeNull()
    expect(storageUtils.get(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull()
    expect(redirectToLogin).toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
  })

  it('shows a forbidden toast without redirecting when access is denied', async () => {
    const redirectToLogin = vi.fn()
    const toastError = vi.fn()
    const client = new HttpClient(
      'http://example.com',
      1000,
      {
        request: vi.fn().mockRejectedValue({
          response: {
            status: 403,
            data: {
              detail: 'forbidden',
            },
          },
        }),
      },
      {
        toastError,
        redirectToLogin,
      },
    )

    await expect(client.get('/forbidden')).rejects.toMatchObject({
      success: false,
      status: 403,
    })

    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledTimes(1)
  })

  it('uses normalized fallback messaging for generic server failures', async () => {
    const toastError = vi.fn()
    const client = new HttpClient(
      'http://example.com',
      1000,
      {
        request: vi.fn().mockRejectedValue({
          response: {
            status: 500,
            data: {},
          },
        }),
      },
      {
        toastError,
      },
    )

    await expect(client.get('/boom')).rejects.toMatchObject({
      success: false,
      status: 500,
      message: ERROR_MESSAGES.SERVER_ERROR,
    })

    expect(toastError).toHaveBeenCalledWith(ERROR_MESSAGES.SERVER_ERROR)
  })

  it('shows a helpful message for transport-level network failures', async () => {
    const toastError = vi.fn()
    const client = new HttpClient(
      'http://192.168.31.15:8000',
      1000,
      {
        request: vi.fn().mockRejectedValue({
          message: 'Network Error',
        }),
      },
      {
        toastError,
      },
    )

    await expect(client.get('/boom')).rejects.toMatchObject({
      success: false,
      status: 0,
      message: `${ERROR_MESSAGES.NETWORK_ERROR} 当前接口地址：http://192.168.31.15:8000`,
    })

    expect(toastError).toHaveBeenCalledWith(
      `${ERROR_MESSAGES.NETWORK_ERROR} 当前接口地址：http://192.168.31.15:8000`,
    )
  })

  it('uploads files with a default form field name and reports progress', async () => {
    const progressSpy = vi.fn()
    let captured: TransportConfig | undefined
    const client = new HttpClient('http://example.com', 1000, {
      request: vi.fn().mockImplementation(async (config: TransportConfig) => {
        captured = config
        config.onUploadProgress?.({ loaded: 5, total: 10 })
        return {
          status: 200,
          data: { ok: true },
        }
      }),
    })

    const file = new File(['hello'], 'demo.txt', { type: 'text/plain' })
    const response = await client.upload('/upload', file, progressSpy)

    expect(response.success).toBe(true)
    expect(progressSpy).toHaveBeenCalledWith(50)
    expect(captured?.data).toBeInstanceOf(FormData)
    expect((captured?.data as FormData).get('file')).toBe(file)
  })

  it('downloads blobs and triggers a browser save flow', async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      data: new Blob(['hello'], { type: 'text/plain' }),
    })
    const client = new HttpClient('http://example.com', 1000, { request })
    const createObjectURL = vi.fn().mockReturnValue('blob:download')
    const revokeObjectURL = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild')
    const removeChild = vi.spyOn(document.body, 'removeChild')
    const originalCreateElement = document.createElement.bind(document)
    const click = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', {
          value: click,
        })
      }
      return element
    }) as typeof document.createElement)

    await client.download('/report', 'report.txt')

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/report',
        method: 'GET',
        responseType: 'blob',
      }),
    )
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download')
  })
})

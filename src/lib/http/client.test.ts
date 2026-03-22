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

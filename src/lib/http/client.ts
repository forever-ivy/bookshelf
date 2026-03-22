import axios from 'axios'

import { API_BASE_URL, ERROR_MESSAGES, STORAGE_KEYS } from '@/constants/constant'
import type { ApiError, ApiResponse, RequestConfig, Transport, TransportResponse } from '@/types/api'
import { storageUtils } from '@/utils'

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
type ResponseInterceptor = <T>(
  response: ApiResponse<T>,
  rawResponse: TransportResponse<T>,
) => ApiResponse<T> | Promise<ApiResponse<T>>
type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>

type ClientHooks = {
  toastError?: (message: string) => void
  redirectToLogin?: () => void
}

function normalizeSuccess<T>(payload: T): ApiResponse<T> {
  return {
    success: true,
    data: payload,
    message: undefined,
    meta: undefined,
  }
}

function extractErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  if ('message' in data && typeof data.message === 'string') {
    return data.message
  }

  if ('detail' in data && typeof data.detail === 'string') {
    return data.detail
  }

  if ('code' in data && typeof data.code === 'string') {
    return data.code
  }

  return undefined
}

export class HttpClient {
  private baseURL: string
  private timeout: number
  private transport: Transport
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []
  private toastError: (message: string) => void
  private redirectToLogin: () => void

  constructor(
    baseURL = API_BASE_URL,
    timeout = 10000,
    transport?: Transport,
    hooks?: ClientHooks,
  ) {
    this.baseURL = baseURL
    this.timeout = timeout
    this.transport =
      transport ||
      axios.create({
        baseURL,
        timeout,
      })
    this.toastError = hooks?.toastError ?? (() => undefined)
    this.redirectToLogin =
      hooks?.redirectToLogin ??
      (() => {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      })
    this.setupDefaultInterceptors()
  }

  private setupDefaultInterceptors() {
    this.addRequestInterceptor((config) => {
      const token = storageUtils.get<string>(STORAGE_KEYS.TOKEN)
      if (token) {
        config.headers = {
          ...(config.headers ?? {}),
          Authorization: `Bearer ${token}`,
        }
      }
      return config
    })

    this.addResponseInterceptor((response) => response)

    this.addErrorInterceptor((error) => {
      if (error.status === 401) {
        storageUtils.remove(STORAGE_KEYS.TOKEN)
        storageUtils.remove(STORAGE_KEYS.REFRESH_TOKEN)
        storageUtils.remove(STORAGE_KEYS.ACCOUNT)
        this.toastError(ERROR_MESSAGES.UNAUTHORIZED)
        this.redirectToLogin()
        return error
      }

      if (error.status === 403) {
        this.toastError(ERROR_MESSAGES.FORBIDDEN)
        return error
      }

      this.toastError(error.message || ERROR_MESSAGES.UNKNOWN_ERROR)
      return error
    })
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor)
  }

  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let current = config
    for (const interceptor of this.requestInterceptors) {
      current = await interceptor(current)
    }
    return current
  }

  private async applyResponseInterceptors<T>(response: TransportResponse<T>): Promise<ApiResponse<T>> {
    let current = normalizeSuccess(response.data)
    for (const interceptor of this.responseInterceptors) {
      current = await interceptor(current, response)
    }
    return current
  }

  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let current = error
    for (const interceptor of this.errorInterceptors) {
      current = await interceptor(current)
    }
    return current
  }

  private async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const finalConfig = await this.applyRequestInterceptors({
        ...config,
        baseURL: this.baseURL,
        timeout: config.timeout ?? this.timeout,
      })
      const response = await this.transport.request<T>(finalConfig)
      return this.applyResponseInterceptors(response)
    } catch (error) {
      const normalized = await this.applyErrorInterceptors(this.toApiError(error))
      throw normalized
    }
  }

  private toApiError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const message =
        extractErrorMessage(error.response?.data) ||
        error.message ||
        (status >= 500 ? ERROR_MESSAGES.SERVER_ERROR : ERROR_MESSAGES.UNKNOWN_ERROR)
      return {
        success: false,
        status,
        code: String(status || 'AXIOS_ERROR'),
        message,
        details: error.response?.data ?? error,
      }
    }

    if (error && typeof error === 'object' && 'response' in error) {
      const maybe = error as {
        response?: {
          status?: number
          data?: unknown
        }
        message?: string
      }
      const status = maybe.response?.status ?? 0
      return {
        success: false,
        status,
        code: String(status || 'REQUEST_ERROR'),
        message:
          extractErrorMessage(maybe.response?.data) ||
          maybe.message ||
          (status >= 500 ? ERROR_MESSAGES.SERVER_ERROR : ERROR_MESSAGES.UNKNOWN_ERROR),
        details: maybe.response?.data ?? maybe,
      }
    }

    return {
      success: false,
      status: 0,
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      details: error,
    }
  }

  async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    config?: Partial<RequestConfig>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'GET',
      params,
    })
  }

  async post<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      data,
    })
  }

  async put<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PUT',
      data,
    })
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PATCH',
      data,
    })
  }

  async delete<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'DELETE',
    })
  }

  async upload<T = unknown>(
    url: string,
    fileOrFormData: File | FormData,
    onProgress?: (progress: number) => void,
  ): Promise<ApiResponse<T>> {
    const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData()
    if (fileOrFormData instanceof File) {
      formData.append('file', fileOrFormData)
    }

    return this.request<T>({
      url,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!event.total || !onProgress) {
          return
        }
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
  }

  async download(url: string, filename = 'download'): Promise<void> {
    try {
      const finalConfig = await this.applyRequestInterceptors({
        url,
        method: 'GET',
        responseType: 'blob',
      })
      const response = await this.transport.request<Blob>(finalConfig)
      const blob = response.data
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      const normalized = await this.applyErrorInterceptors(this.toApiError(error))
      throw normalized
    }
  }
}

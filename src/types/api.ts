import type { AxiosRequestConfig, AxiosResponse } from 'axios'

export type ApiResponse<T> = {
  success: true
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export type ApiError = {
  success: false
  status: number
  code: string
  message: string
  details?: unknown
}

export type RequestConfig = AxiosRequestConfig & {
  rawResponse?: boolean
}

export type TransportResponse<T = unknown> = Pick<AxiosResponse<T>, 'data' | 'status'>

export type Transport = {
  request<T = unknown>(config: RequestConfig): Promise<TransportResponse<T>>
}

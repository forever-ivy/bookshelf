type LocationLike = {
  protocol?: string
  hostname?: string
}

function formatHostname(hostname: string) {
  if (!hostname.includes(':') || hostname.startsWith('[')) {
    return hostname
  }
  return `[${hostname}]`
}

export function resolveApiBaseUrl(explicitBaseUrl?: string | null, locationLike?: LocationLike) {
  const configuredBaseUrl = explicitBaseUrl?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  const runtimeLocation =
    locationLike ?? (typeof window !== 'undefined' ? window.location : undefined)
  const protocol = runtimeLocation?.protocol === 'https:' ? 'https:' : 'http:'
  const hostname = runtimeLocation?.hostname?.trim() || '127.0.0.1'

  return `${protocol}//${formatHostname(hostname)}:8000`
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const STORAGE_KEYS = {
  TOKEN: 'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  ACCOUNT: 'admin_account',
  SIDEBAR_COLLAPSED: 'admin_sidebar_collapsed',
} as const

export const ERROR_MESSAGES = {
  UNAUTHORIZED: '会话已过期，需重新验证身份。',
  FORBIDDEN: '权限受限，当前账号未获准访问该模块。',
  SERVER_ERROR: '节点响应异常，请核对服务运行状态。',
  UNKNOWN_ERROR: '请求失败，请稍后再试。',
  NETWORK_ERROR: '节点响应异常，请核对服务运行状态。',
  DOWNLOAD_ERROR: '文件下载失败。',
} as const

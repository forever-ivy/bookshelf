export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'

export const STORAGE_KEYS = {
  TOKEN: 'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  ACCOUNT: 'admin_account',
  SIDEBAR_COLLAPSED: 'admin_sidebar_collapsed',
} as const

export const ERROR_MESSAGES = {
  UNAUTHORIZED: '登录状态已失效，请重新登录。',
  FORBIDDEN: '当前账号没有访问该资源的权限。',
  SERVER_ERROR: '服务暂时不可用，请稍后再试。',
  UNKNOWN_ERROR: '请求失败，请稍后再试。',
  NETWORK_ERROR: '网络连接异常，请检查本地服务是否启动。',
  DOWNLOAD_ERROR: '文件下载失败。',
} as const

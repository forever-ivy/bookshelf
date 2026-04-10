import { readStoredRefreshToken, readStoredSessionToken, replaceStoredSessionTokens } from '@/stores';

export class LibraryApiError extends Error {
  code: string;
  details?: unknown;
  status: number | null;

  constructor(message: string, options: { code: string; details?: unknown; status?: number | null }) {
    super(message);
    this.name = 'LibraryApiError';
    this.code = options.code;
    this.details = options.details;
    this.status = options.status ?? null;
  }
}

export function getLibraryServiceBaseUrl() {
  return process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL?.replace(/\/$/, '') ?? '';
}

export function hasLibraryService() {
  return getLibraryServiceBaseUrl().length > 0;
}

async function readToken(explicitToken?: string | null) {
  if (explicitToken !== undefined) {
    return explicitToken;
  }

  return readStoredSessionToken();
}

export function isLibraryApiError(error: unknown): error is LibraryApiError {
  return error instanceof LibraryApiError;
}

export function isLibraryAuthError(error: unknown) {
  return isLibraryApiError(error) && (error.status === 401 || error.status === 403);
}

export function getLibraryErrorMessage(error: unknown, fallback = '借阅服务暂时不可用，请稍后重试。') {
  if (!isLibraryApiError(error)) {
    return fallback;
  }

  if (error.code === 'book_unavailable') {
    return '这本书当前暂不可借，请换一本或稍后再试。';
  }

  if (error.code === 'delivery_target_required') {
    return '请先输入座位号。';
  }

  if (error.code === 'service_not_configured') {
    return '还没有配置真实后端地址，当前无法进入联调模式。';
  }

  if (error.status === 401 || error.status === 403) {
    return '登录状态已失效，请重新登录。';
  }

  if (error.status === 404) {
    return '请求的资源不存在，可能是前后端接口还没有完全对齐。';
  }

  if (error.code === 'network_error') {
    return '无法连接智慧借阅服务，请确认服务已经启动并且地址可访问。';
  }

  return fallback;
}

export function getAuthActionErrorMessage(
  error: unknown,
  options: {
    action: 'login' | 'register';
    fallback: string;
  }
) {
  if (!isLibraryApiError(error)) {
    return options.fallback;
  }

  if (options.action === 'login') {
    if (error.code === 'user_not_found') {
      return '没账号';
    }

    if (
      error.code === 'invalid_password' ||
      error.code === 'password_incorrect' ||
      error.code === 'wrong_password'
    ) {
      return '密码错误';
    }
  }

  if (error.status === 400) {
    return options.action === 'login'
      ? '请输入完整的账号和密码后再试。'
      : '请把账号、昵称和密码填写完整后再试。';
  }

  if (error.status === 401 || error.status === 403) {
    return options.action === 'login'
      ? '账号或密码不正确，请重新输入后再试。'
      : '注册信息暂时未通过校验，请检查后再试。';
  }

  if (options.action === 'register' && error.status === 409) {
    return '这个账号名已经被使用，请换一个后再试。';
  }

  if (error.code === 'network_error') {
    return '暂时无法连接图书馆服务，请确认网络和后端服务状态后重试。';
  }

  return options.fallback;
}

export function getLoginValidationErrorMessage(input: {
  password: string;
  username: string;
}) {
  if (!input.username.trim()) {
    return '没账号';
  }

  if (!input.password.trim()) {
    return '密码错误';
  }

  return null;
}

async function buildLibraryApiError(response: Response) {
  let details: unknown;

  try {
    const contentType = response.headers.get('Content-Type') ?? '';

    if (contentType.includes('application/json')) {
      details = await response.json();
    } else {
      const text = await response.text();
      details = text ? { message: text } : undefined;
    }
  } catch {
    details = undefined;
  }

  const normalizedDetails =
    details && typeof details === 'object' ? (details as Record<string, unknown>) : null;
  const nestedError =
    normalizedDetails?.error && typeof normalizedDetails.error === 'object'
      ? (normalizedDetails.error as Record<string, unknown>)
      : null;
  const code =
    (typeof normalizedDetails?.code === 'string' ? normalizedDetails.code : null) ??
    (typeof normalizedDetails?.error_code === 'string' ? normalizedDetails.error_code : null) ??
    (typeof nestedError?.code === 'string' ? nestedError.code : null) ??
    `http_${response.status}`;
  const message =
    (typeof normalizedDetails?.message === 'string' ? normalizedDetails.message : null) ??
    (typeof normalizedDetails?.detail === 'string' ? normalizedDetails.detail : null) ??
    (typeof nestedError?.message === 'string' ? nestedError.message : null) ??
    code;

  return new LibraryApiError(message, {
    code,
    details,
    status: response.status,
  });
}

export async function libraryFetchJson<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const baseUrl = getLibraryServiceBaseUrl();
  if (!baseUrl) {
    throw new LibraryApiError('library_service_not_configured', {
      code: 'service_not_configured',
    });
  }

  const token = await readToken(options.token);
  const hasFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body && !hasFormDataBody ? { 'Content-Type': 'application/json' } : null),
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new LibraryApiError('library_network_error', {
      code: 'network_error',
    });
  }

  if (!response.ok) {
    throw await buildLibraryApiError(response);
  }

  return response.json() as Promise<T>;
}

async function refreshAccessToken() {
  const baseUrl = getLibraryServiceBaseUrl();
  const refreshToken = await readStoredRefreshToken();

  if (!baseUrl || !refreshToken) {
    throw new LibraryApiError('refresh_token_missing', {
      code: 'refresh_token_missing',
      status: 401,
    });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    throw new LibraryApiError('library_network_error', {
      code: 'network_error',
    });
  }

  if (!response.ok) {
    throw await buildLibraryApiError(response);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    accessToken?: string;
    refresh_token?: string | null;
    refreshToken?: string | null;
  };
  const nextAccessToken = payload.access_token ?? payload.accessToken;
  const nextRefreshToken = payload.refresh_token ?? payload.refreshToken ?? refreshToken;

  if (!nextAccessToken) {
    throw new LibraryApiError('refresh_token_invalid_payload', {
      code: 'refresh_token_invalid_payload',
      status: 500,
    });
  }

  await replaceStoredSessionTokens({
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  });

  return nextAccessToken;
}

export async function libraryRequest<T>(
  path: string,
  options: RequestInit & {
    token?: string | null;
    fallback: () => T | Promise<T>;
    fallbackOnError?: boolean;
    retryOnAuthError?: boolean;
  }
): Promise<T> {
  if (!hasLibraryService()) {
    return options.fallback();
  }

  try {
    return await libraryFetchJson<T>(path, options);
  } catch (error) {
    if (options.retryOnAuthError !== false && isLibraryAuthError(error)) {
      const refreshedToken = await refreshAccessToken();
      return libraryFetchJson<T>(path, {
        ...options,
        token: refreshedToken,
      });
    }

    if (options.fallbackOnError) {
      return options.fallback();
    }

    throw error;
  }
}

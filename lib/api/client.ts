import { normalizeBaseUrl } from '@/lib/connection';
import type {
  BadgeSummary,
  BooklistItem,
  BorrowLog,
  CabinetCompartment,
  MemberStats,
  MemberSummary,
  MonthlyReport,
  WeeklyReport,
} from '@/lib/api/types';

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  code?: string;
  status: number;
  url: string;

  constructor(message: string, status: number, url: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.code = code;
  }
}

function buildHeaders(options: RequestOptions) {
  const headers = new Headers(options.headers);
  const hasJsonBody = options.body != null && !(options.body instanceof FormData);

  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function parseErrorBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; code?: string }
      | null;

    return {
      code: payload?.code,
      message: payload?.message ?? `Request failed with status ${response.status}`,
    };
  }

  const message = await response.text().catch(() => '');

  return {
    message: message || `Request failed with status ${response.status}`,
  };
}

async function requestJson<T>(baseUrl: string, path: string, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${normalizeBaseUrl(baseUrl)}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: buildHeaders(options),
      method: options.method ?? 'GET',
      signal: options.signal ?? controller.signal,
    });

    if (!response.ok) {
      const { code, message } = await parseErrorBody(response);
      throw new ApiError(message, response.status, url, code);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, url, 'TIMEOUT');
    }

    throw new ApiError('Network error', 0, url, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createBookshelfApiClient(baseUrl: string) {
  return {
    getUsers() {
      return requestJson<MemberSummary[]>(baseUrl, '/api/users');
    },
    getCurrentUser() {
      return requestJson<MemberSummary | null>(baseUrl, '/api/users/current');
    },
    switchUser(userId: number) {
      return requestJson<MemberSummary | null>(baseUrl, '/api/users/switch', {
        body: JSON.stringify({ user_id: userId }),
        method: 'POST',
      });
    },
    getCompartments() {
      return requestJson<CabinetCompartment[]>(baseUrl, '/api/compartments');
    },
    getMemberStats(memberId: number) {
      return requestJson<MemberStats>(baseUrl, `/api/users/${memberId}/stats`);
    },
    getBorrowLogs(memberId: number, days = 30) {
      return requestJson<BorrowLog[]>(
        baseUrl,
        `/api/users/${memberId}/borrow_logs?days=${days}`
      );
    },
    getMemberBooklist(memberId: number) {
      return requestJson<BooklistItem[]>(baseUrl, `/api/users/${memberId}/booklist`);
    },
    getMemberBadges(memberId: number) {
      return requestJson<{ badges: BadgeSummary[] }>(baseUrl, `/api/users/${memberId}/badges`);
    },
    getWeeklyReport(memberId: number) {
      return requestJson<WeeklyReport>(baseUrl, `/api/users/${memberId}/weekly_report`);
    },
    getMonthlyReport() {
      return requestJson<MonthlyReport>(baseUrl, '/api/family/monthly_report');
    },
  };
}

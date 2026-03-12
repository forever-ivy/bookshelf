export type ConnectionProfile = {
  baseUrl: string;
  displayName: string;
  connectedAt: string;
  lastVerifiedAt: string;
};

export function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const url = new URL(trimmed);
  const pathname = url.pathname.replace(/\/+$/, '');

  url.pathname = pathname;
  url.search = '';
  url.hash = '';

  return url.toString().replace(/\/$/, '');
}

export function inferConnectionName(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    return url.hostname === 'localhost' ? '本地书柜' : url.hostname;
  } catch {
    return '我的书柜';
  }
}

export function createConnectionProfile(baseUrl: string, displayName?: string): ConnectionProfile {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const now = new Date().toISOString();

  return {
    baseUrl: normalizedBaseUrl,
    displayName: displayName?.trim() || inferConnectionName(normalizedBaseUrl),
    connectedAt: now,
    lastVerifiedAt: now,
  };
}

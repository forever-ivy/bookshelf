const BOOK_LOCATION_PLACEHOLDERS = ['位置待确认', '馆藏位置待确认', '默认书柜'] as const;

export function isUnresolvedBookLocation(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return true;
  }

  return BOOK_LOCATION_PLACEHOLDERS.some((placeholder) => normalized.includes(placeholder));
}

export function resolveBookLocationDisplay(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized || isUnresolvedBookLocation(normalized)) {
    return '书库';
  }

  return normalized;
}

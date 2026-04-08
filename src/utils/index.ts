export { storageUtils } from '@/utils/storage'

const SHANGHAI_OFFSET_HOURS = 8
const NAIVE_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/

function parseDateTime(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    const parsed = new Date(normalized)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const matched = normalized.match(NAIVE_TIMESTAMP_PATTERN)
  if (!matched) {
    const parsed = new Date(normalized)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const [, year, month, day, hour, minute, second = '00'] = matched
  const utcMillis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - SHANGHAI_OFFSET_HOURS,
    Number(minute),
    Number(second),
  )

  return new Date(utcMillis)
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '—'
  }

  const parsed = parseDateTime(value)
  if (!parsed) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(parsed)
}

export function formatRelativeCount(value: number, unit: string) {
  return `${value}${unit}`
}

import { describe, expect, it } from 'vitest'

import { resolveApiBaseUrl } from '@/constants/constant'

describe('resolveApiBaseUrl', () => {
  it('prefers the explicit environment value when provided', () => {
    expect(resolveApiBaseUrl('https://api.example.com')).toBe('https://api.example.com')
  })

  it('derives the default API host from the current page hostname', () => {
    expect(resolveApiBaseUrl('', { protocol: 'http:', hostname: '192.168.31.15' })).toBe(
      'http://192.168.31.15:8000',
    )
  })

  it('falls back to loopback when no runtime location is available', () => {
    expect(resolveApiBaseUrl(undefined, {})).toBe('http://127.0.0.1:8000')
  })
})

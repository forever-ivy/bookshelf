import { describe, expect, it } from 'vitest'

import { formatDateTime } from '@/utils'

describe('formatDateTime', () => {
  it('formats timestamps in Asia/Shanghai with a full local date and time', () => {
    expect(formatDateTime('2026-04-07T22:39:00Z')).toBe('2026/04/08 06:39')
  })

  it('treats timezone-less timestamps as Shanghai local time instead of re-shifting them', () => {
    expect(formatDateTime('2026-04-08T08:31:00')).toBe('2026/04/08 08:31')
    expect(formatDateTime('2026-04-08 08:30:00')).toBe('2026/04/08 08:30')
  })
})

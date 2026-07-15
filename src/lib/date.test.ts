import { describe, expect, it } from 'vitest'
import { addRecurringDate, localDateKey, localMonthKey } from './date'

describe('local calendar dates', () => {
  it('uses local date parts without UTC shifting', () => {
    const date = new Date(2026, 6, 14, 0, 5)
    expect(localDateKey(date)).toBe('2026-07-14')
    expect(localMonthKey(date)).toBe('2026-07')
  })

  it('clamps monthly recurrence at the end of a month', () => {
    expect(addRecurringDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(addRecurringDate('2024-01-31', 'monthly')).toBe('2024-02-29')
  })

  it('advances weekly and yearly recurrences', () => {
    expect(addRecurringDate('2026-07-14', 'weekly')).toBe('2026-07-21')
    expect(addRecurringDate('2024-02-29', 'yearly')).toBe('2025-02-28')
  })
})

import { describe, expect, it } from 'vitest'
import { weeklyRecap } from './weeklyRecap'
import type { Transaction } from '../types/finance'
const entry = (date: string, amount: number, type: Transaction['type'] = 'expense'): Transaction => ({ id: `${date}-${type}`, title: 'Test', account: 'Cash', date, amount, type })
describe('Sunday recap', () => {
  it('releases only the completed Sunday through Saturday week', () => {
    const result = weeklyRecap([entry('2026-09-05', 99), entry('2026-09-06', 100), entry('2026-09-12', 200), entry('2026-09-13', 999)], new Date(2026, 8, 13, 9))
    expect(result).toMatchObject({ start: '2026-09-06', end: '2026-09-12', total: 300, count: 2, days: 2 })
  })
  it('keeps the same recap available throughout the following week', () => {
    expect(weeklyRecap([], new Date(2026, 8, 19)).id).toBe('2026-09-13')
  })
  it('does not count transfers or repayments as spending', () => {
    const result = weeklyRecap([entry('2026-09-08', 100, 'receivable_payment'), entry('2026-09-08', 100, 'transfer')], new Date(2026, 8, 13))
    expect(result).toMatchObject({ total: 0, count: 0, days: 1, hasEntries: true })
  })
  it('handles the year boundary', () => {
    expect(weeklyRecap([], new Date(2027, 0, 3))).toMatchObject({ start: '2026-12-27', end: '2027-01-02' })
  })
})

import { describe, expect, it } from 'vitest'
import { monthlySpending } from './monthlyWidget'
import type { Transaction } from '../types/finance'

const expense = (category: string, amount: number, date = '2026-09-10'): Transaction => ({ id: category, type: 'expense', title: category, category, amount, date, account: 'Cash' })
describe('monthly spending widget', () => {
  it('totals month-to-date expenses only and ranks categories', () => {
    const summary = monthlySpending([
      expense('Food', 300), expense('Food', 200), expense('Transport', 100),
      expense('Future', 1000, '2026-09-11'), expense('August', 1000, '2026-08-31'),
      { ...expense('Salary', 1000), type: 'income' }, { ...expense('Move', 1000), type: 'transfer' },
    ], new Date(2026, 8, 10))
    expect(summary).toEqual({ month: '2026-09', total: 600, rows: [{ name: 'Food', amount: 500 }, { name: 'Transport', amount: 100 }] })
  })
  it('groups overflow so displayed categories add up to the total', () => {
    const summary = monthlySpending(['A', 'B', 'C', 'D', 'E'].map((name, i) => expense(name, (i + 1) * 100)), new Date(2026, 8, 10))
    expect(summary.rows).toHaveLength(4)
    expect(summary.rows[3]).toEqual({ name: 'Other categories', amount: 300 })
    expect(summary.rows.reduce((sum, row) => sum + row.amount, 0)).toBe(summary.total)
  })
  it('resets on month rollover and labels uncategorized expenses', () => {
    expect(monthlySpending([expense('Food', 200)], new Date(2026, 9, 1)).total).toBe(0)
    expect(monthlySpending([expense('', 200)], new Date(2026, 8, 10)).rows[0].name).toBe('Uncategorized')
  })
})

import { describe, expect, it } from 'vitest'
import { buildAttentionItems } from './attention'
import type { Account, Budget, Goal, Transaction, UpcomingExpense } from '../types/finance'

const today = new Date(2026, 7, 6, 12)

const bill = (overrides: Partial<UpcomingExpense>): UpcomingExpense => ({
  id: 'bill-1',
  title: 'Electricity',
  amount: 4_000,
  category: 'Bills',
  dueDate: '2026-08-07',
  status: 'upcoming',
  isRecurring: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

const empty = { accounts: [] as Account[], budgets: [] as Budget[], goals: [] as Goal[], transactions: [] as Transaction[], upcomingExpenses: [] as UpcomingExpense[], today }

describe('attention inbox — bills', () => {
  it('surfaces a bill that is due soon', () => {
    const items = buildAttentionItems({ ...empty, upcomingExpenses: [bill({})] })
    expect(items.map((item) => item.id)).toContain('bill-bill-1')
  })

  it('drops a bill once it is paid', () => {
    const items = buildAttentionItems({ ...empty, upcomingExpenses: [bill({ status: 'paid' })] })
    expect(items).toHaveLength(0)
  })

  it('drops a bill the user sent to history', () => {
    // regression: cancelled bills used to keep nagging from this list forever
    const items = buildAttentionItems({ ...empty, upcomingExpenses: [bill({ status: 'cancelled' })] })
    expect(items).toHaveLength(0)
  })

  it('ranks an overdue bill above a low balance', () => {
    const items = buildAttentionItems({
      ...empty,
      accounts: [{ id: 'a1', name: 'Cash', type: 'cash', balance: 400, color: '#000', activity: '', cardLabel: 'CASH', includeInSafeSpend: true }],
      upcomingExpenses: [bill({ dueDate: '2026-08-01' })],
    })
    expect(items[0].priority).toBe('urgent')
    expect(items[0].id).toBe('bill-bill-1')
  })
})

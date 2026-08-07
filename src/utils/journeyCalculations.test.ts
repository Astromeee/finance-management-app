import { describe, expect, it } from 'vitest'
import type { Account, Budget, Category, JourneySettings, Transaction, UpcomingExpense } from '../types/finance'
import { buildPreviousCycleStory, buildWeeklyReveal, calculateAffordability, calculateIncomeCycle, calculateSafeSpend, detectMoneyLeak, rollIncomeDateForward } from './journeyCalculations'

const settings: JourneySettings = {
  incomeSourceType: 'salary', incomeCadence: 'monthly', typicalIncome: 60_000,
  nextIncomeDate: '2026-08-01', primaryPriority: 'stretch', safetyReserve: 5_000,
  onboardingVersion: 2, onboardingStep: 6, tourCompleted: false, analyticsConsent: false,
}
const accounts: Account[] = [{ id: 'cash', name: 'Cash', type: 'cash', balance: 30_000, color: '#fff', activity: '', cardLabel: 'CASH', includeInSafeSpend: true }]
const categories: Category[] = [
  { id: 'food', name: 'Food', kind: 'expense', color: '#fff', spendingNature: 'essential' },
  { id: 'fun', name: 'Fun', kind: 'expense', color: '#fff', spendingNature: 'flexible' },
]
const budgets: Budget[] = [{ id: 'food-budget', category: 'Food', categoryId: 'food', amount: 8_000, used: 2_000 }]
const upcoming: UpcomingExpense[] = [{ id: 'bill', title: 'Groceries', amount: 4_000, category: 'Food', dueDate: '2026-07-24', status: 'upcoming', isRecurring: true, createdAt: '2026-07-01' }]

describe('Payday Journey calculations', () => {
  it('derives a monthly cycle from the next income date', () => {
    expect(calculateIncomeCycle(settings, '2026-07-15')).toEqual({
      startDate: '2026-07-01', endDate: '2026-08-01', totalDays: 31, daysRemaining: 17, daysElapsed: 14,
    })
  })

  it('protects essential money before calculating a daily allowance', () => {
    const result = calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses: upcoming, settings, today: '2026-07-15' })
    expect(result.reservedForBills).toBe(6_000)
    expect(result.flexibleMoneyRemaining).toBe(19_000)
    expect(result.safeToSpendToday).toBe(1_117)
    expect(result.state).toBe('watchful')
  })

  it('does not double count an upcoming bill already covered by an essential budget', () => {
    const result = calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses: upcoming, settings, today: '2026-07-15' })
    expect(result.reservedForBills).not.toBe(10_000)
  })

  it('explains safe, caution, and risky purchases without persisting anything', () => {
    const safeSpend = calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses: upcoming, settings, today: '2026-07-15' })
    expect(calculateAffordability(900, safeSpend).state).toBe('safe')
    expect(calculateAffordability(2_000, safeSpend).state).toBe('caution')
    expect(calculateAffordability(22_000, safeSpend).state).toBe('risky')
  })

  it('asks for setup details instead of inventing a number', () => {
    const result = calculateSafeSpend({ accounts, budgets: [], categories, upcomingExpenses: [], settings: { ...settings, nextIncomeDate: undefined }, today: '2026-07-15' })
    expect(result.state).toBe('needs_setup')
    expect(result.missing).toContain('next income date')
  })
})

describe('rolling a stale payday forward', () => {
  it('leaves a future date untouched', () => {
    expect(rollIncomeDateForward('2026-08-01', 'monthly', '2026-07-15')).toBe('2026-08-01')
  })

  it('advances one cycle on payday itself', () => {
    expect(rollIncomeDateForward('2026-08-01', 'monthly', '2026-08-01')).toBe('2026-09-01')
    expect(rollIncomeDateForward('2026-08-06', 'weekly', '2026-08-06')).toBe('2026-08-13')
  })

  it('catches up across a long absence, landing on the very next payday', () => {
    // six months away: the answer is the next 10th ahead of today, not six hops of drift
    expect(rollIncomeDateForward('2026-02-10', 'monthly', '2026-08-06')).toBe('2026-08-10')
    expect(rollIncomeDateForward('2026-06-01', 'weekly', '2026-08-06')).toBe('2026-08-10')
  })

  it('keeps a month-end payday anchored instead of eroding it', () => {
    // Someone paid on the 31st is clamped to the 28th only *within* February.
    // The anchor must survive, so March pays on the 31st again — not the 28th.
    expect(rollIncomeDateForward('2026-01-31', 'monthly', '2026-02-28')).toBe('2026-03-31')
    expect(rollIncomeDateForward('2026-01-31', 'monthly', '2026-02-10')).toBe('2026-02-28')
    expect(rollIncomeDateForward('2026-01-31', 'monthly', '2026-04-02')).toBe('2026-04-30')
    expect(rollIncomeDateForward('2026-01-31', 'monthly', '2026-05-02')).toBe('2026-05-31')
  })

  it('ignores a malformed stored date', () => {
    expect(rollIncomeDateForward('not-a-date', 'monthly', '2026-08-06')).toBe('not-a-date')
  })
})

describe('payday no longer blanks the home screen', () => {
  it('starts the next cycle on payday instead of returning null', () => {
    const cycle = calculateIncomeCycle(settings, '2026-08-01')
    expect(cycle).toMatchObject({ startDate: '2026-08-01', endDate: '2026-09-01', totalDays: 31, daysElapsed: 0 })
  })

  it('still produces a spendable daily number on payday', () => {
    const result = calculateSafeSpend({ accounts, budgets: [], categories, upcomingExpenses: [], settings, today: '2026-08-01' })
    expect(result.state).not.toBe('needs_setup')
    expect(result.missing).toHaveLength(0)
    expect(result.safeToSpendToday).toBeGreaterThan(0)
  })

  it('recovers even after several missed cycles', () => {
    const result = calculateSafeSpend({ accounts, budgets: [], categories, upcomingExpenses: [], settings, today: '2026-11-20' })
    expect(result.state).not.toBe('needs_setup')
    expect(result.cycle?.endDate).toBe('2026-12-01')
  })
})

describe('money leak detector', () => {
  it('surfaces one repeated category from the last 30 days', () => {
    const transactions: Transaction[] = [1, 2, 3, 4].map((day) => ({
      id: String(day), title: 'Coffee', amount: 400, type: 'expense', category: 'Eating Out',
      categoryId: 'eating-out', account: 'Cash', date: `2026-07-${String(day + 9).padStart(2, '0')}`,
    }))
    const insight = detectMoneyLeak(transactions, '2026-07-15')
    expect(insight?.amount).toBe(1_600)
    expect(insight?.transactionCount).toBe(4)
    expect(insight?.confidence).toBe('medium')
  })
})

describe('retention stories', () => {
  const history: Transaction[] = [
    { id: 'income', title: 'Salary', amount: 50_000, type: 'income', account: 'Cash', date: '2026-06-02' },
    { id: 'food', title: 'Groceries', amount: 8_000, type: 'expense', category: 'Food', account: 'Cash', date: '2026-06-05' },
    { id: 'save', title: 'Goal Saving', amount: 5_000, type: 'goal_saving', account: 'Cash', date: '2026-06-08' },
  ]

  it('builds a four-part story for the previous completed income cycle', () => {
    const story = buildPreviousCycleStory(settings, history, '2026-07-15')
    expect(story).toMatchObject({ openingMoney: 50_000, spent: 8_000, protected: 5_000, closingMoney: 37_000, strongestCategory: 'Food' })
  })

  it('reveals one useful pattern for the last seven days', () => {
    const reveal = buildWeeklyReveal([{ id: '1', title: 'Bus', amount: 500, type: 'expense', category: 'Transport', account: 'Cash', date: '2026-07-14' }], '2026-07-15')
    expect(reveal?.title).toContain('no-spend days')
  })
})

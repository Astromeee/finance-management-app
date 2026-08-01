import { describe, expect, it } from 'vitest'
import { billsToUpcomingExpenses, billToUpcomingExpense, billsTotal, nextDueDate, type OnboardingBill } from './onboardingBills'

const bill: OnboardingBill = { id: 'bill-1', name: 'Rent', amount: 18_000, category: 'Housing/Rent', dueDay: 1, frequency: 'monthly' }

describe('onboarding bills', () => {
  it('totals every bill amount', () => {
    expect(billsTotal([
      bill,
      { id: 'b2', name: 'Electricity & gas', amount: 4_500, category: 'Utilities', dueDay: 10, frequency: 'monthly' },
      { id: 'b3', name: 'Subscriptions', amount: 1_100, category: 'Subscriptions', dueDay: 20, frequency: 'monthly' },
    ])).toBe(23_600)
  })

  it('returns zero for an empty list', () => {
    expect(billsTotal([])).toBe(0)
  })

  it('picks the next occurrence later in the same month', () => {
    expect(nextDueDate(20, '2026-08-05')).toBe('2026-08-20')
  })

  it('rolls to next month when the day has already passed', () => {
    expect(nextDueDate(1, '2026-08-05')).toBe('2026-09-01')
  })

  it('clamps a day that does not exist in the target month', () => {
    expect(nextDueDate(31, '2026-01-31')).toBe('2026-01-31')
    expect(nextDueDate(31, '2026-02-01')).toBe('2026-02-28')
  })

  it('maps a bill to a recurring upcoming expense', () => {
    const expense = billToUpcomingExpense(bill, '2026-08-05')
    expect(expense).toMatchObject({
      title: 'Rent',
      amount: 18_000,
      category: 'Housing/Rent',
      dueDate: '2026-09-01',
      status: 'upcoming',
      isRecurring: true,
      recurringFrequency: 'monthly',
    })
    expect(expense.id).toBeTruthy()
    expect(expense.createdAt).toBeTruthy()
  })

  it('maps a whole list', () => {
    const expenses = billsToUpcomingExpenses([bill], '2026-08-05')
    expect(expenses).toHaveLength(1)
    expect(expenses[0].title).toBe('Rent')
  })
})

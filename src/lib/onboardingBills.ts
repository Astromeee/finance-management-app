import type { RecurringFrequency, UpcomingExpense } from '../types/finance'
import { localDateKey } from './date'

export type OnboardingBill = {
  id: string
  name: string
  amount: number
  category: string
  dueDay: number
  frequency: RecurringFrequency
}

/** Default categories a fixed bill can land in, drawn from DEFAULT_EXPENSE_CATEGORIES. */
export const BILL_CATEGORY_OPTIONS = [
  'Housing/Rent',
  'Utilities',
  'Mobile & Internet',
  'Subscriptions',
  'Transport/Fuel',
  'Education',
  'Healthcare',
  'Miscellaneous',
] as const

export function billsTotal(bills: OnboardingBill[]) {
  return bills.reduce((sum, bill) => sum + Math.max(0, bill.amount), 0)
}

/** The next calendar date on or after `today` that falls on `dueDay`, clamped to the month's length. */
export function nextDueDate(dueDay: number, today = localDateKey()) {
  const base = new Date(`${today}T12:00:00`)
  const day = Math.min(31, Math.max(1, Math.floor(dueDay)))
  const clampedFor = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0, 12).getDate()
    return new Date(year, month, Math.min(day, lastDay), 12)
  }
  const thisMonth = clampedFor(base.getFullYear(), base.getMonth())
  if (thisMonth.getTime() >= base.getTime()) return localDateKey(thisMonth)
  return localDateKey(clampedFor(base.getFullYear(), base.getMonth() + 1))
}

export function billToUpcomingExpense(bill: OnboardingBill, today = localDateKey()): UpcomingExpense {
  return {
    id: crypto.randomUUID(),
    title: bill.name.trim() || 'Fixed bill',
    amount: Math.max(0, Math.floor(bill.amount)),
    category: bill.category,
    dueDate: nextDueDate(bill.dueDay, today),
    status: 'upcoming',
    isRecurring: true,
    recurringFrequency: bill.frequency,
    reminderDaysBefore: 2,
    createdAt: new Date().toISOString(),
  }
}

export function billsToUpcomingExpenses(bills: OnboardingBill[], today = localDateKey()) {
  return bills.map((bill) => billToUpcomingExpense(bill, today))
}

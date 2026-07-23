import type { Account, Budget, Category, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaultCategories'

export const accounts: Account[] = [
]

export const incomeSources: Category[] = [
  ...DEFAULT_INCOME_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'income', color: ['#E2703A', '#CE6231', '#9A8F7D', '#2B241D'][index % 4], spendingNature: 'flexible' as const }))

export const expenseCategories: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'expense', color: ['#2B241D', '#E2703A', '#9A8F7D', '#5C544A', '#CE6231', '#B9AE97'][index % 6], spendingNature: ['Food & Essentials', 'Transport', 'Education'].includes(name) ? 'essential' as const : 'flexible' as const }))

export const transactions: Transaction[] = [
]

export const goals: Goal[] = [
]

export const debts: Debt[] = [
]

export const upcomingExpenses: UpcomingExpense[] = [
]

export const budgets: Budget[] = [
]

export const categorySpend: { name: string; value: number; color: string }[] = [
]

export const weeklyTrend: { day: string; spending: number; income: number }[] = [
]

export const incomeBreakdown: { source: string; amount: number }[] = [
]

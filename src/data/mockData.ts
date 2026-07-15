import type { Account, Budget, Category, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaultCategories'

export const accounts: Account[] = [
]

export const incomeSources: Category[] = [
  ...DEFAULT_INCOME_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'income', color: ['#77D6A3', '#FF6B3D', '#C6BED4', '#F1B75A'][index % 4], spendingNature: 'flexible' as const }))

export const expenseCategories: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'expense', color: ['#FF6B3D', '#77D6A3', '#C6BED4', '#F1B75A', '#8E7FA6', '#FF806B'][index % 6], spendingNature: ['Food & Essentials', 'Transport', 'Education'].includes(name) ? 'essential' as const : 'flexible' as const }))

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

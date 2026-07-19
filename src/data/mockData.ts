import type { Account, Budget, Category, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaultCategories'

export const accounts: Account[] = [
]

export const incomeSources: Category[] = [
  ...DEFAULT_INCOME_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'income', color: ['#FF9A5C', '#FF6B3D', '#C9743F', '#E8A05C'][index % 4], spendingNature: 'flexible' as const }))

export const expenseCategories: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'expense', color: ['#FF6B3D', '#FF9A5C', '#C9743F', '#E8A05C', '#A8642F', '#E8481C'][index % 6], spendingNature: ['Food & Essentials', 'Transport', 'Education'].includes(name) ? 'essential' as const : 'flexible' as const }))

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

import type { Account, Budget, Category, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaultCategories'

export const accounts: Account[] = [
]

export const incomeSources: Category[] = [
  ...DEFAULT_INCOME_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'income', color: ['#ddff45', '#8be28f', '#d4d4d0', '#aeb7c5'][index % 4] }))

export const expenseCategories: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
].map((name, index) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, kind: 'expense', color: ['#ddff45', '#d4d4d0', '#8f949c', '#e98d67', '#aeb7c5', '#c9a46a'][index % 6] }))

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

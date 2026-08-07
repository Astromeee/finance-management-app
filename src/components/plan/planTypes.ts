import { formatAmount } from '../../lib/currency'
import type { Account, Budget, Category, Goal, MoneyQuest, Transaction, UpcomingExpense, WishlistItem } from '../../types/finance'

export type UpcomingPayload = Omit<UpcomingExpense, 'id' | 'status' | 'createdAt' | 'paidTransactionId'>

export interface PlanData {
  accounts: Account[]
  budgets: Budget[]
  budgetHistory: Budget[]
  categories: Category[]
  goals: Goal[]
  moneyQuests: MoneyQuest[]
  transactions: Transaction[]
  upcomingExpenses: UpcomingExpense[]
  wishlistItems: WishlistItem[]
}

export interface PlanActions {
  onSaveBudget: (budget: Budget) => void
  onArchiveBudget: (budget: Budget) => void
  onRestoreBudget: (budget: Budget) => void
  onCopyLastMonthBudgets: () => void
  onAddUpcoming: (payload: UpcomingPayload) => void
  onUpdateUpcoming: (id: string, payload: UpcomingPayload) => void
  onCancelUpcoming: (expense: UpcomingExpense) => void
  onMarkUpcomingPaid: (expense: UpcomingExpense, payload: { accountId: string; paymentDate: string; notes?: string }) => void
  onSaveWishlist: (item: WishlistItem) => void
  onRemoveWishlist: (item: WishlistItem) => void
  onBuyWishlist: (item: WishlistItem) => void
  onSaveQuest: (quest: MoneyQuest) => void
  onEndQuest: (quest: MoneyQuest) => void
}

export type PlanSection = 'limits' | 'bills' | 'cooling' | 'quests'
export type PlanHistoryFilter = 'all' | PlanSection

export const sectionDescriptions: Record<PlanSection, string> = {
  limits: 'Set a monthly ceiling for categories where you want more control.',
  bills: 'Keep known payments visible before spending the money elsewhere.',
  cooling: 'Pause a non-essential purchase, then decide again with a clearer head.',
  quests: 'Short challenges that Pocket Ledger tracks automatically from your activity.',
}

export const nf = (value: number) => formatAmount(value)

export function formatPlanDate(value?: string, withYear = false) {
  if (!value) return 'Not set'
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
}

export function daysUntil(value: string, now = new Date()) {
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return Infinity
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.ceil((date.getTime() - start) / 86_400_000)
}

export function isWishlistActive(item: WishlistItem) {
  return item.status === 'waiting' || item.status === 'ready'
}

export function isBillActive(item: UpcomingExpense) {
  return item.status !== 'paid' && item.status !== 'cancelled'
}

export function previousMonthKey(date = new Date()) {
  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`
}

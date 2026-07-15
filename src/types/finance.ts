import type { LucideIcon } from 'lucide-react'

export type AccountType = 'cash' | 'bank' | 'wallet'
export type TransactionType = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | 'goal_saving' | 'debt_payment'
export type Status = 'Active' | 'Completed' | 'Overdue'
export type DebtCategory = 'Debt' | 'Overdue Payment' | 'Money I Owe' | 'Installment' | 'Other'
export type DebtStatus = 'Active' | 'Due Soon' | 'Overdue' | 'Paid'
export type UpcomingExpenseStatus = 'upcoming' | 'due_soon' | 'overdue' | 'paid'
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  color: string
  activity: string
  cardLabel: string
}

export interface Category {
  id: string
  name: string
  kind: 'income' | 'expense'
  color: string
}

export interface Transaction {
  id: string
  title: string
  amount: number
  type: TransactionType
  category?: string
  categoryId?: string
  source?: string
  account: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  goalId?: string
  debtId?: string
  paymentMethod?: string
  date: string
  notes?: string
  createdAt?: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  dueDate?: string
  linkedAccountId?: string
  notes?: string
  status: Status
}

export interface Debt {
  id: string
  title: string
  name?: string
  personOrCompany?: string
  totalAmount: number
  total?: number
  paidAmount: number
  paid?: number
  dueDate?: string
  category: DebtCategory
  status: DebtStatus
  notes?: string
  createdAt: string
}

export interface Budget {
  id: string
  category: string
  amount: number
  used: number
  categoryId?: string
  periodMonth?: string
}

export interface UpcomingExpense {
  id: string
  title: string
  amount: number
  category: string
  dueDate: string
  linkedAccountId?: string
  notes?: string
  status: UpcomingExpenseStatus
  isRecurring: boolean
  recurringFrequency?: RecurringFrequency
  repeatStartDate?: string
  repeatEndDate?: string
  reminderDaysBefore?: number
  createdAt: string
  paidTransactionId?: string
}

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

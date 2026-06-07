import type { LucideIcon } from 'lucide-react'

export type AccountType = 'cash' | 'bank' | 'wallet'
export type TransactionType = 'income' | 'expense' | 'transfer' | 'goal' | 'debt'
export type Status = 'Active' | 'Completed' | 'Overdue'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  color: string
  activity: string
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
  category: string
  account: string
  date: string
  notes?: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  dueDate?: string
  status: Status
}

export interface Debt {
  id: string
  name: string
  total: number
  paid: number
  dueDate?: string
  status: Status
}

export interface Budget {
  id: string
  category: string
  amount: number
  used: number
}

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

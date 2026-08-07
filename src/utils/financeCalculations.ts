import type { Account } from '../types/finance'

export const formatPKR = (value: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace('PKR', 'Rs.')

export const percent = (value: number, total: number) =>
  total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / total) * 100)))

export const totalBalance = (accounts: Account[]) =>
  accounts.reduce((sum, account) => sum + account.balance, 0)

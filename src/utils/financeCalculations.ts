import type { Account } from '../types/finance'

/* Money *formatting* now lives in lib/currency, which follows whichever
   currency the user picked. This module keeps only the arithmetic. */

export const percent = (value: number, total: number) =>
  total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / total) * 100)))

export const totalBalance = (accounts: Account[]) =>
  accounts.reduce((sum, account) => sum + account.balance, 0)

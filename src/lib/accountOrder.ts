import type { Account } from '../types/finance'

/**
 * The wallet's card order is a local presentation preference: dragging cards
 * on the Wallet page persists an id sequence here, and the Home balance
 * carousel follows because both read the same ordered accounts state.
 */
const STORAGE_KEY = 'pl-account-order'

export function applyAccountOrder(accounts: Account[]): Account[] {
  try {
    const saved: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(saved) || !saved.length) return accounts
    const position = new Map(saved.map((id, index) => [id, index]))
    return [...accounts].sort((a, b) => (position.get(a.id) ?? saved.length) - (position.get(b.id) ?? saved.length))
  } catch {
    return accounts
  }
}

export function saveAccountOrder(accounts: Account[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.map((account) => account.id)))
}

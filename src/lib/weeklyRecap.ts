import type { Transaction } from '../types/finance'
import { localDateKey } from './date'

/** Sunday releases the last fully completed Sunday–Saturday week. */
export function weeklyRecap(transactions: Transaction[], now = new Date()) {
  const release = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const start = new Date(release.getFullYear(), release.getMonth(), release.getDate() - 7)
  const end = new Date(release.getFullYear(), release.getMonth(), release.getDate() - 1)
  const startKey = localDateKey(start), endKey = localDateKey(end)
  const entries = transactions.filter((item) => item.date >= startKey && item.date <= endKey)
  const expenses = entries.filter((item) => item.type === 'expense')
  return {
    id: localDateKey(release), start: startKey, end: endKey,
    total: expenses.reduce((sum, item) => sum + item.amount, 0),
    count: expenses.length,
    days: new Set(entries.map((item) => item.date)).size,
    hasEntries: entries.length > 0,
    label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  }
}

export function openWeeklyRecap() { window.dispatchEvent(new Event('pocket-weekly-recap')) }

import { Capacitor, registerPlugin } from '@capacitor/core'
import type { Transaction } from '../types/finance'
import { currencySymbol, getCurrency } from './currency'
import { localMonthKey, localDateKey } from './date'

export function monthlySpending(transactions: Transaction[], now = new Date()) {
  const month = localMonthKey(now)
  const today = localDateKey(now)
  const groups = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !transaction.date.startsWith(month) || transaction.date > today) continue
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) continue
    const category = transaction.category?.trim() || 'Uncategorized'
    groups.set(category, (groups.get(category) ?? 0) + transaction.amount)
  }
  const categories = [...groups].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
  const rows = categories.length > 4 ? [...categories.slice(0, 3), { name: 'Other categories', amount: categories.slice(3).reduce((sum, row) => sum + row.amount, 0) }] : categories
  return { month, total: categories.reduce((sum, row) => sum + row.amount, 0), rows }
}

const WidgetData = registerPlugin<{ update(options: { snapshot: string }): Promise<void> }>('WidgetData')
export async function syncMonthlyWidget(transactions: Transaction[] | null) {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('WidgetData')) return
  await WidgetData.update({ snapshot: transactions === null ? '' : JSON.stringify({ ...monthlySpending(transactions), symbol: currencySymbol(), currency: getCurrency(), updatedAt: Date.now() }) })
}

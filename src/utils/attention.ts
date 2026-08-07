import type { Account, Budget, Goal, Transaction, UpcomingExpense, WishlistItem } from '../types/finance'

export type AttentionPriority = 'urgent' | 'important' | 'review'

export type AttentionItem = {
  id: string
  priority: AttentionPriority
  title: string
  detail: string
  page: 'transactions' | 'accounts' | 'reports' | 'goals' | 'budgets'
  action: string
}

type AttentionInput = {
  accounts: Account[]
  budgets: Budget[]
  goals: Goal[]
  transactions: Transaction[]
  upcomingExpenses: UpcomingExpense[]
  wishlistItems?: WishlistItem[]
  today?: Date
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000)
}

function money(value: number) {
  return Math.round(value).toLocaleString('en-PK')
}

export function buildAttentionItems({ accounts, budgets, goals, transactions, upcomingExpenses, wishlistItems = [], today = new Date() }: AttentionInput) {
  const items: AttentionItem[] = []
  const todayKey = dateKey(today)

  for (const bill of upcomingExpenses) {
    // a cancelled bill is not waiting on the user — only paid was skipped
    // before, so bills sent to history kept nagging from this list forever
    if (bill.status === 'paid' || bill.status === 'cancelled') continue
    const days = daysBetween(todayKey, bill.dueDate)
    if (days > 7) continue
    const timing = days < 0
      ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
      : days === 0
        ? 'due today'
        : days === 1
          ? 'due tomorrow'
          : `due in ${days} days`
    items.push({
      id: `bill-${bill.id}`,
      priority: days <= 0 ? 'urgent' : 'important',
      title: `${bill.title} is ${timing}`,
      detail: `Rs ${money(bill.amount)} is reserved in your plan.`,
      page: 'budgets',
      action: days <= 7 ? 'Review bill' : 'Open plan',
    })
  }

  for (const budget of budgets) {
    if (budget.amount <= 0 || budget.used < budget.amount * 0.85) continue
    const over = Math.max(0, budget.used - budget.amount)
    items.push({
      id: `budget-${budget.id}`,
      priority: over > 0 ? 'urgent' : 'important',
      title: over > 0 ? `${budget.category} is over its limit` : `${budget.category} is close to its limit`,
      detail: over > 0
        ? `Rs ${money(over)} over the current limit.`
        : `Rs ${money(Math.max(0, budget.amount - budget.used))} remains.`,
      page: 'budgets',
      action: 'Review plan',
    })
  }

  const uncategorized = transactions.filter((transaction) => transaction.type === 'expense' && (!transaction.category || transaction.category.toLowerCase() === 'uncategorized'))
  if (uncategorized.length) {
    items.push({
      id: 'uncategorized-transactions',
      priority: 'review',
      title: `${uncategorized.length} ${uncategorized.length === 1 ? 'transaction needs' : 'transactions need'} a category`,
      detail: 'Clear categories make your Insights more reliable.',
      page: 'transactions',
      action: 'Categorize',
    })
  }

  for (const goal of goals) {
    if (goal.status === 'Completed' || !goal.dueDate || goal.saved >= goal.target) continue
    const days = daysBetween(todayKey, goal.dueDate)
    if (days > 30) continue
    items.push({
      id: `goal-${goal.id}`,
      priority: days < 0 ? 'urgent' : 'important',
      title: days < 0 ? `${goal.name} has passed its target date` : `${goal.name} is approaching its target date`,
      detail: `Rs ${money(Math.max(0, goal.target - goal.saved))} is still needed.`,
      page: 'goals',
      action: 'Add payment',
    })
  }

  for (const item of wishlistItems) {
    if (item.status !== 'ready' && !(item.status === 'waiting' && new Date(item.reconsiderAt).getTime() <= today.getTime())) continue
    items.push({
      id: `wishlist-${item.id}`,
      priority: 'review',
      title: `${item.name} is ready for a decision`,
      detail: `The cooling-off period for Rs ${money(item.amount)} has finished.`,
      page: 'budgets',
      action: 'Review purchase',
    })
  }

  const lowAccount = accounts
    .filter((account) => account.balance >= 0 && account.balance < 1_000)
    .sort((a, b) => a.balance - b.balance)[0]
  if (lowAccount) {
    items.push({
      id: `account-${lowAccount.id}`,
      priority: 'review',
      title: `${lowAccount.name} has a low balance`,
      detail: `Rs ${money(lowAccount.balance)} is currently available.`,
      page: 'accounts',
      action: 'Open wallet',
    })
  }

  const rank: Record<AttentionPriority, number> = { urgent: 0, important: 1, review: 2 }
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]).slice(0, 12)
}

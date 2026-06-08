import type { Account, Budget, Debt, Goal, Transaction } from '../types/finance'

export const formatPKR = (value: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace('PKR', 'Rs.')

export const percent = (value: number, total: number) =>
  total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100))

export const totalBalance = (accounts: Account[]) =>
  accounts.reduce((sum, account) => sum + account.balance, 0)

export const monthlyIncome = (transactions: Transaction[]) =>
  transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0)

export const monthlyExpenses = (transactions: Transaction[]) =>
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0)

export const netSaving = (transactions: Transaction[]) =>
  monthlyIncome(transactions) - monthlyExpenses(transactions)

export const safeToSpend = (accounts: Account[], budgets: Budget[], goals: Goal[], debts: Debt[]) => {
  const remainingBudgets = budgets.reduce((sum, budget) => sum + Math.max(0, budget.amount - budget.used), 0)
  const shortTermGoals = goals.reduce((sum, goal) => sum + Math.max(0, goal.target - goal.saved) * 0.08, 0)
  const debtReserve = debts.reduce((sum, debt) => sum + Math.max(0, debt.total - debt.paid) * 0.06, 0)
  return Math.max(0, Math.round(totalBalance(accounts) - remainingBudgets - shortTermGoals - debtReserve))
}

export const goalProgress = (goal: Goal) => percent(goal.saved, goal.target)
export const debtProgress = (debt: Debt) => percent(debt.paid, debt.total)
export const budgetUsage = (budget: Budget) => percent(budget.used, budget.amount)

const categoryColors = ['#ddff45', '#d4d4d0', '#e98d67', '#aeb7c5', '#8f949c', '#c9a46a']

export const categorySpendFromTransactions = (transactions: Transaction[]) => {
  const totals = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Record<string, number>>((items, transaction) => {
      const category = transaction.category ?? transaction.title
      items[category] = (items[category] ?? 0) + transaction.amount
      return items
    }, {})

  return Object.entries(totals)
    .map(([name, value], index) => ({ name, value, color: categoryColors[index % categoryColors.length] }))
    .sort((a, b) => b.value - a.value)
}

export const incomeBreakdownFromTransactions = (transactions: Transaction[]) => {
  const totals = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce<Record<string, number>>((items, transaction) => {
      const source = transaction.source ?? transaction.category ?? transaction.title
      items[source] = (items[source] ?? 0) + transaction.amount
      return items
    }, {})

  return Object.entries(totals).map(([source, amount]) => ({ source, amount }))
}

export const weeklyTrendFromTransactions = (transactions: Transaction[]) => {
  const byDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ({ day, spending: 0, income: 0 }))
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date)
    if (Number.isNaN(date.getTime())) return
    const item = byDay[date.getDay()]
    if (transaction.type === 'income') item.income += transaction.amount
    if (transaction.type === 'expense') item.spending += transaction.amount
  })
  return [1, 2, 3, 4, 5, 6, 0].map((index) => byDay[index])
}

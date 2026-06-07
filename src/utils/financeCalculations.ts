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

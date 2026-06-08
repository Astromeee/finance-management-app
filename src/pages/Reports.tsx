import { IncomeBars, SpendingDonut, WeeklyLine } from '../components/charts/FinanceCharts'
import { ProgressCard } from '../components/cards/ProgressCard'
import { budgetUsage, categorySpendFromTransactions, formatPKR, monthlyExpenses, monthlyIncome, netSaving, totalBalance } from '../utils/financeCalculations'
import type { Account, Budget, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'

export function Reports({ accounts, transactions, goals, debts, budgets, upcomingExpenses }: { accounts: Account[]; transactions: Transaction[]; goals: Goal[]; debts: Debt[]; budgets: Budget[]; upcomingExpenses: UpcomingExpense[] }) {
  const nearBudget = budgets.length ? budgets.reduce((top, budget) => (budgetUsage(budget) > budgetUsage(top) ? budget : top), budgets[0]) : undefined
  const closestGoal = goals.length ? goals.reduce((top, goal) => (goal.saved / goal.target > top.saved / top.target ? goal : top), goals[0]) : undefined
  const debtLeft = debts.reduce((sum, debt) => sum + debt.total - debt.paid, 0)
  const totalGoalSavings = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const categorySpend = categorySpendFromTransactions(transactions)
  const upcoming = upcomingReport(upcomingExpenses)

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="card"><p className="text-sm text-[var(--muted)]">Income</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(monthlyIncome(transactions))}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Expenses</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(monthlyExpenses(transactions))}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Savings</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(totalGoalSavings)}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Net saving</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(netSaving(transactions))}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Debt left</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(debtLeft)}</h3></div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="card"><div className="section-title"><div><p>Category report</p><h3>Spending by category</h3></div></div><SpendingDonut data={categorySpend} /></div>
        <div className="card"><div className="section-title"><div><p>Trend report</p><h3>Weekly spending</h3></div></div><WeeklyLine transactions={transactions} /></div>
        <div className="card"><div className="section-title"><div><p>Income report</p><h3>Source breakdown</h3></div></div><IncomeBars transactions={transactions} /></div>
        <div className="card">
          <div className="section-title"><div><p>Account report</p><h3>Balance breakdown</h3></div><span>{formatPKR(totalBalance(accounts))}</span></div>
          <div className="space-y-3">{accounts.map((account) => <div key={account.id} className="flex justify-between rounded-2xl bg-[var(--surface-2)] p-3 text-sm"><span>{account.name}</span><strong>{formatPKR(account.balance)}</strong></div>)}</div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {nearBudget && <ProgressCard title={nearBudget.category} label="Budget nearest limit" current={nearBudget.used} total={nearBudget.amount} status="Watch" warning />}
        {closestGoal && <ProgressCard title={closestGoal.name} label="Closest goal" current={closestGoal.saved} total={closestGoal.target} status="Active" />}
        <ProgressCard title="Needs" label="Needs vs wants" current={35000} total={52500} status="67%" />
        <ProgressCard title="Wants" label="Needs vs wants" current={17500} total={52500} status="33%" />
      </section>
      <section className="card">
        <div className="section-title">
          <div>
            <p>Planning report</p>
            <h3>Upcoming expenses preview</h3>
          </div>
          <span>Unpaid items are not actual expenses</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="premium-row p-3"><p className="text-sm text-[var(--muted)]">Upcoming this month</p><strong className="mt-1 block text-xl text-white">{formatPKR(upcoming.thisMonth)}</strong></div>
          <div className="premium-row p-3"><p className="text-sm text-[var(--muted)]">Recurring commitments</p><strong className="mt-1 block text-xl text-white">{upcoming.recurring}</strong></div>
          <div className="premium-row p-3"><p className="text-sm text-[var(--muted)]">Overdue planned</p><strong className="mt-1 block text-xl text-white">{formatPKR(upcoming.overdue)}</strong></div>
          <div className="premium-row p-3"><p className="text-sm text-[var(--muted)]">Converted to actual</p><strong className="mt-1 block text-xl text-white">{formatPKR(upcoming.paidConverted)}</strong></div>
        </div>
      </section>
    </div>
  )
}

function upcomingReport(expenses: UpcomingExpense[]) {
  const now = new Date()
  return expenses.reduce((summary, expense) => {
    const dueDate = new Date(expense.dueDate)
    const isCurrentMonth = dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
    const unpaid = expense.status !== 'paid'
    if (unpaid && isCurrentMonth) summary.thisMonth += expense.amount
    if (unpaid && expense.isRecurring) summary.recurring += 1
    if (unpaid && dueDate < startOfToday()) summary.overdue += expense.amount
    if (expense.status === 'paid') summary.paidConverted += expense.amount
    return summary
  }, { thisMonth: 0, recurring: 0, overdue: 0, paidConverted: 0 })
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

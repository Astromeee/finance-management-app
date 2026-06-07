import { budgets, debts, goals } from '../data/mockData'
import { IncomeBars, SpendingDonut, WeeklyLine } from '../components/charts/FinanceCharts'
import { ProgressCard } from '../components/cards/ProgressCard'
import { budgetUsage, formatPKR, monthlyExpenses, monthlyIncome, netSaving, totalBalance } from '../utils/financeCalculations'
import type { Account, Transaction } from '../types/finance'

export function Reports({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const nearBudget = budgets.reduce((top, budget) => (budgetUsage(budget) > budgetUsage(top) ? budget : top), budgets[0])
  const closestGoal = goals.reduce((top, goal) => (goal.saved / goal.target > top.saved / top.target ? goal : top), goals[0])
  const debtLeft = debts.reduce((sum, debt) => sum + debt.total - debt.paid, 0)

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card"><p className="text-sm text-[var(--muted)]">Received</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(monthlyIncome(transactions))}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Spent</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(monthlyExpenses(transactions))}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Saved</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(netSaving(transactions))}</h3></div>
        <div className="card"><p className="text-sm text-[var(--muted)]">Debt left</p><h3 className="mt-2 text-2xl font-semibold text-white">{formatPKR(debtLeft)}</h3></div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="card"><div className="section-title"><div><p>Category report</p><h3>Spending by category</h3></div></div><SpendingDonut /></div>
        <div className="card"><div className="section-title"><div><p>Trend report</p><h3>Weekly spending</h3></div></div><WeeklyLine /></div>
        <div className="card"><div className="section-title"><div><p>Income report</p><h3>Source breakdown</h3></div></div><IncomeBars /></div>
        <div className="card">
          <div className="section-title"><div><p>Account report</p><h3>Balance breakdown</h3></div><span>{formatPKR(totalBalance(accounts))}</span></div>
          <div className="space-y-3">{accounts.map((account) => <div key={account.id} className="flex justify-between rounded-2xl bg-[var(--surface-2)] p-3 text-sm"><span>{account.name}</span><strong>{formatPKR(account.balance)}</strong></div>)}</div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressCard title={nearBudget.category} label="Budget nearest limit" current={nearBudget.used} total={nearBudget.amount} status="Watch" warning />
        <ProgressCard title={closestGoal.name} label="Closest goal" current={closestGoal.saved} total={closestGoal.target} status="Active" />
        <ProgressCard title="Needs" label="Needs vs wants" current={35000} total={52500} status="67%" />
        <ProgressCard title="Wants" label="Needs vs wants" current={17500} total={52500} status="33%" />
      </section>
    </div>
  )
}

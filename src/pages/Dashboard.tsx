import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, CircleDollarSign, Landmark, ReceiptText, ShieldCheck, Target, Wallet } from 'lucide-react'
import { budgets, categorySpend, debts, goals } from '../data/mockData'
import { MetricCard } from '../components/cards/MetricCard'
import { ProgressCard } from '../components/cards/ProgressCard'
import { SpendingDonut, WeeklyLine } from '../components/charts/FinanceCharts'
import { budgetUsage, formatPKR, monthlyExpenses, monthlyIncome, netSaving, safeToSpend, totalBalance } from '../utils/financeCalculations'
import type { Account, Transaction } from '../types/finance'

export function Dashboard({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const hotBudget = budgets.find((budget) => budgetUsage(budget) >= 80) ?? budgets[0]
  const quickActions = [
    { label: 'Income', icon: ArrowDownLeft, primary: true },
    { label: 'Expense', icon: ArrowUpRight },
    { label: 'Transfer', icon: ArrowRightLeft },
    { label: 'Goal', icon: Target },
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <article className="balance-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--muted)]">Total Balance</p>
              <h3 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-6xl">{formatPKR(totalBalance(accounts))}</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">Total across cash, banks, and wallets</p>
            </div>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">+21.4%</span>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {quickActions.map(({ label, icon: Icon, primary }) => (
              <button key={label} className={primary ? 'quick-action quick-action-primary' : 'quick-action'}>
                <Icon className="mx-auto" size={18} />
                <span className="mt-2 block text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </article>
        <div className="card">
          <div className="section-title"><div><p>Accounts</p><h3>Balance preview</h3></div><Wallet size={20} /></div>
          <div className="space-y-2.5">
            {accounts.map((account) => (
              <div key={account.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                <span className="flex min-w-0 items-center gap-3 truncate text-sm text-[var(--muted)]"><i className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" />{account.name}</span>
                <strong className="text-sm text-white">{formatPKR(account.balance)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard compact label="Received" value={formatPKR(monthlyIncome(transactions))} detail="Parents + freelance" icon={ArrowDownLeft} tone="positive" />
        <MetricCard compact label="Expenses" value={formatPKR(monthlyExpenses(transactions))} detail="Bills, food, clothes" icon={ArrowUpRight} tone="negative" />
        <MetricCard compact label="Safe to Spend" value={formatPKR(safeToSpend(accounts, budgets, goals, debts))} detail="After reserves" icon={ShieldCheck} tone="info" />
        <MetricCard compact label="Saved" value={formatPKR(netSaving(transactions))} detail="This month" icon={CircleDollarSign} tone="accent" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[.95fr_1.05fr]">
        <div className="card">
          <div className="section-title"><div><p>Recent activity</p><h3>Transactions</h3></div><span>See all</span></div>
          <div className="space-y-2">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-3)] text-[var(--accent)]">
                  {transaction.type === 'expense' ? <ReceiptText size={18} /> : transaction.type === 'goal' ? <Target size={18} /> : transaction.type === 'debt' ? <Landmark size={18} /> : <CircleDollarSign size={18} />}
                </span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium text-white">{transaction.title}</p><p className="truncate text-xs text-[var(--muted)]">{transaction.category} · {transaction.account} · {transaction.date}</p></div>
                <strong className={transaction.type === 'income' ? 'amount-positive' : transaction.type === 'expense' ? 'amount-negative' : 'amount-neutral'}>{transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatPKR(transaction.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="card">
            <div className="section-title">
              <div>
                <p>Weekly trend</p>
                <h3>Spending vs income</h3>
              </div>
              <span>{formatPKR(netSaving(transactions))} saved</span>
            </div>
            <WeeklyLine />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <div className="section-title"><div><p>Categories</p><h3>Where money went</h3></div></div>
          <SpendingDonut />
          <div className="grid gap-2">
            {categorySpend.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[var(--muted)]"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span>
                <strong className="text-white">{formatPKR(item.value)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2">
          <ProgressCard title={goals[0].name} label="Active goal" current={goals[0].saved} total={goals[0].target} status={goals[0].status} dueDate={goals[0].dueDate} />
          <ProgressCard title={debts[0].name} label="Debt progress" current={debts[0].paid} total={debts[0].total} status={debts[0].status} dueDate={debts[0].dueDate} />
          <div className="rounded-3xl border border-[rgba(233,141,103,.18)] bg-[rgba(233,141,103,.08)] p-4 text-[var(--negative)] lg:col-span-2">
            <p className="font-semibold">Budget warning</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{hotBudget.category} is at {budgetUsage(hotBudget)}% usage.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

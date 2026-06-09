import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Target, TrendingDown, TrendingUp, WalletCards, type LucideIcon } from 'lucide-react'
import { formatPKR, percent } from '../utils/financeCalculations'
import type { Account, Budget, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { cn } from '../utils/ui'

type PeriodKey = 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'all-time' | 'custom'
type PeriodSelection = PeriodKey | `month:${string}`

type Range = {
  label: string
  start?: Date
  end?: Date
}

const periodOptions: Array<{ value: PeriodKey; label: string }> = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'this-year', label: 'This Year' },
  { value: 'all-time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
]

const needsCategories = new Set([
  'Rent',
  'Apartment Rent',
  'Bills',
  'Electricity Bill',
  'University Fee',
  'Transport',
  'Food & Groceries',
  'Mobile Package',
  'Course Fee',
  'Health',
])

const wantsCategories = new Set([
  'Dining Out',
  'Clothes',
  'Subscriptions',
  'Canva Subscription',
  'Entertainment',
  'Shopping',
  'Miscellaneous',
])

const tooltipStyle = {
  background: '#1a1c20',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 14,
  color: '#f6f3ea',
}

export function Reports({
  accounts,
  transactions,
  goals,
  debts,
  budgets,
  upcomingExpenses,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
}) {
  const [period, setPeriod] = useState<PeriodSelection>('this-month')
  const [customStart, setCustomStart] = useState(monthStart(new Date()).toISOString().slice(0, 10))
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10))

  const range = useMemo(() => getRange(period, customStart, customEnd), [period, customEnd, customStart])
  const periodTransactions = useMemo(
    () => transactions.filter((transaction) => inRange(transaction.date, range)),
    [range, transactions],
  )
  const incomeTransactions = periodTransactions.filter((transaction) => transaction.type === 'income')
  const expenseTransactions = periodTransactions.filter((transaction) => transaction.type === 'expense')

  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalExpenses = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const netSaved = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (netSaved / totalIncome) * 100 : 0

  const spendingByCategory = groupTransactions(expenseTransactions, (transaction) => transaction.category ?? transaction.title, totalExpenses)
  const incomeBySource = groupTransactions(incomeTransactions, (transaction) => transaction.source ?? transaction.category ?? transaction.title, totalIncome)
  const accountUsage = groupTransactions(expenseTransactions, (transaction) => transaction.account, totalExpenses).map((item) => ({
    ...item,
    count: expenseTransactions.filter((transaction) => transaction.account === item.name).length,
  }))
  const trendData = spendingTrend(expenseTransactions, range)
  const needsWants = calculateNeedsWants(expenseTransactions)
  const budgetRows = budgets.map((budget) => {
    const actual = expenseTransactions.filter((transaction) => transaction.category === budget.category).reduce((sum, transaction) => sum + transaction.amount, 0)
    const usage = percent(actual, budget.amount)
    return {
      ...budget,
      actual,
      remaining: budget.amount - actual,
      usage,
      status: usage > 100 ? 'Over Budget' : usage >= 80 ? 'Near Limit' : 'Under Budget',
    }
  })
  const upcoming = upcomingReport(upcomingExpenses)
  const goalDebt = goalDebtReport(goals, debts)

  return (
    <div className="reports-page space-y-5 pb-28">
      <section className="reports-filter-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Reports period</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{range.label}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(12rem,18rem)_1fr]">
          <label className="reports-period-select">
            <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodSelection)}>
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {availableMonthOptions(transactions).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input className="form-input" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input className="form-input" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Total Income" value={formatPKR(totalIncome)} tone="positive" icon={TrendingUp} />
        <SummaryCard label="Total Expenses" value={formatPKR(totalExpenses)} tone="negative" icon={TrendingDown} />
        <SummaryCard label="Net Saved" value={formatPKR(netSaved)} tone={netSaved >= 0 ? 'positive' : 'negative'} icon={WalletCards} />
        <SummaryCard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} tone={savingsRate >= 0 ? 'positive' : 'negative'} icon={Target} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ReportPanel eyebrow="Actual expenses only" title="Spending by Category" meta={`${spendingByCategory.length} categories used`}>
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.035] p-3 text-sm text-[var(--muted)]">
            Top spending category: <strong className="text-white">{spendingByCategory[0]?.name ?? 'None'}</strong>
          </div>
          <RankedBars items={spendingByCategory} empty="No actual expenses in this period." />
        </ReportPanel>

        <ReportPanel eyebrow="Income transactions only" title="Income by Source" meta={`${incomeBySource.length} sources`}>
          <RankedBars items={incomeBySource} empty="No income in this period." accent="lime" />
        </ReportPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <ReportPanel eyebrow={range.start && range.end && sameMonth(range.start, range.end) ? 'Daily spending' : 'Monthly spending'} title="Spending Trend">
          <div className="reports-chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#a7a8ac" tickLine={false} axisLine={false} />
                <YAxis stroke="#a7a8ac" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(221,255,69,.045)' }} />
                <Bar dataKey="amount" fill="#e98d67" radius={[10, 10, 4, 4]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportPanel>

        <ReportPanel eyebrow="Necessary vs lifestyle spending" title="Needs vs Wants">
          <div className="grid gap-3">
            <SplitCard label="Needs" amount={needsWants.needs} percent={needsWants.needsPercent} />
            <SplitCard label="Wants" amount={needsWants.wants} percent={needsWants.wantsPercent} tone="orange" />
          </div>
        </ReportPanel>
      </section>

      <ReportPanel eyebrow="Expense transactions only" title="Spending by Account" meta={`${expenseTransactions.length} transactions · ${accounts.length} accounts`}>
        <RankedBars items={accountUsage} empty="No account spending in this period." showCount />
      </ReportPanel>

      <ReportPanel eyebrow="Budget vs actual spending" title="Budget Performance">
        <div className="grid gap-3 md:grid-cols-2">
          {budgetRows.map((budget) => <BudgetRow key={budget.id} budget={budget} />)}
        </div>
      </ReportPanel>

      <ReportPanel eyebrow="Planned, not yet paid" title="Upcoming Expenses">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MiniMetric label="Upcoming this month" value={formatPKR(upcoming.thisMonth)} />
          <MiniMetric label="Due in next 7 days" value={formatPKR(upcoming.nextSevenDays)} tone="lime" />
          <MiniMetric label="Overdue unpaid" value={formatPKR(upcoming.overdue)} tone="orange" />
          <MiniMetric label="Recurring upcoming" value={String(upcoming.recurring)} />
        </div>
      </ReportPanel>

      <ReportPanel eyebrow="Savings goals and debt obligations" title="Goals & Debts">
        <div className="grid gap-3 md:grid-cols-3">
          <MiniMetric label="Goal target" value={formatPKR(goalDebt.goalTarget)} />
          <MiniMetric label="Saved toward goals" value={formatPKR(goalDebt.goalSaved)} tone="lime" />
          <MiniMetric label="Goal progress" value={`${goalDebt.goalProgress}%`} />
          <MiniMetric label="Total debt" value={formatPKR(goalDebt.debtTotal)} tone="orange" />
          <MiniMetric label="Debt paid" value={formatPKR(goalDebt.debtPaid)} />
          <MiniMetric label="Remaining debt" value={formatPKR(goalDebt.debtRemaining)} tone="orange" />
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <CompactProgressList title="Active savings goals" items={goals.filter((goal) => goal.status !== 'Completed').map((goal) => ({ name: goal.name, current: goal.saved, total: goal.target }))} />
          <CompactProgressList title="Active debts" items={debts.filter((debt) => debt.status !== 'Completed').map((debt) => ({ name: debt.name, current: debt.paid, total: debt.total }))} tone="orange" />
        </div>
      </ReportPanel>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone: 'positive' | 'negative' }) {
  return (
    <article className={cn('reports-summary-card', tone === 'negative' && 'reports-summary-negative')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
        <span className="reports-summary-icon"><Icon size={18} /></span>
      </div>
      <h3 className="mt-4 truncate text-2xl font-semibold text-white sm:text-3xl">{value}</h3>
    </article>
  )
}

function ReportPanel({ eyebrow, title, meta, children }: { eyebrow: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="reports-panel">
      <div className="section-title">
        <div>
          <p>{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        {meta && <span>{meta}</span>}
      </div>
      {children}
    </section>
  )
}

function RankedBars({ items, empty, accent = 'orange', showCount }: { items: Array<{ name: string; value: number; percent: number; count?: number }>; empty: string; accent?: 'orange' | 'lime'; showCount?: boolean }) {
  if (!items.length) return <p className="rounded-2xl bg-white/[.035] p-4 text-sm text-[var(--muted)]">{empty}</p>
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.name} className="reports-ranked-row">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{item.name}</p>
              {showCount && <p className="mt-1 text-xs text-[var(--muted)]">{item.count} transactions</p>}
            </div>
            <div className="text-right">
              <strong className="text-white">{formatPKR(item.value)}</strong>
              <p className="text-xs text-[var(--muted)]">{item.percent}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className={cn('h-full rounded-full', accent === 'lime' ? 'bg-[var(--accent)]' : 'bg-[var(--negative)]')} style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SplitCard({ label, amount, percent: value, tone = 'lime' }: { label: string; amount: number; percent: number; tone?: 'lime' | 'orange' }) {
  return (
    <article className="reports-ranked-row">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="text-sm text-[var(--muted)]">{value}% of spending</p>
        </div>
        <strong className="text-xl text-white">{formatPKR(amount)}</strong>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className={cn('h-full rounded-full', tone === 'lime' ? 'bg-[var(--accent)]' : 'bg-[var(--negative)]')} style={{ width: `${value}%` }} />
      </div>
    </article>
  )
}

function BudgetRow({ budget }: { budget: Budget & { actual: number; remaining: number; usage: number; status: string } }) {
  const over = budget.status === 'Over Budget'
  const near = budget.status === 'Near Limit'
  return (
    <article className="reports-ranked-row">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{budget.category}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Budget {formatPKR(budget.amount)} · Actual {formatPKR(budget.actual)}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', over ? 'bg-[rgba(233,141,103,.12)] text-[var(--negative)]' : near ? 'bg-[rgba(221,255,69,.12)] text-[var(--accent)]' : 'bg-[rgba(139,226,143,.12)] text-[var(--positive)]')}>{budget.status}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className={cn('h-full rounded-full', over ? 'bg-[var(--negative)]' : near ? 'bg-[#ffc857]' : 'bg-[var(--accent)]')} style={{ width: `${Math.min(100, budget.usage)}%` }} />
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">{budget.remaining >= 0 ? `${formatPKR(budget.remaining)} remaining` : `${formatPKR(Math.abs(budget.remaining))} exceeded`} · {budget.usage}% used</p>
    </article>
  )
}

function MiniMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'lime' | 'orange' }) {
  return (
    <article className="reports-mini-metric">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <strong className={cn('mt-2 block text-xl text-white', tone === 'lime' && 'text-[var(--accent)]', tone === 'orange' && 'text-[var(--negative)]')}>{value}</strong>
    </article>
  )
}

function CompactProgressList({ title, items, tone = 'lime' }: { title: string; items: Array<{ name: string; current: number; total: number }>; tone?: 'lime' | 'orange' }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
      <h4 className="font-semibold text-white">{title}</h4>
      <div className="mt-3 grid gap-3">
        {items.length ? items.map((item) => {
          const progress = percent(item.current, item.total)
          return (
            <div key={item.name}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate text-[var(--muted)]">{item.name}</span>
                <strong className="text-white">{progress}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className={cn('h-full rounded-full', tone === 'lime' ? 'bg-[var(--accent)]' : 'bg-[var(--negative)]')} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        }) : <p className="text-sm text-[var(--muted)]">No active items.</p>}
      </div>
    </div>
  )
}

function groupTransactions(transactions: Transaction[], label: (transaction: Transaction) => string, total: number) {
  const grouped = transactions.reduce<Record<string, number>>((items, transaction) => {
    const key = label(transaction) || 'Unexplained'
    items[key] = (items[key] ?? 0) + transaction.amount
    return items
  }, {})
  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value, percent: total > 0 ? Math.round((value / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
}

function calculateNeedsWants(transactions: Transaction[]) {
  const needs = transactions.filter((transaction) => needsCategories.has(transaction.category ?? '')).reduce((sum, transaction) => sum + transaction.amount, 0)
  const wants = transactions.filter((transaction) => wantsCategories.has(transaction.category ?? '') || !needsCategories.has(transaction.category ?? '')).reduce((sum, transaction) => sum + transaction.amount, 0)
  const total = needs + wants
  return {
    needs,
    wants,
    needsPercent: total > 0 ? Math.round((needs / total) * 100) : 0,
    wantsPercent: total > 0 ? Math.round((wants / total) * 100) : 0,
  }
}

function spendingTrend(transactions: Transaction[], range: Range) {
  const monthly = !range.start || !range.end || !sameMonth(range.start, range.end)
  const grouped = transactions.reduce<Record<string, number>>((items, transaction) => {
    const date = parseDate(transaction.date)
    if (!date) return items
    const key = monthly ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : String(date.getDate()).padStart(2, '0')
    items[key] = (items[key] ?? 0) + transaction.amount
    return items
  }, {})
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ label: monthly ? monthLabelFromKey(key) : key, amount }))
}

function upcomingReport(expenses: UpcomingExpense[]) {
  const now = new Date()
  const start = startOfDay(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return expenses.reduce((summary, expense) => {
    const dueDate = parseDate(expense.dueDate)
    if (!dueDate || expense.status === 'paid') return summary
    const due = startOfDay(dueDate)
    if (due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear()) summary.thisMonth += expense.amount
    if (due >= start && due <= end) summary.nextSevenDays += expense.amount
    if (due < start || expense.status === 'overdue') summary.overdue += expense.amount
    if (expense.isRecurring) summary.recurring += 1
    return summary
  }, { thisMonth: 0, nextSevenDays: 0, overdue: 0, recurring: 0 })
}

function goalDebtReport(goals: Goal[], debts: Debt[]) {
  const goalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const goalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const debtTotal = debts.reduce((sum, debt) => sum + debt.total, 0)
  const debtPaid = debts.reduce((sum, debt) => sum + debt.paid, 0)
  return {
    goalTarget,
    goalSaved,
    goalProgress: percent(goalSaved, goalTarget),
    debtTotal,
    debtPaid,
    debtRemaining: Math.max(0, debtTotal - debtPaid),
  }
}

function getRange(period: string, customStart: string, customEnd: string): Range {
  if (period.startsWith('month:')) {
    const [, value] = period.split(':')
    const [year, month] = value.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    return { label: monthLabel(start), start, end: endOfMonth(start) }
  }
  const today = new Date()
  if (period === 'last-month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return { label: monthLabel(start), start, end: endOfMonth(start) }
  }
  if (period === 'last-3-months') return relativeMonthsRange(today, 3, 'Last 3 Months')
  if (period === 'last-6-months') return relativeMonthsRange(today, 6, 'Last 6 Months')
  if (period === 'this-year') return { label: String(today.getFullYear()), start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31, 23, 59, 59) }
  if (period === 'all-time') return { label: 'All Time' }
  if (period === 'custom') return { label: 'Custom Range', start: parseDate(customStart), end: endOfDay(parseDate(customEnd) ?? new Date()) }
  const start = monthStart(today)
  return { label: monthLabel(start), start, end: endOfMonth(start) }
}

function relativeMonthsRange(today: Date, months: number, label: string) {
  const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1)
  return { label, start, end: endOfDay(today) }
}

function availableMonthOptions(transactions: Transaction[]) {
  const months = [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))]
  return months.sort((a, b) => b.localeCompare(a)).map((value) => ({ value: `month:${value}`, label: monthLabelFromKey(value) }))
}

function inRange(dateString: string, range: Range) {
  const date = parseDate(dateString)
  if (!date) return false
  if (range.start && date < range.start) return false
  if (range.end && date > range.end) return false
  return true
}

function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function endOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function sameMonth(start: Date, end: Date) {
  return start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric' }).format(date)
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  return monthLabel(new Date(year, month - 1, 1))
}

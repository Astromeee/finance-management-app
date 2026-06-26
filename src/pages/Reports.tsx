import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, Landmark, PieChart as PieChartIcon, WalletCards, type LucideIcon } from 'lucide-react'
import { formatPKR, percent } from '../utils/financeCalculations'
import type { Account, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
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
  upcomingExpenses,
  expenseCategories,
  incomeCategories,
  onAddExpenseCategory,
  onAddIncomeCategory,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  upcomingExpenses: UpcomingExpense[]
  expenseCategories: string[]
  incomeCategories: string[]
  onAddExpenseCategory: (category: string) => void
  onAddIncomeCategory: (category: string) => void
}) {
  const [period, setPeriod] = useState<PeriodSelection>('this-month')
  const [customStart, setCustomStart] = useState(monthStart(new Date()).toISOString().slice(0, 10))
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10))
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [newIncomeCategory, setNewIncomeCategory] = useState('')
  const [showMoreAnalytics, setShowMoreAnalytics] = useState(false)

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
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  const spendingByCategory = groupTransactions(expenseTransactions, (transaction) => transaction.category ?? transaction.title, totalExpenses)
  const incomeBySource = groupTransactions(incomeTransactions, (transaction) => transaction.source ?? transaction.category ?? transaction.title, totalIncome)
  const accountUsage = groupTransactions(expenseTransactions, (transaction) => transaction.account, totalExpenses).map((item) => ({
    ...item,
    count: expenseTransactions.filter((transaction) => transaction.account === item.name).length,
  }))
  const trendData = spendingTrend(expenseTransactions, range)
  const upcoming = upcomingReport(upcomingExpenses)
  const goalDebt = goalDebtReport(goals, debts)
  const hasMoneyMovement = periodTransactions.length > 0 || totalIncome > 0 || totalExpenses > 0
  const snapshotSentence = buildSnapshotSentence({ rangeLabel: range.label, totalIncome, totalExpenses, netSaved, debtRemaining: goalDebt.debtRemaining, upcomingDue: upcoming.nextSevenDays })
  const cashflowData = cashflowTrend(periodTransactions, range)
  const spendingMix = spendingByCategory.length ? spendingByCategory.slice(0, 5) : [{ name: 'No spending', value: 1, percent: 100 }]
  const debtProgress = goalDebt.debtTotal > 0 ? Math.round((goalDebt.debtPaid / goalDebt.debtTotal) * 100) : 0
  const advancedOpen = showMoreAnalytics

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

      <section className="reports-snapshot-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{range.label} snapshot</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{netSaved >= 0 ? formatPKR(netSaved) : `-${formatPKR(Math.abs(netSaved))}`}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{snapshotSentence}</p>
        </div>
        <div className="reports-snapshot-grid">
          <MiniMetric label="Cash now" value={formatPKR(totalBalance)} tone="lime" />
          <MiniMetric label="Upcoming 7 days" value={formatPKR(upcoming.nextSevenDays)} tone={upcoming.nextSevenDays > 0 ? 'orange' : 'neutral'} />
          <MiniMetric label="Debt left" value={formatPKR(goalDebt.debtRemaining)} tone={goalDebt.debtRemaining > 0 ? 'orange' : 'lime'} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          title="Spending"
          eyebrow="Actual expenses"
          value={formatPKR(totalExpenses)}
          note={spendingByCategory[0] ? `${spendingByCategory[0].name} is your top category.` : 'No spending logged in this period.'}
          icon={PieChartIcon}
          tone="orange"
        >
          <DonutChart data={spendingMix} colors={['#e98d67', '#ddff45', '#39dced', '#b46cff', '#aeb7c5']} empty={!spendingByCategory.length} />
        </InsightCard>
        <InsightCard
          title="Cashflow"
          eyebrow="Income minus expenses"
          value={netSaved >= 0 ? formatPKR(netSaved) : `-${formatPKR(Math.abs(netSaved))}`}
          note={totalIncome > 0 ? `${savingsRate.toFixed(1)}% savings rate for ${range.label}.` : 'No income logged yet for this period.'}
          icon={WalletCards}
          tone={netSaved >= 0 ? 'lime' : 'orange'}
        >
          {hasMoneyMovement ? <CashflowMiniChart data={cashflowData} /> : <EmptyInsight title="No cashflow yet" note="Add income and expenses to see money moving over time." />}
        </InsightCard>
        <InsightCard
          title="Debt"
          eyebrow="Money owed"
          value={formatPKR(goalDebt.debtRemaining)}
          note={goalDebt.debtTotal > 0 ? `${debtProgress}% paid across ${debts.length} items.` : 'No debt items are active.'}
          icon={Landmark}
          tone={goalDebt.debtRemaining > 0 ? 'orange' : 'lime'}
        >
          <ProgressRing value={goalDebt.debtTotal > 0 ? debtProgress : 100} label={goalDebt.debtTotal > 0 ? 'paid' : 'clear'} tone={goalDebt.debtRemaining > 0 ? 'orange' : 'lime'} />
        </InsightCard>
      </section>

      <section>
        <ReportPanel eyebrow="Where your money went" title="Spending Mix" meta={`${spendingByCategory.length} categories`}>
          <div className="reports-chart-two-col">
            <DonutChart data={spendingMix} colors={['#e98d67', '#ddff45', '#39dced', '#b46cff', '#aeb7c5']} empty={!spendingByCategory.length} />
            <RankedBars items={spendingByCategory.slice(0, 5)} empty="No actual expenses in this period." />
          </div>
        </ReportPanel>
      </section>

      <ReportPanel eyebrow="Money in and out" title="Cashflow Trend">
        {hasMoneyMovement ? <div className="reports-chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflowData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#a7a8ac" tickLine={false} axisLine={false} />
              <YAxis stroke="#a7a8ac" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(221,255,69,.18)' }} />
              <Area type="monotone" dataKey="income" stroke="#ddff45" fill="rgba(221,255,69,.12)" strokeWidth={2.5} isAnimationActive={false} />
              <Area type="monotone" dataKey="expenses" stroke="#e98d67" fill="rgba(233,141,103,.12)" strokeWidth={2.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div> : <EmptyInsight title="No trend to show yet" note="Once you record transactions, this chart will compare income and spending over the selected period." />}
      </ReportPanel>

      <button className="reports-more-toggle" onClick={() => setShowMoreAnalytics((current) => !current)}>
        <span>{showMoreAnalytics ? 'Hide more analytics' : 'Show more analytics'}</span>
        <ChevronDown className={cn(showMoreAnalytics && 'rotate-180')} size={18} />
      </button>

      {advancedOpen && (
        <>
        <section className="grid gap-5 xl:grid-cols-2">
          <ReportPanel eyebrow="Income transactions only" title="Income by Source" meta={`${incomeBySource.length} sources`}>
            <RankedBars items={incomeBySource} empty="No income in this period." accent="lime" />
          </ReportPanel>

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
        </section>

        <ReportPanel eyebrow="Expense transactions only" title="Spending by Account" meta={`${expenseTransactions.length} transactions · ${accounts.length} accounts`}>
          <RankedBars items={accountUsage} empty="No account spending in this period." showCount />
        </ReportPanel>

        <ReportPanel eyebrow="Planned, not yet paid" title="Upcoming Expenses">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MiniMetric label="Upcoming this month" value={formatPKR(upcoming.thisMonth)} />
            <MiniMetric label="Due in next 7 days" value={formatPKR(upcoming.nextSevenDays)} tone="lime" />
            <MiniMetric label="Overdue unpaid" value={formatPKR(upcoming.overdue)} tone="orange" />
            <MiniMetric label="Recurring upcoming" value={String(upcoming.recurring)} />
          </div>
        </ReportPanel>

        <ReportPanel eyebrow="Savings goals, debts, and money owed" title="Goals & Debts">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniMetric label="Goal target" value={formatPKR(goalDebt.goalTarget)} />
            <MiniMetric label="Saved toward goals" value={formatPKR(goalDebt.goalSaved)} tone="lime" />
            <MiniMetric label="Goal progress" value={`${goalDebt.goalProgress}%`} />
            <MiniMetric label="Total debt / money owed" value={formatPKR(goalDebt.debtTotal)} tone="orange" />
            <MiniMetric label="Total paid" value={formatPKR(goalDebt.debtPaid)} />
            <MiniMetric label="Total remaining" value={formatPKR(goalDebt.debtRemaining)} tone="orange" />
            <MiniMetric label="Overdue items" value={String(goalDebt.overdueItems)} tone="orange" />
            <MiniMetric label="Money I owe items" value={String(goalDebt.moneyOwedItems)} />
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <CompactProgressList title="Active savings goals" items={goals.filter((goal) => goal.status !== 'Completed').map((goal) => ({ name: goal.name, current: goal.saved, total: goal.target }))} />
            <CompactProgressList title="Debts & money owed" items={debts.filter((debt) => debtStatus(debt) !== 'Paid').map((debt) => ({ name: debt.title || debt.name || 'Debt', current: debt.paidAmount ?? debt.paid ?? 0, total: debt.totalAmount ?? debt.total ?? 0 }))} tone="orange" />
          </div>
        </ReportPanel>
        </>
      )}

      <section className="grid gap-5 xl:grid-cols-2">
        <ReportPanel eyebrow="Expense category setup" title="Add Expense Category" meta={`${expenseCategories.length} categories`}>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(event) => {
            event.preventDefault()
            const category = newExpenseCategory.trim()
            if (!category) return
            onAddExpenseCategory(category)
            setNewExpenseCategory('')
          }}>
            <input className="form-input" value={newExpenseCategory} onChange={(event) => setNewExpenseCategory(event.target.value)} placeholder="Add category, e.g. Fuel" />
            <button className="btn-primary justify-center" type="submit">Add Category</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {expenseCategories.slice(-8).map((category) => <span key={category} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{category}</span>)}
          </div>
        </ReportPanel>

        <ReportPanel eyebrow="Income source setup" title="Add Income Category" meta={`${incomeCategories.length} categories`}>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(event) => {
            event.preventDefault()
            const category = newIncomeCategory.trim()
            if (!category) return
            onAddIncomeCategory(category)
            setNewIncomeCategory('')
          }}>
            <input className="form-input" value={newIncomeCategory} onChange={(event) => setNewIncomeCategory(event.target.value)} placeholder="Add income source, e.g. Client Work" />
            <button className="btn-primary justify-center" type="submit">Add Source</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {incomeCategories.slice(-8).map((category) => <span key={category} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{category}</span>)}
          </div>
        </ReportPanel>
      </section>
    </div>
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

function InsightCard({ eyebrow, title, value, note, icon: Icon, tone, children }: { eyebrow: string; title: string; value: string; note: string; icon: LucideIcon; tone: 'lime' | 'orange'; children: ReactNode }) {
  return (
    <article className={cn('reports-insight-card', tone === 'orange' && 'reports-insight-orange')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
        </div>
        <span className="reports-summary-icon"><Icon size={18} /></span>
      </div>
      <strong className="mt-4 block truncate text-3xl text-white">{value}</strong>
      <p className="mt-2 min-h-10 text-sm leading-5 text-[var(--muted)]">{note}</p>
      <div className="mt-4">{children}</div>
    </article>
  )
}

function DonutChart({ data, colors, empty = false }: { data: Array<{ name: string; value: number; percent?: number }>; colors: string[]; empty?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(0, data.length - 1))
  const selected = empty ? undefined : data[safeSelectedIndex]
  const selectedPercent = selected ? selected.percent ?? percent(selected.value, total) : 0

  return (
    <div className="reports-donut-wrap">
      <div className="reports-donut-visual">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={empty ? 0 : 5}
              cornerRadius={10}
              minAngle={empty ? 0 : 7}
              stroke="rgba(18,19,21,.92)"
              strokeWidth={5}
              isAnimationActive={false}
              onClick={(_, index) => setSelectedIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={empty ? 'rgba(255,255,255,.1)' : colors[index % colors.length]}
                  opacity={!empty && index !== safeSelectedIndex ? 0.48 : 1}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => empty ? ['No data yet', name] : [formatPKR(Number(value)), name]} contentStyle={tooltipStyle} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="reports-donut-center">
          <strong>{empty ? '0%' : `${selectedPercent}%`}</strong>
          <span>{empty ? 'No data' : selected?.name}</span>
        </div>
      </div>
      {!empty && (
        <div className="reports-donut-legend" aria-label="Spending categories">
          {data.map((item, index) => {
            const itemPercent = item.percent ?? percent(item.value, total)
            const active = index === safeSelectedIndex
            return (
              <button
                key={item.name}
                className={cn(active && 'reports-donut-legend-active')}
                type="button"
                onClick={() => setSelectedIndex(index)}
              >
                <span style={{ backgroundColor: colors[index % colors.length] }} />
                <strong>{item.name}</strong>
                <em>{itemPercent}%</em>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CashflowMiniChart({ data }: { data: Array<{ label: string; income: number; expenses: number; net: number }> }) {
  return (
    <div className="reports-mini-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="income" stroke="#ddff45" fill="rgba(221,255,69,.14)" strokeWidth={2.2} isAnimationActive={false} />
          <Area type="monotone" dataKey="expenses" stroke="#e98d67" fill="rgba(233,141,103,.12)" strokeWidth={2.2} isAnimationActive={false} />
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ProgressRing({ value, label, tone }: { value: number; label: string; tone: 'lime' | 'orange' }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="reports-ring-wrap">
      <div className={cn('reports-progress-ring', tone === 'orange' && 'reports-progress-ring-orange')} style={{ background: `conic-gradient(var(--ring-color) ${clamped * 3.6}deg, rgba(255,255,255,.08) 0deg)` }}>
        <div>
          <strong>{clamped}%</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyInsight({ title, note }: { title: string; note: string }) {
  return (
    <div className="reports-empty-insight">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{note}</p>
    </div>
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

function cashflowTrend(transactions: Transaction[], range: Range) {
  const monthly = !range.start || !range.end || !sameMonth(range.start, range.end)
  const grouped = transactions.reduce<Record<string, { income: number; expenses: number }>>((items, transaction) => {
    const date = parseDate(transaction.date)
    if (!date) return items
    const key = monthly ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : String(date.getDate()).padStart(2, '0')
    items[key] ??= { income: 0, expenses: 0 }
    if (transaction.type === 'income') items[key].income += transaction.amount
    if (transaction.type === 'expense') items[key].expenses += transaction.amount
    return items
  }, {})
  const rows = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => ({ label: monthly ? monthLabelFromKey(key) : key, income: item.income, expenses: item.expenses, net: item.income - item.expenses }))
  return rows.length ? rows : [{ label: range.label, income: 0, expenses: 0, net: 0 }]
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
  const debtTotal = debts.reduce((sum, debt) => sum + (debt.totalAmount ?? debt.total ?? 0), 0)
  const debtPaid = debts.reduce((sum, debt) => sum + (debt.paidAmount ?? debt.paid ?? 0), 0)
  return {
    goalTarget,
    goalSaved,
    goalProgress: percent(goalSaved, goalTarget),
    debtTotal,
    debtPaid,
    debtRemaining: Math.max(0, debtTotal - debtPaid),
    overdueItems: debts.filter((debt) => debtStatus(debt) === 'Overdue').length,
    moneyOwedItems: debts.filter((debt) => debt.category === 'Money I Owe').length,
  }
}

function buildSnapshotSentence({ rangeLabel, totalIncome, totalExpenses, netSaved, debtRemaining, upcomingDue }: { rangeLabel: string; totalIncome: number; totalExpenses: number; netSaved: number; debtRemaining: number; upcomingDue: number }) {
  if (totalIncome === 0 && totalExpenses === 0) {
    if (debtRemaining > 0) return `No income or spending is logged for ${rangeLabel} yet. You still have ${formatPKR(debtRemaining)} debt or money owed remaining.`
    return `No income or spending is logged for ${rangeLabel} yet. Add a few transactions and this will turn into a useful money snapshot.`
  }
  if (netSaved >= 0) {
    const upcomingText = upcomingDue > 0 ? ` Watch ${formatPKR(upcomingDue)} due in the next 7 days.` : ''
    return `You are positive by ${formatPKR(netSaved)} for ${rangeLabel}: ${formatPKR(totalIncome)} income against ${formatPKR(totalExpenses)} spending.${upcomingText}`
  }
  return `You spent ${formatPKR(Math.abs(netSaved))} more than income in ${rangeLabel}. Debt remaining is ${formatPKR(debtRemaining)}.`
}

function debtStatus(debt: Debt) {
  const total = debt.totalAmount ?? debt.total ?? 0
  const paid = debt.paidAmount ?? debt.paid ?? 0
  if (paid >= total) return 'Paid'
  if (debt.dueDate) {
    const due = startOfDay(parseDate(debt.dueDate) ?? new Date())
    const now = startOfDay(new Date())
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / 86400000)
    if (daysUntilDue < 0) return 'Overdue'
    if (daysUntilDue <= 7) return 'Due Soon'
  }
  return debt.status === 'Overdue' || debt.status === 'Due Soon' ? debt.status : 'Active'
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

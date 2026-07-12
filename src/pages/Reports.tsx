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
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Landmark, PercentCircle, PieChart as PieChartIcon, TrendingUp, WalletCards, ChevronDown, type LucideIcon } from 'lucide-react'
import { formatPKR, percent } from '../utils/financeCalculations'
import type { Account, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { cn } from '../utils/ui'

/* ============================================================
   Reports (Analytics) — V3 redesign
   Same data, same props, same calculations. New skin:
   - Orange #FF5C00 leads every chart; income is soft green; the rest warm grey
   - Glass panels + glass tooltips
   - Period selector is a horizontal chip rail (custom range keeps date inputs)
   Drop-in replacement for src/pages/Reports.tsx.
   ============================================================ */

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
  { value: 'last-3-months', label: '3 Months' },
  { value: 'last-6-months', label: '6 Months' },
  { value: 'this-year', label: 'This Year' },
  { value: 'all-time', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
]

const ORANGE = '#FF5C00'
const ORANGE_SOFT = '#FF8A47'
const GREEN = '#7DC98F'
const GREY_AXIS = '#8D8A85'
const GRID = 'rgba(246,243,239,.07)'

const chartColors = [ORANGE, ORANGE_SOFT, '#C9743F', GREY_AXIS, '#5E5B57']

const tooltipStyle = {
  background: 'rgba(28,28,30,.92)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 16,
  boxShadow: '0 12px 32px rgba(0,0,0,.4)',
  color: '#F2EFEA',
  backdropFilter: 'blur(12px)',
  fontFamily: 'Outfit, sans-serif',
  fontSize: 13,
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
  const cashflowData = cashflowTrend(periodTransactions, range)
  const spendingMix = spendingByCategory.length ? spendingByCategory.slice(0, 5) : [{ name: 'No spending', value: 1, percent: 100 }]
  const debtProgress = goalDebt.debtTotal > 0 ? Math.round((goalDebt.debtPaid / goalDebt.debtTotal) * 100) : 0
  const monthChips = availableMonthOptions(transactions)

  return (
    <div className="space-y-5 pb-28">
      {/* ---- Header: Insights / Analytics (mock 6a) ---- */}
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Insights</p>
          <h2 className="mt-0.5 text-[32px] font-semibold leading-tight text-white">Analytics</h2>
        </div>
        <p className="pb-1.5 text-[14px] font-semibold text-[var(--accent)]">{range.label}</p>
      </section>

      {/* ---- Period chip rail ---- */}
      <section className="rounded-[26px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 backdrop-blur-xl">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
          {periodOptions.map((option) => {
            const active = period === option.value
            return (
              <button
                key={option.value}
                className={cn(
                  'flex-none rounded-full border px-4 py-2 text-[13px] font-medium transition',
                  active
                    ? 'border-transparent bg-gradient-to-br from-[#FF5C00] to-[#D14E0C] text-[#16130F]'
                    : 'border-[var(--border)] bg-transparent text-[var(--muted)]',
                )}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            )
          })}
          {monthChips.map((option) => {
            const active = period === option.value
            return (
              <button
                key={option.value}
                className={cn(
                  'flex-none rounded-full border px-4 py-2 text-[13px] font-medium transition',
                  active
                    ? 'border-transparent bg-gradient-to-br from-[#FF5C00] to-[#D14E0C] text-[#16130F]'
                    : 'border-[var(--border)] bg-transparent text-[var(--muted)]',
                )}
                onClick={() => setPeriod(option.value as PeriodSelection)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {period === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input className="form-input" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            <input className="form-input" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
        )}
      </section>

      {/* ---- Stat cards ---- */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Analytics summary">
        <StatCard label="Income" value={formatPKR(totalIncome)} detail={`${incomeTransactions.length} entries`} icon={ArrowDownLeft} tone="positive" />
        <StatCard label="Spending" value={formatPKR(totalExpenses)} detail={`${expenseTransactions.length} entries`} icon={ArrowUpRight} tone="accent" />
        <StatCard label="Net saved" value={netSaved >= 0 ? formatPKR(netSaved) : `-${formatPKR(Math.abs(netSaved))}`} detail={netSaved >= 0 ? 'Positive cashflow' : 'Over budget'} icon={TrendingUp} tone={netSaved >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Save rate" value={`${savingsRate.toFixed(1)}%`} detail={totalIncome > 0 ? 'Income kept' : 'No income yet'} icon={PercentCircle} tone="neutral" />
      </section>

      {/* ---- Insight trio ---- */}
      <section className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          title="Spending"
          eyebrow="Actual expenses"
          value={formatPKR(totalExpenses)}
          note={spendingByCategory[0] ? `${spendingByCategory[0].name} is your top category.` : 'No spending logged in this period.'}
          icon={PieChartIcon}
        >
          <DonutChart data={spendingMix} colors={chartColors} empty={!spendingByCategory.length} />
        </InsightCard>
        <InsightCard
          title="Cashflow"
          eyebrow="Income minus expenses"
          value={netSaved >= 0 ? formatPKR(netSaved) : `-${formatPKR(Math.abs(netSaved))}`}
          note={totalIncome > 0 ? `${savingsRate.toFixed(1)}% savings rate for ${range.label}.` : 'No income logged yet for this period.'}
          icon={WalletCards}
        >
          {hasMoneyMovement ? <CashflowMiniChart data={cashflowData} /> : <EmptyInsight title="No cashflow yet" note="Add income and expenses to see money moving over time." />}
        </InsightCard>
        <InsightCard
          title="Debt"
          eyebrow="Money owed"
          value={formatPKR(goalDebt.debtRemaining)}
          note={goalDebt.debtTotal > 0 ? `${debtProgress}% paid across ${debts.length} items.` : 'No debt items are active.'}
          icon={Landmark}
        >
          <ProgressRing value={goalDebt.debtTotal > 0 ? debtProgress : 100} label={goalDebt.debtTotal > 0 ? 'paid' : 'clear'} tone={goalDebt.debtRemaining > 0 ? 'accent' : 'positive'} />
        </InsightCard>
      </section>

      {/* ---- Spending mix ---- */}
      <ReportPanel eyebrow="Where your money went" title="Spending Mix" meta={`${spendingByCategory.length} categories`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <DonutChart data={spendingMix} colors={chartColors} empty={!spendingByCategory.length} />
          <RankedBars items={spendingByCategory.slice(0, 5)} empty="No actual expenses in this period." />
        </div>
      </ReportPanel>

      {/* ---- Cashflow trend ---- */}
      <ReportPanel eyebrow="Money in and out" title="Cashflow Trend">
        {hasMoneyMovement ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={cashflowData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expenseGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ORANGE} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={GREY_AXIS} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis stroke={GREY_AXIS} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,92,0,.28)', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="income" stroke={GREEN} fill="url(#incomeGlow)" strokeWidth={2.5} activeDot={{ r: 6, strokeWidth: 3, stroke: '#171716', fill: GREEN }} animationDuration={950} animationEasing="ease-out" />
                <Area type="monotone" dataKey="expenses" stroke={ORANGE} fill="url(#expenseGlow)" strokeWidth={3} activeDot={{ r: 7, strokeWidth: 3, stroke: '#171716', fill: ORANGE }} animationDuration={950} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyInsight title="No trend to show yet" note="Once you record transactions, this chart will compare income and spending over the selected period." />}
      </ReportPanel>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:border-[rgba(255,92,0,.3)] hover:text-[var(--accent)]"
        onClick={() => setShowMoreAnalytics((current) => !current)}
      >
        <span>{showMoreAnalytics ? 'Hide more analytics' : 'Show more analytics'}</span>
        <ChevronDown className={cn('transition-transform', showMoreAnalytics && 'rotate-180')} size={18} />
      </button>

      {showMoreAnalytics && (
        <>
          <section className="grid gap-5 xl:grid-cols-2">
            <ReportPanel eyebrow="Income transactions only" title="Income by Source" meta={`${incomeBySource.length} sources`}>
              <RankedBars items={incomeBySource} empty="No income in this period." accent="positive" />
            </ReportPanel>

            <ReportPanel eyebrow={range.start && range.end && sameMonth(range.start, range.end) ? 'Daily spending' : 'Monthly spending'} title="Spending Trend">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ORANGE} stopOpacity={1} />
                        <stop offset="100%" stopColor="#B23F02" stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" stroke={GREY_AXIS} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis stroke={GREY_AXIS} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,92,0,.06)' }} />
                    <Bar dataKey="amount" fill="url(#spendBar)" radius={[10, 10, 4, 4]} animationDuration={850} animationEasing="ease-out" />
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
              <MiniMetric label="Due in next 7 days" value={formatPKR(upcoming.nextSevenDays)} tone="positive" />
              <MiniMetric label="Overdue unpaid" value={formatPKR(upcoming.overdue)} tone="negative" />
              <MiniMetric label="Recurring upcoming" value={String(upcoming.recurring)} />
            </div>
          </ReportPanel>

          <ReportPanel eyebrow="Savings goals, debts, and money owed" title="Goals & Debts">
            <div className="grid gap-3 md:grid-cols-3">
              <MiniMetric label="Goal target" value={formatPKR(goalDebt.goalTarget)} />
              <MiniMetric label="Saved toward goals" value={formatPKR(goalDebt.goalSaved)} tone="positive" />
              <MiniMetric label="Goal progress" value={`${goalDebt.goalProgress}%`} />
              <MiniMetric label="Total debt / money owed" value={formatPKR(goalDebt.debtTotal)} tone="negative" />
              <MiniMetric label="Total paid" value={formatPKR(goalDebt.debtPaid)} />
              <MiniMetric label="Total remaining" value={formatPKR(goalDebt.debtRemaining)} tone="negative" />
              <MiniMetric label="Overdue items" value={String(goalDebt.overdueItems)} tone="negative" />
              <MiniMetric label="Money I owe items" value={String(goalDebt.moneyOwedItems)} />
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <CompactProgressList title="Active savings goals" items={goals.filter((goal) => goal.status !== 'Completed').map((goal) => ({ name: goal.name, current: goal.saved, total: goal.target }))} />
              <CompactProgressList title="Debts & money owed" items={debts.filter((debt) => debtStatus(debt) !== 'Paid').map((debt) => ({ name: debt.title || debt.name || 'Debt', current: debt.paidAmount ?? debt.paid ?? 0, total: debt.totalAmount ?? debt.total ?? 0 }))} tone="negative" />
            </div>
          </ReportPanel>
        </>
      )}

      {/* ---- Category setup ---- */}
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
            {expenseCategories.slice(-8).map((category) => <span key={category} className="rounded-full border border-[var(--border)] bg-white/[.04] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{category}</span>)}
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
            {incomeCategories.slice(-8).map((category) => <span key={category} className="rounded-full border border-[var(--border)] bg-white/[.04] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{category}</span>)}
          </div>
        </ReportPanel>
      </section>
    </div>
  )
}

/* ============ presentational pieces ============ */

function ReportPanel({ eyebrow, title, meta, children }: { eyebrow: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
        </div>
        {meta && <span className="text-xs text-[var(--muted-2)]">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

function InsightCard({ eyebrow, title, value, note, icon: Icon, children }: { eyebrow: string; title: string; value: string; note: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <article className="rounded-[26px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-[14px] border border-[rgba(255,92,0,.22)] bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={18} /></span>
      </div>
      <strong className="mt-4 block truncate text-3xl font-semibold tracking-tight text-white">{value}</strong>
      <p className="mt-2 min-h-10 text-sm leading-5 text-[var(--muted)]">{note}</p>
      <div className="mt-4">{children}</div>
    </article>
  )
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: LucideIcon; tone: 'positive' | 'negative' | 'accent' | 'neutral' }) {
  const toneColor = tone === 'positive' ? 'var(--positive)' : tone === 'negative' ? 'var(--negative)' : tone === 'accent' ? 'var(--accent)' : 'var(--muted)'
  return (
    <article className="flex items-start gap-3 rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 backdrop-blur-xl">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-[14px]" style={{ color: toneColor, background: 'color-mix(in srgb, currentColor 12%, transparent)', border: '1px solid color-mix(in srgb, currentColor 24%, transparent)' }}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted-2)]">{label}</p>
        <strong className="mt-0.5 block truncate text-lg font-semibold tracking-tight text-white">{value}</strong>
        <span className="text-xs text-[var(--muted-2)]">{detail}</span>
      </div>
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
    <div>
      <div className="relative mx-auto h-52 w-52">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="88%"
              paddingAngle={empty ? 0 : 4}
              cornerRadius={12}
              minAngle={empty ? 0 : 7}
              stroke="rgba(23,23,22,.9)"
              strokeWidth={5}
              isAnimationActive
              animationBegin={80}
              animationDuration={900}
              animationEasing="ease-out"
              onClick={(_, index) => setSelectedIndex(index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={empty ? 'rgba(255,255,255,.1)' : colors[index % colors.length]}
                  opacity={!empty && index !== safeSelectedIndex ? 0.4 : 1}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => empty ? ['No data yet', name] : [formatPKR(Number(value)), name]} contentStyle={tooltipStyle} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-2xl font-semibold tracking-tight text-white">{empty ? '0%' : `${selectedPercent}%`}</strong>
          <span className="max-w-[7rem] truncate text-xs text-[var(--muted-2)]">{empty ? 'No data' : selected?.name}</span>
          {!empty && selected && <em className="text-xs not-italic text-[var(--accent)]">{formatPKR(selected.value)}</em>}
        </div>
      </div>
      {!empty && (
        <div className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Spending categories">
          {data.map((item, index) => {
            const itemPercent = item.percent ?? percent(item.value, total)
            const active = index === safeSelectedIndex
            return (
              <button
                key={item.name}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                  active ? 'border-[rgba(255,92,0,.35)] bg-[var(--accent-soft)] text-white' : 'border-[var(--border)] text-[var(--muted)]',
                )}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-pressed={active}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <strong className="font-medium">{item.name}</strong>
                <em className="not-italic text-[var(--muted-2)]">{itemPercent}%</em>
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
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="miniIncomeGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.22} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="miniExpenseGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity={0.28} />
              <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="income" stroke={GREEN} fill="url(#miniIncomeGlow)" strokeWidth={2.4} activeDot={{ r: 5, strokeWidth: 2, stroke: '#171716' }} animationDuration={850} animationEasing="ease-out" />
          <Area type="monotone" dataKey="expenses" stroke={ORANGE} fill="url(#miniExpenseGlow)" strokeWidth={2.6} activeDot={{ r: 5, strokeWidth: 2, stroke: '#171716' }} animationDuration={850} animationEasing="ease-out" />
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ProgressRing({ value, label, tone }: { value: number; label: string; tone: 'accent' | 'positive' }) {
  const clamped = Math.max(0, Math.min(100, value))
  const size = 128
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const color = tone === 'positive' ? GREEN : ORANGE

  return (
    <div className="grid place-items-center py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(246,243,239,.08)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 10px ${color}55)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-2xl font-semibold tracking-tight text-white">{clamped}%</strong>
          <span className="text-xs text-[var(--muted-2)]">{label}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyInsight({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white/[.02] p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{note}</p>
    </div>
  )
}

function RankedBars({ items, empty, accent = 'accent', showCount }: { items: Array<{ name: string; value: number; percent: number; count?: number }>; empty: string; accent?: 'accent' | 'positive'; showCount?: boolean }) {
  if (!items.length) return <p className="rounded-2xl bg-white/[.035] p-4 text-sm text-[var(--muted)]">{empty}</p>
  const fill = accent === 'positive' ? 'linear-gradient(90deg,#7DC98F,#4E9A66)' : 'linear-gradient(90deg,#FF5C00,#D14E0C)'
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={item.name} className="rounded-[18px] border border-[var(--border)] bg-white/[.03] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{item.name}</p>
              {showCount && <p className="mt-0.5 text-xs text-[var(--muted-2)]">{item.count} transactions</p>}
            </div>
            <div className="text-right">
              <strong className="text-sm font-semibold text-white">{formatPKR(item.value)}</strong>
              <p className="text-xs text-[var(--muted-2)]">{item.percent}%</p>
            </div>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: fill }}
              initial={{ width: 0 }}
              animate={{ width: `${item.percent}%` }}
              transition={{ duration: 0.9, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'negative' }) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-white/[.03] p-3.5">
      <p className="text-xs text-[var(--muted-2)]">{label}</p>
      <strong className={cn('mt-1.5 block text-lg font-semibold tracking-tight text-white', tone === 'positive' && 'text-[var(--positive)]', tone === 'negative' && 'text-[var(--negative)]')}>{value}</strong>
    </article>
  )
}

function CompactProgressList({ title, items, tone = 'positive' }: { title: string; items: Array<{ name: string; current: number; total: number }>; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-white/[.025] p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <div className="mt-3 grid gap-3">
        {items.length ? items.map((item) => {
          const progress = percent(item.current, item.total)
          return (
            <div key={item.name}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate text-[var(--muted)]">{item.name}</span>
                <strong className="text-white">{progress}%</strong>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                <motion.div
                  className={cn('h-full rounded-full', tone === 'positive' ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]')}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          )
        }) : <p className="text-sm text-[var(--muted)]">No active items.</p>}
      </div>
    </div>
  )
}

/* ============ data helpers (unchanged from original) ============ */

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

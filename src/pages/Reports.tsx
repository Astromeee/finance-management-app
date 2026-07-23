import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Share2, Trophy } from 'lucide-react'
import type { Account, Debt, Goal, JourneySettings, MoneyWin, Transaction, UpcomingExpense } from '../types/finance'
import { cn } from '../utils/ui'
import { buildPreviousCycleStory, buildWeeklyReveal, detectMoneyLeak } from '../utils/journeyCalculations'
import { trackEvent } from '../lib/analytics'

/* ============================================================
   Insights — "The story." (Vault spec 15a)
   Deliberately curated: ONE chart, three stats, three categories,
   one win. Everything else lives behind "Full report →".
   Same data, same props, same calculations.
   ============================================================ */

type PeriodKey = 'this-month' | 'last-month' | 'last-3-months' | 'this-year'

const periodOptions: Array<{ value: PeriodKey; label: string }> = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: '3 mo' },
  { value: 'this-year', label: 'Year' },
]

type Range = {
  label: string
  start?: Date
  end?: Date
}

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

export function Reports({
  transactions,
  journeySettings,
  moneyWins,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  upcomingExpenses: UpcomingExpense[]
  journeySettings: JourneySettings
  moneyWins: MoneyWin[]
}) {
  const [period, setPeriod] = useState<PeriodKey>('this-month')
  const [showFullReport, setShowFullReport] = useState(false)
  const [showStory, setShowStory] = useState(false)

  const range = useMemo(() => getRange(period), [period])
  const periodTransactions = useMemo(
    () => transactions.filter((transaction) => inRange(transaction.date, range)),
    [range, transactions],
  )
  const incomeTransactions = periodTransactions.filter((transaction) => transaction.type === 'income')
  const expenseTransactions = periodTransactions.filter((transaction) => transaction.type === 'expense')

  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalExpenses = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const netSaved = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? Math.round((netSaved / totalIncome) * 100) : 0

  const spendingByCategory = groupTransactions(expenseTransactions, (transaction) => transaction.category ?? transaction.title, totalExpenses)
  const incomeBySource = groupTransactions(incomeTransactions, (transaction) => transaction.source ?? transaction.category ?? transaction.title, totalIncome)
  const topCategories = spendingByCategory.slice(0, 3)
  const weeks = weeklyBars(expenseTransactions, range)
  const weeklyAverage = weeks.length ? Math.round(weeks.reduce((sum, week) => sum + week.amount, 0) / weeks.length) : 0
  const maxWeek = Math.max(...weeks.map((week) => week.amount), 1)

  const daily = useMemo(() => dailyBars(transactions), [transactions])
  const maxDaily = Math.max(...daily.map((day) => day.amount), 1)
  const todaySpent = daily[daily.length - 1]?.amount ?? 0

  /* Donut: top five categories + everything else, colored from the
     Vault ladder (clay leads, since the biggest slice is the story). */
  const donutTop = spendingByCategory.slice(0, 5)
  const donutRest = spendingByCategory.slice(5).reduce((sum, category) => sum + category.value, 0)
  const donutData = donutRest > 0 ? [...donutTop, { name: 'Everything else', value: donutRest, percent: 0 }] : donutTop

  const moneyLeak = useMemo(() => detectMoneyLeak(transactions), [transactions])
  const weeklyReveal = useMemo(() => buildWeeklyReveal(transactions), [transactions])
  const cycleStory = useMemo(() => buildPreviousCycleStory(journeySettings, transactions), [journeySettings, transactions])
  useEffect(() => { if (moneyLeak) trackEvent('insight_viewed', { surface: 'insights', state: 'available' }) }, [moneyLeak])

  const latestWin = moneyWins[0]
  const winSentence = latestWin
    ? latestWin.title
    : netSaved > 0
      ? <>You kept <span className="vault-digits">Rs {nf(netSaved)}</span> — that&rsquo;s {savingsRate}% of what came in.</>
      : 'Record a full cycle and your first win lands here.'

  const eyebrow = `${range.label} · Story`.toUpperCase()

  const share = () => {
    void navigator.share?.({
      title: 'My Pocket Ledger story',
      text: `${range.label}: received Rs ${nf(totalIncome)}, spent Rs ${nf(totalExpenses)}, kept ${Math.max(0, savingsRate)}%.`,
    })
  }

  return (
    <div className="vault-screen">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{eyebrow}</p>
        <div className="vault-topbar-actions">
          <button aria-label="Share this story" className="vault-iconbtn" type="button" onClick={share}><Share2 size={15} strokeWidth={1.8} /></button>
        </div>
      </header>

      <h1 className="vault-title">The <em>story.</em></h1>

      <div className="vault-chiprow mt-6">
        {periodOptions.map((option) => (
          <button key={option.value} className={cn('vault-chip', period === option.value && 'is-active')} type="button" onClick={() => setPeriod(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <section aria-label="Received, spent and kept" className="vault-strip mt-5">
        <div className="vault-cell">
          <p className="vault-cell-label">Received</p>
          <p className="vault-cell-value">{nf(totalIncome)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">Spent</p>
          <p className="vault-cell-value">{nf(totalExpenses)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">Kept</p>
          <p className="vault-cell-value is-clay">{Math.max(0, savingsRate)}%</p>
        </div>
      </section>

      <section aria-label="Week by week spending" className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="vault-h2">Week by week</h2>
          <p className="vault-h2-sub vault-digits">avg {nf(weeklyAverage)} / week</p>
        </div>
        <div className="vault-bars">
          {weeks.map((week) => (
            <div
              key={week.label}
              className={cn('vault-bar', week.isNow && 'is-now')}
              style={{ height: `${Math.max(8, (week.amount / maxWeek) * 100)}%` }}
            >
              {week.isNow && week.amount > 0 && <span className="vault-bar-value">{nf(week.amount)}</span>}
            </div>
          ))}
        </div>
        <div className="vault-bar-labels">
          {weeks.map((week) => <span key={week.label} className={cn(week.isNow && 'is-now')}>{week.label}</span>)}
        </div>
      </section>

      <section aria-label="Day by day spending, last 14 days" className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="vault-h2">Day by day</h2>
          <p className="vault-h2-sub vault-digits">{todaySpent > 0 ? <>Rs {nf(todaySpent)} today</> : 'last 14 days'}</p>
        </div>
        <div className="vault-bars is-daily">
          {daily.map((day) => (
            <div
              key={day.key}
              className={cn('vault-bar', day.isToday && 'is-now')}
              style={{ height: `${Math.max(5, (day.amount / maxDaily) * 100)}%` }}
            />
          ))}
        </div>
        <div className="vault-bar-labels is-daily">
          {daily.map((day) => <span key={day.key} className={cn(day.isToday && 'is-now')}>{day.label}</span>)}
        </div>
      </section>

      <section aria-label="Spending split by category" className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="vault-h2">The split</h2>
          <p className="vault-h2-sub">this period, by category</p>
        </div>
        {totalExpenses > 0 ? (
          <div className="mt-5 flex items-center gap-5">
            <Donut data={donutData} total={totalExpenses} />
            <div className="min-w-0 flex-1">
              {donutData.map((segment, index) => (
                <div key={segment.name} className="flex items-center gap-2.5 border-b border-[var(--rule-soft)] py-2 last:border-b-0">
                  <span aria-hidden className="h-2 w-2 flex-none rounded-full" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--ink)]">{segment.name}</span>
                  <span className="vault-digits flex-none text-[12.5px] font-semibold text-[var(--taupe)]">{totalExpenses > 0 ? Math.round((segment.value / totalExpenses) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-6 text-sm text-[var(--taupe)]">No spending recorded in this period yet.</p>
        )}
      </section>

      <section aria-label="Where it went" className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="vault-h2">Where it went</h2>
          <button aria-expanded={showFullReport} className="vault-link" type="button" onClick={() => setShowFullReport((value) => { if (!value) trackEvent('story_opened', { surface: 'insights', state: 'available' }); return !value })}>
            Full report →
          </button>
        </div>
        <div className="mt-2">
          {topCategories.length ? topCategories.map((category, index) => (
            <div key={category.name} className="border-b border-[var(--rule-soft)] py-3.5 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="vault-row-title">{category.name}</p>
                <p className="vault-row-amount">{nf(category.value)} <span className="text-[var(--taupe)]">· {category.percent}%</span></p>
              </div>
              <div className="vault-line mt-2.5">
                <div className={cn('vault-line-fill', index === 0 && 'is-clay')} style={{ width: `${category.percent}%` }} />
              </div>
            </div>
          )) : (
            <p className="py-6 text-sm text-[var(--taupe)]">No spending recorded in this period yet.</p>
          )}
        </div>
      </section>

      <section aria-label="This cycle's win" className="vault-espresso mt-8 flex items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--clay)]">This cycle&rsquo;s win</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--bone-text)]">{winSentence}</p>
        </div>
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--clay)] text-[var(--espresso)]"><Trophy size={17} strokeWidth={2} /></span>
      </section>

      {showFullReport && (
        <div className="mt-9">
          <section aria-label="Money leak check">
            <h2 className="vault-h2 text-[20px]">Money leak check</h2>
            {moneyLeak ? (
              <div className="mt-3">
                <p className="vault-row-title">{moneyLeak.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-[var(--ink-soft)]">{moneyLeak.explanation}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--clay)]">{moneyLeak.action}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--taupe)]">We need at least three repeated purchases and enough recent history before naming a leak. No guesses and no shame.</p>
            )}
          </section>

          <section aria-label="Weekly reveal" className="mt-8">
            <h2 className="vault-h2 text-[20px]">Weekly reveal</h2>
            <p className="vault-row-title mt-3">{weeklyReveal?.title ?? 'Your first reveal is forming'}</p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--ink-soft)]">{weeklyReveal?.detail ?? 'Record a few expenses this week and we will surface one useful pattern here.'}</p>
          </section>

          <section aria-label="Money story" className="mt-8">
            <button aria-expanded={showStory} className="flex w-full items-baseline justify-between gap-4 text-left" type="button" onClick={() => setShowStory((value) => { if (!value) trackEvent('story_opened', { surface: 'insights', state: cycleStory ? 'available' : 'empty' }); return !value })}>
              <h2 className="vault-h2 text-[20px]">Money story</h2>
              <ChevronDown className={cn('shrink-0 text-[var(--taupe)] transition-transform', showStory && 'rotate-180')} size={16} />
            </button>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{cycleStory?.headline ?? 'A four-part recap appears after Pocket Ledger has a full cycle of entries.'}</p>
            {showStory && cycleStory && (
              <div className="vault-strip mt-4 flex-wrap">
                <StoryCell label="Money in" value={cycleStory.openingMoney} />
                <StoryCell label="Spent" value={cycleStory.spent} />
                <StoryCell label="Protected" value={cycleStory.protected} />
                <StoryCell label="Left" value={cycleStory.closingMoney} />
              </div>
            )}
          </section>

          <section aria-label="Where it came from" className="mt-8">
            <h2 className="vault-h2 text-[20px]">Where it came from</h2>
            <div className="mt-1">
              {incomeBySource.length ? incomeBySource.slice(0, 3).map((source) => (
                <div key={source.name} className="vault-row">
                  <span className="vault-row-dot is-in" />
                  <span className="vault-row-main"><span className="vault-row-title block">{source.name}</span></span>
                  <span className="vault-row-amount is-in">+{nf(source.value)}</span>
                </div>
              )) : <p className="py-4 text-sm text-[var(--taupe)]">No income recorded in this period.</p>}
            </div>
          </section>

          <section aria-label="Tiny wins" className="mt-8">
            <h2 className="vault-h2 text-[20px]">Tiny wins</h2>
            <div className="mt-1">
              {moneyWins.length ? moneyWins.slice(0, 5).map((win) => (
                <div key={win.id} className="vault-row">
                  <span className="vault-row-dot is-in" />
                  <span className="vault-row-main">
                    <span className="vault-row-title block">{win.title}</span>
                    <span className="vault-row-meta block">{win.detail ?? new Date(win.earnedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                  </span>
                </div>
              )) : <p className="py-4 text-sm leading-6 text-[var(--taupe)]">Your first win can be a completed quest, a goal milestone, a recovered budget, or a purchase you chose to skip.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function StoryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="vault-cell">
      <p className="vault-cell-label">{label}</p>
      <p className="vault-cell-value text-[17px]">Rs {nf(value)}</p>
    </div>
  )
}

/* ============ data helpers ============ */

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

/** Local 'YYYY-MM-DD' key for a Date — all bucket math runs on keys so
 *  timezones and midnight-vs-noon offsets can never skew a bar. */
function keyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayOffset(fromKey: string, toKey: string) {
  return Math.round((new Date(`${toKey}T12:00:00`).getTime() - new Date(`${fromKey}T12:00:00`).getTime()) / 86_400_000)
}

/* The one chart: weekly money-out for the selected range. Month ranges
   use real calendar weeks of the month (days 1–7, 8–14, …); longer
   ranges split into four equal segments. The bucket containing today
   is "Now" (clay). */
function weeklyBars(transactions: Transaction[], range: Range) {
  const start = range.start ?? new Date()
  const end = range.end ?? new Date()
  const startKey = keyOf(start)
  const spanDays = Math.max(1, dayOffset(startKey, keyOf(end)) + 1)
  const isMonth = spanDays <= 31
  const bucketCount = isMonth ? Math.max(1, Math.ceil(spanDays / 7)) : 4
  const bucketDays = isMonth ? 7 : Math.max(1, Math.ceil(spanDays / bucketCount))
  const buckets = Array.from({ length: bucketCount }, () => 0)
  for (const transaction of transactions) {
    const offset = dayOffset(startKey, transaction.date)
    if (offset < 0 || offset >= spanDays || !Number.isFinite(offset)) continue
    buckets[Math.min(bucketCount - 1, Math.floor(offset / bucketDays))] += transaction.amount
  }
  const todayOffset = dayOffset(startKey, keyOf(new Date()))
  const todayIndex = todayOffset >= 0 && todayOffset < spanDays
    ? Math.min(bucketCount - 1, Math.floor(todayOffset / bucketDays))
    : -1
  return buckets.map((amount, index) => ({
    label: index === todayIndex ? 'Now' : `W${index + 1}`,
    amount,
    isNow: index === todayIndex,
  }))
}

/* Day-by-day money out — always the last 14 days, independent of the
   period chips, so it reads as "what did the last two weeks look like". */
function dailyBars(transactions: Transaction[]) {
  const now = new Date()
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - index))
    return { key: keyOf(date), label: String(date.getDate()), amount: 0, isToday: index === 13 }
  })
  const slot = new Map(days.map((day, index) => [day.key, index]))
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    const index = slot.get(transaction.date)
    if (index !== undefined) days[index].amount += transaction.amount
  }
  return days
}

/* Donut palette — Vault tokens only: clay leads, then the warm ladder. */
const DONUT_COLORS = ['#E2703A', '#2B241D', '#9A8F7D', '#877B67', '#B9AE97', '#DDD4C1']

function Donut({ data, total }: { data: Array<{ name: string; value: number }>; total: number }) {
  const R = 54
  const C = 2 * Math.PI * R
  const segments: Array<{ name: string; color: string; dash: number; offset: number }> = []
  let start = 0
  for (const [index, segment] of data.entries()) {
    const fraction = total > 0 ? segment.value / total : 0
    segments.push({
      name: segment.name,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      dash: Math.max(0, fraction * C - 2.5),
      offset: -start * C,
    })
    start += fraction
  }
  return (
    <svg aria-hidden height={148} viewBox="0 0 148 148" width={148} className="flex-none">
      {segments.map((segment) => (
        <circle
          key={segment.name}
          cx={74}
          cy={74}
          fill="none"
          r={R}
          stroke={segment.color}
          strokeDasharray={`${segment.dash} ${C}`}
          strokeDashoffset={segment.offset}
          strokeLinecap="butt"
          strokeWidth={18}
          transform="rotate(-90 74 74)"
        />
      ))}
      <text fill="var(--ink)" fontFamily="'Space Grotesk', sans-serif" fontSize={17} fontWeight={600} textAnchor="middle" x={74} y={72}>Rs {nf(total)}</text>
      <text fill="var(--taupe)" fontFamily="'Schibsted Grotesk', sans-serif" fontSize={10.5} letterSpacing={1.4} textAnchor="middle" x={74} y={90}>SPENT</text>
    </svg>
  )
}

function getRange(period: PeriodKey): Range {
  const today = new Date()
  if (period === 'last-month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return { label: monthLabel(start), start, end: endOfMonth(start) }
  }
  if (period === 'last-3-months') {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    return { label: 'Last 3 months', start, end: endOfDay(today) }
  }
  if (period === 'this-year') {
    return { label: String(today.getFullYear()), start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31, 23, 59, 59) }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { label: monthLabel(start), start, end: endOfMonth(start) }
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

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function endOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-PK', { month: 'long' }).format(date)
}

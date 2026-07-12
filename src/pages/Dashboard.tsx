import { ArrowDown, ArrowRightLeft, ArrowUpRight, Eye, EyeOff, Moon, Plus, Sun, Target, UserRound } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { CategoryIcon } from '../components/icons/CategoryIcon'
import { firstNameOf, getProfile, initialsOf, onProfileChange } from '../lib/profile'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import type { Account, Budget, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import { cn } from '../utils/ui'

/* ============================================================
   Home — V3 redesign.
   Overview/Insights switch + avatar menu (theme toggle, profile),
   Salam greeting, total with vs-last-month delta, account card
   carousel with Manage / + Add money, quick actions, spending
   pace card, recent activity.
   ============================================================ */

type DashboardAction = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | null

const OUTFLOW_TYPES = new Set(['expense', 'goal_saving', 'debt_payment'])

/** Plain amounts (no "Rs") for activity rows and the pace subtitle, per the home mock */
const plain = (amount: number) => Math.round(Math.abs(amount)).toLocaleString('en-US')

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function Dashboard({
  accounts,
  transactions,
  onAction,
  onNavigate,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  onAction: (action: DashboardAction) => void
  onNavigate: (page: string) => void
}) {
  const reduceMotion = useReducedMotion()
  const [showBalance, setShowBalance] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfileState] = useState(getProfile)
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => onProfileChange(setProfileState), [])

  const total = totalBalance(accounts)
  const activeAccount = accounts[Math.min(activeIndex, Math.max(0, accounts.length - 1))] ?? null

  const now = new Date()
  const monthKey = now.toISOString().slice(0, 7)
  const monthName = now.toLocaleDateString('en-US', { month: 'long' })

  const month = useMemo(() => {
    let income = 0
    let spent = 0
    let netFlow = 0
    const weeks = [0, 0, 0, 0, 0]
    const categories = new Map<string, number>()
    for (const transaction of transactions) {
      if (!transaction.date?.startsWith(monthKey)) continue
      if (transaction.type === 'income') {
        income += transaction.amount
        netFlow += transaction.amount
      } else if (OUTFLOW_TYPES.has(transaction.type)) {
        netFlow -= transaction.amount
        if (transaction.type === 'expense') {
          spent += transaction.amount
          const day = Number(transaction.date.slice(8, 10))
          weeks[Math.min(4, Math.floor((day - 1) / 7))] += transaction.amount
          const category = transaction.category ?? transaction.title
          categories.set(category, (categories.get(category) ?? 0) + transaction.amount)
        }
      }
    }
    let topCategory: { name: string; amount: number } | null = null
    for (const [name, amount] of categories) {
      if (!topCategory || amount > topCategory.amount) topCategory = { name, amount }
    }
    return { income, spent, netFlow, weeks, topCategory }
  }, [transactions, monthKey])

  const lastMonthEnd = total - month.netFlow
  const delta = lastMonthEnd > 0 && month.netFlow !== 0 ? ((total - lastMonthEnd) / lastMonthEnd) * 100 : null

  const pace = useMemo(() => {
    const dayIndex = (now.getDay() + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayIndex)
    const labels: string[] = []
    const spend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
      const key = localDateKey(date)
      return transactions
        .filter((transaction) => transaction.date === key && transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0)
    })
    return { spend, labels, todayIndex: dayIndex, max: Math.max(...spend, 1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  const currentWeekIndex = Math.min(4, Math.floor((now.getDate() - 1) / 7))
  const heaviestWeekIndex = month.weeks.indexOf(Math.max(...month.weeks))

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.createdAt ?? `${b.date}T23:59:59`).getTime() - new Date(a.createdAt ?? `${a.date}T23:59:59`).getTime())
        .slice(0, 5),
    [transactions],
  )

  const onCarouselScroll = (event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget
    const cardWidth = node.firstElementChild instanceof HTMLElement ? node.firstElementChild.offsetWidth + 12 : 1
    const index = Math.round(node.scrollLeft / cardWidth)
    if (index !== activeIndex) {
      setActiveIndex(Math.max(0, Math.min(accounts.length - 1, index)))
      // haptic tick as each card snaps into place (supported on Android/Chrome)
      navigator.vibrate?.(10)
    }
  }

  const scrollToIndex = (index: number) => {
    const node = carouselRef.current
    if (!node) return
    const cardWidth = node.firstElementChild instanceof HTMLElement ? node.firstElementChild.offsetWidth + 12 : 0
    node.scrollTo({ left: index * cardWidth, behavior: 'smooth' })
  }

  const quickActions = [
    { label: 'Income', icon: ArrowDown, action: 'income' as const },
    { label: 'Expense', icon: ArrowUpRight, action: 'expense' as const },
    { label: 'Transfer', icon: ArrowRightLeft, action: 'transfer' as const },
    { label: 'Goal', icon: Target, action: 'goal' as const },
  ]

  return (
    <div className="mx-auto w-full max-w-xl pb-6 pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-2">
      {/* ---- Header: segmented control + avatar menu ---- */}
      <header className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[.055] p-1 backdrop-blur-xl">
          <button className="seg-active rounded-full px-4.5 py-2 text-[13px] font-bold">Overview</button>
          <button className="rounded-full px-4.5 py-2 text-[13px] font-semibold text-[var(--muted)]" onClick={() => onNavigate('reports')}>
            Insights
          </button>
        </div>
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-label="Profile menu"
            className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[var(--accent)] text-[13px] font-extrabold text-[#16130F]"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {profile.avatar ? <img alt="" className="h-full w-full object-cover" src={profile.avatar} /> : initialsOf(profile.name)}
          </button>
          <span aria-hidden className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white/90 bg-[var(--bg)]" />
          {menuOpen && (
            <>
              <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-60 rounded-[20px] border border-white/10 bg-[var(--surface)] p-2 shadow-[0_24px_60px_rgba(0,0,0,.5)]"
                initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
              >
                <button
                  className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-[14px] font-semibold text-white transition hover:bg-white/[.05]"
                  onClick={() => {
                    setMenuOpen(false)
                    onNavigate('profile')
                  }}
                >
                  <UserRound size={17} className="text-[var(--accent)]" /> Edit profile
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-[14px] font-semibold text-white transition hover:bg-white/[.05]"
                  onClick={() => setThemeState(toggleTheme())}
                >
                  {theme === 'dark' ? <Sun size={17} className="text-[var(--accent)]" /> : <Moon size={17} className="text-[var(--accent)]" />}
                  Switch to {theme === 'dark' ? 'light' : 'dark'} mode
                </button>
              </motion.div>
            </>
          )}
        </div>
      </header>

      {/* ---- Greeting ---- */}
      <h1 className="mt-6 text-[30px] font-bold leading-tight text-white">Salam, {firstNameOf(profile.name)} 👋</h1>
      <p className="mt-1 text-[15px] text-[var(--muted)]">Here's your money at a glance</p>

      {/* ---- Total + delta ---- */}
      <div className="mt-5 flex items-center gap-3">
        <h2 className="text-[42px] font-semibold leading-none tracking-tight text-white tabular-nums">{showBalance ? formatPKR(total) : 'Rs •••••'}</h2>
        <button aria-label={showBalance ? 'Hide balances' : 'Show balances'} className="mt-1 grid h-9 w-9 place-items-center rounded-full text-[var(--muted-2)]" onClick={() => setShowBalance((current) => !current)}>
          {showBalance ? <Eye size={19} /> : <EyeOff size={19} />}
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-[var(--muted)]">
        {delta !== null && (
          <>
            <span className={cn('font-semibold', delta >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </span>
            {' vs last month · '}
          </>
        )}
        total across {accounts.length} account{accounts.length === 1 ? '' : 's'}
      </p>

      {/* ---- Account card block ---- */}
      <section className="mt-6 rounded-[26px] border border-white/10 bg-white/[.055] p-4 backdrop-blur-xl">
        {activeAccount ? (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-[14px] font-semibold text-white">
                {activeAccount.name} <span className="font-normal text-[var(--muted-2)]">· {activeAccount.cardLabel || activeAccount.id.slice(0, 4).toUpperCase()}</span>
              </p>
              <div className="flex items-center gap-1.5">
                {accounts.map((account, index) => (
                  <button
                    key={account.id}
                    aria-label={`Go to ${account.name}`}
                    className={cn('h-1.5 rounded-full transition-all', index === activeIndex ? 'w-4 bg-[var(--accent)]' : 'w-1.5 bg-white/20')}
                    onClick={() => scrollToIndex(index)}
                  />
                ))}
              </div>
            </div>

            <div
              ref={carouselRef}
              className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
              onScroll={onCarouselScroll}
            >
              {accounts.map((account) => (
                <div key={account.id} className="dash-account-card relative flex min-h-[200px] min-w-full snap-center snap-always flex-col overflow-hidden rounded-[22px] p-6">
                  <PixelMosaic />
                  <p className="text-[13px] text-[var(--muted-2)]">Available balance</p>
                  <p className="relative mt-2 text-[36px] font-semibold leading-none tracking-tight text-white tabular-nums">
                    {showBalance ? (
                      <>
                        {formatPKR(account.balance)}
                        <span className="text-[16px] font-normal text-[var(--muted-2)]">.00</span>
                      </>
                    ) : (
                      'Rs •••••'
                    )}
                  </p>
                  <div className="relative mt-auto flex items-center justify-between pt-10">
                    <p className="text-[10.5px] font-semibold tracking-[.18em] text-[var(--muted-2)]">POCKET LEDGER</p>
                    <p className="text-[12px] text-[var(--muted-2)]">{account.type[0].toUpperCase()}{account.type.slice(1)} account</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button className="min-h-12 rounded-full border border-white/10 bg-white/[.04] text-[14px] font-semibold text-white" onClick={() => onNavigate('accounts')}>
                Manage
              </button>
              <button className="min-h-12 rounded-full bg-[var(--accent)] text-[14px] font-bold text-[#16130F]" onClick={() => onAction('income')}>
                + Add money
              </button>
            </div>
          </>
        ) : (
          <button className="grid w-full place-items-center gap-2 rounded-[20px] border border-dashed border-white/15 px-5 py-9 text-center" onClick={() => onNavigate('accounts')}>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)] text-[#16130F]"><Plus size={20} /></span>
            <span className="text-[15px] font-semibold text-white">Add your first account</span>
            <span className="text-[12.5px] text-[var(--muted)]">Create cash, bank, or wallet accounts to start tracking.</span>
          </button>
        )}
      </section>

      {/* ---- Quick actions ---- */}
      <section aria-label="Quick actions" className="mt-4 grid grid-cols-4 gap-3">
        {quickActions.map(({ label, icon: Icon, action }, index) => (
          <motion.button
            key={label}
            className={cn(
              'flex flex-col items-center gap-2 rounded-[22px] px-2 py-4',
              index === 0 ? 'bg-[var(--accent)] text-[#16130F]' : 'border border-white/10 bg-white/[.055] text-[var(--text)] backdrop-blur-xl',
            )}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            onClick={() => onAction(action)}
          >
            <Icon size={20} strokeWidth={2} />
            <span className={cn('text-[12px] font-semibold', index === 0 ? 'text-[#16130F]' : 'text-[var(--muted)]')}>{label}</span>
          </motion.button>
        ))}
      </section>

      {/* ---- Spending pace ---- */}
      <section className="mt-4 rounded-[26px] border border-white/10 bg-white/[.055] p-5 backdrop-blur-xl">
        <div className="flex items-baseline justify-between">
          <p className="text-[12.5px] text-[var(--muted)]">{monthName} · spending pace</p>
          <button className="text-[12.5px] font-semibold text-[var(--accent)]" onClick={() => onNavigate('reports')}>
            Reports →
          </button>
        </div>
        <p className="mt-1.5 text-[24px] font-semibold text-white tabular-nums">
          {selectedDay === null ? (
            <>
              {formatPKR(month.spent)}{' '}
              <span className="text-[14px] font-normal text-[var(--muted-2)]">{month.income > 0 ? `of ${plain(month.income)} in` : 'spent this month'}</span>
            </>
          ) : (
            <>
              {formatPKR(pace.spend[selectedDay])}{' '}
              <span className="text-[14px] font-normal text-[var(--muted-2)]">spent {pace.labels[selectedDay]}</span>
            </>
          )}
        </p>

        <div className="mt-4 flex h-16 items-end gap-2">
          {pace.spend.map((amount, index) => {
            const future = index > pace.todayIndex
            const active = selectedDay === null ? index === pace.todayIndex : index === selectedDay
            return (
              <button
                key={index}
                type="button"
                aria-label={`${pace.labels[index]}: ${formatPKR(amount)}`}
                disabled={future}
                className={cn('flex-1 rounded-[9px] transition-all', future && 'border border-dashed border-white/15')}
                style={{
                  height: future ? '34%' : `${Math.max(12, (amount / pace.max) * 100)}%`,
                  background: future ? 'transparent' : active ? 'linear-gradient(180deg,#FF5C00,#D14E0C)' : 'var(--surface-3)',
                  boxShadow: active && !future ? '0 0 16px rgba(255,92,0,.35)' : undefined,
                }}
                onClick={() => setSelectedDay((current) => (current === index ? null : index))}
              />
            )
          })}
        </div>

        <p className="mt-4 text-[12.5px] text-[var(--muted)]">
          {month.spent > 0 && month.topCategory ? (
            <>
              {heaviestWeekIndex === currentWeekIndex ? 'This week is your heaviest' : `Week ${heaviestWeekIndex + 1} was your heaviest`} —{' '}
              <strong className="font-semibold text-white">{month.topCategory.name}</strong> leads at Rs {plain(month.topCategory.amount)}.
            </>
          ) : (
            'Add an expense to see your spending pace.'
          )}
        </p>
      </section>

      {/* ---- Recent activity ---- */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[19px] font-bold text-white">Recent activity</h3>
          <button className="text-[13px] font-semibold text-[var(--accent)]" onClick={() => onNavigate('transactions')}>
            View all
          </button>
        </div>
        <div className="mt-1.5">
          {recent.length ? (
            recent.map((transaction) => {
              const sign = transaction.type === 'income' ? '+' : OUTFLOW_TYPES.has(transaction.type) ? '-' : ''
              return (
                <button
                  key={transaction.id}
                  className="flex w-full items-center gap-3 border-b border-white/5 py-3.5 text-left last:border-b-0"
                  onClick={() => onNavigate('transactions')}
                >
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] border border-white/10 bg-white/[.045] text-[var(--muted)]">
                    <CategoryIcon label={transaction.category ?? transaction.source ?? transaction.title} type={transaction.type} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[14.5px] font-semibold text-white">{transaction.title}</strong>
                    <small className="text-[12px] text-[var(--muted-2)]">{transaction.account} · {formatWhen(transaction)}</small>
                  </span>
                  <span
                    className={cn(
                      'text-[14.5px] font-semibold tabular-nums',
                      sign === '+' ? 'text-[var(--positive)]' : sign === '-' ? 'text-[var(--negative)]' : 'text-[var(--muted)]',
                    )}
                  >
                    {sign}{plain(transaction.amount)}
                  </span>
                </button>
              )
            })
          ) : (
            <p className="rounded-[20px] border border-white/10 bg-white/[.035] px-4 py-5 text-center text-[13px] text-[var(--muted)]">
              No activity yet — your newest transactions will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

/* Decorative pixel-mosaic in the account card's top-right corner (home mock) */
const MOSAIC_OPACITY = [0, 0.35, 0.9, 1, 0, 0.55, 0.75, 0.95, 0, 0, 0.4, 0.65, 0, 0, 0, 0.3]

function PixelMosaic() {
  return (
    <div aria-hidden className="absolute right-4 top-4 grid grid-cols-4 gap-[3px]">
      {MOSAIC_OPACITY.map((opacity, index) => (
        <span key={index} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: opacity ? `rgba(255,92,0,${opacity})` : 'transparent' }} />
      ))}
    </div>
  )
}

function formatWhen(transaction: Transaction) {
  const todayKey = localDateKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (transaction.date === todayKey) {
    if (transaction.createdAt) {
      const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(transaction.createdAt))
      return `Today, ${time}`
    }
    return 'Today'
  }
  if (transaction.date === localDateKey(yesterday)) return 'Yesterday'
  const parsed = new Date(`${transaction.date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return transaction.date
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed)
}

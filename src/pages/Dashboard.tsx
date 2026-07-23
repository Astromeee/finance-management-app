import { ArrowUpRight, Bell, Eye, EyeOff, Settings, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { firstNameOf, getProfile, initialsOf } from '../lib/profile'
import { trackEvent } from '../lib/analytics'
import type { Account, Budget, Category, Debt, Goal, JourneySettings, Transaction, UpcomingExpense } from '../types/finance'
import { calculateSafeSpend, detectMoneyLeak } from '../utils/journeyCalculations'
import { cn } from '../utils/ui'

type DashboardAction = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | null

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

function railStep(rail: HTMLElement) {
  const firstCard = rail.firstElementChild
  if (!(firstCard instanceof HTMLElement)) return 1
  const styles = window.getComputedStyle(rail)
  const gap = Number.parseFloat(styles.columnGap || styles.gap)
  return firstCard.offsetWidth + (Number.isFinite(gap) ? gap : 0)
}

/** "Today" / "Yesterday" / "Jul 16" — matches the entry rows in the Home mock. */
function relativeDay(date: string) {
  const today = new Date()
  const then = new Date(`${date}T12:00:00`)
  if (Number.isNaN(then.getTime())) return date
  const days = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "WED · 23 JULY" — the Home top-bar eyebrow. */
function todayEyebrow() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' })
  const day = now.getDate()
  const month = now.toLocaleDateString('en-GB', { month: 'long' })
  return `${weekday} · ${day} ${month}`.toUpperCase()
}

function greetingWord() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning,'
  if (hour < 17) return 'Good afternoon,'
  return 'Good evening,'
}

export function Dashboard({
  accounts,
  transactions,
  budgets,
  upcomingExpenses,
  categories,
  journeySettings,
  onNavigate,
  onSetupJourney,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  categories: Category[]
  journeySettings: JourneySettings
  onAction: (action: DashboardAction) => void
  onNavigate: (page: string) => void
  onPlanPurchase: () => void
  onSetupJourney: () => void
  onTourComplete: () => void
}) {
  const [showBalance, setShowBalance] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeBalanceIndex, setActiveBalanceIndex] = useState(0)
  const balanceRailRef = useRef<HTMLDivElement>(null)
  const balanceRailFrame = useRef<number | undefined>(undefined)
  const activeBalanceCard = useRef(0)
  const profile = getProfile()
  const safeSpend = useMemo(() => calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses, settings: journeySettings }), [accounts, budgets, categories, upcomingExpenses, journeySettings])
  const insight = useMemo(() => detectMoneyLeak(transactions), [transactions])
  const recent = useMemo(() => [...transactions].sort((a, b) => new Date(b.createdAt ?? `${b.date}T23:59:59`).getTime() - new Date(a.createdAt ?? `${a.date}T23:59:59`).getTime()).slice(0, 3), [transactions])
  const needsSetup = safeSpend.state === 'needs_setup'
  const totalBalance = useMemo(() => accounts.reduce((sum, account) => sum + account.balance, 0), [accounts])

  const cards = useMemo(() => [
    { id: 'total', label: 'Total balance', amount: totalBalance, foot: accounts.length ? `Across ${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'} · updated just now` : 'Add an account to begin' },
    ...accounts.map((account) => ({ id: account.id, label: account.name, amount: account.balance, foot: account.includeInSafeSpend === false ? 'Excluded from safe spend' : 'In safe spend · updated just now' })),
  ], [accounts, totalBalance])

  const handleBalanceRailScroll = useCallback(() => {
    if (balanceRailFrame.current !== undefined) window.cancelAnimationFrame(balanceRailFrame.current)
    balanceRailFrame.current = window.requestAnimationFrame(() => {
      const rail = balanceRailRef.current
      if (!rail) return
      const nextCard = Math.max(0, Math.min(cards.length - 1, Math.round(rail.scrollLeft / railStep(rail))))
      if (nextCard === activeBalanceCard.current) return
      activeBalanceCard.current = nextCard
      setActiveBalanceIndex(nextCard)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(8)
    })
  }, [cards.length])

  useEffect(() => () => {
    if (balanceRailFrame.current !== undefined) window.cancelAnimationFrame(balanceRailFrame.current)
  }, [])

  const scrollToBalanceIndex = useCallback((index: number) => {
    const rail = balanceRailRef.current
    if (!rail) return
    rail.scrollTo({ left: index * railStep(rail), behavior: 'smooth' })
  }, [])

  /* Leak headline: "Dining Out — Rs 40,139 in 30 days" */
  const leakName = insight ? insight.title.replace(/ is quietly adding up$/, '') : null

  const statePill = { comfortable: null, needs_setup: null, watchful: <span className="vault-pill is-espresso mt-1.5">Watchful</span>, protect: <span className="vault-pill mt-1.5">Protect</span> }[safeSpend.state]

  return (
    <div className="vault-screen">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{todayEyebrow()}</p>
        <div className="vault-topbar-actions">
          <button aria-label="Notifications" className="vault-iconbtn" type="button" onClick={() => onNavigate('settings')}><Bell size={15} strokeWidth={1.8} /></button>
          <div className="relative">
            <button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Profile menu" className="vault-avatar" type="button" onClick={() => setMenuOpen((current) => !current)}>
              {profile.avatar ? <img alt="" src={profile.avatar} /> : initialsOf(profile.name)}
            </button>
            {menuOpen && <>
              <button aria-label="Close profile menu" className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="vault-outline absolute right-0 top-12 z-50 w-56 p-2 shadow-xl" role="menu">
                <MenuButton icon={UserRound} label="Edit profile" onClick={() => onNavigate('profile')} />
                <MenuButton icon={Settings} label="Settings" onClick={() => onNavigate('settings')} />
              </div>
            </>}
          </div>
        </div>
      </header>

      <h1 className="vault-title mt-8">
        {greetingWord()}<br />
        <em>{firstNameOf(profile.name) || 'friend'}.</em>
      </h1>

      <section aria-label="Your balances" className="mt-7">
        <div ref={balanceRailRef} aria-label="Balances. Swipe to view each account." className="vault-carousel" onScroll={handleBalanceRailScroll} role="region">
          {cards.map((card, index) => (
            <article key={card.id} aria-label={`${card.label} balance`} className="vault-balance-card">
              <div className="flex items-start justify-between gap-3">
                <p className="vault-balance-eyebrow">{card.label}</p>
                <button aria-label={showBalance ? 'Hide money amounts' : 'Show money amounts'} className="text-[var(--sand-dim)]" type="button" tabIndex={index === activeBalanceIndex ? 0 : -1} onClick={() => setShowBalance((value) => !value)}>
                  {showBalance ? <Eye size={17} strokeWidth={1.8} /> : <EyeOff size={17} strokeWidth={1.8} />}
                </button>
              </div>
              <div className="vault-balance-amount">
                <span className="vault-currency">Rs</span>
                <span className="vault-numeral">{showBalance ? nf(card.amount) : '••••'}</span>
              </div>
              <div className="vault-balance-foot">
                <span className="truncate">{card.foot}</span>
                {cards.length > 1 && <span className="vault-swipe">⟷ Swipe</span>}
              </div>
            </article>
          ))}
        </div>
        {cards.length > 1 && (
          <div className="vault-carousel-dots" role="tablist" aria-label="Balance cards">
            {cards.map((card, index) => (
              <button key={card.id} aria-label={`Show ${card.label}`} aria-selected={index === activeBalanceIndex} className={cn('vault-carousel-dot', index === activeBalanceIndex && 'is-active')} role="tab" type="button" onClick={() => scrollToBalanceIndex(index)} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Your cycle" className="vault-strip mt-7">
        <button className="vault-cell text-left" type="button" onClick={() => needsSetup ? onSetupJourney() : onNavigate('budgets')}>
          <p className="vault-cell-label">Safe today</p>
          <p className="vault-cell-value">{needsSetup ? '—' : showBalance ? `Rs ${nf(safeSpend.safeToSpendToday)}` : 'Rs ••'}</p>
          {statePill}
        </button>
        <div className="vault-cell">
          <p className="vault-cell-label">Cycle</p>
          <p className="vault-cell-value">{safeSpend.cycle ? <>Day {safeSpend.cycle.daysElapsed}<span className="vault-sub">/{safeSpend.cycle.totalDays}</span></> : '—'}</p>
        </div>
        <button className="vault-cell text-left" type="button" onClick={() => onNavigate('goals')}>
          <p className="vault-cell-label">Next income</p>
          <p className="vault-cell-value">{safeSpend.cycle ? <>{safeSpend.cycle.daysRemaining} <span className="vault-sub">days</span></> : '—'}</p>
        </button>
      </section>

      {needsSetup ? (
        <button className="vault-leak mt-7" type="button" onClick={onSetupJourney}>
          <span className="min-w-0">
            <span className="vault-leak-eyebrow block">Finish your setup</span>
            <span className="vault-leak-title block">Set your income date to unlock your daily number</span>
          </span>
          <span className="vault-leak-arrow"><ArrowUpRight size={18} strokeWidth={2} /></span>
        </button>
      ) : insight && leakName ? (
        <button className="vault-leak mt-7" type="button" onClick={() => { trackEvent('journey_breakdown_opened', { surface: 'home', state: safeSpend.state }); onNavigate('reports') }}>
          <span className="min-w-0">
            <span className="vault-leak-eyebrow block">Money leak found</span>
            <span className="vault-leak-title block">{leakName} — <span className="vault-digits">Rs {nf(insight.amount)}</span> in 30 days</span>
          </span>
          <span className="vault-leak-arrow"><ArrowUpRight size={18} strokeWidth={2} /></span>
        </button>
      ) : null}

      <section aria-label="Latest entries" className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="vault-h2">Today</h2>
          <button className="vault-link" type="button" onClick={() => onNavigate('transactions')}>Ledger →</button>
        </div>
        <div className="mt-1">
          {recent.length ? recent.map((transaction) => <EntryRow key={transaction.id} transaction={transaction} />) : (
            <p className="py-8 text-center text-sm text-[var(--taupe)]">No entries yet — tap <span className="font-bold text-[var(--clay)]">+</span> to record your first one.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function EntryRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income'
  const isTransfer = transaction.type === 'transfer'
  return (
    <div className="vault-row">
      <span className={cn('vault-row-dot', isIncome && 'is-in', isTransfer && 'is-move')} />
      <div className="vault-row-main">
        <p className="vault-row-title">{transaction.title}</p>
        <p className="vault-row-meta">{transaction.account ?? transaction.category} · {relativeDay(transaction.date)}</p>
      </div>
      <p className={cn('vault-row-amount', isIncome && 'is-in', isTransfer && 'is-move')}>
        {isTransfer ? nf(transaction.amount) : `${isIncome ? '+' : '−'}${nf(transaction.amount)}`}
      </p>
    </div>
  )
}

function MenuButton({ icon: Icon, label, onClick }: { icon: typeof Settings; label: string; onClick: () => void }) {
  return <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]" onClick={onClick}><Icon className="text-[var(--clay)]" size={17} strokeWidth={1.8} />{label}</button>
}

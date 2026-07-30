import { ArrowRight, ArrowUpRight, Bell, ClipboardList, Eye, EyeOff, Settings, Target, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { firstNameOf, getProfile, initialsOf } from '../lib/profile'
import { trackEvent } from '../lib/analytics'
import type { Account, Budget, Category, Debt, Goal, JourneySettings, Transaction, UpcomingExpense, WishlistItem } from '../types/finance'
import { calculateSafeSpend, detectMoneyLeak } from '../utils/journeyCalculations'
import { cn } from '../utils/ui'
import { buildAttentionItems } from '../utils/attention'

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

type Notice = { id: string; dot: 'out' | 'in' | 'move'; title: string; meta: string; page: string }

export function Dashboard({
  accounts,
  transactions,
  goals,
  budgets,
  upcomingExpenses,
  categories,
  journeySettings,
  wishlistItems = [],
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
  wishlistItems?: WishlistItem[]
  onAction: (action: DashboardAction) => void
  onNavigate: (page: string) => void
  onPlanPurchase: () => void
  onSetupJourney: () => void
  onTourComplete: () => void
}) {
  const [showBalance, setShowBalance] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [noticesOpen, setNoticesOpen] = useState(false)
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

  /* One ranked inbox shared with desktop. Each item explains the issue and
     routes to the page where the user can resolve it. */
  const notices = useMemo(() => {
    return buildAttentionItems({ accounts, budgets, goals, transactions, upcomingExpenses, wishlistItems }).slice(0, 6).map<Notice>((item) => ({
      id: item.id,
      dot: item.priority === 'urgent' ? 'out' : item.priority === 'important' ? 'move' : 'in',
      title: item.title,
      meta: `${item.detail} ${item.action}`,
      page: item.page,
    }))
  }, [accounts, budgets, goals, transactions, upcomingExpenses, wishlistItems])

  return (
    <div className="vault-screen">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{todayEyebrow()}</p>
        <div className="vault-topbar-actions">
          <div className="relative">
            <button aria-expanded={noticesOpen} aria-haspopup="menu" aria-label={notices.length ? `Notifications — ${notices.length} waiting` : 'Notifications'} className="vault-iconbtn relative" type="button" onClick={() => { setMenuOpen(false); setNoticesOpen((current) => !current) }}>
              <Bell size={15} strokeWidth={1.8} />
              {notices.length > 0 && <span aria-hidden className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-[var(--clay)]" />}
            </button>
            {noticesOpen && <>
              <button aria-label="Close notifications" className="fixed inset-0 z-40" onClick={() => setNoticesOpen(false)} />
              <div className="vault-outline absolute right-[-48px] top-12 z-50 w-[20rem] max-w-[calc(100vw-40px)] px-4 py-3 shadow-xl" role="menu" aria-label="Notifications">
                <p className="vault-eyebrow">Needs attention</p>
                {notices.length ? (
                  <div className="mt-1">
                    {notices.map((notice) => (
                      <button key={notice.id} className="vault-row" role="menuitem" type="button" onClick={() => { setNoticesOpen(false); onNavigate(notice.page) }}>
                        <span className={cn('vault-row-dot', notice.dot === 'in' && 'is-in', notice.dot === 'move' && 'is-move')} />
                        <span className="vault-row-main">
                          <span className="vault-row-title block whitespace-normal">{notice.title}</span>
                          <span className="vault-row-meta block">{notice.meta}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-5 text-center text-sm text-[var(--taupe)]">You&rsquo;re all caught up. Nothing needs you right now.</p>
                )}
              </div>
            </>}
          </div>
          <div className="relative">
            <button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Profile menu" className="vault-avatar" type="button" onClick={() => { setNoticesOpen(false); setMenuOpen((current) => !current) }}>
              {profile.avatar ? <img alt="" src={profile.avatar} /> : initialsOf(profile.name)}
            </button>
            {menuOpen && <>
              <button aria-label="Close profile menu" className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="vault-outline absolute right-0 top-12 z-50 w-56 p-2 shadow-xl" role="menu">
                <MenuButton icon={ClipboardList} label="The plan" onClick={() => onNavigate('budgets')} />
                <MenuButton icon={Target} label="Your paths (goals)" onClick={() => onNavigate('goals')} />
                <div aria-hidden className="mx-3 my-1 border-t border-[var(--rule-soft)]" />
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

      <p className="vault-insight-caption mt-7">Tap a card to dig in</p>
      <section aria-label="Your cycle" className="vault-insight-row mt-3">
        <button className="vault-insight is-tappable" type="button" onClick={() => needsSetup ? onSetupJourney() : onNavigate('budgets')}>
          <span className="vault-insight-label">Safe today</span>
          <span className="vault-insight-value">
            {needsSetup ? '—' : showBalance ? <><span className="cur">Rs</span> {nf(safeSpend.safeToSpendToday)}</> : <><span className="cur">Rs</span> ••</>}
          </span>
          <span className="vault-insight-foot">
            <span className="vault-insight-link">{needsSetup ? 'Finish setup' : 'Open plan'}</span>
            <span className="vault-insight-arrow"><ArrowRight size={13} strokeWidth={2.4} /></span>
          </span>
        </button>
        <div className="vault-insight is-flat">
          <span className="vault-insight-label">Cycle</span>
          <span className="vault-insight-value">{safeSpend.cycle ? <>Day {safeSpend.cycle.daysElapsed}<span className="unit">/{safeSpend.cycle.totalDays}</span></> : '—'}</span>
          <span className="vault-insight-foot">
            <span className="vault-insight-flat">On track</span>
          </span>
        </div>
        <button className="vault-insight is-tappable" type="button" onClick={() => onNavigate('accounts')}>
          <span className="vault-insight-label">Next income</span>
          <span className="vault-insight-value">{safeSpend.cycle ? <>{safeSpend.cycle.daysRemaining} <span className="unit">days</span></> : '—'}</span>
          <span className="vault-insight-foot">
            <span className="vault-insight-link">Open wallet</span>
            <span className="vault-insight-arrow"><ArrowRight size={13} strokeWidth={2.4} /></span>
          </span>
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

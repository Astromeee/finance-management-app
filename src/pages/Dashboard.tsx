import { ArrowDown, ArrowRight, ArrowRightLeft, ArrowUpRight, Eye, EyeOff, Flag, Settings, Sparkles, Target, UserRound, WalletCards } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { CategoryIcon } from '../components/icons/CategoryIcon'
import { firstNameOf, getProfile, initialsOf } from '../lib/profile'
import { trackEvent } from '../lib/analytics'
import type { Account, Budget, Category, Debt, Goal, JourneySettings, Transaction, UpcomingExpense } from '../types/finance'
import { formatPKR } from '../utils/financeCalculations'
import { calculateSafeSpend, detectMoneyLeak } from '../utils/journeyCalculations'
import { cn } from '../utils/ui'

type DashboardAction = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | null

const CARD_GAP = 14

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

export function Dashboard({
  accounts,
  transactions,
  budgets,
  upcomingExpenses,
  categories,
  journeySettings,
  onAction,
  onNavigate,
  onPlanPurchase,
  onSetupJourney,
  onTourComplete,
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
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(!journeySettings.tourCompleted)
  const [slide, setSlide] = useState(0)
  const lastSlide = useRef(0)
  const railRef = useRef<HTMLDivElement>(null)
  const profile = getProfile()
  const safeSpend = useMemo(() => calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses, settings: journeySettings }), [accounts, budgets, categories, upcomingExpenses, journeySettings])
  const insight = useMemo(() => detectMoneyLeak(transactions), [transactions])
  const recent = useMemo(() => [...transactions].sort((a, b) => new Date(b.createdAt ?? `${b.date}T23:59:59`).getTime() - new Date(a.createdAt ?? `${a.date}T23:59:59`).getTime()).slice(0, 3), [transactions])
  const progress = safeSpend.cycle ? Math.max(0, Math.min(100, (safeSpend.cycle.daysElapsed / safeSpend.cycle.totalDays) * 100)) : 0
  const needsSetup = safeSpend.state === 'needs_setup'
  const totalBalance = useMemo(() => accounts.reduce((sum, account) => sum + account.balance, 0), [accounts])
  const stateCopy = {
    comfortable: { label: 'Comfortable', className: 'journey-status-positive' },
    watchful: { label: 'Watchful', className: 'journey-status-warning' },
    protect: { label: 'Protect', className: 'journey-status-negative' },
    needs_setup: { label: 'Needs setup', className: 'journey-status-warning' },
  }[safeSpend.state]

  // one dot per card: the safe-to-spend card, then one per account
  const slides = 1 + accounts.length

  const onRailScroll = () => {
    const rail = railRef.current
    const card = rail?.firstElementChild as HTMLElement | null
    if (!rail || !card) return
    const next = Math.max(0, Math.min(slides - 1, Math.round(rail.scrollLeft / (card.offsetWidth + CARD_GAP))))
    // guard on a ref, not on `slide`: scroll fires far faster than React
    // re-renders, so a state check would be stale and buzz several times per swipe
    if (next === lastSlide.current) return
    lastSlide.current = next
    setSlide(next)
    // a short tick as each card snaps into place (no-op where unsupported)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(8)
  }

  const completeCoach = () => {
    setCoachOpen(false)
    onTourComplete()
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-8 pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">Salam, {firstNameOf(profile.name)} <span aria-hidden="true">👋</span></p>
          <h1 className="mt-0.5 font-display text-2xl font-bold">Overview</h1>
        </div>
        <div className="relative">
          <button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Profile menu" className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]" onClick={() => setMenuOpen((current) => !current)}>{profile.avatar ? <img alt="" className="h-full w-full object-cover" src={profile.avatar} /> : initialsOf(profile.name)}</button>
          {menuOpen && <><button aria-label="Close profile menu" className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} /><div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-2xl"><MenuButton icon={UserRound} label="Edit profile" onClick={() => onNavigate('profile')} /><MenuButton icon={Settings} label="Settings" onClick={() => onNavigate('settings')} /></div></>}
        </div>
      </header>

      <section aria-label="Your money" className="mt-5">
        <div className="home-rail" onScroll={onRailScroll} ref={railRef}>
          <article className="home-rail-card flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--muted)]">Safe to spend today</p>
              <span className={cn('journey-status', stateCopy.className)}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{stateCopy.label}</span>
            </div>

            {needsSetup ? (
              <>
                <h2 className="mt-3 font-display text-[2.4rem] font-bold leading-none">Finish your setup</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{safeSpend.explanation}</p>
                <button className="btn-primary mt-5 self-start px-5" onClick={onSetupJourney}>Complete journey setup <ArrowRight size={17} /></button>
              </>
            ) : (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <h2 className="font-display text-[clamp(2.6rem,12vw,3.6rem)] font-bold leading-none tracking-tight tabular-nums">{showBalance ? formatPKR(safeSpend.safeToSpendToday) : 'Rs ••••'}</h2>
                  <button aria-label={showBalance ? 'Hide money amounts' : 'Show money amounts'} className="text-[var(--muted-2)] transition-colors hover:text-[var(--text)]" onClick={() => setShowBalance((value) => !value)}>{showBalance ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                </div>
                <button
                  aria-expanded={showBreakdown}
                  className="mt-2 self-start text-left text-sm leading-6 text-[var(--muted)]"
                  onClick={() => setShowBreakdown((value) => { if (!value) trackEvent('journey_breakdown_opened', { surface: 'home', state: safeSpend.state }); return !value })}
                >
                  Bills + {formatPKR(safeSpend.safetyReserve)} reserve already protected
                </button>
                {showBreakdown && <dl className="mt-3 grid gap-2 text-sm"><BreakdownRow label="Spendable balances" value={safeSpend.includedBalance} /><BreakdownRow label="Protected for bills" value={-safeSpend.reservedForBills} /><BreakdownRow label="Safety reserve" value={-safeSpend.safetyReserve} /><BreakdownRow label="Flexible until payday" value={safeSpend.flexibleMoneyRemaining} strong /></dl>}
              </>
            )}

            <div className="mt-auto pt-7">
              <div className="payday-track">
                <div className="payday-fill" style={{ width: `${progress}%` }} />
                <span className="payday-knob" style={{ left: `${progress}%` }} />
                <span className="payday-target" />
              </div>
              <div className="mt-3 flex justify-between text-xs text-[var(--muted)]">
                <span>{safeSpend.cycle ? `Day ${safeSpend.cycle.daysElapsed} of ${safeSpend.cycle.totalDays}` : 'Start'}</span>
                <span>{safeSpend.cycle ? `Next income · ${safeSpend.cycle.daysRemaining} days` : 'Add income date'}</span>
              </div>
            </div>
          </article>

          {accounts.map((account) => {
            const share = totalBalance > 0 ? Math.round((account.balance / totalBalance) * 100) : 0
            return (
              <article className="home-rail-card flex flex-col" key={account.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--muted)]">{account.name}</p>
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[0.72rem] font-semibold capitalize text-[var(--muted)]">{account.includeInSafeSpend ? account.type : 'Excluded'}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <h2 className="font-display text-[clamp(2.4rem,11vw,3.4rem)] font-bold leading-none tracking-tight tabular-nums">{showBalance ? formatPKR(account.balance) : 'Rs ••••'}</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{account.activity}</p>
                <div className="mt-auto pt-7">
                  <div className="payday-track"><div className="payday-fill" style={{ width: `${share}%` }} /></div>
                  <div className="mt-3 flex justify-between text-xs text-[var(--muted)]">
                    <span>{account.cardLabel}</span>
                    <span>{share}% of your money</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {slides > 1 && <div className="home-dots" role="tablist" aria-label="Money cards">{Array.from({ length: slides }, (_, index) => <span aria-selected={index === slide} className={cn('home-dot', index === slide && 'home-dot-active')} key={index} role="tab" />)}</div>}
      </section>

      {coachOpen && <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[var(--surface)] p-4"><div className="flex gap-3"><Sparkles className="mt-0.5 shrink-0 text-[var(--accent)]" size={19} /><div><p className="font-semibold">Start here each day</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">This one number already protects your reserve and upcoming bills. Tap it whenever you want to check the logic.</p><button className="mt-3 text-sm font-semibold text-[var(--accent)]" onClick={completeCoach}>Got it</button></div></div></div>}

      <section aria-label="Quick actions" className="mt-4 grid grid-cols-4 gap-3">
        <QuickAction icon={ArrowDown} label="Income" onClick={() => onAction('income')} />
        <QuickAction icon={ArrowUpRight} label="Expense" onClick={() => onAction('expense')} />
        <QuickAction icon={Target} label="Plan buy" onClick={onPlanPurchase} featured />
        <QuickAction icon={ArrowRightLeft} label="Transfer" onClick={() => onAction('transfer')} />
      </section>

      <TodayMove insight={insight} state={safeSpend.state} onAction={() => insight ? onNavigate('reports') : needsSetup ? onSetupJourney() : safeSpend.state === 'protect' ? onNavigate('budgets') : onAction('expense')} />

      <section className="mt-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-xl font-bold">Latest entries</h2>
          <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]" onClick={() => onNavigate('transactions')}>See all <ArrowRight size={15} /></button>
        </div>
        <div className="mt-3 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">{recent.length ? recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />) : <div className="px-5 py-8 text-center"><WalletCards className="mx-auto text-[var(--muted-2)]" size={24} /><p className="mt-3 font-semibold">No entries yet</p><p className="mt-1 text-sm text-[var(--muted)]">Record an income or expense to begin your story.</p></div>}</div>
      </section>
    </div>
  )
}

function TodayMove({ insight, state, onAction }: { insight: ReturnType<typeof detectMoneyLeak>; state: ReturnType<typeof calculateSafeSpend>['state']; onAction: () => void }) {
  const content = insight ? { eyebrow: 'Money leak', title: insight.title, detail: insight.explanation, action: 'See the pattern' } : state === 'needs_setup' ? { eyebrow: 'Today’s move', title: 'Set your next income date', detail: 'It is the one detail needed to turn your balance into a useful daily number.', action: 'Finish setup' } : state === 'protect' ? { eyebrow: 'Today’s move', title: 'Keep flexible spending paused', detail: 'Review upcoming bills before recording another optional purchase.', action: 'Review plan' } : { eyebrow: 'Today’s move', title: 'Keep today accurate', detail: 'Record one purchase while it’s fresh — a clean ledger keeps tomorrow’s number honest.', action: 'Record expense' }
  return (
    <section className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)]"><Flag size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">{content.eyebrow}</p>
          <h2 className="mt-1.5 font-display text-lg font-bold">{content.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{content.detail}</p>
          <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]" onClick={onAction}>{content.action}<ArrowRight size={15} /></button>
        </div>
      </div>
    </section>
  )
}

function QuickAction({ icon: Icon, label, onClick, featured }: { icon: typeof ArrowDown; label: string; onClick: () => void; featured?: boolean }) {
  return <motion.button className={cn('flex min-h-[92px] flex-col items-center justify-center gap-2.5 px-2 text-[0.82rem] font-semibold', featured ? 'quick-action-primary rounded-[20px]' : 'quick-action text-[var(--muted)]')} whileTap={{ scale: 0.97 }} onClick={onClick}><Icon size={20} /><span>{label}</span></motion.button>
}

function BreakdownRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={cn('flex justify-between gap-3', strong && 'border-t border-[var(--border)] pt-2 font-semibold')}><dt className="text-[var(--muted)]">{label}</dt><dd className="tabular-nums">{formatPKR(value)}</dd></div>
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const expense = transaction.type === 'expense' || transaction.type === 'goal_saving' || transaction.type === 'debt_payment'
  return (
    <div className="flex items-center gap-3.5 border-b border-[var(--border)] px-4 py-4 last:border-b-0">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', expense ? 'bg-[var(--surface-2)] text-[var(--muted)]' : 'bg-[rgba(255,92,0,.13)] text-[var(--accent)]')}><CategoryIcon label={transaction.category ?? transaction.title} size={18} type={transaction.type} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-semibold">{transaction.title}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{transaction.category ?? transaction.account} · {relativeDay(transaction.date)}</p>
      </div>
      <p className={cn('shrink-0 text-[0.95rem] font-bold tabular-nums', expense ? 'text-[var(--text)]' : 'text-[var(--positive)]')}>{expense ? '−' : '+'}{formatPKR(transaction.amount)}</p>
    </div>
  )
}

function MenuButton({ icon: Icon, label, onClick }: { icon: typeof Settings; label: string; onClick: () => void }) {
  return <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--surface-2)]" onClick={onClick}><Icon className="text-[var(--accent)]" size={17} />{label}</button>
}

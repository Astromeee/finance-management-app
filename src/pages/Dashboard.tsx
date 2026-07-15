import { ArrowDown, ArrowRight, ArrowRightLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, Eye, EyeOff, Flag, Settings, ShieldCheck, Sparkles, Target, UserRound, WalletCards } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CategoryIcon } from '../components/icons/CategoryIcon'
import { firstNameOf, getProfile, initialsOf } from '../lib/profile'
import { trackEvent } from '../lib/analytics'
import type { Account, Budget, Category, Debt, Goal, JourneySettings, Transaction, UpcomingExpense } from '../types/finance'
import { formatPKR } from '../utils/financeCalculations'
import { calculateSafeSpend, detectMoneyLeak } from '../utils/journeyCalculations'
import { cn } from '../utils/ui'

type DashboardAction = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | null

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
  const reduceMotion = useReducedMotion()
  const [showBalance, setShowBalance] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(!journeySettings.tourCompleted)
  const profile = getProfile()
  const safeSpend = useMemo(() => calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses, settings: journeySettings }), [accounts, budgets, categories, upcomingExpenses, journeySettings])
  const insight = useMemo(() => detectMoneyLeak(transactions), [transactions])
  const recent = useMemo(() => [...transactions].sort((a, b) => new Date(b.createdAt ?? `${b.date}T23:59:59`).getTime() - new Date(a.createdAt ?? `${a.date}T23:59:59`).getTime()).slice(0, 3), [transactions])
  const progress = safeSpend.cycle ? Math.max(0, Math.min(100, (safeSpend.cycle.daysElapsed / safeSpend.cycle.totalDays) * 100)) : 0
  const stateCopy = {
    comfortable: { label: 'Comfortable', className: 'journey-status-positive', icon: Check },
    watchful: { label: 'Watchful', className: 'journey-status-warning', icon: Eye },
    protect: { label: 'Protect', className: 'journey-status-negative', icon: ShieldCheck },
    needs_setup: { label: 'Needs setup', className: 'journey-status-warning', icon: CalendarDays },
  }[safeSpend.state]
  const StatusIcon = stateCopy.icon

  const completeCoach = () => {
    setCoachOpen(false)
    onTourComplete()
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-8 pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-2">
      <header className="flex items-center justify-between">
        <div><p className="text-sm text-[var(--muted)]">Salam, {firstNameOf(profile.name)}</p><h1 className="mt-0.5 font-display text-2xl font-bold">Your payday journey</h1></div>
        <div className="relative"><button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Profile menu" className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]" onClick={() => setMenuOpen((current) => !current)}>{profile.avatar ? <img alt="" className="h-full w-full object-cover" src={profile.avatar} /> : initialsOf(profile.name)}</button>{menuOpen && <><button aria-label="Close profile menu" className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} /><div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-2xl"><MenuButton icon={UserRound} label="Edit profile" onClick={() => onNavigate('profile')} /><MenuButton icon={Settings} label="Settings" onClick={() => onNavigate('settings')} /></div></>}</div>
      </header>

      <section className={cn('journey-hero mt-6 overflow-hidden rounded-[24px] border p-5 sm:p-7', safeSpend.state === 'protect' ? 'journey-hero-protect' : safeSpend.state === 'watchful' || safeSpend.state === 'needs_setup' ? 'journey-hero-watchful' : 'journey-hero-comfortable')}>
        <div className="flex items-center justify-between gap-3"><span className={cn('journey-status', stateCopy.className)}><StatusIcon size={14} />{stateCopy.label}</span><button aria-label={showBalance ? 'Hide money amounts' : 'Show money amounts'} className="icon-button" onClick={() => setShowBalance((value) => !value)}>{showBalance ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        {safeSpend.state === 'needs_setup' ? <><p className="mt-7 text-sm font-semibold text-[var(--muted)]">Safe to spend today</p><h2 className="mt-2 font-display text-4xl font-bold">Finish your setup</h2><p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{safeSpend.explanation}</p><button className="btn-primary mt-6" onClick={onSetupJourney}>Complete journey setup <ArrowRight size={17} /></button></> : <><p className="mt-7 text-sm font-semibold text-[var(--muted)]">Safe to spend today</p><div className="mt-2 flex items-center gap-3"><h2 className="font-display text-[clamp(2.6rem,11vw,4.6rem)] font-bold leading-none tracking-tight tabular-nums">{showBalance ? formatPKR(safeSpend.safeToSpendToday) : 'Rs. ••••'}</h2></div><p className="mt-4 max-w-lg text-sm leading-6 text-[var(--muted)]">{safeSpend.explanation}</p></>}

        <div className="mt-8"><div className="relative h-2 rounded-full bg-black/20"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} /><motion.span animate={{ left: `${progress}%` }} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[var(--surface)] bg-[var(--accent)] shadow-md" transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 22 }} /></div><div className="mt-3 flex justify-between text-xs text-[var(--muted)]"><span>{safeSpend.cycle ? 'Income received' : 'Start'}</span><span>{safeSpend.cycle ? `${safeSpend.cycle.daysRemaining} days to income` : 'Add income date'}</span></div></div>

        {safeSpend.state !== 'needs_setup' && <div className="mt-5 border-t border-[var(--border)] pt-4"><button aria-expanded={showBreakdown} className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setShowBreakdown((value) => { if (!value) trackEvent('journey_breakdown_opened', { surface: 'home', state: safeSpend.state }); return !value })}>How this is calculated <ChevronDown className={cn('transition-transform', showBreakdown && 'rotate-180')} size={17} /></button>{showBreakdown && <dl className="mt-4 grid gap-3 text-sm"><BreakdownRow label="Spendable account balances" value={safeSpend.includedBalance} /><BreakdownRow label="Protected for bills" value={-safeSpend.reservedForBills} /><BreakdownRow label="Safety reserve" value={-safeSpend.safetyReserve} /><BreakdownRow label="Flexible until payday" value={safeSpend.flexibleMoneyRemaining} strong /></dl>}</div>}

        {coachOpen && <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4"><div className="flex gap-3"><Sparkles className="mt-0.5 shrink-0 text-[var(--accent)]" size={19} /><div><p className="font-semibold">Start here each day</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">This one number already protects your reserve and upcoming bills. Open the breakdown whenever you want to check the logic.</p><button className="mt-3 text-sm font-semibold text-[var(--accent)]" onClick={completeCoach}>Got it</button></div></div></div>}
      </section>

      <section aria-label="Quick actions" className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        <QuickAction icon={ArrowDown} label="Income" onClick={() => onAction('income')} />
        <QuickAction icon={ArrowUpRight} label="Expense" onClick={() => onAction('expense')} />
        <QuickAction icon={Target} label="Plan buy" onClick={onPlanPurchase} featured />
        <QuickAction icon={ArrowRightLeft} label="Transfer" onClick={() => onAction('transfer')} />
      </section>

      <TodayMove insight={insight} state={safeSpend.state} onAction={() => insight ? onNavigate('reports') : safeSpend.state === 'needs_setup' ? onSetupJourney() : safeSpend.state === 'protect' ? onNavigate('budgets') : onAction('expense')} />

      <section className="mt-5">
        <div className="flex items-center justify-between px-1"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--muted-2)]">Recent activity</p><h2 className="mt-1 text-lg font-semibold">Latest entries</h2></div><button className="text-sm font-semibold text-[var(--accent)]" onClick={() => onNavigate('transactions')}>See all</button></div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">{recent.length ? recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />) : <div className="px-5 py-8 text-center"><WalletCards className="mx-auto text-[var(--muted-2)]" size={24} /><p className="mt-3 font-semibold">No entries yet</p><p className="mt-1 text-sm text-[var(--muted)]">Record an income or expense to begin your story.</p></div>}</div>
      </section>
    </div>
  )
}

function TodayMove({ insight, state, onAction }: { insight: ReturnType<typeof detectMoneyLeak>; state: ReturnType<typeof calculateSafeSpend>['state']; onAction: () => void }) {
  const content = insight ? { eyebrow: 'Money leak', title: insight.title, detail: insight.explanation, action: 'See the pattern' } : state === 'needs_setup' ? { eyebrow: 'Today’s move', title: 'Set your next income date', detail: 'It is the one detail needed to turn your balance into a useful daily number.', action: 'Finish setup' } : state === 'protect' ? { eyebrow: 'Today’s move', title: 'Keep flexible spending paused', detail: 'Review upcoming bills before recording another optional purchase.', action: 'Review plan' } : { eyebrow: 'Today’s move', title: 'Keep today accurate', detail: 'Record one purchase while it is still fresh. A clean ledger makes tomorrow’s number more useful.', action: 'Record expense' }
  return <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Flag size={20} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">{content.eyebrow}</p><h2 className="mt-1.5 text-lg font-semibold">{content.title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{content.detail}</p><button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]" onClick={onAction}>{content.action}<ArrowRight size={15} /></button></div></div></section>
}

function QuickAction({ icon: Icon, label, onClick, featured }: { icon: typeof ArrowDown; label: string; onClick: () => void; featured?: boolean }) {
  return <motion.button className={cn('flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-semibold', featured ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]')} whileTap={{ scale: 0.97 }} onClick={onClick}><Icon size={19} /><span>{label}</span></motion.button>
}

function BreakdownRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={cn('flex justify-between gap-3', strong && 'border-t border-[var(--border)] pt-3 font-semibold')}><dt className="text-[var(--muted)]">{label}</dt><dd className="tabular-nums">{formatPKR(value)}</dd></div>
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const expense = transaction.type === 'expense' || transaction.type === 'goal_saving' || transaction.type === 'debt_payment'
  return <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5 last:border-b-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]"><CategoryIcon label={transaction.category ?? transaction.title} size={18} type={transaction.type} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{transaction.title}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{transaction.category ?? transaction.account} · {transaction.date}</p></div><p className={cn('text-sm font-semibold tabular-nums', expense ? 'text-[var(--text)]' : 'text-[var(--positive)]')}>{expense ? '−' : '+'}{formatPKR(transaction.amount)}</p></div>
}

function MenuButton({ icon: Icon, label, onClick }: { icon: typeof Settings; label: string; onClick: () => void }) {
  return <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--surface-2)]" onClick={onClick}><Icon className="text-[var(--accent)]" size={17} />{label}</button>
}

import { ArrowRight, CheckCircle2, Landmark, PencilLine, Plus, Repeat2, Trash2, WalletCards, X, type LucideIcon } from 'lucide-react'
import { animate, motion } from 'framer-motion'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BottomSheet as Sheet } from '../components/BottomSheet'
import { expenseCategories } from '../data/mockData'
import type { Account, Debt, DebtCategory, DebtStatus, Goal, RecurringFrequency, UpcomingExpense, UpcomingExpenseStatus } from '../types/finance'
import { formatPKR, percent } from '../utils/financeCalculations'
import { cn } from '../utils/ui'

/* ============================================================
   Goals & Debts — V3 redesign
   Same data, props, and modals. New skin + motion:
   - Goal cards: animated SVG progress ring (orange gradient stroke,
     spring draw-in) with count-up percentage
   - Debt cards: spring-animated progress bar with glow + count-up
   - Overview: glass stat cards with animated mini-rings
   - Segmented pill tabs
   Drop-in replacement for src/pages/GoalsDebts.tsx.
   ============================================================ */

type UpcomingPayload = Omit<UpcomingExpense, 'id' | 'status' | 'createdAt' | 'paidTransactionId'>
type PaidPayload = { accountId: string; paymentDate: string; notes?: string }
type DebtPayload = {
  title: string
  personOrCompany?: string
  totalAmount: number
  paidAmount: number
  dueDate?: string
  category: DebtCategory
  status: DebtStatus
  notes?: string
}
type GoalPayload = { name: string; target: number; saved: number; dueDate?: string; linkedAccountId?: string; notes?: string; status: Goal['status'] }
type SavingsPayload = { goalId: string; amount: number; accountId: string; date: string; notes?: string }
type GoalsDebtsTab = 'goals' | 'debts' | 'upcoming'
type DeleteTarget =
  | { kind: 'upcoming'; id: string; title: string }
  | { kind: 'goal'; id: string; title: string }
  | { kind: 'debt'; id: string; title: string }

const frequencyLabels: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  semi_annual: 'Every 6 months',
  yearly: 'Yearly',
}

const debtCategoryOptions: DebtCategory[] = ['Debt', 'Overdue Payment', 'Money I Owe', 'Installment', 'Other']
const debtStatusOptions: DebtStatus[] = ['Active', 'Due Soon', 'Overdue', 'Paid']

const EASE = [0.22, 1, 0.36, 1] as const

/* ---------- shared motion atoms ---------- */

/** Number that counts up from 0 when it enters. */
function CountUp({ value, format = (v: number) => String(Math.round(v)), duration = 1 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (latest) => { node.textContent = format(latest) },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span ref={ref}>{format(value)}</span>
}

/** Animated SVG progress ring with gradient stroke + glow. */
function ProgressRing({
  progress,
  size = 96,
  stroke = 9,
  from = '#FF5C00',
  to = '#FF8A47',
  track = 'rgba(246,243,239,.08)',
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  from?: string
  to?: string
  track?: string
  children?: ReactNode
}) {
  const clamped = Math.max(0, Math.min(100, progress))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const id = useId().replaceAll(':', '')
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 1.2, ease: EASE }}
          style={{ filter: `drop-shadow(0 0 8px ${from}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/** Spring-animated horizontal progress bar with glow. */
function ProgressBar({ progress, color = '#FF5C00', glow = true, height = 8 }: { progress: number; color?: string; glow?: boolean; height?: number }) {
  const clamped = Math.max(0, Math.min(100, progress))
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/[.07]" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, #000))`, boxShadow: glow ? `0 0 14px ${color}66` : undefined }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 60, damping: 16, mass: 1 }}
      />
    </div>
  )
}

export function GoalsDebts({
  goals,
  debts,
  accounts,
  upcomingExpenses,
  onAddGoal,
  onDebtPayment,
  onAddDebt,
  onUpdateGoal,
  onDeleteGoal,
  onUpdateDebt,
  onDeleteDebt,
  onAddSavings,
  onAddUpcomingExpense,
  onUpdateUpcomingExpense,
  onDeleteUpcomingExpense,
  onMarkUpcomingPaid,
}: {
  goals: Goal[]
  debts: Debt[]
  accounts: Account[]
  upcomingExpenses: UpcomingExpense[]
  onAddGoal: () => void
  onDebtPayment: (debtId: string) => void
  onAddDebt: (payload: DebtPayload) => void
  onUpdateGoal: (goalId: string, payload: GoalPayload) => void
  onDeleteGoal: (goalId: string) => void
  onUpdateDebt: (debtId: string, payload: DebtPayload) => void
  onDeleteDebt: (debtId: string) => void
  onAddSavings: (payload: SavingsPayload) => void
  onAddUpcomingExpense: (payload: UpcomingPayload) => void
  onUpdateUpcomingExpense: (expenseId: string, payload: UpcomingPayload) => void
  onDeleteUpcomingExpense: (expenseId: string) => void
  onMarkUpcomingPaid: (expense: UpcomingExpense, payload: PaidPayload) => void
}) {
  const [editingExpense, setEditingExpense] = useState<UpcomingExpense | null>(null)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [savingGoal, setSavingGoal] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [payingExpense, setPayingExpense] = useState<UpcomingExpense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [activeTab, setActiveTab] = useState<GoalsDebtsTab>('goals')
  const sortedUpcoming = useMemo(
    () => [...upcomingExpenses].sort((a, b) => a.status === 'paid' && b.status !== 'paid' ? 1 : b.status === 'paid' && a.status !== 'paid' ? -1 : a.dueDate.localeCompare(b.dueDate)),
    [upcomingExpenses],
  )
  const totalSavings = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const totalDebt = debts.reduce((sum, debt) => sum + debtTotal(debt), 0)
  const totalDebtPaid = debts.reduce((sum, debt) => sum + debtPaid(debt), 0)
  const totalDebtToPay = debts.reduce((sum, debt) => sum + debtRemaining(debt), 0)
  const activeGoals = goals.filter((goal) => goal.status !== 'Completed').length
  const activeDebts = debts.filter((debt) => debtDisplayStatus(debt) !== 'Paid').length
  const goalProgress = percent(totalSavings, totalGoalTarget)
  const debtProgress = totalDebt > 0 ? Math.round((totalDebtPaid / totalDebt) * 100) : 100

  const tabs: Array<{ key: GoalsDebtsTab; label: string; count: number }> = [
    { key: 'goals', label: 'Goals', count: activeGoals },
    { key: 'debts', label: 'Debts', count: activeDebts },
  ]

  return (
    <div className="space-y-6 pb-32">
      {/* ---- Header: Plans / Goals & Debts + add button (mock 6b) ---- */}
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Plans</p>
          <h2 className="mt-0.5 text-[32px] font-semibold leading-tight text-white">Goals &amp; Debts</h2>
        </div>
        <button
          aria-label={activeTab === 'debts' ? 'Add debt' : activeTab === 'upcoming' ? 'Add upcoming expense' : 'Add goal'}
          className="grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br from-[#FF5C00] to-[#D14E0C] text-[#16130F] shadow-[0_12px_28px_rgba(255,92,0,.25)]"
          onClick={() => {
            if (activeTab === 'debts') setShowAddDebt(true)
            else if (activeTab === 'upcoming') setShowAddExpense(true)
            else onAddGoal()
          }}
        >
          <Plus size={22} />
        </button>
      </section>

      {/* ---- Overview: animated glass stats ---- */}
      <section className="grid grid-cols-2 gap-3">
        <OverviewCard
          label="Total savings"
          value={totalSavings}
          icon={WalletCards}
          color="#7DC98F"
          ring={goalProgress}
          ringLabel={totalGoalTarget > 0 ? `${goalProgress}% of goals` : 'No goals yet'}
        />
        <OverviewCard
          label="Debt to pay"
          value={totalDebtToPay}
          icon={Landmark}
          color="#FF5C00"
          ring={debtProgress}
          ringLabel={totalDebt > 0 ? `${debtProgress}% paid` : 'All clear'}
        />
      </section>

      {/* ---- Segmented pill tabs ---- */}
      <section className="flex rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-1 backdrop-blur-xl" aria-label="Goals and debts sections">
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition',
                active ? 'text-[#16130F]' : 'text-[var(--muted)]',
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {active && (
                <motion.span
                  layoutId="goals-tab-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#D14E0C]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{tab.label}</span>
              <strong className={cn('relative rounded-full px-1.5 text-xs', active ? 'bg-black/15' : 'bg-white/[.07] text-[var(--muted-2)]')}>{tab.count}</strong>
            </button>
          )
        })}
      </section>

      {activeTab === 'goals' && <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-sm text-[var(--muted)]">Savings Goals</p><h3 className="text-2xl font-semibold tracking-tight text-white">Build future money</h3></div>
          <button className="btn-primary" onClick={onAddGoal}>Add goal</button>
        </div>
        {goals.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal, index) => (
            <GoalRingCard
              key={goal.id}
              goal={goal}
              index={index}
              onAddSavings={() => setSavingGoal(goal)}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => setDeleteTarget({ kind: 'goal', id: goal.id, title: goal.name })}
            />
          ))}
        </div> : <GoalsEmptyState title="No savings goals yet" note="Create a target for a laptop, emergency fund, fee payment, or anything you want to save toward." action="Add goal" onAction={onAddGoal} />}
      </section>}

      {activeTab === 'debts' && <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-sm text-[var(--muted)]">Debts / Overdue / Money I Owe</p><h3 className="text-2xl font-semibold tracking-tight text-white">Debts</h3></div>
          <button className="btn-primary" onClick={() => setShowAddDebt(true)}><Plus size={18} /> Add debt</button>
        </div>
        {debts.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {debts.map((debt, index) => (
            <DebtGlowCard
              key={debt.id}
              debt={debt}
              index={index}
              onPayDebt={() => onDebtPayment(debt.id)}
              onEdit={() => setEditingDebt(debt)}
              onDelete={() => setDeleteTarget({ kind: 'debt', id: debt.id, title: debtTitle(debt) })}
            />
          ))}
        </div> : <GoalsEmptyState title="No debts tracked" note="Add money you owe, installments, overdue payments, or borrowed amounts so you always know what is left." action="Add debt" onAction={() => setShowAddDebt(true)} />}
      </section>}

      {activeTab === 'upcoming' && <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--muted)]">Upcoming Expenses</p>
            <h3 className="text-2xl font-semibold tracking-tight text-white">Plan future payments</h3>
          </div>
          <button className="btn-primary" onClick={() => setShowAddExpense(true)}><Plus size={18} /> Add Upcoming Expense</button>
        </div>

        {sortedUpcoming.length ? <div className="grid gap-3 xl:grid-cols-2">
          {sortedUpcoming.map((expense, index) => {
            const displayStatus = upcomingDisplayStatus(expense)
            const account = accounts.find((item) => item.id === expense.linkedAccountId)
            return (
              <motion.article
                key={expense.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05, ease: EASE }}
                className={cn(
                  'rounded-[24px] border p-5 backdrop-blur-xl',
                  displayStatus === 'overdue'
                    ? 'border-[rgba(232,105,74,.3)] bg-[rgba(232,105,74,.07)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
                  displayStatus === 'paid' && 'opacity-60',
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-lg font-semibold text-white">{expense.title}</h4>
                      <StatusBadge status={displayStatus} />
                      {expense.isRecurring && <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,92,0,.22)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"><Repeat2 size={13} />Recurring</span>}
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{expense.category} · Due {formatDate(expense.dueDate)}{account ? ` · ${account.name}` : ''}</p>
                    {expense.isRecurring && expense.recurringFrequency && <p className="mt-1 text-xs text-[var(--muted-2)]">{frequencyLabels[expense.recurringFrequency]} commitment</p>}
                  </div>
                  <strong className="shrink-0 text-2xl font-semibold tracking-tight text-white">{formatPKR(expense.amount)}</strong>
                </div>
                {expense.notes && <p className="mt-3 rounded-2xl bg-white/[.035] px-3 py-2 text-sm text-[var(--muted)]">{expense.notes}</p>}
                <div className="mt-4 grid gap-2">
                  <button className="btn-primary justify-center px-4 py-2 text-sm disabled:opacity-50" disabled={displayStatus === 'paid'} onClick={() => setPayingExpense(expense)}><CheckCircle2 size={16} /> Mark as Paid</button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-white" onClick={() => setEditingExpense(expense)}><PencilLine size={15} /> Edit</button>
                    <button className="flex items-center justify-center gap-1.5 rounded-full border border-[rgba(232,105,74,.25)] px-4 py-2 text-sm font-medium text-[var(--negative)]" onClick={() => setDeleteTarget({ kind: 'upcoming', id: expense.id, title: expense.title })}><Trash2 size={15} /> Delete</button>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div> : <GoalsEmptyState title="No upcoming expenses" note="Plan future payments like rent, subscriptions, bills, or family support before they hit your balance." action="Add upcoming" onAction={() => setShowAddExpense(true)} />}
      </section>}

      <AddUpcomingExpenseModal
        open={showAddExpense}
        accounts={accounts}
        onClose={() => setShowAddExpense(false)}
        onSubmit={onAddUpcomingExpense}
      />
      <AddUpcomingExpenseModal
        key={editingExpense?.id ?? 'edit-upcoming-closed'}
        open={Boolean(editingExpense)}
        accounts={accounts}
        expense={editingExpense ?? undefined}
        onClose={() => setEditingExpense(null)}
        onSubmit={(payload) => {
          if (editingExpense) onUpdateUpcomingExpense(editingExpense.id, payload)
        }}
      />
      <AddDebtModal
        open={showAddDebt}
        onClose={() => setShowAddDebt(false)}
        onSubmit={onAddDebt}
      />
      <EditGoalModal
        key={editingGoal?.id ?? 'edit-goal-closed'}
        goal={editingGoal}
        accounts={accounts}
        onClose={() => setEditingGoal(null)}
        onSubmit={(payload) => {
          if (editingGoal) onUpdateGoal(editingGoal.id, payload)
        }}
      />
      <AddDebtModal
        key={editingDebt?.id ?? 'edit-debt-closed'}
        open={Boolean(editingDebt)}
        debt={editingDebt ?? undefined}
        onClose={() => setEditingDebt(null)}
        onSubmit={(payload) => {
          if (editingDebt) onUpdateDebt(editingDebt.id, payload)
        }}
      />
      <AddSavingsModal
        key={savingGoal?.id ?? 'saving-closed'}
        goal={savingGoal}
        accounts={accounts}
        onClose={() => setSavingGoal(null)}
        onSubmit={onAddSavings}
      />
      <RecordUpcomingExpensePaidModal
        key={payingExpense?.id ?? 'paid-upcoming-closed'}
        expense={payingExpense}
        accounts={accounts}
        onClose={() => setPayingExpense(null)}
        onConfirm={(payload) => {
          if (payingExpense) onMarkUpcomingPaid(payingExpense, payload)
        }}
      />
      <ConfirmDeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.kind === 'upcoming') onDeleteUpcomingExpense(deleteTarget.id)
          if (deleteTarget?.kind === 'goal') onDeleteGoal(deleteTarget.id)
          if (deleteTarget?.kind === 'debt') onDeleteDebt(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}

/* ---------- redesigned cards ---------- */

function OverviewCard({ label, value, icon: Icon, color, ring, ringLabel }: { label: string; value: number; icon: LucideIcon; color: string; ring?: number; ringLabel?: string }) {
  return (
    <article className="flex items-center gap-3.5 rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 backdrop-blur-xl">
      {ring !== undefined ? (
        <ProgressRing progress={ring} size={56} stroke={6} from={color} to={color}>
          <Icon size={18} style={{ color }} />
        </ProgressRing>
      ) : (
        <span className="grid h-11 w-11 flex-none place-items-center rounded-[16px]" style={{ color, background: 'color-mix(in srgb, currentColor 12%, transparent)', border: '1px solid color-mix(in srgb, currentColor 24%, transparent)' }}>
          <Icon size={19} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-2)]">{label}</p>
        <h3 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-white">
          <CountUp value={value} format={(v) => formatPKR(Math.round(v))} />
        </h3>
        {ringLabel && <p className="text-[11px] text-[var(--muted-2)]">{ringLabel}</p>}
      </div>
    </article>
  )
}

function GoalRingCard({ goal, index, onAddSavings, onEdit, onDelete }: { goal: Goal; index: number; onAddSavings: () => void; onEdit: () => void; onDelete: () => void }) {
  const progress = percent(goal.saved, goal.target)
  const remaining = Math.max(0, goal.target - goal.saved)
  const done = goal.status === 'Completed' || progress >= 100

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
      className="rounded-[26px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 backdrop-blur-xl"
    >
      <div className="flex items-start gap-4">
        <ProgressRing progress={progress} size={92} stroke={9} from={done ? '#7DC98F' : '#FF5C00'} to={done ? '#4E9A66' : '#FF8A47'}>
          <strong className="text-lg font-semibold tracking-tight text-white"><CountUp value={progress} format={(v) => `${Math.round(v)}%`} /></strong>
          <span className="text-[10px] text-[var(--muted-2)]">saved</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-lg font-semibold text-white">{goal.name}</h4>
            <span className={cn(
              'flex-none rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              done ? 'border-[rgba(125,201,143,.3)] bg-[rgba(125,201,143,.1)] text-[var(--positive)]' : 'border-[rgba(255,92,0,.25)] bg-[var(--accent-soft)] text-[var(--accent)]',
            )}>{goal.status}</span>
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight text-white">
            <CountUp value={goal.saved} format={(v) => formatPKR(Math.round(v))} />
            <span className="text-sm font-normal text-[var(--muted-2)]"> / {formatPKR(goal.target)}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted-2)]">{formatPKR(remaining)} remaining{goal.dueDate ? ` · Due ${goal.dueDate}` : ''}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <button className="btn-primary justify-center px-4 py-2 text-sm" onClick={onAddSavings}><WalletCards size={16} /> Add savings</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-white" onClick={onEdit}><PencilLine size={15} /> Edit</button>
          <button className="flex items-center justify-center gap-1.5 rounded-full border border-[rgba(232,105,74,.25)] px-4 py-2 text-sm font-medium text-[var(--negative)]" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>
      </div>
    </motion.article>
  )
}

function DebtGlowCard({ debt, index, onPayDebt, onEdit, onDelete }: { debt: Debt; index: number; onPayDebt: () => void; onEdit: () => void; onDelete: () => void }) {
  const total = debtTotal(debt)
  const paid = debtPaid(debt)
  const progress = percent(paid, total)
  const remaining = Math.max(0, total - paid)
  const status = debtDisplayStatus(debt)
  const overdue = status === 'Overdue'
  const paidOff = status === 'Paid'
  const category = debt.category ?? 'Debt'
  const barColor = overdue ? '#E8694A' : paidOff ? '#7DC98F' : '#FF5C00'

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
      className={cn(
        'rounded-[26px] border p-5 backdrop-blur-xl',
        overdue ? 'border-[rgba(232,105,74,.3)] bg-[rgba(232,105,74,.07)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-white/[.04] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--muted)]">{category}</span>
            {debt.personOrCompany && <span className="rounded-full border border-[var(--border)] bg-white/[.04] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--muted)]">{debt.personOrCompany}</span>}
          </div>
          <h4 className="mt-2.5 truncate text-lg font-semibold text-white">{debtTitle(debt)}</h4>
        </div>
        <span className={cn(
          'flex-none rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
          paidOff ? 'border-[rgba(125,201,143,.3)] bg-[rgba(125,201,143,.1)] text-[var(--positive)]'
            : overdue ? 'border-[rgba(232,105,74,.35)] bg-[rgba(232,105,74,.12)] text-[var(--negative)]'
              : status === 'Due Soon' ? 'border-[rgba(255,92,0,.3)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-white/[.04] text-[var(--muted)]',
        )}>{status}</span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-xl font-semibold tracking-tight text-white">
          <CountUp value={paid} format={(v) => formatPKR(Math.round(v))} />
          <span className="text-sm font-normal text-[var(--muted-2)]"> / {formatPKR(total)}</span>
        </p>
        <strong className="text-lg font-semibold text-white"><CountUp value={progress} format={(v) => `${Math.round(v)}%`} /></strong>
      </div>
      <div className="mt-2.5">
        <ProgressBar progress={progress} color={barColor} />
      </div>
      <p className="mt-2 text-xs text-[var(--muted-2)]">{formatPKR(remaining)} left{debt.dueDate ? ` · Due ${formatDate(debt.dueDate)}` : ''}</p>
      {debt.notes && <p className="mt-3 rounded-2xl bg-white/[.035] px-3 py-2 text-sm text-[var(--muted)]">{debt.notes}</p>}
      <div className="mt-4 grid gap-2">
        <button className="btn-primary justify-center px-4 py-2 text-sm disabled:opacity-50" disabled={paidOff} onClick={onPayDebt}><CheckCircle2 size={16} /> Add Payment</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-white" onClick={onEdit}><PencilLine size={15} /> Edit</button>
          <button className="flex items-center justify-center gap-1.5 rounded-full border border-[rgba(232,105,74,.25)] px-4 py-2 text-sm font-medium text-[var(--negative)]" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>
      </div>
    </motion.article>
  )
}

function GoalsEmptyState({ title, note, action, onAction }: { title: string; note: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[26px] border border-dashed border-[var(--border)] bg-white/[.02] p-6">
      <div className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-[#FF5C00] to-[#D14E0C] p-3 text-[#16130F]">
        <Plus size={26} />
      </div>
      <div>
        <h4 className="text-xl font-semibold text-white">{title}</h4>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{note}</p>
      </div>
      <button className="btn-primary justify-center" onClick={onAction}>{action}</button>
    </div>
  )
}

function StatusBadge({ status }: { status: UpcomingExpenseStatus }) {
  const config: Record<UpcomingExpenseStatus, { label: string; cls: string }> = {
    upcoming: { label: 'Upcoming', cls: 'border-[var(--border)] bg-white/[.04] text-[var(--muted)]' },
    due_soon: { label: 'Due Soon', cls: 'border-[rgba(255,92,0,.3)] bg-[var(--accent-soft)] text-[var(--accent)]' },
    overdue: { label: 'Overdue', cls: 'border-[rgba(232,105,74,.35)] bg-[rgba(232,105,74,.12)] text-[var(--negative)]' },
    paid: { label: 'Paid', cls: 'border-[rgba(125,201,143,.3)] bg-[rgba(125,201,143,.1)] text-[var(--positive)]' },
  }
  return <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', config[status].cls)}>{config[status].label}</span>
}

/* ---------- modals (behavior unchanged, accents recolored) ---------- */

export function AddUpcomingExpenseModal({
  open,
  accounts,
  expense,
  onClose,
  onSubmit,
}: {
  open: boolean
  accounts: Account[]
  expense?: UpcomingExpense
  onClose: () => void
  onSubmit: (payload: UpcomingPayload) => void
}) {
  const [title, setTitle] = useState(expense?.title ?? '')
  const [amount, setAmount] = useState(expense?.amount.toString() ?? '')
  const [category, setCategory] = useState(expense?.category ?? expenseCategories[0]?.name ?? 'Other Upcoming Expense')
  const [dueDate, setDueDate] = useState(expense?.dueDate ?? today())
  const [linkedAccountId, setLinkedAccountId] = useState(expense?.linkedAccountId ?? '')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [isRecurring, setIsRecurring] = useState(expense?.isRecurring ?? false)
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(expense?.recurringFrequency ?? 'monthly')
  const [repeatStartDate, setRepeatStartDate] = useState(expense?.repeatStartDate ?? expense?.dueDate ?? today())
  const [repeatEndDate, setRepeatEndDate] = useState(expense?.repeatEndDate ?? '')
  const [reminderDaysBefore, setReminderDaysBefore] = useState(expense?.reminderDaysBefore?.toString() ?? '')
  const parsedAmount = Number(amount)
  const invalid = !title.trim() || parsedAmount <= 0 || !category || !dueDate || (isRecurring && !recurringFrequency)

  return (
    <Sheet title={expense ? 'Edit upcoming expense' : 'Add upcoming expense'} eyebrow="Planned future payment" open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (invalid) return
        onSubmit({
          title: title.trim(),
          amount: parsedAmount,
          category,
          dueDate,
          linkedAccountId: linkedAccountId || undefined,
          notes: notes.trim() || undefined,
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
          repeatStartDate: isRecurring ? repeatStartDate : undefined,
          repeatEndDate: isRecurring && repeatEndDate ? repeatEndDate : undefined,
          reminderDaysBefore: isRecurring && reminderDaysBefore ? Number(reminderDaysBefore) : undefined,
        })
        onClose()
      }}>
        <Field label="Title" value={title} onChange={setTitle} placeholder="Electricity Bill" />
        <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="Rs. 8,500" />
        <Select label="Category" value={category} onChange={setCategory} options={[...expenseCategories.map((item) => item.name), 'Internet Bill', 'Subscription', 'Family Payment', 'Other Upcoming Expense']} />
        <Field label="Due date" type="date" value={dueDate} onChange={setDueDate} />
        <Select label="Linked account optional" value={linkedAccountId} onChange={setLinkedAccountId} options={[{ value: '', label: 'No linked account' }, ...accounts.map((item) => ({ value: item.id, label: item.name }))]} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--surface-2)] px-4 py-3">
          <span>
            <span className="block font-semibold text-white">Recurring</span>
            <span className="text-xs text-[var(--muted)]">Create the next planned payment after this one is paid.</span>
          </span>
          <input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} />
        </label>
        {isRecurring && (
          <div className="grid gap-4 rounded-3xl border border-[rgba(255,92,0,.16)] bg-[rgba(255,92,0,.05)] p-3">
            <Select label="Frequency" value={recurringFrequency} onChange={(value) => setRecurringFrequency(value as RecurringFrequency)} options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />
            <Field label="Repeat start date" type="date" value={repeatStartDate} onChange={setRepeatStartDate} />
            <Field label="Optional repeat end date" type="date" value={repeatEndDate} onChange={setRepeatEndDate} />
            <Field label="Reminder days before due date" type="number" value={reminderDaysBefore} onChange={setReminderDaysBefore} placeholder="3" />
          </div>
        )}
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>{expense ? 'Save upcoming expense' : 'Add Upcoming Expense'}</button>
      </form>
    </Sheet>
  )
}

function AddDebtModal({
  open,
  debt,
  onClose,
  onSubmit,
}: {
  open: boolean
  debt?: Debt
  onClose: () => void
  onSubmit: (payload: DebtPayload) => void
}) {
  const [title, setTitle] = useState(debt ? debtTitle(debt) : '')
  const [category, setCategory] = useState<DebtCategory>(debt?.category ?? 'Debt')
  const [personOrCompany, setPersonOrCompany] = useState(debt?.personOrCompany ?? '')
  const [total, setTotal] = useState(debt ? debtTotal(debt).toString() : '')
  const [paid, setPaid] = useState(debt ? debtPaid(debt).toString() : '0')
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? '')
  const [status, setStatus] = useState<DebtStatus>(debt ? debtDisplayStatus(debt) : 'Active')
  const [notes, setNotes] = useState(debt?.notes ?? '')
  const parsedTotal = Number(total)
  const parsedPaid = Number(paid)
  const invalid = !title.trim() || parsedTotal <= 0 || parsedPaid < 0 || parsedPaid > parsedTotal

  return (
    <Sheet title={debt ? 'Edit debt / money owed' : 'Add debt / money owed'} eyebrow={category === 'Money I Owe' ? 'Personal amount to pay back' : debt ? 'Update obligation' : 'New obligation'} open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (invalid) return
        onSubmit({
          title: title.trim(),
          category,
          personOrCompany: personOrCompany.trim() || undefined,
          totalAmount: parsedTotal,
          paidAmount: parsedPaid,
          dueDate: dueDate || undefined,
          status: parsedPaid >= parsedTotal ? 'Paid' : status,
          notes: notes.trim() || undefined,
        })
        onClose()
      }}>
        <Field label="Title" value={title} onChange={setTitle} placeholder={category === 'Money I Owe' ? 'Borrowed from Ali' : 'Course installment'} />
        <Select label="Type" value={category} onChange={(value) => setCategory(value as DebtCategory)} options={debtCategoryOptions} />
        <Field label={category === 'Money I Owe' ? 'Person name optional' : 'Person / Company name optional'} value={personOrCompany} onChange={setPersonOrCompany} placeholder={category === 'Money I Owe' ? 'Ali' : 'Bank, university, company'} />
        <Field label="Total amount" type="number" value={total} onChange={setTotal} placeholder="Rs. 50,000" />
        <Field label="Already paid" type="number" value={paid} onChange={setPaid} />
        <Field label="Due date optional" type="date" value={dueDate} onChange={setDueDate} />
        <Select label="Status" value={status} onChange={(value) => setStatus(value as DebtStatus)} options={debtStatusOptions} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>{debt ? 'Save item' : 'Add item'}</button>
      </form>
    </Sheet>
  )
}

function EditGoalModal({
  goal,
  accounts,
  onClose,
  onSubmit,
}: {
  goal: Goal | null
  accounts: Account[]
  onClose: () => void
  onSubmit: (payload: GoalPayload) => void
}) {
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal?.target.toString() ?? '')
  const [saved, setSaved] = useState(goal?.saved.toString() ?? '0')
  const [linkedAccountId, setLinkedAccountId] = useState(goal?.linkedAccountId ?? '')
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? '')
  const [notes, setNotes] = useState(goal?.notes ?? '')
  const [status, setStatus] = useState<Goal['status']>(goal?.status ?? 'Active')

  if (!goal) return null

  const parsedTarget = Number(target)
  const parsedSaved = Number(saved)
  const invalid = !name.trim() || parsedTarget <= 0 || parsedSaved < 0 || parsedSaved > parsedTarget

  return (
    <Sheet title="Edit goal" eyebrow={goal.name} open={Boolean(goal)} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (invalid) return
        onSubmit({
          name: name.trim(),
          target: parsedTarget,
          saved: parsedSaved,
          linkedAccountId: linkedAccountId || undefined,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
          status: parsedSaved >= parsedTarget ? 'Completed' : status,
        })
        onClose()
      }}>
        <Field label="Goal name" value={name} onChange={setName} placeholder="New laptop" />
        <Field label="Target amount" type="number" value={target} onChange={setTarget} placeholder="Rs. 250,000" />
        <Field label="Saved amount" type="number" value={saved} onChange={setSaved} />
        <Select label="Linked account optional" value={linkedAccountId} onChange={setLinkedAccountId} options={[{ value: '', label: 'No linked account' }, ...accounts.map((item) => ({ value: item.id, label: item.name }))]} />
        <Field label="Deadline optional" type="date" value={dueDate} onChange={setDueDate} />
        <Select label="Status" value={status} onChange={(value) => setStatus(value as Goal['status'])} options={['Active', 'Completed', 'Overdue']} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        {parsedSaved > parsedTarget && <p className="text-sm text-[var(--negative)]">Saved amount cannot be greater than target amount.</p>}
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>Save goal</button>
      </form>
    </Sheet>
  )
}

function AddSavingsModal({
  goal,
  accounts,
  onClose,
  onSubmit,
}: {
  goal: Goal | null
  accounts: Account[]
  onClose: () => void
  onSubmit: (payload: SavingsPayload) => void
}) {
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [showInsufficient, setShowInsufficient] = useState(false)

  if (!goal) return null

  const selectedAccount = accounts.find((account) => account.id === accountId)
  const parsedAmount = Number(amount)
  const remaining = Math.max(0, goal.target - goal.saved)
  const invalid = parsedAmount <= 0 || parsedAmount > remaining || !date || !selectedAccount

  return (
    <Sheet title="Add savings" eyebrow={goal.name} open={Boolean(goal)} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (invalid) return
        if (!selectedAccount || parsedAmount > selectedAccount.balance) {
          setShowInsufficient(true)
          return
        }
        onSubmit({ goalId: goal.id, amount: parsedAmount, accountId: selectedAccount.id, date, notes: notes.trim() || undefined })
        onClose()
      }}>
        <Field label="Savings amount" type="number" value={amount} onChange={setAmount} placeholder="Rs. 5,000" />
        <Select label="Pay from account" value={accountId} onChange={setAccountId} options={accounts.map((account) => ({ value: account.id, label: `${account.name} · ${formatPKR(account.balance)}` }))} />
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <TextArea label="Notes optional" value={notes} onChange={setNotes} />
        <div className="rounded-2xl border border-[rgba(255,92,0,.2)] bg-[rgba(255,92,0,.06)] p-3 text-sm text-[var(--muted)]">
          Remaining target: {formatPKR(remaining)}. This contribution will reduce the selected account balance.
        </div>
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>Add savings</button>
      </form>
      {showInsufficient && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-[rgba(232,105,74,.24)] bg-[var(--surface)] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--negative)]">Not enough savings</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Savings balance is too low</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{selectedAccount?.name ?? 'The selected account'} has {formatPKR(selectedAccount?.balance ?? 0)} available.</p>
            <button className="btn-primary mt-5 w-full justify-center" type="button" onClick={() => setShowInsufficient(false)}>Got it</button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function ConfirmDeleteModal({
  target,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!target) return null

  const labels: Record<DeleteTarget['kind'], { eyebrow: string; note: string }> = {
    upcoming: {
      eyebrow: 'Delete upcoming expense',
      note: 'This removes the planned item only. It will not affect transactions, balances, or actual expenses.',
    },
    goal: {
      eyebrow: 'Delete savings goal',
      note: 'This removes the goal card only. It will not delete past savings transactions or change account balances.',
    },
    debt: {
      eyebrow: 'Delete debt',
      note: 'This removes the debt card only. It will not delete past debt payment transactions or change account balances.',
    },
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.section
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm rounded-[1.6rem] border border-white/10 bg-[var(--surface)] p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--muted)]">{labels[target.kind].eyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Delete {target.title}?</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close delete confirmation"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{labels[target.kind].note}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Keep it</button>
          <button className="rounded-2xl border border-[rgba(232,105,74,.24)] bg-[rgba(232,105,74,.1)] px-4 py-3 text-sm font-semibold text-[var(--negative)]" onClick={onConfirm}>Delete</button>
        </div>
      </motion.section>
    </div>
  )
}

export function RecordUpcomingExpensePaidModal({
  expense,
  accounts,
  onClose,
  onConfirm,
}: {
  expense: UpcomingExpense | null
  accounts: Account[]
  onClose: () => void
  onConfirm: (payload: PaidPayload) => void
}) {
  const [accountId, setAccountId] = useState(expense?.linkedAccountId ?? accounts[0]?.id ?? '')
  const [paymentDate, setPaymentDate] = useState(today())
  const [notes, setNotes] = useState('')

  if (!expense) return null

  return (
    <Sheet title="Record this as an actual expense?" eyebrow={`${expense.title} · ${formatPKR(expense.amount)}`} open={Boolean(expense)} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (!accountId || !paymentDate) return
        onConfirm({ accountId, paymentDate, notes: notes.trim() || undefined })
        onClose()
      }}>
        <Select label="Paid from account" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: `${item.name} · ${formatPKR(item.balance)}` }))} />
        <Field label="Payment date" type="date" value={paymentDate} onChange={setPaymentDate} />
        <TextArea label="Notes optional" value={notes} onChange={setNotes} />
        <div className="rounded-2xl border border-[rgba(255,92,0,.2)] bg-[rgba(255,92,0,.06)] p-3 text-sm text-[var(--muted)]">
          Confirming will create a real expense transaction, reduce the selected account balance, and mark this planned item as paid.
        </div>
        <button className="btn-primary justify-center" disabled={!accountId || !paymentDate}>Record as actual expense <ArrowRight size={17} /></button>
      </form>
    </Sheet>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label><span className="form-label">{label}</span><input className="form-input" type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="form-label">{label}</span><textarea className="form-input min-h-20 resize-none" value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] | Array<{ value: string; label: string }> }) {
  return (
    <label>
      <span className="form-label">{label}</span>
      <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

function debtTitle(debt: Debt) {
  return debt.title || debt.name || 'Debt'
}

function debtTotal(debt: Debt) {
  return debt.totalAmount ?? debt.total ?? 0
}

function debtPaid(debt: Debt) {
  return debt.paidAmount ?? debt.paid ?? 0
}

function debtRemaining(debt: Debt) {
  return Math.max(0, debtTotal(debt) - debtPaid(debt))
}

function debtDisplayStatus(debt: Debt): DebtStatus {
  if (debtPaid(debt) >= debtTotal(debt)) return 'Paid'
  if (debt.status === 'Paid') return 'Paid'
  if (debt.dueDate) {
    const due = startOfDay(debt.dueDate).getTime()
    const now = startOfDay(today()).getTime()
    const daysUntilDue = Math.ceil((due - now) / 86400000)
    if (daysUntilDue < 0) return 'Overdue'
    if (daysUntilDue <= 7) return 'Due Soon'
  }
  return debt.status === 'Overdue' || debt.status === 'Due Soon' ? debt.status : 'Active'
}

function upcomingDisplayStatus(expense: UpcomingExpense): UpcomingExpenseStatus {
  if (expense.status === 'paid') return 'paid'
  const due = startOfDay(expense.dueDate).getTime()
  const now = startOfDay(today()).getTime()
  const daysUntilDue = Math.ceil((due - now) / 86400000)
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 7) return 'due_soon'
  return 'upcoming'
}

function startOfDay(date: string) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

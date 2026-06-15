import { ArrowRight, CalendarClock, CheckCircle2, Landmark, PencilLine, Plus, Repeat2, Target, Trash2, WalletCards, X, type LucideIcon } from 'lucide-react'
import { motion, useDragControls } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PanInfo } from 'framer-motion'
import { expenseCategories } from '../data/mockData'
import type { Account, Debt, DebtCategory, DebtStatus, Goal, RecurringFrequency, UpcomingExpense, UpcomingExpenseStatus } from '../types/finance'
import { formatPKR, percent } from '../utils/financeCalculations'
import { cn } from '../utils/ui'

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
  const [activeTab, setActiveTab] = useState<GoalsDebtsTab>('debts')
  const sortedUpcoming = useMemo(
    () => [...upcomingExpenses].sort((a, b) => a.status === 'paid' && b.status !== 'paid' ? 1 : b.status === 'paid' && a.status !== 'paid' ? -1 : a.dueDate.localeCompare(b.dueDate)),
    [upcomingExpenses],
  )
  const summary = upcomingSummary(upcomingExpenses)
  const totalSavings = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const totalDebtToPay = debts.reduce((sum, debt) => sum + debtRemaining(debt), 0)
  const activeGoals = goals.filter((goal) => goal.status !== 'Completed').length
  const activeDebts = debts.filter((debt) => debtDisplayStatus(debt) !== 'Paid').length
  const activeUpcoming = sortedUpcoming.filter((expense) => expense.status !== 'paid').length

  return (
    <div className="space-y-6 pb-32">
      <section className="goals-overview-strip">
        <OverviewStatCard label="Total savings" value={formatPKR(totalSavings)} icon={WalletCards} tone="lime" />
        <OverviewStatCard label="Debt to pay" value={formatPKR(totalDebtToPay)} icon={Landmark} tone="orange" />
        <OverviewStatCard label="Upcoming this month" value={formatPKR(summary.thisMonth)} icon={CalendarClock} tone="cyan" />
        <OverviewStatCard label="Due next 7 days" value={formatPKR(summary.nextSevenDays)} icon={Target} tone="purple" />
      </section>

      <section className="goals-tabs" aria-label="Goals and debts sections">
        <button className={cn(activeTab === 'goals' && 'goals-tab-active')} onClick={() => setActiveTab('goals')}>
          <span>Goals</span>
          <strong>{activeGoals}</strong>
        </button>
        <button className={cn(activeTab === 'debts' && 'goals-tab-active')} onClick={() => setActiveTab('debts')}>
          <span>Debts</span>
          <strong>{activeDebts}</strong>
        </button>
        <button className={cn(activeTab === 'upcoming' && 'goals-tab-active')} onClick={() => setActiveTab('upcoming')}>
          <span>Upcoming</span>
          <strong>{activeUpcoming}</strong>
        </button>
      </section>

      {activeTab === 'goals' && <section>
        <div className="goals-section-header">
          <div><p className="text-sm text-[var(--muted)]">Savings Goals</p><h3 className="text-2xl font-semibold text-white">Build future money</h3></div>
          <button className="btn-primary" onClick={onAddGoal}>Add goal</button>
        </div>
        {goals.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalNeonCard
              key={goal.id}
              goal={goal}
              onAddSavings={() => setSavingGoal(goal)}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => setDeleteTarget({ kind: 'goal', id: goal.id, title: goal.name })}
            />
          ))}
        </div> : <GoalsEmptyState title="No savings goals yet" note="Create a target for a laptop, emergency fund, fee payment, or anything you want to save toward." action="Add goal" onAction={onAddGoal} />}
      </section>}

      {activeTab === 'debts' && <section>
        <div className="goals-section-header">
          <div><p className="text-sm text-[var(--muted)]">Debts / Overdue / Money I Owe</p><h3 className="text-2xl font-semibold text-white">Debts</h3></div>
          <button className="btn-primary" onClick={() => setShowAddDebt(true)}><Plus size={18} /> Add debt</button>
        </div>
        {debts.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {debts.map((debt) => (
            <DebtNeonCard
              key={debt.id}
              debt={debt}
              onPayDebt={() => onDebtPayment(debt.id)}
              onEdit={() => setEditingDebt(debt)}
              onDelete={() => setDeleteTarget({ kind: 'debt', id: debt.id, title: debtTitle(debt) })}
            />
          ))}
        </div> : <GoalsEmptyState title="No debts tracked" note="Add money you owe, installments, overdue payments, or borrowed amounts so you always know what is left." action="Add debt" onAction={() => setShowAddDebt(true)} />}
      </section>}

      {activeTab === 'upcoming' && <section>
        <div className="goals-section-header">
          <div>
            <p className="text-sm text-[var(--muted)]">Upcoming Expenses</p>
            <h3 className="text-2xl font-semibold text-white">Plan future payments</h3>
          </div>
          <button className="btn-primary" onClick={() => setShowAddExpense(true)}><Plus size={18} /> Add Upcoming Expense</button>
        </div>

        {sortedUpcoming.length ? <div className="grid gap-3 xl:grid-cols-2">
          {sortedUpcoming.map((expense) => {
            const displayStatus = upcomingDisplayStatus(expense)
            const account = accounts.find((item) => item.id === expense.linkedAccountId)
            return (
              <article key={expense.id} className={cn('upcoming-expense-card', `upcoming-expense-${displayStatus}`)}>
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-xl font-semibold text-white">{expense.title}</h4>
                      <StatusBadge status={displayStatus} />
                      {expense.isRecurring && <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(221,255,69,.2)] bg-[rgba(221,255,69,.08)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"><Repeat2 size={13} />Recurring</span>}
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{expense.category} · Due {formatDate(expense.dueDate)}{account ? ` · ${account.name}` : ''}</p>
                    {expense.isRecurring && expense.recurringFrequency && <p className="mt-1 text-xs text-[var(--muted)]">{frequencyLabels[expense.recurringFrequency]} commitment</p>}
                  </div>
                  <strong className="shrink-0 text-2xl font-semibold text-white">{formatPKR(expense.amount)}</strong>
                </div>
                {expense.notes && <p className="mt-3 rounded-2xl bg-white/[.035] px-3 py-2 text-sm text-[var(--muted)]">{expense.notes}</p>}
                <div className="goal-card-actions">
                  <button className="btn-primary justify-center px-4 py-2 text-sm disabled:opacity-50" disabled={displayStatus === 'paid'} onClick={() => setPayingExpense(expense)}><CheckCircle2 size={16} /> Mark as Paid</button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="goal-secondary-action" onClick={() => setEditingExpense(expense)}><PencilLine size={15} /> Edit</button>
                    <button className="goal-danger-action" onClick={() => setDeleteTarget({ kind: 'upcoming', id: expense.id, title: expense.title })}><Trash2 size={15} /> Delete</button>
                  </div>
                </div>
              </article>
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

function OverviewStatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone: 'lime' | 'orange' | 'cyan' | 'purple' }) {
  return (
    <article className={cn('goals-overview-card', `goals-overview-${tone}`)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
          <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{value}</h3>
        </div>
        <span className="goals-overview-icon"><Icon size={22} /></span>
      </div>
    </article>
  )
}

function GoalsEmptyState({ title, note, action, onAction }: { title: string; note: string; action: string; onAction: () => void }) {
  return (
    <div className="goals-empty-state">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent)] text-[#111318]">
        <Plus size={28} />
      </div>
      <div>
        <h4 className="text-2xl font-semibold text-white">{title}</h4>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{note}</p>
      </div>
      <button className="btn-primary justify-center" onClick={onAction}>{action}</button>
    </div>
  )
}

function GoalNeonCard({ goal, onAddSavings, onEdit, onDelete }: { goal: Goal; onAddSavings: () => void; onEdit: () => void; onDelete: () => void }) {
  const progress = percent(goal.saved, goal.target)
  const remaining = Math.max(0, goal.target - goal.saved)

  return (
    <article className="upcoming-expense-card goal-debt-card">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Saved amount</p>
          <h4 className="mt-2 truncate text-xl font-semibold text-white">{goal.name}</h4>
        </div>
        <span className="upcoming-status-badge upcoming-status-due_soon">{goal.status}</span>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)] shadow-inner shadow-black/20">
        <div className="h-full rounded-full bg-[var(--accent)] shadow-[0_0_18px_rgba(221,255,69,.65)]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{formatPKR(goal.saved)} of {formatPKR(goal.target)}</p>
          <p className="mt-1 text-xs text-[var(--muted-2)]">{formatPKR(remaining)} remaining{goal.dueDate ? ` · Due ${goal.dueDate}` : ''}</p>
        </div>
        <strong className="text-2xl text-white">{progress}%</strong>
      </div>
      <div className="goal-card-actions">
        <button className="btn-primary justify-center px-4 py-2 text-sm" onClick={onAddSavings}><WalletCards size={16} /> Add savings</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="goal-secondary-action" onClick={onEdit}><PencilLine size={15} /> Edit</button>
          <button className="goal-danger-action" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>
      </div>
    </article>
  )
}

function DebtNeonCard({ debt, onPayDebt, onEdit, onDelete }: { debt: Debt; onPayDebt: () => void; onEdit: () => void; onDelete: () => void }) {
  const total = debtTotal(debt)
  const paid = debtPaid(debt)
  const progress = percent(paid, total)
  const remaining = Math.max(0, total - paid)
  const status = debtDisplayStatus(debt)
  const overdue = status === 'Overdue'
  const paidOff = status === 'Paid'
  const category = debt.category ?? 'Debt'

  return (
    <article className={cn('upcoming-expense-card goal-debt-card', overdue && 'upcoming-expense-overdue')}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('upcoming-status-badge', category === 'Money I Owe' ? 'upcoming-status-due_soon' : overdue ? 'upcoming-status-overdue' : 'upcoming-status-upcoming')}>{category}</span>
            {debt.personOrCompany && <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">{debt.personOrCompany}</span>}
          </div>
          <h4 className="mt-3 truncate text-xl font-semibold text-white">{debtTitle(debt)}</h4>
        </div>
        <span className={cn('upcoming-status-badge', debtStatusClass(status))}>{status}</span>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)] shadow-inner shadow-black/20">
        <div className={cn('h-full rounded-full shadow-[0_0_18px_currentColor]', overdue ? 'bg-[var(--negative)] text-[var(--negative)]' : paidOff ? 'bg-[var(--positive)] text-[var(--positive)]' : 'bg-[var(--accent)] text-[var(--accent)]')} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{formatPKR(paid)} paid / {formatPKR(total)} total</p>
          <p className="mt-1 text-xs text-[var(--muted-2)]">{formatPKR(remaining)} left{debt.dueDate ? ` · Due ${formatDate(debt.dueDate)}` : ''}</p>
        </div>
        <strong className="text-2xl text-white">{progress}%</strong>
      </div>
      {debt.notes && <p className="mt-3 rounded-2xl bg-white/[.035] px-3 py-2 text-sm text-[var(--muted)]">{debt.notes}</p>}
      <div className="goal-card-actions">
        <button className="btn-primary justify-center px-4 py-2 text-sm" disabled={paidOff} onClick={onPayDebt}><CheckCircle2 size={16} /> Add Payment</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="goal-secondary-action" onClick={onEdit}><PencilLine size={15} /> Edit</button>
          <button className="goal-danger-action" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: UpcomingExpenseStatus }) {
  const labels: Record<UpcomingExpenseStatus, string> = {
    upcoming: 'Upcoming',
    due_soon: 'Due Soon',
    overdue: 'Overdue',
    paid: 'Paid',
  }
  return <span className={cn('upcoming-status-badge', `upcoming-status-${status}`)}>{labels[status]}</span>
}

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
          <div className="grid gap-4 rounded-3xl border border-[rgba(221,255,69,.14)] bg-[rgba(221,255,69,.045)] p-3">
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
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [showInsufficient, setShowInsufficient] = useState(false)

  if (!goal) return null

  const savings = accounts.find((account) => account.id === 'savings') ?? { id: 'savings', name: 'Savings', balance: 0 }
  const parsedAmount = Number(amount)
  const remaining = Math.max(0, goal.target - goal.saved)
  const invalid = parsedAmount <= 0 || parsedAmount > remaining || !date

  return (
    <Sheet title="Add savings" eyebrow={goal.name} open={Boolean(goal)} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (invalid) return
        if (parsedAmount > savings.balance) {
          setShowInsufficient(true)
          return
        }
        onSubmit({ goalId: goal.id, amount: parsedAmount, accountId: 'savings', date, notes: notes.trim() || undefined })
        onClose()
      }}>
        <Field label="Savings amount" type="number" value={amount} onChange={setAmount} placeholder="Rs. 5,000" />
        <div className="rounded-2xl border border-[rgba(221,255,69,.18)] bg-[rgba(221,255,69,.06)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Current Savings Balance</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatPKR(savings.balance)}</p>
        </div>
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <TextArea label="Notes optional" value={notes} onChange={setNotes} />
        <div className="rounded-2xl border border-[rgba(221,255,69,.18)] bg-[rgba(221,255,69,.06)] p-3 text-sm text-[var(--muted)]">
          Remaining target: {formatPKR(remaining)}. Saving will only reduce your Savings balance. Transfer money to Savings first if needed.
        </div>
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>Add savings</button>
      </form>
      {showInsufficient && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-[rgba(233,141,103,.24)] bg-[var(--surface)] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--negative)]">Not enough savings</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Savings balance is too low</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">You have {formatPKR(savings.balance)} in Savings. Transfer money into Savings first, then add it to this goal.</p>
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
          <button className="rounded-2xl border border-[rgba(233,141,103,.24)] bg-[rgba(233,141,103,.1)] px-4 py-3 text-sm font-semibold text-[var(--negative)]" onClick={onConfirm}>Delete</button>
        </div>
      </motion.section>
    </div>
  )
}

function RecordUpcomingExpensePaidModal({
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
        <div className="rounded-2xl border border-[rgba(221,255,69,.18)] bg-[rgba(221,255,69,.06)] p-3 text-sm text-[var(--muted)]">
          Confirming will create a real expense transaction, reduce the selected account balance, and mark this planned item as paid.
        </div>
        <button className="btn-primary justify-center" disabled={!accountId || !paymentDate}>Record as actual expense <ArrowRight size={17} /></button>
      </form>
    </Sheet>
  )
}

function Sheet({ title, eyebrow, open, onClose, children }: { title: string; eyebrow: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const dragControls = useDragControls()
  if (!open) return null

  const closeOnDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 96 || info.velocity.y > 720) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <motion.section
        initial={{ opacity: 0, y: 72, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 30, mass: 1 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.28 }}
        onDragEnd={closeOnDrag}
        className="modal-sheet-scroll mx-auto max-h-[86svh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="mx-auto mb-3 block h-5 w-20 touch-none rounded-full" type="button" aria-label={`Drag to close ${title}`} onPointerDown={(event) => dragControls.start(event)}>
          <span className="mx-auto block h-1.5 w-14 rounded-full bg-white/18" />
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">{eyebrow}</p>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={`Close ${title}`}><X size={19} /></button>
        </div>
        {children}
      </motion.section>
    </div>
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
  return new Date().toISOString().slice(0, 10)
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

function debtStatusClass(status: DebtStatus) {
  if (status === 'Paid') return 'upcoming-status-paid'
  if (status === 'Overdue') return 'upcoming-status-overdue'
  if (status === 'Due Soon') return 'upcoming-status-due_soon'
  return 'upcoming-status-upcoming'
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

function upcomingSummary(expenses: UpcomingExpense[]) {
  const now = new Date(today())
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  return expenses.reduce((summary, expense) => {
    const displayStatus = upcomingDisplayStatus(expense)
    const dueDate = new Date(expense.dueDate)
    const unpaid = displayStatus !== 'paid'
    if (unpaid && dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) summary.thisMonth += expense.amount
    if (unpaid && displayStatus === 'due_soon') summary.nextSevenDays += expense.amount
    if (unpaid && displayStatus === 'overdue') summary.overdue += expense.amount
    if (unpaid && expense.isRecurring) summary.recurring += 1
    return summary
  }, { thisMonth: 0, nextSevenDays: 0, overdue: 0, recurring: 0 })
}

function startOfDay(date: string) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

import { ArrowRight, Check, CircleAlert, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { BottomSheet as Sheet } from '../components/BottomSheet'
import { expenseCategories } from '../data/mockData'
import type { Account, Debt, DebtCategory, DebtStatus, Goal, RecurringFrequency, UpcomingExpense } from '../types/finance'
import { formatPKR, percent } from '../utils/financeCalculations'
import { cn } from '../utils/ui'

/* ============================================================
   Goals & Debts — "Your paths." (Vault spec 15b)
   Goals are journeys on one vertical milestone trail: 48px SVG
   progress rings (clay on-pace / espresso needs-attention), a clay
   debt node card, and a dashed "+ Start a new path". Same data,
   props, and modals as before.
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
  onAddGoal,
  onDebtPayment,
  onAddDebt,
  onUpdateGoal,
  onDeleteGoal,
  onUpdateDebt,
  onDeleteDebt,
  onAddSavings,
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
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [savingGoal, setSavingGoal] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [chooserOpen, setChooserOpen] = useState(false)

  const totalSavings = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const there = percent(totalSavings, totalGoalTarget)
  const activeDebtCount = debts.filter((debt) => debtDisplayStatus(debt) !== 'Paid').length

  const eyebrow = `${goals.length} ${goals.length === 1 ? 'goal' : 'goals'} · ${activeDebtCount} ${activeDebtCount === 1 ? 'debt' : 'debts'}`

  return (
    <div className="vault-screen">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{eyebrow}</p>
        <div className="vault-topbar-actions">
          <button aria-label="Start a new path" className="vault-iconbtn" type="button" onClick={() => setChooserOpen(true)}>
            <Plus size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <h1 className="vault-title">Your <em>paths.</em></h1>

      <section aria-label="Progress across all paths" className="vault-strip mt-7">
        <div className="vault-cell">
          <p className="vault-cell-label">Saved so far</p>
          <p className="vault-cell-value">Rs {nf(totalSavings)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">Toward</p>
          <p className="vault-cell-value">Rs {nf(totalGoalTarget)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">There</p>
          <p className="vault-cell-value is-clay">{there}%</p>
        </div>
      </section>

      {(goals.length > 0 || debts.length > 0) && (
        <section aria-label="Your paths" className="vault-trail mt-4">
          {goals.map((goal) => (
            <GoalNode
              key={goal.id}
              goal={goal}
              onQuickAdd={() => setSavingGoal(goal)}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => setDeleteTarget({ kind: 'goal', id: goal.id, title: goal.name })}
            />
          ))}
          {debts.map((debt) => (
            <DebtNode
              key={debt.id}
              debt={debt}
              onPay={() => onDebtPayment(debt.id)}
              onEdit={() => setEditingDebt(debt)}
              onDelete={() => setDeleteTarget({ kind: 'debt', id: debt.id, title: debtTitle(debt) })}
            />
          ))}
        </section>
      )}

      <button className="vault-dashed mt-6" type="button" onClick={() => setChooserOpen(true)}>
        + Start a new path
      </button>

      {chooserOpen && (
        <div className="fixed inset-0 z-[60] grid items-end bg-[rgba(43,36,29,.45)]" onClick={() => setChooserOpen(false)}>
          <div className="vault-outline mx-auto w-full max-w-[27rem] rounded-b-none px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5" role="dialog" aria-label="Start a new path" onClick={(event) => event.stopPropagation()}>
            <h2 className="vault-h2">Start a new <em className="italic text-[var(--clay)]">path.</em></h2>
            <div className="mt-2">
              <button className="vault-row" type="button" onClick={() => { setChooserOpen(false); onAddGoal() }}>
                <span className="vault-row-dot is-in" />
                <span className="vault-row-main">
                  <span className="vault-row-title block">A goal to save toward</span>
                  <span className="vault-row-meta block">A laptop, a fund, a trip — anything ahead of you</span>
                </span>
              </button>
              <button className="vault-row" type="button" onClick={() => { setChooserOpen(false); setShowAddDebt(true) }}>
                <span className="vault-row-dot" />
                <span className="vault-row-main">
                  <span className="vault-row-title block">A debt to clear</span>
                  <span className="vault-row-meta block">Installments, borrowed money, overdue payments</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
      <ConfirmDeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.kind === 'upcoming') return
          if (deleteTarget?.kind === 'goal') onDeleteGoal(deleteTarget.id)
          if (deleteTarget?.kind === 'debt') onDeleteDebt(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}

/* ---------- trail nodes (Vault spec 15b) ---------- */

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

const RING_R = 20
const RING_C = 2 * Math.PI * RING_R

/** Plain-language arrival line under each goal (bold detail in clay). */
function goalEta(goal: Goal): { text: ReactNode; onPace: boolean } {
  const remaining = Math.max(0, goal.target - goal.saved)
  if (remaining <= 0 || goal.status === 'Completed') {
    return { text: <>Fully funded — you have <strong className="font-bold text-[var(--clay)]">arrived</strong>.</>, onPace: true }
  }
  if (goal.dueDate) {
    const due = new Date(`${goal.dueDate}T12:00:00`)
    if (!Number.isNaN(due.getTime())) {
      const monthsLeft = Math.max(1, Math.ceil((due.getTime() - Date.now()) / (30 * 86_400_000)))
      const perCycle = Math.ceil(remaining / monthsLeft)
      const arriveLabel = due.toLocaleDateString('en-US', { month: 'long' })
      const elapsedShare = percent(goal.saved, goal.target)
      return {
        text: <>Add <strong className="font-bold text-[var(--clay)]">Rs {nf(perCycle)}</strong>/cycle to arrive by {arriveLabel}</>,
        onPace: elapsedShare >= 40,
      }
    }
  }
  return { text: <>Rs {nf(remaining)} to go — set a date to plan your pace</>, onPace: percent(goal.saved, goal.target) >= 40 }
}

function GoalNode({ goal, onQuickAdd, onEdit, onDelete }: { goal: Goal; onQuickAdd: () => void; onEdit: () => void; onDelete: () => void }) {
  const progress = percent(goal.saved, goal.target)
  const eta = goalEta(goal)
  const arc = eta.onPace ? 'var(--clay)' : 'var(--espresso)'
  return (
    <div className="vault-trail-node">
      <div className="vault-ring">
        <svg width={48} height={48} aria-hidden="true">
          <circle cx={24} cy={24} r={RING_R} fill="none" stroke="var(--rule-soft)" strokeWidth={4} />
          <circle cx={24} cy={24} r={RING_R} fill="none" stroke={arc} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(RING_C * Math.min(100, progress)) / 100} ${RING_C}`} />
        </svg>
        <span className="vault-ring-label">{progress}%</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="vault-goal-name truncate">{goal.name}</h3>
          <button aria-label={`Add savings to ${goal.name}`} className="vault-quickadd" type="button" onClick={onQuickAdd}>
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
        <p className="vault-digits mt-1 text-[13.5px] font-medium text-[var(--ink-soft)]">{nf(goal.saved)} of {nf(goal.target)}</p>
        <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--taupe)]">{eta.text}</p>
        <p className="mt-1.5 text-[11px] font-semibold text-[var(--taupe)]">
          <button className="underline-offset-2 hover:underline" type="button" onClick={onEdit}>Edit</button>
          <span aria-hidden="true"> · </span>
          <button className="underline-offset-2 hover:underline" type="button" onClick={onDelete}>Delete</button>
        </p>
      </div>
    </div>
  )
}

function DebtNode({ debt, onPay, onEdit, onDelete }: { debt: Debt; onPay: () => void; onEdit: () => void; onDelete: () => void }) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const remaining = debtRemaining(debt)
  const paidOff = debtDisplayStatus(debt) === 'Paid'
  // Rich meta to match the design: "Due 5 August · Rs 4,000/month · 2 payments to freedom"
  const detail = debt.notes?.trim() || debt.personOrCompany || (debt.category && debt.category !== 'Debt' ? debt.category : '')
  const meta = [debt.dueDate ? `Due ${formatDate(debt.dueDate)}` : null, detail || null].filter(Boolean).join(' · ')
  return (
    <div className="vault-debt-node">
      <span className="vault-debt-badge">{paidOff ? <Check size={19} strokeWidth={2.4} /> : <CircleAlert size={19} strokeWidth={2} />}</span>
      <div
        className={cn('vault-debt-card', paidOff && 'is-paid')}
        role="button"
        tabIndex={0}
        aria-expanded={actionsOpen}
        onClick={() => setActionsOpen((open) => !open)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActionsOpen((open) => !open) } }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={cn('min-w-0 truncate font-display text-[21px] leading-tight', paidOff ? 'text-[var(--taupe-faint)]' : 'text-[var(--espresso)]')}>{debtTitle(debt)}</h3>
          <p className={cn('vault-digits flex-none text-[15px] font-bold', paidOff ? 'text-[var(--taupe-faint)]' : 'text-[var(--espresso)]')}>
            {paidOff ? 'Cleared' : <>{nf(remaining)} left</>}
          </p>
        </div>
        {meta && <p className={cn('mt-1.5 text-[12.5px] font-medium leading-[1.45]', paidOff ? 'text-[var(--taupe-faint)]' : 'text-[var(--clay-ink)]')}>{meta}</p>}
        {actionsOpen && (
          <p className={cn('mt-3 text-[11px] font-bold', paidOff ? 'text-[var(--taupe-faint)]' : 'text-[var(--clay-ink)]')}>
            {!paidOff && <><button className="uppercase tracking-[1.2px]" type="button" onClick={(event) => { event.stopPropagation(); onPay() }}>Pay</button><span aria-hidden="true"> · </span></>}
            <button className="uppercase tracking-[1.2px]" type="button" onClick={(event) => { event.stopPropagation(); onEdit() }}>Edit</button>
            <span aria-hidden="true"> · </span>
            <button className="uppercase tracking-[1.2px]" type="button" onClick={(event) => { event.stopPropagation(); onDelete() }}>Delete</button>
          </p>
        )}
      </div>
    </div>
  )
}



/* ---------- modals (behavior unchanged, accents recolored) ---------- */

export function AddUpcomingExpenseModal({
  open,
  accounts,
  expense,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean
  accounts: Account[]
  expense?: UpcomingExpense
  onClose: () => void
  onSubmit: (payload: UpcomingPayload) => void
  onDelete?: () => void
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
        <label className="flex items-center justify-between rounded-2xl border border-[var(--rule)] bg-[var(--surface-2)] px-4 py-3">
          <span>
            <span className="block font-semibold text-[var(--ink)]">Recurring</span>
            <span className="text-xs text-[var(--muted)]">Create the next planned payment after this one is paid.</span>
          </span>
          <input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} />
        </label>
        {isRecurring && (
          <div className="grid gap-4 rounded-3xl border border-[rgba(255, 122, 26,.16)] bg-[rgba(255, 122, 26,.05)] p-3">
            <Select label="Frequency" value={recurringFrequency} onChange={(value) => setRecurringFrequency(value as RecurringFrequency)} options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />
            <Field label="Repeat start date" type="date" value={repeatStartDate} onChange={setRepeatStartDate} />
            <Field label="Optional repeat end date" type="date" value={repeatEndDate} onChange={setRepeatEndDate} />
            <Field label="Reminder days before due date" type="number" value={reminderDaysBefore} onChange={setReminderDaysBefore} placeholder="3" />
          </div>
        )}
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>{expense ? 'Save upcoming expense' : 'Add Upcoming Expense'}</button>
        {expense && onDelete && <button className="justify-self-center text-sm font-semibold text-[var(--clay)]" type="button" onClick={() => { onDelete(); onClose() }}>Delete this bill</button>}
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
        <div className="rounded-2xl border border-[rgba(255, 122, 26,.2)] bg-[rgba(255, 122, 26,.06)] p-3 text-sm text-[var(--muted)]">
          Remaining target: {formatPKR(remaining)}. This contribution will reduce the selected account balance.
        </div>
        <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>Add savings</button>
      </form>
      {showInsufficient && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(43,36,29,.45)] p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-[rgba(232,105,74,.24)] bg-[var(--surface)] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--negative)]">Not enough savings</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">Savings balance is too low</h3>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(43,36,29,.45)] p-5" onMouseDown={onClose}>
      <section
        className="vault-outline w-full max-w-sm p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="vault-eyebrow">{labels[target.kind].eyebrow}</p>
            <h2 className="vault-h2 mt-1">Delete {target.title}?</h2>
          </div>
          <button className="vault-iconbtn" onClick={onClose} aria-label="Close delete confirmation"><X size={15} strokeWidth={1.8} /></button>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">{labels[target.kind].note}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="vault-chip is-active justify-center" onClick={onClose}>Keep it</button>
          <button className="vault-chip justify-center text-[var(--clay)]" onClick={onConfirm}>Delete</button>
        </div>
      </section>
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
        <div className="rounded-2xl border border-[rgba(255, 122, 26,.2)] bg-[rgba(255, 122, 26,.06)] p-3 text-sm text-[var(--muted)]">
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
  // "5 August" — matches the debt-node meta in the Vault mock (15b)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(new Date(date))
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

function startOfDay(date: string) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

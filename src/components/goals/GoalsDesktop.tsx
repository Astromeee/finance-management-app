import { formatMoney } from '../../lib/currency'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleDollarSign, Pencil, Plus, Target, Trash2, WalletCards, X } from 'lucide-react'
import type { Account, Debt, Goal } from '../../types/finance'
import { buildGoalMilestones, goalPace, goalProgress, monthlyContributionNeeded, selectFeaturedGoal, type GoalMilestone } from './goalsDesktopLogic'

const money = (value: number) => formatMoney(value)
const debtTitle = (debt: Debt) => debt.title || debt.name || 'Debt'
const debtTotal = (debt: Debt) => debt.totalAmount ?? debt.total ?? 0
const debtPaid = (debt: Debt) => debt.paidAmount ?? debt.paid ?? 0
const formatDate = (date?: string) => date ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'

type Detail = { kind: 'goal' | 'debt'; id: string }

export interface GoalsDesktopProps {
  goals: Goal[]
  debts: Debt[]
  accounts: Account[]
  onNewPath: () => void
  onAddFunds: (goalId: string) => void
  onEditGoal: (goalId: string) => void
  onCompleteGoal: (goal: Goal) => void
  onDeleteGoal: (goalId: string) => void
  onPayDebt: (debtId: string) => void
  onAddDebt: () => void
  onEditDebt: (debtId: string) => void
  onDeleteDebt: (debtId: string) => void
}

function PaceBadge({ pace }: { pace: ReturnType<typeof goalPace> }) {
  const tone = pace === 'Overdue' || pace === 'Needs contribution' ? 'warn' : pace === 'Ahead of pace' || pace === 'Completed' ? 'good' : 'neutral'
  return <span className={`gd-pace is-${tone}`}>{pace}</span>
}

function GoalDetailPanel({ goal, accounts, close, onAddFunds, onEdit, onComplete, onDelete }: { goal: Goal; accounts: Account[]; close: () => void; onAddFunds: () => void; onEdit: () => void; onComplete: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    closeRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); previousFocus?.focus() }
  }, [close])
  const progress = goalProgress(goal)
  const remaining = Math.max(0, goal.target - goal.saved)
  const account = accounts.find((item) => item.id === goal.linkedAccountId)
  return <div className="d-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <aside className="d-slide-over gd-detail-panel" role="dialog" aria-modal="true" aria-labelledby="goal-detail-title">
      <header><div><span><Target size={14}/></span>Goal details</div><button ref={closeRef} type="button" onClick={close} aria-label="Close goal details"><X size={17}/></button><h2 id="goal-detail-title">{goal.name}</h2><p>Review your progress before choosing an action.</p></header>
      <div className="d-modal-body">
        <section className="gd-panel-progress"><div><span>{progress}% complete</span><strong>{money(goal.saved)} <small>of {money(goal.target)}</small></strong></div><i><b style={{ width: `${progress}%` }}/></i><p>{money(remaining)} remaining</p></section>
        <dl className="gd-detail-grid"><div><dt>Target date</dt><dd>{formatDate(goal.dueDate)}</dd></div><div><dt>Pace</dt><dd><PaceBadge pace={goalPace(goal)}/></dd></div><div><dt>Monthly needed</dt><dd>{money(monthlyContributionNeeded(goal))}</dd></div><div><dt>Linked account</dt><dd>{account?.name ?? 'Not linked'}</dd></div></dl>
        {goal.notes && <section className="gd-note"><span>Note</span><p>{goal.notes}</p></section>}
        <div className="gd-panel-actions"><button className="gd-primary" type="button" onClick={onAddFunds} disabled={remaining <= 0}><Plus size={16}/>Add funds</button><button type="button" onClick={onEdit}><Pencil size={16}/>Edit goal</button>{goal.status !== 'Completed' && <button type="button" onClick={onComplete}><Check size={16}/>Mark complete</button>}</div>
        {confirmDelete ? <div className="gd-delete-confirm" role="alert"><p><strong>Delete this goal?</strong><span>Its existing ledger entries and account balances will stay unchanged.</span></p><button type="button" onClick={() => setConfirmDelete(false)}>Keep goal</button><button type="button" onClick={onDelete}>Delete</button></div> : <button type="button" className="d-destructive" onClick={() => setConfirmDelete(true)}><Trash2 size={16}/>Delete goal</button>}
      </div>
    </aside>
  </div>
}

function DebtDetailPanel({ debt, close, onPay, onEdit, onDelete }: { debt: Debt; close: () => void; onPay: () => void; onEdit: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    closeRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); previousFocus?.focus() }
  }, [close])
  const total = debtTotal(debt)
  const paid = debtPaid(debt)
  const remaining = Math.max(0, total - paid)
  const progress = Math.min(100, Math.round((paid / Math.max(1, total)) * 100))
  return <div className="d-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <aside className="d-slide-over gd-detail-panel" role="dialog" aria-modal="true" aria-labelledby="debt-detail-title">
      <header><div><span><CircleDollarSign size={14}/></span>Debt details</div><button ref={closeRef} type="button" onClick={close} aria-label="Close debt details"><X size={17}/></button><h2 id="debt-detail-title">{debtTitle(debt)}</h2><p>Review the repayment before making any changes.</p></header>
      <div className="d-modal-body">
        <section className="gd-panel-progress"><div><span>{progress}% repaid</span><strong>{money(paid)} <small>of {money(total)}</small></strong></div><i><b style={{ width: `${progress}%` }}/></i><p>{money(remaining)} outstanding</p></section>
        <dl className="gd-detail-grid"><div><dt>Due date</dt><dd>{formatDate(debt.dueDate)}</dd></div><div><dt>Status</dt><dd>{debt.status}</dd></div><div><dt>Owed to</dt><dd>{debt.personOrCompany || 'Not specified'}</dd></div><div><dt>Category</dt><dd>{debt.category}</dd></div></dl>
        {debt.notes && <section className="gd-note"><span>Note</span><p>{debt.notes}</p></section>}
        <div className="gd-panel-actions"><button className="gd-primary" type="button" onClick={onPay} disabled={remaining <= 0}><WalletCards size={16}/>Pay</button><button type="button" onClick={onEdit}><Pencil size={16}/>Edit debt</button></div>
        {confirmDelete ? <div className="gd-delete-confirm" role="alert"><p><strong>Delete this debt?</strong><span>Past repayments and account balances will stay unchanged.</span></p><button type="button" onClick={() => setConfirmDelete(false)}>Keep debt</button><button type="button" onClick={onDelete}>Delete</button></div> : <button type="button" className="d-destructive" onClick={() => setConfirmDelete(true)}><Trash2 size={16}/>Delete debt</button>}
      </div>
    </aside>
  </div>
}

export function GoalsDesktop(props: GoalsDesktopProps) {
  const { goals, debts } = props
  const [detail, setDetail] = useState<Detail | null>(null)
  const [showAllMilestones, setShowAllMilestones] = useState(false)
  const featured = useMemo(() => selectFeaturedGoal(goals), [goals])
  const milestones = useMemo(() => buildGoalMilestones(goals, debts), [goals, debts])
  const shownMilestones = showAllMilestones ? milestones : milestones.slice(0, 4)
  const featuredProgress = featured ? goalProgress(featured) : 0
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const outstanding = debts.reduce((sum, debt) => sum + Math.max(0, debtTotal(debt) - debtPaid(debt)), 0)

  const openMilestone = (milestone: GoalMilestone) => setDetail({ kind: milestone.kind, id: milestone.id })
  const selectedGoal = detail?.kind === 'goal' ? goals.find((goal) => goal.id === detail.id) : undefined
  const selectedDebt = detail?.kind === 'debt' ? debts.find((debt) => debt.id === detail.id) : undefined

  return <>
    <div className="gd-workspace">
      <div className="gd-primary-column">
        <section className="gd-hero">
          {featured ? <>
            <div className="gd-hero-top"><div><span className="gd-eyebrow">Featured path</span><div className="gd-feature-title"><span><Target size={21}/></span><h2>{featured.name}</h2></div><p><strong>{money(featured.saved)}</strong> of {money(featured.target)} saved</p></div><div className="gd-hero-ring" style={{ background: `conic-gradient(#E2703A ${featuredProgress}%,#4A4035 0)` }}><span>{featuredProgress}<small>%</small></span></div></div>
            <div className="gd-hero-progress"><i><b style={{ width: `${featuredProgress}%` }}/></i><div><strong>{money(Math.max(0, featured.target - featured.saved))} to go</strong><span>{featuredProgress}%</span></div></div>
            <div className="gd-hero-stats"><div><span>Target date</span><strong>{formatDate(featured.dueDate)}</strong></div><div><span>Pace</span><strong>{goalPace(featured)}</strong></div><div><span>Monthly needed</span><strong>{money(monthlyContributionNeeded(featured))}</strong></div></div>
            <div className="gd-hero-actions"><button type="button" className="gd-primary" onClick={() => props.onAddFunds(featured.id)}><Plus size={16}/>Add funds</button><button type="button" onClick={() => setDetail({ kind: 'goal', id: featured.id })}>View details<ArrowRight size={15}/></button></div>
          </> : <div className="gd-empty-hero"><Target size={25}/><span className="gd-eyebrow">Your next path</span><h2>Turn a future plan into a visible goal.</h2><p>Add a target, then contribute from any account when you are ready.</p><button type="button" className="gd-primary" onClick={props.onNewPath}><Plus size={16}/>Create a path</button></div>}
        </section>

        <section className="gd-card gd-goals-list">
          <header><div><span className="gd-eyebrow">Your progress</span><h2>All goals</h2></div><p><strong>{money(totalSaved)}</strong> saved of {money(totalTarget)}</p></header>
          <div className="gd-goal-table-head" aria-hidden="true"><span>Goal</span><span>Progress</span><span>Remaining</span><span>Due & pace</span></div>
          {goals.map((goal) => { const progress = goalProgress(goal); return <button type="button" className="gd-goal-row" key={goal.id} onClick={() => setDetail({ kind: 'goal', id: goal.id })}>
            <span className="gd-row-icon"><Target size={18}/></span><span className="gd-row-title"><strong>{goal.name}</strong><small>{money(goal.saved)} of {money(goal.target)}</small></span><span className="gd-row-progress"><i><b style={{ width: `${progress}%` }}/></i><small>{progress}% funded</small></span><span className="gd-row-amount">{money(Math.max(0, goal.target - goal.saved))}</span><span className="gd-row-status"><small>{formatDate(goal.dueDate)}</small><PaceBadge pace={goalPace(goal)}/></span><ChevronRight size={16}/>
          </button> })}
          {!goals.length && <div className="gd-empty"><Target size={23}/><div><h3>No goals yet</h3><p>Create a path to start tracking progress toward something that matters.</p></div><button type="button" onClick={props.onNewPath}>Create a path</button></div>}
        </section>
      </div>

      <aside className="gd-side-column">
        <section className="gd-card gd-milestones">
          <header><div><span className="gd-eyebrow">Coming into view</span><h2>Upcoming milestones</h2></div><span>{milestones.length}</span></header>
          <p className="gd-section-copy">Goal dates and unpaid debts, ordered by what arrives first.</p>
          <div>{shownMilestones.map((milestone) => <button type="button" key={`${milestone.kind}-${milestone.id}`} onClick={() => openMilestone(milestone)}><span className={`gd-date-badge is-${milestone.timing === 'Overdue' ? 'overdue' : milestone.timing === 'Date not set' ? 'undated' : 'future'}`}><CalendarDays size={14}/>{milestone.timing === 'Date not set' ? 'No date' : formatDate(milestone.date).replace(/\s\d{4}$/, '')}</span><p><strong>{milestone.title}</strong><small>{milestone.kind === 'goal' ? 'Goal' : 'Debt'} · {money(milestone.remaining)} {milestone.kind === 'goal' ? 'remaining' : 'outstanding'}</small></p><ChevronRight size={15}/></button>)}</div>
          {!milestones.length && <div className="gd-small-empty"><Check size={18}/><p><strong>No upcoming milestones</strong><span>Add a date to a goal or debt to see it here.</span></p></div>}
          {milestones.length > 4 && <button className="gd-view-all" type="button" onClick={() => setShowAllMilestones((value) => !value)}>{showAllMilestones ? 'Show fewer' : `View all ${milestones.length}`}<ArrowRight size={14}/></button>}
        </section>

        <section className="gd-card gd-debts">
          <header><div><span className="gd-eyebrow">What you owe</span><h2>Debts & repayments</h2></div><button type="button" onClick={props.onAddDebt}><Plus size={15}/>Add debt</button></header>
          <div className="gd-debt-total"><span>Outstanding</span><strong>{money(outstanding)}</strong></div>
          {debts.map((debt) => { const total = debtTotal(debt); const paid = debtPaid(debt); const remaining = Math.max(0, total - paid); const progress = Math.min(100, Math.round((paid / Math.max(1, total)) * 100)); return <div className="gd-debt-row" key={debt.id}><button type="button" className="gd-debt-main" onClick={() => setDetail({ kind: 'debt', id: debt.id })}><span className="gd-row-icon"><CircleDollarSign size={17}/></span><p><strong>{debtTitle(debt)}</strong><small>{money(remaining)} left · {progress}% repaid</small></p><span>{formatDate(debt.dueDate)}</span><ChevronRight size={15}/></button><button type="button" className="gd-pay" onClick={() => props.onPayDebt(debt.id)} disabled={remaining <= 0}>Pay</button></div> })}
          {!debts.length && <div className="gd-small-empty"><CircleDollarSign size={18}/><p><strong>No debts recorded</strong><span>Add one to keep repayments beside your goals.</span></p></div>}
        </section>
      </aside>
    </div>

    {selectedGoal && <GoalDetailPanel goal={selectedGoal} accounts={props.accounts} close={() => setDetail(null)} onAddFunds={() => { setDetail(null); props.onAddFunds(selectedGoal.id) }} onEdit={() => { setDetail(null); props.onEditGoal(selectedGoal.id) }} onComplete={() => { props.onCompleteGoal(selectedGoal); setDetail(null) }} onDelete={() => { props.onDeleteGoal(selectedGoal.id); setDetail(null) }}/>} 
    {selectedDebt && <DebtDetailPanel debt={selectedDebt} close={() => setDetail(null)} onPay={() => { setDetail(null); props.onPayDebt(selectedDebt.id) }} onEdit={() => { setDetail(null); props.onEditDebt(selectedDebt.id) }} onDelete={() => { props.onDeleteDebt(selectedDebt.id); setDetail(null) }}/>} 
  </>
}

import {
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Flag,
  History,
  Pencil,
  PieChart,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CoolOffSheet } from '../components/sheets/CoolOffSheet'
import { VaultSheet } from '../components/sheets/VaultSheet'
import { AddUpcomingExpenseModal, RecordUpcomingExpensePaidModal } from './GoalsDebts'
import { CategoryIcon } from '../components/icons/CategoryIcon'
import type { Budget, MoneyQuest, UpcomingExpense, WishlistItem } from '../types/finance'
import { localDateKey, localMonthKey } from '../lib/date'
import { questProgress } from '../utils/retention'
import { cn } from '../utils/ui'
import {
  daysUntil,
  formatPlanDate,
  isBillActive,
  isWishlistActive,
  nf,
  type PlanActions,
  type PlanData,
  type PlanHistoryFilter,
  type PlanSection,
} from '../components/plan/planTypes'

type DetailTarget =
  | { kind: 'limit'; item: Budget }
  | { kind: 'bill'; item: UpcomingExpense }
  | { kind: 'cooling'; item: WishlistItem }
  | { kind: 'quests'; item: MoneyQuest }

const sections: Array<{ key: PlanSection; label: string }> = [
  { key: 'limits', label: 'Limits' },
  { key: 'bills', label: 'Bills' },
  { key: 'cooling', label: 'Cool-off' },
  { key: 'quests', label: 'Quests' },
]

/* Colour-coded section headers so the four parts of the plan read as distinct
   families rather than one flat wall. Each heading ends on an italic accent
   word in the section's colour, matching the page-title pattern. */
const sectionHeads: Record<PlanSection, { eyebrow: string; accent: string; lead: string; word: string; copy: string }> = {
  limits: { eyebrow: 'Spending limits', accent: '#C85A2A', lead: 'Caps for ', word: 'this month.', copy: 'Each category has a ceiling, so nothing quietly runs over.' },
  bills: { eyebrow: 'Scheduled bills', accent: '#657355', lead: 'Set aside ', word: 'first.', copy: 'Known payments protected before your spending number is drawn.' },
  cooling: { eyebrow: 'Cool-off list', accent: '#837661', lead: 'Sleep on ', word: 'it.', copy: 'Non-essential buys you’re pausing on before deciding.' },
  quests: { eyebrow: 'Weekly quests', accent: '#7C8A6B', lead: 'Small ', word: 'wins.', copy: 'Light money challenges, scored from your ledger for you.' },
}

export function Budgets(props: PlanData & PlanActions) {
  const {
    accounts, budgets, budgetHistory, categories, goals, moneyQuests, transactions, upcomingExpenses, wishlistItems,
    onSaveBudget, onArchiveBudget, onRestoreBudget, onCopyLastMonthBudgets,
    onAddUpcoming, onUpdateUpcoming, onCancelUpcoming, onMarkUpcomingPaid,
    onSaveWishlist, onRemoveWishlist, onBuyWishlist, onSaveQuest, onEndQuest,
  } = props
  const [activeChip, setActiveChip] = useState<PlanSection>('limits')
  const [addChooserOpen, setAddChooserOpen] = useState(false)
  const [detail, setDetail] = useState<DetailTarget | null>(null)
  const [listSection, setListSection] = useState<PlanSection | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<PlanHistoryFilter>('all')
  const [now] = useState(() => Date.now())
  const [limitEditor, setLimitEditor] = useState<Budget | 'new' | null>(null)
  const [addingBill, setAddingBill] = useState(false)
  const [editingBill, setEditingBill] = useState<UpcomingExpense | null>(null)
  const [payingBill, setPayingBill] = useState<UpcomingExpense | null>(null)
  const [addingWish, setAddingWish] = useState(false)
  const [editingWish, setEditingWish] = useState<WishlistItem | null>(null)
  const [startingQuest, setStartingQuest] = useState(false)
  const sectionRefs = useRef<Record<PlanSection, HTMLElement | null>>({ limits: null, bills: null, cooling: null, quests: null })

  const activeBills = useMemo(() => upcomingExpenses.filter(isBillActive).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [upcomingExpenses])
  const coolingItems = useMemo(() => wishlistItems.filter(isWishlistActive).sort((a, b) => a.reconsiderAt.localeCompare(b.reconsiderAt)), [wishlistItems])
  const activeQuests = useMemo(() => moneyQuests.filter((quest) => quest.status === 'active'), [moneyQuests])
  const totalLimit = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.used, 0)
  const remaining = Math.max(0, totalLimit - totalUsed)
  const spentPct = totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0
  const dueSoon = activeBills.filter((bill) => daysUntil(bill.dueDate) <= 30).length
  const readyItems = coolingItems.filter((item) => item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= now).length
  const previousMonthLimits = budgetHistory.filter((budget) => !budget.archived).length

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const key = (visible?.target as HTMLElement | undefined)?.dataset.section as PlanSection | undefined
      if (key) setActiveChip(key)
    }, { rootMargin: '-18% 0px -66% 0px' })
    Object.values(sectionRefs.current).forEach((node) => { if (node) observer.observe(node) })
    return () => observer.disconnect()
  }, [])

  const goTo = (key: PlanSection) => {
    setActiveChip(key)
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const addFor = (kind: PlanSection) => {
    if (kind === 'limits') setLimitEditor('new')
    if (kind === 'bills') setAddingBill(true)
    if (kind === 'cooling') setAddingWish(true)
    if (kind === 'quests' && activeQuests.length < 3) setStartingQuest(true)
  }

  const previewFor = (kind: PlanSection) => kind === 'limits' ? budgets : kind === 'bills' ? activeBills : kind === 'cooling' ? coolingItems : activeQuests
  const countFor = (kind: PlanSection) => previewFor(kind).length

  return (
    <div className="vault-screen pl-mobile-plan">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{new Date().toLocaleDateString('en-GB', { month: 'long' }).toUpperCase()} · YOUR PLAN</p>
        <button aria-label="Add to your plan" className="vault-plan-add-pill" type="button" onClick={() => setAddChooserOpen(true)}><Plus size={17} /> <span>Add</span></button>
      </header>
      <h1 className="vault-title">The <em>plan.</em></h1>

      <section className="pl-hero" aria-label="Limit money left">
        <div className="pl-hero-top">
          <span className="pl-hero-label">Limit money left</span>
          <span className="pl-hero-pill">{spentPct}% spent</span>
        </div>
        <strong className="pl-hero-figure vault-digits">Rs {nf(remaining)}</strong>
        <p className="pl-hero-sub">Rs {nf(totalUsed)} of Rs {nf(totalLimit)} used across your {budgets.length} {budgets.length === 1 ? 'limit' : 'limits'}</p>
        <span className="pl-hero-bar"><i style={{ width: `${spentPct}%` }} /></span>
      </section>

      <section className="pl-statstrip" aria-label="Plan at a glance">
        <div><span>Bills due</span><strong className="vault-digits" style={{ color: 'var(--clay-deep)' }}>{dueSoon}</strong></div>
        <div><span>Decisions ready</span><strong className="vault-digits" style={{ color: '#657355' }}>{readyItems}</strong></div>
        <div><span>Quests</span><strong className="vault-digits" style={{ color: '#7C8A6B' }}>{activeQuests.length} <small>/ 3</small></strong></div>
      </section>

      <div className="vault-chiprow pl-plan-chips sticky top-0 z-10 -mx-[26px] bg-[var(--bone)] px-[26px] py-2">
        {sections.map(({ key, label }) => <button key={key} className={cn('vault-chip', activeChip === key && 'is-active')} type="button" onClick={() => goTo(key)}>{label}</button>)}
      </div>

      {sections.map(({ key, label }) => (
        <section key={key} ref={(node) => { sectionRefs.current[key] = node }} data-section={key} className="pl-mobile-section scroll-mt-16">
          <header className="pl-section-head">
            <div>
              <p className="pl-section-eyebrow" style={{ color: sectionHeads[key].accent }}>{sectionHeads[key].eyebrow}</p>
              <h2 className="pl-section-title">{sectionHeads[key].lead}<em style={{ color: sectionHeads[key].accent }}>{sectionHeads[key].word}</em></h2>
              <p className="pl-section-copy">{sectionHeads[key].copy}</p>
            </div>
            <button type="button" disabled={key === 'quests' && activeQuests.length >= 3} onClick={() => addFor(key)}><Plus size={14} /> Add</button>
          </header>
          {key === 'limits' && previousMonthLimits > 0 && budgets.length === 0 && <button className="pl-copy-month" type="button" onClick={onCopyLastMonthBudgets}><Copy size={15} /> Copy last month&rsquo;s limits</button>}
          <div className="pl-mobile-list">
            {previewFor(key).slice(0, 3).map((item) => <MobilePlanRow key={item.id} kind={key} item={item as never} transactions={transactions} onOpen={() => setDetail({ kind: key === 'quests' ? 'quests' : key === 'cooling' ? 'cooling' : key === 'bills' ? 'bill' : 'limit', item } as DetailTarget)} />)}
            {countFor(key) === 0 && <button className="pl-mobile-empty" type="button" onClick={() => addFor(key)}><Plus size={18} /><span><strong>No {label.toLowerCase()} yet</strong><small>Add one when it helps you make a clearer decision.</small></span></button>}
          </div>
          {countFor(key) > 3 && <button className="pl-view-all" type="button" onClick={() => setListSection(key)}>View all {countFor(key)} <ChevronRight size={15} /></button>}
          {key === 'quests' && activeQuests.length >= 3 && <p className="pl-cap-note">Three quests are active. End or complete one before starting another.</p>}
        </section>
      ))}

      <button className="pl-history-link" type="button" onClick={() => setHistoryOpen(true)}><span><History size={18} /><span><strong>Plan history</strong><small>Past limits, bills, decisions and quests</small></span></span><ChevronRight size={18} /></button>

      {addChooserOpen && <AddToPlanSheet activeQuestCount={activeQuests.length} onClose={() => setAddChooserOpen(false)} onPick={(kind) => { setAddChooserOpen(false); addFor(kind) }} />}
      {listSection && <ListSheet title={sections.find((item) => item.key === listSection)?.label ?? 'Plan items'} onClose={() => setListSection(null)}>{previewFor(listSection).map((item) => <MobilePlanRow key={item.id} kind={listSection} item={item as never} transactions={transactions} onOpen={() => { setListSection(null); setDetail({ kind: listSection === 'quests' ? 'quests' : listSection === 'cooling' ? 'cooling' : listSection === 'bills' ? 'bill' : 'limit', item } as DetailTarget) }} />)}</ListSheet>}
      {historyOpen && <HistorySheet budgets={budgetHistory} bills={upcomingExpenses} wishlist={wishlistItems} quests={moneyQuests} filter={historyFilter} onFilter={setHistoryFilter} onClose={() => setHistoryOpen(false)} onRestoreBudget={onRestoreBudget} onRepeatQuest={(quest) => { setHistoryOpen(false); onSaveQuest(repeatQuest(quest)) }} />}
      {detail && <DetailSheet target={detail} accounts={accounts} categories={categories} goals={goals} transactions={transactions} onClose={() => setDetail(null)} onEdit={() => { if (detail.kind === 'limit') setLimitEditor(detail.item); if (detail.kind === 'bill') setEditingBill(detail.item); if (detail.kind === 'cooling') setEditingWish(detail.item); setDetail(null) }} onArchiveLimit={(budget) => { onArchiveBudget(budget); setDetail(null) }} onPayBill={(bill) => { setPayingBill(bill); setDetail(null) }} onCancelBill={(bill) => { onCancelUpcoming(bill); setDetail(null) }} onSaveWishlist={(item) => { onSaveWishlist(item); setDetail(null) }} onRemoveWishlist={(item) => { onRemoveWishlist(item); setDetail(null) }} onBuyWishlist={(item) => { onBuyWishlist(item); setDetail(null) }} onEndQuest={(quest) => { onEndQuest(quest); setDetail(null) }} onRepeatQuest={(quest) => { onSaveQuest(repeatQuest(quest)); setDetail(null) }} />}
      {limitEditor && <LimitSheet budget={limitEditor === 'new' ? undefined : limitEditor} budgets={budgets} categories={categories} onClose={() => setLimitEditor(null)} onSave={(budget) => { onSaveBudget(budget); setLimitEditor(null) }} />}
      <AddUpcomingExpenseModal accounts={accounts} key={addingBill ? 'add-plan-bill' : 'closed-plan-bill'} open={addingBill} onClose={() => setAddingBill(false)} onSubmit={onAddUpcoming} />
      <AddUpcomingExpenseModal accounts={accounts} key={editingBill?.id ?? 'closed-edit-plan-bill'} expense={editingBill ?? undefined} open={Boolean(editingBill)} onClose={() => setEditingBill(null)} onSubmit={(payload) => { if (editingBill) onUpdateUpcoming(editingBill.id, payload) }} />
      <RecordUpcomingExpensePaidModal accounts={accounts} expense={payingBill} onClose={() => setPayingBill(null)} onConfirm={(payload) => { if (payingBill) onMarkUpcomingPaid(payingBill, payload) }} />
      <CoolOffSheet key={editingWish?.id ?? (addingWish ? 'add-plan-wish' : 'closed-plan-wish')} open={addingWish || Boolean(editingWish)} item={editingWish ?? undefined} categories={categories} onClose={() => { setAddingWish(false); setEditingWish(null) }} onSave={onSaveWishlist} />
      {startingQuest && <QuestSheet categories={categories} goals={goals} onClose={() => setStartingQuest(false)} onSave={(quest) => { onSaveQuest(quest); setStartingQuest(false) }} />}
    </div>
  )
}

function MobilePlanRow({ kind, item, transactions, onOpen }: { kind: PlanSection; item: Budget | UpcomingExpense | WishlistItem | MoneyQuest; transactions: PlanData['transactions']; onOpen: () => void }) {
  const [now] = useState(() => Date.now())
  if (kind === 'limits') {
    const budget = item as Budget
    const used = Math.round((budget.used / Math.max(1, budget.amount)) * 100)
    return <button className="pl-mobile-row" type="button" onClick={onOpen}><span className="pl-row-icon is-clay"><CategoryIcon label={budget.category} type="expense" size={18} /></span><span><strong>{budget.category}</strong><small>Rs {nf(Math.max(0, budget.amount - budget.used))} left · {used}% used</small><i><b className={used >= 80 ? 'is-hot' : ''} style={{ width: `${Math.min(100, used)}%` }} /></i></span><span className="vault-digits">Rs {nf(budget.amount)}</span></button>
  }
  if (kind === 'bills') {
    const bill = item as UpcomingExpense
    const days = daysUntil(bill.dueDate)
    return <button className="pl-mobile-row" type="button" onClick={onOpen}><span className="pl-row-icon is-sage"><CalendarDays size={18} /></span><span><strong>{bill.title}</strong><small>{days < 0 ? `${Math.abs(days)} days overdue` : `Due ${formatPlanDate(bill.dueDate)}`} · {bill.isRecurring ? bill.recurringFrequency?.replace('_', ' ') : 'one-time'}</small></span><span className="vault-digits">Rs {nf(bill.amount)}</span></button>
  }
  if (kind === 'cooling') {
    const wish = item as WishlistItem
    const ready = wish.status === 'ready' || new Date(wish.reconsiderAt).getTime() <= now
    return <button className="pl-mobile-row" type="button" onClick={onOpen}><span className="pl-row-icon is-taupe"><Clock3 size={18} /></span><span><strong>{wish.name}</strong><small>{ready ? <b className="pl-row-ready">Ready to decide</b> : `Think until ${formatPlanDate(wish.reconsiderAt)}`}{wish.reason ? ` · ${wish.reason}` : ''}</small></span><span className="vault-digits">Rs {nf(wish.amount)}</span></button>
  }
  const quest = item as MoneyQuest
  const progress = Math.min(100, Math.round(questProgress(quest, transactions)))
  return <button className="pl-mobile-row" type="button" onClick={onOpen}><span className="pl-row-icon is-sage"><Flag size={18} /></span><span><strong>{quest.title}</strong><small>{progress}% complete · ends {formatPlanDate(quest.endsOn)}</small><i><b style={{ width: `${progress}%` }} /></i></span><span className="vault-digits">{progress}%</span></button>
}

function LimitSheet({ budget, budgets, categories, onClose, onSave }: { budget?: Budget; budgets: Budget[]; categories: PlanData['categories']; onClose: () => void; onSave: (budget: Budget) => void }) {
  const available = categories.filter((category) => category.kind === 'expense' && (category.id === budget?.categoryId || !budgets.some((item) => item.categoryId ? item.categoryId === category.id : item.category === category.name)))
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? available[0]?.id ?? '')
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const category = categories.find((item) => item.id === categoryId)
    const value = Number(amount)
    if (!category || value <= 0) return
    onSave({ ...budget, id: budget?.id ?? crypto.randomUUID(), category: category.name, categoryId: category.id, amount: value, used: budget?.used ?? 0, periodMonth: budget?.periodMonth ?? `${localMonthKey()}-01`, archived: false })
  }
  return <VaultSheet open label={budget ? `Edit ${budget.category} limit` : 'Add spending limit'} onClose={onClose}><h2 className="vault-sheet-title">{budget ? 'Edit spending' : 'Add a spending'} <em>limit.</em></h2><p className="mt-2 text-center text-[12px] text-[var(--taupe)]">Your recorded spending stays attached when a limit changes.</p><form className="mt-5 grid gap-3" onSubmit={submit}><label><span className="form-label">Category</span><select className="form-input" disabled={Boolean(budget)} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{available.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label><span className="form-label">Monthly limit</span><input className="form-input" min="1" inputMode="numeric" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="PKR amount" /></label><button className="vault-commit is-espresso" disabled={!categoryId || Number(amount) <= 0}>Save limit</button></form></VaultSheet>
}

function QuestSheet({ categories, goals, onClose, onSave }: { categories: PlanData['categories']; goals: PlanData['goals']; onClose: () => void; onSave: (quest: MoneyQuest) => void }) {
  const [type, setType] = useState<MoneyQuest['type']>('no_spend_days')
  const [target, setTarget] = useState('3')
  const [categoryId, setCategoryId] = useState(categories.find((item) => item.kind === 'expense')?.id ?? '')
  const [goalId, setGoalId] = useState(goals.find((goal) => goal.status !== 'Completed')?.id ?? goals[0]?.id ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Math.max(1, Number(target))
    const category = categories.find((item) => item.id === categoryId)
    const goal = goals.find((item) => item.id === goalId)
    const end = new Date(); end.setDate(end.getDate() + 6)
    const title = type === 'tracking_days' ? `Track money on ${value} days` : type === 'no_spend_days' ? `${value} no-spend days` : type === 'goal_contribution' ? `Add Rs ${nf(value)} to ${goal?.name ?? 'a goal'}` : `Keep ${category?.name ?? 'category'} under Rs ${nf(value)}`
    onSave({ id: crypto.randomUUID(), type, title, categoryId: type === 'category_limit' ? categoryId : undefined, goalId: type === 'goal_contribution' ? goalId : undefined, targetCount: type === 'tracking_days' || type === 'no_spend_days' ? value : undefined, targetAmount: type === 'category_limit' || type === 'goal_contribution' ? value : undefined, startsOn: localDateKey(), endsOn: localDateKey(end), status: 'active', createdAt: new Date().toISOString() })
  }
  return <VaultSheet open label="Start a weekly quest" onClose={onClose}><h2 className="vault-sheet-title">Start a weekly <em>quest.</em></h2><p className="mt-2 text-center text-[12px] text-[var(--taupe)]">Progress is measured automatically from your ledger.</p><form className="mt-5 grid gap-3" onSubmit={submit}><label><span className="form-label">Quest type</span><select className="form-input" value={type} onChange={(event) => setType(event.target.value as MoneyQuest['type'])}><option value="no_spend_days">No-spend days</option><option value="tracking_days">Tracking days</option><option value="category_limit">Category spending limit</option><option value="goal_contribution" disabled={!goals.length}>Goal contribution</option></select></label>{type === 'category_limit' && <label><span className="form-label">Category</span><select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}{type === 'goal_contribution' && <label><span className="form-label">Goal</span><select className="form-input" value={goalId} onChange={(event) => setGoalId(event.target.value)}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>}<label><span className="form-label">{type === 'tracking_days' || type === 'no_spend_days' ? 'Number of days' : 'PKR target'}</span><input className="form-input" min="1" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label><button className="vault-commit is-espresso" disabled={Number(target) <= 0 || (type === 'goal_contribution' && !goalId)}>Start quest</button></form></VaultSheet>
}

function DetailSheet({ target, accounts, categories, goals, transactions, onClose, onEdit, onArchiveLimit, onPayBill, onCancelBill, onSaveWishlist, onRemoveWishlist, onBuyWishlist, onEndQuest, onRepeatQuest }: { target: DetailTarget; accounts: PlanData['accounts']; categories: PlanData['categories']; goals: PlanData['goals']; transactions: PlanData['transactions']; onClose: () => void; onEdit: () => void; onArchiveLimit: (budget: Budget) => void; onPayBill: (bill: UpcomingExpense) => void; onCancelBill: (bill: UpcomingExpense) => void; onSaveWishlist: (item: WishlistItem) => void; onRemoveWishlist: (item: WishlistItem) => void; onBuyWishlist: (item: WishlistItem) => void; onEndQuest: (quest: MoneyQuest) => void; onRepeatQuest: (quest: MoneyQuest) => void }) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? '')
  const [now] = useState(() => Date.now())
  if (target.kind === 'limit') {
    const spent = target.item.used
    const remaining = Math.max(0, target.item.amount - spent)
    const used = Math.round((spent / Math.max(1, target.item.amount)) * 100)
    const cycle = new Date(target.item.periodMonth ?? localMonthKey()).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
    const dayOfMonth = new Date().getDate()
    const dailyRate = spent / Math.max(1, dayOfMonth)
    const daysAtPace = dailyRate > 0 ? Math.max(1, Math.round(remaining / dailyRate)) : null
    return <PlanDetailShell eyebrow="Spending limit" accent="#C85A2A" title={target.item.category} hero={<span className="pl-hero-fig vault-digits">Rs {nf(remaining)} <small>left</small></span>} pill={<span className="pl-hero-pill-tag is-clay">{used}% used</span>} onClose={onClose}>
      <span className="pl-usage-bar"><i style={{ width: `${Math.min(100, used)}%` }} /></span>
      <PlanDetailList items={[['Monthly limit', `Rs ${nf(target.item.amount)}`], ['Spent so far', `Rs ${nf(spent)}`], ['Cycle', cycle]]} />
      <p className="pl-pace-note">{used >= 80 && daysAtPace ? <>You’re close to the ceiling. <strong>Rs {nf(remaining)}</strong> covers about {daysAtPace} more {daysAtPace === 1 ? 'day' : 'days'} at your current pace.</> : <><strong>Rs {nf(remaining)}</strong> of your Rs {nf(target.item.amount)} limit is still free this month.</>}</p>
      <div className="pl-sheet-actions-row"><button className="vault-commit is-espresso" type="button" onClick={onEdit}><Pencil size={16} /> Edit limit</button><button className="pl-sheet-secondary" type="button" onClick={() => onArchiveLimit(target.item)}><Archive size={16} /> Archive</button></div>
    </PlanDetailShell>
  }
  if (target.kind === 'bill') {
    const account = accounts.find((item) => item.id === target.item.linkedAccountId)
    const repeats = target.item.isRecurring && target.item.recurringFrequency ? capitalize(target.item.recurringFrequency.replace('_', ' ')) : 'One time'
    return <PlanDetailShell eyebrow="Scheduled bill" accent="#657355" title={target.item.title} hero={<span className="pl-hero-fig vault-digits">Rs {nf(target.item.amount)}</span>} pill={<span className="pl-hero-pill-tag is-sage">Due {formatPlanDate(target.item.dueDate, true)}</span>} onClose={onClose}>
      <PlanDetailList items={[['Category', target.item.category], ['Paid from', account?.name ?? 'Choose when paying'], ['Repeats', repeats], ['Reminder', target.item.reminderDaysBefore ? `${target.item.reminderDaysBefore} days before` : 'None']]} />
      {target.item.notes && <p className="pl-pace-note">{target.item.notes}</p>}
      <div className="pl-sheet-actions"><button className="vault-commit is-espresso" type="button" onClick={() => onPayBill(target.item)}><Check size={16} /> Mark paid</button><div className="pl-sheet-actions-row"><button className="pl-sheet-secondary" type="button" onClick={onEdit}><Pencil size={16} /> Edit</button><button className="pl-sheet-danger" type="button" onClick={() => onCancelBill(target.item)}><X size={16} /> Cancel bill</button></div></div>
    </PlanDetailShell>
  }
  if (target.kind === 'cooling') {
    const item = target.item
    const ready = item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= now
    const category = categories.find((entry) => entry.id === item.categoryId)
    return <PlanDetailShell eyebrow="Cool-off decision" accent="#837661" title={item.name} hero={<span className="pl-hero-fig vault-digits">Rs {nf(item.amount)}</span>} pill={<span className="pl-hero-pill-tag is-taupe">{ready ? 'Ready to decide' : 'Cooling off'}</span>} onClose={onClose}>
      <PlanDetailList items={[['Category', category?.name ?? 'Not set'], ['Started', formatPlanDate(item.createdAt)], ['Ready', formatPlanDate(item.reconsiderAt, true)], ['Status', ready ? 'Ready to decide' : 'Still cooling off']]} />
      {item.reason && <p className="pl-pace-note"><strong>Why you paused</strong>{item.reason}</p>}
      <div className="pl-sheet-actions">{ready && <button className="vault-commit is-espresso" type="button" onClick={() => onBuyWishlist(item)}>Buy and record expense</button>}<button className="pl-sheet-secondary" type="button" onClick={() => onSaveWishlist({ ...item, reconsiderAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), status: 'waiting' })}>Keep waiting 3 days</button><button className="pl-sheet-secondary" type="button" onClick={() => onSaveWishlist({ ...item, status: 'skipped' })}>Skip purchase</button>{goals.length > 0 && <div className="pl-move-goal"><select className="form-input" value={goalId} onChange={(event) => setGoalId(event.target.value)}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select><button type="button" onClick={() => onSaveWishlist({ ...item, goalId, status: 'moved_to_goal' })}>Move to goal</button></div>}<button className="pl-sheet-secondary" type="button" onClick={onEdit}><Pencil size={16} /> Edit</button><button className="pl-sheet-danger" type="button" onClick={() => onRemoveWishlist(item)}><Trash2 size={16} /> Remove</button></div>
    </PlanDetailShell>
  }
  const progress = Math.min(100, Math.round(questProgress(target.item, transactions)))
  return <PlanDetailShell eyebrow="Weekly quest" accent="#7C8A6B" title={target.item.title} hero={<span className="pl-hero-fig vault-digits">{progress}%</span>} pill={<span className="pl-hero-pill-tag is-green">{target.item.status}</span>} onClose={onClose}>
    <span className="pl-usage-bar is-green"><i style={{ width: `${progress}%` }} /></span>
    <PlanDetailList items={[['Started', formatPlanDate(target.item.startsOn)], ['Ends', formatPlanDate(target.item.endsOn, true)], ['Days remaining', String(Math.max(0, daysUntil(target.item.endsOn)))], ['Status', capitalize(target.item.status)]]} />
    <p className="pl-pace-note">The target is locked while this quest is active. Progress is calculated from matching ledger activity.</p>
    <div className="pl-sheet-actions-row"><button className="pl-sheet-secondary" type="button" onClick={() => onRepeatQuest(target.item)}><RotateCcw size={16} /> Repeat as new</button>{target.item.status === 'active' && <button className="pl-sheet-danger" type="button" onClick={() => onEndQuest(target.item)}><X size={16} /> End quest</button>}</div>
  </PlanDetailShell>
}

function capitalize(value: string) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : value }

function PlanDetailShell({ title, eyebrow, accent, hero, pill, onClose, children }: { title: string; eyebrow: string; accent: string; hero: ReactNode; pill?: ReactNode; onClose: () => void; children: ReactNode }) {
  return <VaultSheet open label={`${eyebrow}: ${title}`} onClose={onClose}><div className="pl-sheet-head"><div><p className="vault-eyebrow" style={{ color: accent }}>{eyebrow}</p><h2 className="vault-sheet-title text-left">{title}</h2></div><button aria-label="Close" type="button" onClick={onClose}><X size={18} /></button></div><div className="pl-hero-amount">{hero}{pill}</div>{children}</VaultSheet>
}

function PlanDetailList({ items }: { items: Array<[string, ReactNode]> }) { return <dl className="pl-detail-list">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> }

function ListSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <VaultSheet open label={`All ${title}`} onClose={onClose}><div className="pl-sheet-head"><div><p className="vault-eyebrow">Your plan</p><h2 className="vault-sheet-title text-left">All {title.toLowerCase()}</h2></div><button aria-label="Close" type="button" onClick={onClose}><X size={18} /></button></div><div className="pl-mobile-list mt-4">{children}</div></VaultSheet> }

function HistorySheet({ budgets, bills, wishlist, quests, filter, onFilter, onClose, onRestoreBudget, onRepeatQuest }: { budgets: Budget[]; bills: UpcomingExpense[]; wishlist: WishlistItem[]; quests: MoneyQuest[]; filter: PlanHistoryFilter; onFilter: (filter: PlanHistoryFilter) => void; onClose: () => void; onRestoreBudget: (budget: Budget) => void; onRepeatQuest: (quest: MoneyQuest) => void }) {
  const entries: Array<{ kind: PlanSection; id: string; title: string; meta: string; date: string; action?: () => void; actionLabel?: string }> = [
    ...budgets.map((item) => ({ kind: 'limits' as const, id: `budget-${item.id}`, title: item.category, meta: `${item.archived ? 'Archived' : item.periodMonth?.slice(0, 7) ?? 'Past month'} · Rs ${nf(item.amount)}`, date: item.updatedAt ?? item.periodMonth ?? '', action: item.archived ? () => onRestoreBudget(item) : undefined, actionLabel: item.archived ? 'Restore' : undefined })),
    ...bills.filter((item) => !isBillActive(item)).map((item) => ({ kind: 'bills' as const, id: `bill-${item.id}`, title: item.title, meta: `${item.status} · Rs ${nf(item.amount)}`, date: item.dueDate })),
    ...wishlist.filter((item) => !isWishlistActive(item)).map((item) => ({ kind: 'cooling' as const, id: `wish-${item.id}`, title: item.name, meta: `${item.status.replaceAll('_', ' ')} · Rs ${nf(item.amount)}`, date: item.updatedAt ?? item.createdAt ?? '' })),
    ...quests.filter((item) => item.status !== 'active').map((item) => ({ kind: 'quests' as const, id: `quest-${item.id}`, title: item.title, meta: item.status, date: item.updatedAt ?? item.endsOn, action: () => onRepeatQuest(item), actionLabel: 'Repeat' })),
  ].filter((item) => filter === 'all' || item.kind === filter).sort((a, b) => b.date.localeCompare(a.date))
  return <VaultSheet open label="Plan history" onClose={onClose}><div className="pl-sheet-head"><div><p className="vault-eyebrow">Past planning</p><h2 className="vault-sheet-title text-left">Plan history</h2></div><button aria-label="Close" type="button" onClick={onClose}><X size={18} /></button></div><div className="vault-chiprow mt-4 overflow-x-auto">{(['all', 'limits', 'bills', 'cooling', 'quests'] as PlanHistoryFilter[]).map((item) => <button key={item} className={cn('vault-chip', filter === item && 'is-active')} type="button" onClick={() => onFilter(item)}>{item === 'all' ? 'All' : item === 'cooling' ? 'Cool-off' : item[0].toUpperCase() + item.slice(1)}</button>)}</div><div className="pl-history-list">{entries.map((entry) => <div key={entry.id}><span className="pl-row-icon"><History size={16} /></span><p><strong>{entry.title}</strong><small>{entry.meta}</small></p>{entry.action && <button type="button" onClick={entry.action}>{entry.actionLabel}</button>}</div>)}{entries.length === 0 && <p className="pl-empty-copy">Nothing in this part of your history yet.</p>}</div></VaultSheet>
}

function AddToPlanSheet({ activeQuestCount, onClose, onPick }: { activeQuestCount: number; onClose: () => void; onPick: (kind: PlanSection) => void }) {
  const options: Array<{ kind: PlanSection; title: string; description: string; icon: typeof PieChart; tone: string }> = [
    { kind: 'limits', title: 'Spending limit', description: 'Cap a category for this month', icon: PieChart, tone: 'is-clay' },
    { kind: 'bills', title: 'Scheduled bill', description: 'Keep a known payment visible', icon: CalendarDays, tone: 'is-espresso' },
    { kind: 'cooling', title: 'Cool off a buy', description: 'Pause before a non-essential purchase', icon: Clock3, tone: 'is-taupe' },
    { kind: 'quests', title: 'Weekly quest', description: activeQuestCount >= 3 ? 'Three quests are already active' : 'Start a tracked money challenge', icon: Flag, tone: 'is-green' },
  ]
  return <VaultSheet open label="Add to your plan" onClose={onClose}><div className="pl-sheet-head"><div><p className="vault-eyebrow">Plan something useful</p><h2 className="vault-sheet-title text-left">Add to your <em>plan.</em></h2></div><button aria-label="Close" type="button" onClick={onClose}><X size={18} /></button></div><div className="vault-plan-sheet-options mt-4">{options.map(({ kind, title, description, icon: Icon, tone }) => <button key={kind} className="vault-plan-sheet-option" disabled={kind === 'quests' && activeQuestCount >= 3} type="button" onClick={() => onPick(kind)}><span className={`vault-plan-sheet-icon ${tone}`}><Icon size={22} /></span><span className="min-w-0 flex-1 text-left"><span className="vault-plan-sheet-option-title">{title}</span><span className="vault-plan-sheet-option-copy">{description}</span></span><ChevronRight size={19} /></button>)}</div></VaultSheet>
}

function repeatQuest(quest: MoneyQuest): MoneyQuest {
  const ends = new Date(); ends.setDate(ends.getDate() + 6)
  return { ...quest, id: crypto.randomUUID(), startsOn: localDateKey(), endsOn: localDateKey(ends), status: 'active', createdAt: new Date().toISOString(), updatedAt: undefined }
}

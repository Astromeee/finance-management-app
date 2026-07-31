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
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Budget, MoneyQuest, RecurringFrequency, UpcomingExpense, WishlistItem } from '../../types/finance'
import { localDateKey, localMonthKey } from '../../lib/date'
import { questProgress } from '../../utils/retention'
import { CategoryIcon } from '../icons/CategoryIcon'
import {
  daysUntil,
  formatPlanDate,
  isBillActive,
  isWishlistActive,
  nf,
  sectionDescriptions,
  type PlanActions,
  type PlanData,
  type PlanHistoryFilter,
  type PlanSection,
} from './planTypes'

type DesktopView = 'overview' | PlanSection | 'history'
type Panel =
  | { kind: 'add' }
  | { kind: 'limit'; mode: 'view' | 'edit' | 'create'; item?: Budget }
  | { kind: 'bill'; mode: 'view' | 'edit' | 'create' | 'pay'; item?: UpcomingExpense }
  | { kind: 'cooling'; mode: 'view' | 'edit' | 'create'; item?: WishlistItem }
  | { kind: 'quest'; mode: 'view' | 'create'; item?: MoneyQuest }

const tabLabels: Array<{ key: DesktopView; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'limits', label: 'Limits' },
  { key: 'bills', label: 'Bills' },
  { key: 'cooling', label: 'Cool-off' },
  { key: 'quests', label: 'Quests' },
  { key: 'history', label: 'History' },
]

export function PlanDesktop(props: PlanData & PlanActions) {
  const {
    budgets, budgetHistory, upcomingExpenses, wishlistItems, moneyQuests, transactions,
    onCopyLastMonthBudgets, onRestoreBudget, onSaveQuest,
  } = props
  const initial = new URLSearchParams(window.location.search).get('view') as DesktopView | null
  const [view, setViewState] = useState<DesktopView>(tabLabels.some((tab) => tab.key === initial) ? initial! : 'overview')
  const [panel, setPanel] = useState<Panel | null>(null)
  const [historyFilter, setHistoryFilter] = useState<PlanHistoryFilter>('all')
  const [now] = useState(() => Date.now())
  const activeBills = useMemo(() => upcomingExpenses.filter(isBillActive).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [upcomingExpenses])
  const cooling = useMemo(() => wishlistItems.filter(isWishlistActive).sort((a, b) => a.reconsiderAt.localeCompare(b.reconsiderAt)), [wishlistItems])
  const quests = moneyQuests.filter((quest) => quest.status === 'active')
  const total = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const used = budgets.reduce((sum, budget) => sum + budget.used, 0)
  const left = Math.max(0, total - used)
  const ready = cooling.filter((item) => item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= now).length
  const dueSoon = activeBills.filter((item) => daysUntil(item.dueDate) <= 30).length
  const needsAttention = [
    ...activeBills.filter((item) => daysUntil(item.dueDate) < 0).map((item) => ({ id: `bill-${item.id}`, label: 'Overdue', title: item.title, detail: `${Math.abs(daysUntil(item.dueDate))} days overdue`, action: () => setPanel({ kind: 'bill', mode: 'view', item }) })),
    ...budgets.filter((item) => item.used / Math.max(1, item.amount) >= .8).map((item) => ({ id: `limit-${item.id}`, label: 'Limit', title: item.category, detail: `${Math.round(item.used / Math.max(1, item.amount) * 100)}% used`, action: () => setPanel({ kind: 'limit', mode: 'view', item }) })),
    ...cooling.filter((item) => item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= now).map((item) => ({ id: `wish-${item.id}`, label: 'Ready', title: item.name, detail: 'Ready for a clear decision', action: () => setPanel({ kind: 'cooling', mode: 'view', item }) })),
    ...quests.filter((item) => daysUntil(item.endsOn) <= 1).map((item) => ({ id: `quest-${item.id}`, label: 'Quest', title: item.title, detail: 'Ends soon', action: () => setPanel({ kind: 'quest', mode: 'view', item }) })),
  ]

  const setView = (next: DesktopView) => {
    setViewState(next)
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    window.history.replaceState(null, '', url)
  }

  return <div className="pl-desktop-plan">
    <div className="pl-desktop-tabs" role="tablist" aria-label="Plan views">{tabLabels.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={view === tab.key} className={view === tab.key ? 'is-active' : ''} onClick={() => setView(tab.key)}>{tab.label}</button>)}<button className="pl-desktop-add" type="button" onClick={() => setPanel({ kind: 'add' })}><Plus size={15} /> Add to plan</button></div>
    <div className="pl-desktop-scroll">
      {view === 'overview' && <>
        <section className="pl-overview-grid">
          <SummaryCard icon={PieChart} label="Limit money left" value={`Rs ${nf(left)}`} detail={`Rs ${nf(used)} used this month`} onClick={() => setView('limits')} />
          <SummaryCard icon={CalendarDays} label="Bills due in 30 days" value={String(dueSoon)} detail={`Rs ${nf(activeBills.filter((bill) => daysUntil(bill.dueDate) <= 30).reduce((sum, bill) => sum + bill.amount, 0))} protected`} onClick={() => setView('bills')} />
          <SummaryCard icon={Clock3} label="Decisions ready" value={String(ready)} detail={`${cooling.length} total cooling off`} onClick={() => setView('cooling')} />
          <SummaryCard icon={Flag} label="Active quests" value={`${quests.length} / 3`} detail="Tracked from your activity" onClick={() => setView('quests')} />
        </section>
        <div className="pl-overview-columns">
          <section className="pl-desktop-card pl-needs-attention"><header><div><p>WHAT NEEDS YOU</p><h2>Needs attention</h2></div><span>{needsAttention.length}</span></header>{needsAttention.length ? needsAttention.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={item.action}><span>{item.label}</span><p><strong>{item.title}</strong><small>{item.detail}</small></p><ChevronRight size={16} /></button>) : <Empty icon={Check} title="Your plan is settled" detail="Nothing is overdue, close to its limit, or waiting for a decision." />}</section>
          <section className="pl-desktop-card pl-plan-guide"><p>THE PLAN, EXPLAINED</p><h2>Four small tools, one calmer month.</h2>{(['limits', 'bills', 'cooling', 'quests'] as PlanSection[]).map((key) => <button key={key} type="button" onClick={() => setView(key)}><span>{key === 'cooling' ? 'Cool-off list' : key[0].toUpperCase() + key.slice(1)}</span><small>{sectionDescriptions[key]}</small><ChevronRight size={15} /></button>)}</section>
        </div>
      </>}
      {view === 'limits' && <Manager title="Spending limits" description={sectionDescriptions.limits} count={`${budgets.length} active`} action="Add limit" onAction={() => setPanel({ kind: 'limit', mode: 'create' })} secondary={budgetHistory.some((budget) => !budget.archived) && budgets.length === 0 ? <button type="button" onClick={onCopyLastMonthBudgets}><Copy size={14} /> Copy last month</button> : undefined}>{budgets.length ? budgets.map((budget) => <LimitRow key={budget.id} budget={budget} onClick={() => setPanel({ kind: 'limit', mode: 'view', item: budget })} />) : <Empty icon={PieChart} title="No limits this month" detail="Create only the category guardrails that help you decide." action="Create limit" onAction={() => setPanel({ kind: 'limit', mode: 'create' })} />}</Manager>}
      {view === 'bills' && <Manager title="Scheduled bills" description={sectionDescriptions.bills} count={`${activeBills.length} active`} action="Add bill" onAction={() => setPanel({ kind: 'bill', mode: 'create' })}>{activeBills.length ? activeBills.map((bill) => <BillRow key={bill.id} bill={bill} onClick={() => setPanel({ kind: 'bill', mode: 'view', item: bill })} onPay={() => setPanel({ kind: 'bill', mode: 'pay', item: bill })} />) : <Empty icon={CalendarDays} title="No bills scheduled" detail="Add known payments so they stay visible before you spend elsewhere." action="Add bill" onAction={() => setPanel({ kind: 'bill', mode: 'create' })} />}</Manager>}
      {view === 'cooling' && <Manager title="Cool-off list" description={sectionDescriptions.cooling} count={`${cooling.length} waiting`} action="Add another" onAction={() => setPanel({ kind: 'cooling', mode: 'create' })}>{cooling.length ? cooling.map((item) => <CoolingRow key={item.id} item={item} onClick={() => setPanel({ kind: 'cooling', mode: 'view', item })} />) : <Empty icon={Clock3} title="Nothing is cooling off" detail="Pause a purchase here when a little distance would help." action="Add an item" onAction={() => setPanel({ kind: 'cooling', mode: 'create' })} />}</Manager>}
      {view === 'quests' && <Manager title="Weekly quests" description={sectionDescriptions.quests} count={`${quests.length} of 3 active`} action="Start quest" actionDisabled={quests.length >= 3} onAction={() => setPanel({ kind: 'quest', mode: 'create' })}>{quests.length ? quests.map((quest) => <QuestRow key={quest.id} quest={quest} transactions={transactions} onClick={() => setPanel({ kind: 'quest', mode: 'view', item: quest })} />) : <Empty icon={Flag} title="No active quests" detail="Choose a short challenge and Pocket Ledger will track it automatically." action="Start quest" onAction={() => setPanel({ kind: 'quest', mode: 'create' })} />}{quests.length >= 3 && <p className="pl-desktop-cap">Three quests are active. End or complete one before starting another.</p>}</Manager>}
      {view === 'history' && <DesktopHistory budgets={budgetHistory} bills={upcomingExpenses} wishlist={wishlistItems} quests={moneyQuests} filter={historyFilter} onFilter={setHistoryFilter} onRestoreBudget={onRestoreBudget} onRepeatQuest={(quest) => onSaveQuest(repeatQuest(quest))} />}
    </div>
    {panel && <DesktopPlanPanel panel={panel} data={props} actions={props} onClose={() => setPanel(null)} onPanel={setPanel} />}
  </div>
}

function SummaryCard({ icon: Icon, label, value, detail, onClick }: { icon: typeof PieChart; label: string; value: string; detail: string; onClick: () => void }) { return <button className="pl-summary-card" type="button" onClick={onClick}><span><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{detail}</small></button> }

function Manager({ title, description, count, action, actionDisabled, onAction, secondary, children }: { title: string; description: string; count: string; action: string; actionDisabled?: boolean; onAction: () => void; secondary?: ReactNode; children: ReactNode }) { return <section className="pl-desktop-card pl-manager"><header><div><p>{count.toUpperCase()}</p><h2>{title}</h2><small>{description}</small></div><div>{secondary}<button type="button" disabled={actionDisabled} onClick={onAction}><Plus size={15} /> {action}</button></div></header><div className="pl-manager-list">{children}</div></section> }

function LimitRow({ budget, onClick }: { budget: Budget; onClick: () => void }) { const progress = Math.round(budget.used / Math.max(1, budget.amount) * 100); return <button className="pl-desktop-row" type="button" onClick={onClick}><span className="pl-desktop-row-icon"><CategoryIcon label={budget.category} type="expense" size={18} /></span><p><strong>{budget.category}</strong><small>Rs {nf(Math.max(0, budget.amount - budget.used))} remaining</small></p><span className="pl-desktop-progress"><i><b className={progress >= 80 ? 'is-hot' : ''} style={{ width: `${Math.min(100, progress)}%` }} /></i><small>{progress}% used</small></span><strong className="pl-row-money">Rs {nf(budget.used)} <small>/ {nf(budget.amount)}</small></strong><ChevronRight size={16} /></button> }
function BillRow({ bill, onClick, onPay }: { bill: UpcomingExpense; onClick: () => void; onPay: () => void }) { const days = daysUntil(bill.dueDate); return <div className="pl-desktop-row"><span className="pl-desktop-row-icon is-sage"><CalendarDays size={18} /></span><button className="pl-row-main" type="button" onClick={onClick}><strong>{bill.title}</strong><small>{days < 0 ? `${Math.abs(days)} days overdue` : `Due ${formatPlanDate(bill.dueDate)}`} · {bill.isRecurring ? bill.recurringFrequency?.replace('_', ' ') : 'one-time'}</small></button><span>{bill.category}</span><strong className="pl-row-money">Rs {nf(bill.amount)}</strong><button className="pl-row-action" type="button" onClick={onPay}>Pay</button><button className="pl-row-chevron" type="button" aria-label={`View ${bill.title}`} onClick={onClick}><ChevronRight size={16} /></button></div> }
function CoolingRow({ item, onClick }: { item: WishlistItem; onClick: () => void }) { const [now] = useState(() => Date.now()); const ready = item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= now; return <button className="pl-desktop-row" type="button" onClick={onClick}><span className="pl-desktop-row-icon is-taupe"><Clock3 size={18} /></span><p><strong>{item.name}</strong><small>{item.reason || 'No note added'}</small></p><span className={`pl-status ${ready ? 'is-ready' : ''}`}>{ready ? 'Ready' : `Until ${formatPlanDate(item.reconsiderAt)}`}</span><strong className="pl-row-money">Rs {nf(item.amount)}</strong><ChevronRight size={16} /></button> }
function QuestRow({ quest, transactions, onClick }: { quest: MoneyQuest; transactions: PlanData['transactions']; onClick: () => void }) { const progress = Math.min(100, Math.round(questProgress(quest, transactions))); return <button className="pl-desktop-row" type="button" onClick={onClick}><span className="pl-desktop-row-icon is-clay"><Flag size={18} /></span><p><strong>{quest.title}</strong><small>Ends {formatPlanDate(quest.endsOn)} · {Math.max(0, daysUntil(quest.endsOn))} days left</small></p><span className="pl-desktop-progress"><i><b style={{ width: `${progress}%` }} /></i><small>{progress}% complete</small></span><strong className="pl-row-money">{progress}%</strong><ChevronRight size={16} /></button> }

function Empty({ icon: Icon, title, detail, action, onAction }: { icon: typeof PieChart; title: string; detail: string; action?: string; onAction?: () => void }) { return <div className="pl-desktop-empty"><span><Icon size={20} /></span><div><h3>{title}</h3><p>{detail}</p></div>{action && <button type="button" onClick={onAction}>{action}</button>}</div> }

function DesktopHistory({ budgets, bills, wishlist, quests, filter, onFilter, onRestoreBudget, onRepeatQuest }: { budgets: Budget[]; bills: UpcomingExpense[]; wishlist: WishlistItem[]; quests: MoneyQuest[]; filter: PlanHistoryFilter; onFilter: (filter: PlanHistoryFilter) => void; onRestoreBudget: (budget: Budget) => void; onRepeatQuest: (quest: MoneyQuest) => void }) {
  const rows: Array<{ kind: PlanSection; id: string; title: string; status: string; detail: string; date: string; action?: () => void; actionLabel?: string }> = [
    ...budgets.map((item) => ({ kind: 'limits' as const, id: `budget-${item.id}`, title: item.category, status: item.archived ? 'Archived' : 'Past month', detail: `Rs ${nf(item.amount)} · ${item.periodMonth?.slice(0, 7)}`, date: item.updatedAt ?? item.periodMonth ?? '', action: item.archived ? () => onRestoreBudget(item) : undefined, actionLabel: 'Restore' })),
    ...bills.filter((item) => !isBillActive(item)).map((item) => ({ kind: 'bills' as const, id: `bill-${item.id}`, title: item.title, status: item.status, detail: `Rs ${nf(item.amount)} · ${formatPlanDate(item.dueDate)}`, date: item.dueDate })),
    ...wishlist.filter((item) => !isWishlistActive(item)).map((item) => ({ kind: 'cooling' as const, id: `wish-${item.id}`, title: item.name, status: item.status.replaceAll('_', ' '), detail: `Rs ${nf(item.amount)}`, date: item.updatedAt ?? item.createdAt ?? '' })),
    ...quests.filter((item) => item.status !== 'active').map((item) => ({ kind: 'quests' as const, id: `quest-${item.id}`, title: item.title, status: item.status, detail: `Ended ${formatPlanDate(item.endsOn)}`, date: item.updatedAt ?? item.endsOn, action: () => onRepeatQuest(item), actionLabel: 'Repeat' })),
  ].filter((item) => filter === 'all' || item.kind === filter).sort((a, b) => b.date.localeCompare(a.date))
  return <section className="pl-desktop-card pl-manager pl-history-manager"><header><div><p>{rows.length} RECORDS</p><h2>Plan history</h2><small>Restore a limit or repeat a useful challenge without losing the original record.</small></div></header><div className="pl-desktop-history-filters">{(['all', 'limits', 'bills', 'cooling', 'quests'] as PlanHistoryFilter[]).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} type="button" onClick={() => onFilter(item)}>{item === 'cooling' ? 'Cool-off' : item[0].toUpperCase() + item.slice(1)}</button>)}</div><div className="pl-manager-list">{rows.map((row) => <div className="pl-desktop-row" key={row.id}><span className="pl-desktop-row-icon"><History size={17} /></span><p><strong>{row.title}</strong><small>{row.detail}</small></p><span className="pl-status">{row.status}</span>{row.action && <button className="pl-row-action" type="button" onClick={row.action}>{row.actionLabel}</button>}</div>)}{rows.length === 0 && <Empty icon={History} title="No history here yet" detail="Completed and archived planning items will appear here." />}</div></section>
}

function DesktopPlanPanel({ panel, data, actions, onClose, onPanel }: { panel: Panel; data: PlanData; actions: PlanActions; onClose: () => void; onPanel: (panel: Panel) => void }) {
  const title = panel.kind === 'add' ? 'Add to your plan' : panel.kind === 'limit' ? panel.mode === 'create' ? 'New spending limit' : panel.item?.category ?? 'Spending limit' : panel.kind === 'bill' ? panel.mode === 'create' ? 'New scheduled bill' : panel.item?.title ?? 'Scheduled bill' : panel.kind === 'cooling' ? panel.mode === 'create' ? 'Cool off a purchase' : panel.item?.name ?? 'Cool-off item' : panel.mode === 'create' ? 'Start a weekly quest' : panel.item?.title ?? 'Weekly quest'
  return <div className="d-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="d-slide-over pl-plan-panel" role="dialog" aria-modal="true" aria-labelledby="plan-panel-title"><header><div><span><Plus size={14} /></span>YOUR PLAN</div><button type="button" aria-label="Close" onClick={onClose}><X size={17} /></button><h2 id="plan-panel-title">{title}</h2><p>{panel.kind === 'add' ? 'Choose the planning tool that fits this decision.' : panel.mode === 'view' ? 'Review the details before making a change.' : 'Changes stay in sync across mobile and desktop.'}</p></header><div className="d-modal-body">{panel.kind === 'add' ? <DesktopAddChooser activeQuests={data.moneyQuests.filter((quest) => quest.status === 'active').length} onPick={onPanel} /> : panel.kind === 'limit' ? <DesktopLimitPanel panel={panel} data={data} actions={actions} onClose={onClose} onPanel={onPanel} /> : panel.kind === 'bill' ? <DesktopBillPanel panel={panel} data={data} actions={actions} onClose={onClose} onPanel={onPanel} /> : panel.kind === 'cooling' ? <DesktopCoolingPanel panel={panel} data={data} actions={actions} onClose={onClose} onPanel={onPanel} /> : <DesktopQuestPanel panel={panel} data={data} actions={actions} onClose={onClose} />}</div></aside></div>
}

function DesktopAddChooser({ activeQuests, onPick }: { activeQuests: number; onPick: (panel: Panel) => void }) { const choices = [{ kind: 'limit' as const, title: 'Spending limit', copy: 'Set a monthly category ceiling', icon: PieChart }, { kind: 'bill' as const, title: 'Scheduled bill', copy: 'Keep a future payment visible', icon: CalendarDays }, { kind: 'cooling' as const, title: 'Cool off a buy', copy: 'Pause a purchase before deciding', icon: Clock3 }, { kind: 'quest' as const, title: 'Weekly quest', copy: activeQuests >= 3 ? 'Three quests are already active' : 'Start a tracked money challenge', icon: Flag }]; return <div className="d-option-list">{choices.map(({ kind, title, copy, icon: Icon }) => <button key={kind} disabled={kind === 'quest' && activeQuests >= 3} type="button" onClick={() => onPick({ kind, mode: 'create' } as Panel)}><Icon /><span><strong>{title}</strong><small>{copy}</small></span><ChevronRight /></button>)}</div> }

function DesktopLimitPanel({ panel, data, actions, onClose, onPanel }: { panel: Extract<Panel, { kind: 'limit' }>; data: PlanData; actions: PlanActions; onClose: () => void; onPanel: (panel: Panel) => void }) {
  const item = panel.item
  const available = data.categories.filter((category) => category.kind === 'expense' && (category.id === item?.categoryId || !data.budgets.some((budget) => budget.categoryId ? budget.categoryId === category.id : budget.category === category.name)))
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? available[0]?.id ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  if (panel.mode === 'view' && item) { const progress = Math.round(item.used / Math.max(1, item.amount) * 100); return <><PanelDetails items={[['Monthly limit', `Rs ${nf(item.amount)}`], ['Spent', `Rs ${nf(item.used)}`], ['Remaining', `Rs ${nf(Math.max(0, item.amount - item.used))}`], ['Used', `${progress}%`]]} /><PanelActions><button className="d-button is-primary" type="button" onClick={() => onPanel({ ...panel, mode: 'edit' })}><Pencil size={16} /> Edit limit</button><button className="d-destructive" type="button" onClick={() => { actions.onArchiveBudget(item); onClose() }}><Archive size={16} /> Archive limit</button></PanelActions></> }
  const submit = (event: FormEvent) => { event.preventDefault(); const category = data.categories.find((entry) => entry.id === categoryId); if (!category || Number(amount) <= 0) return; actions.onSaveBudget({ ...item, id: item?.id ?? crypto.randomUUID(), category: category.name, categoryId, amount: Number(amount), used: item?.used ?? 0, periodMonth: item?.periodMonth ?? `${localMonthKey()}-01`, archived: false }); onClose() }
  return <form className="pl-panel-form" onSubmit={submit}><DesktopField label="Category"><select disabled={Boolean(item)} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{available.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></DesktopField><DesktopField label="Monthly limit"><span>Rs</span><input min="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></DesktopField><p className="pl-panel-note">Editing the amount never resets the spending calculated from your ledger.</p><button className="d-button is-primary" disabled={!categoryId || Number(amount) <= 0}>Save limit</button></form>
}

function DesktopBillPanel({ panel, data, actions, onClose, onPanel }: { panel: Extract<Panel, { kind: 'bill' }>; data: PlanData; actions: PlanActions; onClose: () => void; onPanel: (panel: Panel) => void }) {
  const item = panel.item
  const [title, setTitle] = useState(item?.title ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [category, setCategory] = useState(item?.category ?? data.categories.find((entry) => entry.kind === 'expense')?.name ?? '')
  const [dueDate, setDueDate] = useState(item?.dueDate ?? localDateKey())
  const [accountId, setAccountId] = useState(item?.linkedAccountId ?? data.accounts[0]?.id ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [recurring, setRecurring] = useState(item?.isRecurring ?? false)
  const [frequency, setFrequency] = useState<RecurringFrequency>(item?.recurringFrequency ?? 'monthly')
  const [repeatEndDate, setRepeatEndDate] = useState(item?.repeatEndDate ?? '')
  const [reminder, setReminder] = useState(item?.reminderDaysBefore ? String(item.reminderDaysBefore) : '3')
  const [paymentDate, setPaymentDate] = useState(localDateKey())
  if (panel.mode === 'view' && item) return <><PanelDetails items={[['Amount', `Rs ${nf(item.amount)}`], ['Due', formatPlanDate(item.dueDate, true)], ['Category', item.category], ['Account', data.accounts.find((entry) => entry.id === item.linkedAccountId)?.name ?? 'Choose when paying'], ['Repeats', item.isRecurring ? item.recurringFrequency?.replace('_', ' ') ?? 'Yes' : 'No'], ['Reminder', item.reminderDaysBefore ? `${item.reminderDaysBefore} days before` : 'None']]} />{item.notes && <p className="pl-panel-note">{item.notes}</p>}<PanelActions><button className="d-button is-primary" type="button" onClick={() => onPanel({ ...panel, mode: 'pay' })}><Check size={16} /> Mark paid</button><button className="d-button is-secondary" type="button" onClick={() => onPanel({ ...panel, mode: 'edit' })}><Pencil size={16} /> Edit bill</button><button className="d-destructive" type="button" onClick={() => { actions.onCancelUpcoming(item); onClose() }}><X size={16} /> Cancel bill</button></PanelActions></>
  if (panel.mode === 'pay' && item) return <form className="pl-panel-form" onSubmit={(event) => { event.preventDefault(); if (!accountId || !paymentDate) return; actions.onMarkUpcomingPaid(item, { accountId, paymentDate, notes: notes.trim() || undefined }); onClose() }}><PanelDetails items={[['Bill', item.title], ['Amount', `Rs ${nf(item.amount)}`]]} /><DesktopField label="Paid from"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · Rs {nf(account.balance)}</option>)}</select></DesktopField><DesktopField label="Payment date"><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></DesktopField><DesktopField label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" /></DesktopField><button className="d-button is-primary" disabled={!accountId || !paymentDate}>Record payment</button></form>
  const submit = (event: FormEvent) => { event.preventDefault(); const payload = { title: title.trim(), amount: Number(amount), category, dueDate, linkedAccountId: accountId || undefined, notes: notes.trim() || undefined, isRecurring: recurring, recurringFrequency: recurring ? frequency : undefined, repeatStartDate: recurring ? dueDate : undefined, repeatEndDate: recurring && repeatEndDate ? repeatEndDate : undefined, reminderDaysBefore: reminder ? Number(reminder) : undefined }; if (item) actions.onUpdateUpcoming(item.id, payload); else actions.onAddUpcoming(payload); onClose() }
  return <form className="pl-panel-form" onSubmit={submit}><DesktopField label="Bill name"><input value={title} onChange={(event) => setTitle(event.target.value)} /></DesktopField><DesktopField label="Amount"><span>Rs</span><input min="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></DesktopField><DesktopField label="Category"><select value={category} onChange={(event) => setCategory(event.target.value)}>{data.categories.filter((entry) => entry.kind === 'expense').map((entry) => <option key={entry.id}>{entry.name}</option>)}</select></DesktopField><div className="pl-panel-fields"><DesktopField label="Due date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></DesktopField><DesktopField label="Account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Choose later</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></DesktopField></div><label className="d-check-row"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /><span><strong>Recurring bill</strong><small>Create the next occurrence after payment</small></span></label>{recurring && <><DesktopField label="Frequency"><select value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semi_annual">Every six months</option><option value="yearly">Yearly</option></select></DesktopField><div className="pl-panel-fields"><DesktopField label="Optional end date"><input type="date" value={repeatEndDate} onChange={(event) => setRepeatEndDate(event.target.value)} /></DesktopField><DesktopField label="Reminder days"><input min="0" type="number" value={reminder} onChange={(event) => setReminder(event.target.value)} /></DesktopField></div></>}<DesktopField label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" /></DesktopField><button className="d-button is-primary" disabled={!title.trim() || Number(amount) <= 0 || !category || !dueDate}>Save bill</button></form>
}

function DesktopCoolingPanel({ panel, data, actions, onClose, onPanel }: { panel: Extract<Panel, { kind: 'cooling' }>; data: PlanData; actions: PlanActions; onClose: () => void; onPanel: (panel: Panel) => void }) {
  const item = panel.item
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? data.categories.find((entry) => entry.kind === 'expense')?.id ?? '')
  const [reason, setReason] = useState(item?.reason ?? '')
  const [duration, setDuration] = useState('48')
  const [customHours, setCustomHours] = useState('72')
  const [goalId, setGoalId] = useState(data.goals[0]?.id ?? '')
  // The panel is remounted for each target, so this view-only readiness check is stable for its lifetime.
  // eslint-disable-next-line react-hooks/purity
  if (panel.mode === 'view' && item) { const ready = item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= Date.now(); return <><PanelDetails items={[['Expected cost', `Rs ${nf(item.amount)}`], ['Category', data.categories.find((entry) => entry.id === item.categoryId)?.name ?? 'Not set'], ['Started', formatPlanDate(item.createdAt)], ['Ready', formatPlanDate(item.reconsiderAt, true)], ['Status', ready ? 'Ready to decide' : 'Cooling off']]} />{item.reason && <p className="pl-panel-note"><strong>Why you paused</strong>{item.reason}</p>}<PanelActions>{ready && <button className="d-button is-primary" type="button" onClick={() => { actions.onBuyWishlist(item); onClose() }}>Buy and record</button>}<button className="d-button is-secondary" type="button" onClick={() => { actions.onSaveWishlist({ ...item, reconsiderAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), status: 'waiting' }); onClose() }}>Wait 3 more days</button><button className="d-button is-secondary" type="button" onClick={() => { actions.onSaveWishlist({ ...item, status: 'skipped' }); onClose() }}>Skip purchase</button>{data.goals.length > 0 && <div className="pl-panel-goal"><select value={goalId} onChange={(event) => setGoalId(event.target.value)}>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select><button type="button" onClick={() => { actions.onSaveWishlist({ ...item, goalId, status: 'moved_to_goal' }); onClose() }}>Move to goal</button></div>}<button className="d-button is-secondary" type="button" onClick={() => onPanel({ ...panel, mode: 'edit' })}><Pencil size={16} /> Edit</button><button className="d-destructive" type="button" onClick={() => { actions.onRemoveWishlist(item); onClose() }}><Trash2 size={16} /> Remove</button></PanelActions></> }
  const submit = (event: FormEvent) => { event.preventDefault(); const hours = duration === 'custom' ? Number(customHours) : Number(duration); actions.onSaveWishlist({ ...item, id: item?.id ?? crypto.randomUUID(), name: name.trim(), amount: Number(amount), categoryId: categoryId || undefined, reason: reason.trim() || undefined, reconsiderAt: new Date(Date.now() + Math.max(1, hours) * 3_600_000).toISOString(), status: 'waiting', createdAt: item?.createdAt ?? new Date().toISOString() }); onClose() }
  return <form className="pl-panel-form" onSubmit={submit}><DesktopField label="Item"><input value={name} onChange={(event) => setName(event.target.value)} /></DesktopField><DesktopField label="Expected cost"><span>Rs</span><input min="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></DesktopField><DesktopField label="Category"><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{data.categories.filter((entry) => entry.kind === 'expense').map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></DesktopField><DesktopField label="Why are you pausing?"><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional" /></DesktopField><DesktopField label="Wait before deciding"><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="24">24 hours</option><option value="48">48 hours</option><option value="168">7 days</option><option value="custom">Custom</option></select></DesktopField>{duration === 'custom' && <DesktopField label="Custom hours"><input min="1" type="number" value={customHours} onChange={(event) => setCustomHours(event.target.value)} /></DesktopField>}<button className="d-button is-primary" disabled={!name.trim() || Number(amount) <= 0 || (duration === 'custom' && Number(customHours) <= 0)}>Save cool-off</button></form>
}

function DesktopQuestPanel({ panel, data, actions, onClose }: { panel: Extract<Panel, { kind: 'quest' }>; data: PlanData; actions: PlanActions; onClose: () => void }) {
  const item = panel.item
  const [type, setType] = useState<MoneyQuest['type']>('no_spend_days')
  const [target, setTarget] = useState('3')
  const [categoryId, setCategoryId] = useState(data.categories.find((entry) => entry.kind === 'expense')?.id ?? '')
  const [goalId, setGoalId] = useState(data.goals.find((goal) => goal.status !== 'Completed')?.id ?? data.goals[0]?.id ?? '')
  if (panel.mode === 'view' && item) { const progress = Math.min(100, Math.round(questProgress(item, data.transactions))); return <><PanelDetails items={[['Progress', `${progress}%`], ['Started', formatPlanDate(item.startsOn)], ['Ends', formatPlanDate(item.endsOn, true)], ['Days remaining', String(Math.max(0, daysUntil(item.endsOn)))], ['Status', item.status]]} /><div className="pl-panel-progress"><i style={{ width: `${progress}%` }} /></div><p className="pl-panel-note">The target is locked while active. Progress comes from matching ledger transactions.</p><PanelActions><button className="d-button is-secondary" type="button" onClick={() => { actions.onSaveQuest(repeatQuest(item)); onClose() }}><RotateCcw size={16} /> Repeat as new</button>{item.status === 'active' && <button className="d-destructive" type="button" onClick={() => { actions.onEndQuest(item); onClose() }}><X size={16} /> End quest</button>}</PanelActions></> }
  const submit = (event: FormEvent) => { event.preventDefault(); const value = Math.max(1, Number(target)); const category = data.categories.find((entry) => entry.id === categoryId); const goal = data.goals.find((entry) => entry.id === goalId); const ends = new Date(); ends.setDate(ends.getDate() + 6); actions.onSaveQuest({ id: crypto.randomUUID(), type, title: type === 'no_spend_days' ? `${value} no-spend days` : type === 'tracking_days' ? `Track money on ${value} days` : type === 'category_limit' ? `Keep ${category?.name ?? 'category'} under Rs ${nf(value)}` : `Add Rs ${nf(value)} to ${goal?.name ?? 'a goal'}`, categoryId: type === 'category_limit' ? categoryId : undefined, goalId: type === 'goal_contribution' ? goalId : undefined, targetCount: type === 'no_spend_days' || type === 'tracking_days' ? value : undefined, targetAmount: type === 'category_limit' || type === 'goal_contribution' ? value : undefined, startsOn: localDateKey(), endsOn: localDateKey(ends), status: 'active', createdAt: new Date().toISOString() }); onClose() }
  return <form className="pl-panel-form" onSubmit={submit}><DesktopField label="Quest type"><select value={type} onChange={(event) => setType(event.target.value as MoneyQuest['type'])}><option value="no_spend_days">No-spend days</option><option value="tracking_days">Tracking days</option><option value="category_limit">Category spending limit</option><option value="goal_contribution" disabled={!data.goals.length}>Goal contribution</option></select></DesktopField>{type === 'category_limit' && <DesktopField label="Category"><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{data.categories.filter((entry) => entry.kind === 'expense').map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></DesktopField>}{type === 'goal_contribution' && <DesktopField label="Goal"><select value={goalId} onChange={(event) => setGoalId(event.target.value)}>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></DesktopField>}<DesktopField label={type === 'no_spend_days' || type === 'tracking_days' ? 'Target days' : 'PKR target'}><input min="1" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></DesktopField><button className="d-button is-primary" disabled={data.moneyQuests.filter((quest) => quest.status === 'active').length >= 3 || Number(target) <= 0 || (type === 'goal_contribution' && !goalId)}>Start quest</button>{data.moneyQuests.filter((quest) => quest.status === 'active').length >= 3 && <p className="pl-panel-note">Three quests are already active.</p>}</form>
}

function DesktopField({ label, children }: { label: string; children: ReactNode }) { return <label className="d-field"><span>{label}</span><div>{children}</div></label> }
function PanelDetails({ items }: { items: Array<[string, string]> }) { return <dl className="pl-panel-details">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> }
function PanelActions({ children }: { children: ReactNode }) { return <div className="pl-panel-actions">{children}</div> }
function repeatQuest(quest: MoneyQuest): MoneyQuest { const ends = new Date(); ends.setDate(ends.getDate() + 6); return { ...quest, id: crypto.randomUUID(), startsOn: localDateKey(), endsOn: localDateKey(ends), status: 'active', createdAt: new Date().toISOString(), updatedAt: undefined } }

import { CalendarClock, Check, Flag, Hourglass, Plus, ReceiptText, ShoppingBag, Trash2, WalletCards } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { Account, Budget, Category, Goal, MoneyQuest, Transaction, UpcomingExpense, WishlistItem } from '../types/finance'
import { budgetUsage, formatPKR } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import { AddUpcomingExpenseModal, RecordUpcomingExpensePaidModal } from './GoalsDebts'

type Tab = 'budgets' | 'bills' | 'wishlist' | 'quest'
type UpcomingPayload = Omit<UpcomingExpense, 'id' | 'status' | 'createdAt' | 'paidTransactionId'>

export function Budgets({ budgets, upcomingExpenses, accounts, categories, transactions, wishlistItems, activeQuest, goals, onNavigateSettings, onAddUpcoming, onUpdateUpcoming, onDeleteUpcoming, onMarkUpcomingPaid, onSaveWishlist, onDeleteWishlist, onBuyWishlist, onMoveWishlistToGoal, onSaveQuest, onCancelQuest }: {
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  wishlistItems: WishlistItem[]
  activeQuest?: MoneyQuest
  goals: Goal[]
  onNavigateSettings: () => void
  onAddUpcoming: (payload: UpcomingPayload) => void
  onUpdateUpcoming: (id: string, payload: UpcomingPayload) => void
  onDeleteUpcoming: (id: string) => void
  onMarkUpcomingPaid: (expense: UpcomingExpense, payload: { accountId: string; paymentDate: string; notes?: string }) => void
  onSaveWishlist: (item: WishlistItem) => void
  onDeleteWishlist: (id: string) => void
  onBuyWishlist: (item: WishlistItem) => void
  onMoveWishlistToGoal: (item: WishlistItem) => void
  onSaveQuest: (quest: MoneyQuest) => void
  onCancelQuest: (quest: MoneyQuest) => void
}) {
  const [tab, setTab] = useState<Tab>('budgets')
  const [addingBill, setAddingBill] = useState(false)
  const [editingBill, setEditingBill] = useState<UpcomingExpense | null>(null)
  const [payingBill, setPayingBill] = useState<UpcomingExpense | null>(null)
  const tabs: Array<{ id: Tab; label: string; icon: typeof WalletCards; count?: number }> = [
    { id: 'budgets', label: 'Budgets', icon: WalletCards, count: budgets.length },
    { id: 'bills', label: 'Bills', icon: CalendarClock, count: upcomingExpenses.filter((item) => item.status !== 'paid').length },
    { id: 'wishlist', label: 'Wishlist', icon: ShoppingBag, count: wishlistItems.filter((item) => item.status === 'waiting' || item.status === 'ready').length },
    { id: 'quest', label: 'Quest', icon: Flag, count: activeQuest ? 1 : 0 },
  ]

  return <div className="mx-auto max-w-3xl pb-6">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">Plan</p><h1 className="mt-2 font-display text-3xl font-bold">Protect what matters next.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Budgets, bills, considered purchases, and one weekly challenge—organized away from Home.</p></header>
    <nav aria-label="Plan sections" className="mt-6 grid grid-cols-4 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">{tabs.map(({ id, label, icon: Icon, count }) => <button className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold sm:flex-row sm:text-sm', tab === id ? 'bg-[var(--surface-3)] text-[var(--accent)]' : 'text-[var(--muted)]')} key={id} onClick={() => setTab(id)}><Icon size={17} /><span>{label}</span>{Boolean(count) && <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] text-[var(--accent)]">{count}</span>}</button>)}</nav>

    {tab === 'budgets' && <BudgetPanel budgets={budgets} onNavigateSettings={onNavigateSettings} />}
    {tab === 'bills' && <BillsPanel expenses={upcomingExpenses} onAdd={() => setAddingBill(true)} onDelete={onDeleteUpcoming} onEdit={setEditingBill} onPay={setPayingBill} />}
    {tab === 'wishlist' && <WishlistPanel categories={categories} items={wishlistItems} onBuy={onBuyWishlist} onDelete={onDeleteWishlist} onMoveToGoal={onMoveWishlistToGoal} onSave={onSaveWishlist} />}
    {tab === 'quest' && <QuestPanel activeQuest={activeQuest} categories={categories} goals={goals} transactions={transactions} onCancel={onCancelQuest} onSave={onSaveQuest} />}

    <AddUpcomingExpenseModal accounts={accounts} key={addingBill ? 'add-bill' : 'closed-add'} open={addingBill} onClose={() => setAddingBill(false)} onSubmit={onAddUpcoming} />
    <AddUpcomingExpenseModal accounts={accounts} key={editingBill?.id ?? 'closed-edit'} expense={editingBill ?? undefined} open={Boolean(editingBill)} onClose={() => setEditingBill(null)} onSubmit={(payload) => { if (editingBill) onUpdateUpcoming(editingBill.id, payload) }} />
    <RecordUpcomingExpensePaidModal accounts={accounts} expense={payingBill} onClose={() => setPayingBill(null)} onConfirm={(payload) => { if (payingBill) onMarkUpcomingPaid(payingBill, payload) }} />
  </div>
}

function BudgetPanel({ budgets, onNavigateSettings }: { budgets: Budget[]; onNavigateSettings: () => void }) {
  const total = budgets.reduce((sum, item) => sum + item.amount, 0)
  const used = budgets.reduce((sum, item) => sum + item.used, 0)
  return <section className="mt-5"><div className="flex items-end justify-between gap-3"><div><p className="text-sm text-[var(--muted)]">This month</p><h2 className="mt-1 font-display text-2xl font-bold tabular-nums">{formatPKR(used)} <span className="text-base font-medium text-[var(--muted)]">of {formatPKR(total)}</span></h2></div><button className="text-sm font-semibold text-[var(--accent)]" onClick={onNavigateSettings}>Manage budgets</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{budgets.length ? budgets.map((budget) => { const usage = budgetUsage(budget); return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" key={budget.id}><div className="flex justify-between gap-3"><p className="font-semibold">{budget.category}</p><p className={cn('text-sm tabular-nums', usage >= 80 ? 'text-[var(--warning)]' : 'text-[var(--muted)]')}>{usage}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className={cn('h-full rounded-full', usage >= 100 ? 'bg-[var(--negative)]' : usage >= 80 ? 'bg-[var(--warning)]' : 'bg-[var(--positive)]')} style={{ width: `${Math.min(100, usage)}%` }} /></div><p className="mt-3 text-sm text-[var(--muted)]">{formatPKR(Math.max(0, budget.amount - budget.used))} remaining</p></article> }) : <Empty icon={WalletCards} title="No budgets yet" detail="Add only the category limits that help you make decisions." action="Add in Settings" onAction={onNavigateSettings} />}</div></section>
}

function BillsPanel({ expenses, onAdd, onDelete, onEdit, onPay }: { expenses: UpcomingExpense[]; onAdd: () => void; onDelete: (id: string) => void; onEdit: (item: UpcomingExpense) => void; onPay: (item: UpcomingExpense) => void }) {
  const sorted = [...expenses].sort((a, b) => a.status === 'paid' ? 1 : b.status === 'paid' ? -1 : a.dueDate.localeCompare(b.dueDate))
  return <section className="mt-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Upcoming bills</h2><p className="mt-1 text-sm text-[var(--muted)]">Due before payday is protected automatically.</p></div><button className="btn-primary" onClick={onAdd}><Plus size={17} /> Add</button></div><div className="mt-4 grid gap-3">{sorted.length ? sorted.map((item) => <article className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" key={item.id}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><ReceiptText size={18} /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 text-sm text-[var(--muted)]">{item.dueDate} · {item.category}</p></div><div className="text-right"><p className="font-semibold tabular-nums">{formatPKR(item.amount)}</p>{item.status !== 'paid' ? <div className="mt-2 flex gap-2"><button className="text-xs font-semibold text-[var(--positive)]" onClick={() => onPay(item)}>Pay</button><button className="text-xs font-semibold text-[var(--accent)]" onClick={() => onEdit(item)}>Edit</button><button aria-label={`Delete ${item.title}`} className="text-[var(--negative)]" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button></div> : <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--positive)]"><Check size={12} /> Paid</span>}</div></article>) : <Empty icon={CalendarClock} title="No upcoming bills" detail="Add rent, subscriptions, fees, or family payments." action="Add a bill" onAction={onAdd} />}</div></section>
}

function WishlistPanel({ items, categories, onSave, onDelete, onBuy, onMoveToGoal }: { items: WishlistItem[]; categories: Category[]; onSave: (item: WishlistItem) => void; onDelete: (id: string) => void; onBuy: (item: WishlistItem) => void; onMoveToGoal: (item: WishlistItem) => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [days, setDays] = useState('3')
  const [categoryId, setCategoryId] = useState(categories.find((item) => item.kind === 'expense')?.id ?? '')
  const add = (event: FormEvent) => { event.preventDefault(); const value = Number(amount); if (!name.trim() || !Number.isSafeInteger(value) || value <= 0) return; const reconsider = new Date(); reconsider.setDate(reconsider.getDate() + Number(days)); onSave({ id: crypto.randomUUID(), name: name.trim(), amount: value, categoryId: categoryId || undefined, reconsiderAt: reconsider.toISOString(), status: 'waiting' }); setName(''); setAmount('') }
  return <section className="mt-5"><div><h2 className="text-lg font-semibold">Cool-Off Wishlist</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Waiting is not “saving” yet. If you skip it, we call it money not spent until you actually move it to a goal.</p></div><form className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2" onSubmit={add}><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="What are you considering?" /><input className="form-input" inputMode="numeric" min="1" step="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="PKR amount" /><select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="flex gap-2"><select aria-label="Cool-off duration" className="form-input" value={days} onChange={(event) => setDays(event.target.value)}><option value="1">24 hours</option><option value="3">3 days</option><option value="7">7 days</option></select><button className="btn-primary justify-center"><Plus size={16} /> Wait</button></div></form><div className="mt-4 grid gap-3">{items.filter((item) => item.status === 'waiting' || item.status === 'ready').map((item) => { const ready = new Date(item.reconsiderAt) <= new Date(); return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" key={item.id}><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">{ready ? <ShoppingBag size={18} /> : <Hourglass size={18} />}</span><div className="min-w-0 flex-1"><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{formatPKR(item.amount)} · {ready ? 'Ready to decide' : `Wait until ${new Date(item.reconsiderAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{ready && <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)]" onClick={() => onBuy(item)}>Buy & record</button>}<button className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold" onClick={() => onSave({ ...item, reconsiderAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), status: 'waiting' })}>Wait 3 more days</button><button className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--positive)]" onClick={() => onSave({ ...item, status: 'skipped' })}>Skip · not spent</button><button className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)]" onClick={() => onMoveToGoal(item)}>Move to goal</button><button aria-label={`Delete ${item.name}`} className="ml-auto px-2 text-[var(--negative)]" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div></article> })}</div></section>
}

function QuestPanel({ activeQuest, categories, goals, transactions, onSave, onCancel }: { activeQuest?: MoneyQuest; categories: Category[]; goals: Goal[]; transactions: Transaction[]; onSave: (quest: MoneyQuest) => void; onCancel: (quest: MoneyQuest) => void }) {
  const [type, setType] = useState<MoneyQuest['type']>('tracking_days')
  const [target, setTarget] = useState('3')
  const [categoryId, setCategoryId] = useState(categories.find((item) => item.kind === 'expense')?.id ?? '')
  const [goalId, setGoalId] = useState(goals[0]?.id ?? '')
  const progress = useMemo(() => activeQuest ? questProgress(activeQuest, transactions) : 0, [activeQuest, transactions])
  const create = (event: FormEvent) => { event.preventDefault(); const start = new Date(); const end = new Date(); end.setDate(end.getDate() + 6); const value = Math.max(1, Number(target)); const title = type === 'tracking_days' ? `Track money on ${value} days` : type === 'no_spend_days' ? `${value} no-spend days` : type === 'category_limit' ? `Keep category spending under ${formatPKR(value)}` : `Put ${formatPKR(value)} toward a goal`; onSave({ id: crypto.randomUUID(), type, title, categoryId: type === 'category_limit' ? categoryId : undefined, goalId: type === 'goal_contribution' ? goalId : undefined, targetCount: type === 'tracking_days' || type === 'no_spend_days' ? value : undefined, targetAmount: type === 'category_limit' || type === 'goal_contribution' ? value : undefined, startsOn: start.toISOString().slice(0, 10), endsOn: end.toISOString().slice(0, 10), status: 'active' }) }
  if (activeQuest) return <section className="mt-5"><p className="text-sm text-[var(--muted)]">One active quest</p><article className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Flag size={20} /></span><div className="flex-1"><p className="font-semibold">{activeQuest.title}</p><p className="mt-1 text-sm text-[var(--muted)]">Ends {activeQuest.endsOn} · recovery is always allowed</p></div></div><div className="mt-5 h-2 rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, progress)}%` }} /></div><div className="mt-2 flex justify-between text-xs text-[var(--muted)]"><span>{Math.round(progress)}% complete</span><span>No streak shame</span></div><button className="mt-5 text-sm font-semibold text-[var(--negative)]" onClick={() => onCancel(activeQuest)}>End quest</button></article></section>
  return <section className="mt-5"><h2 className="text-lg font-semibold">Choose one weekly quest</h2><p className="mt-1 text-sm text-[var(--muted)]">Small, transaction-derived, and forgiving if the week changes.</p><form className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" onSubmit={create}><select className="form-input" value={type} onChange={(event) => setType(event.target.value as MoneyQuest['type'])}><option value="tracking_days">Tracking consistency</option><option value="no_spend_days">No-spend days</option><option value="category_limit">Category spending limit</option><option value="goal_contribution">Goal contribution</option></select>{type === 'category_limit' && <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{type === 'goal_contribution' && <select className="form-input" value={goalId} onChange={(event) => setGoalId(event.target.value)}>{goals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<label><span className="form-label">{type === 'tracking_days' || type === 'no_spend_days' ? 'Number of days' : 'PKR amount'}</span><input className="form-input" min="1" step="1" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label><button className="btn-primary justify-center"><Flag size={17} /> Start quest</button></form></section>
}

function questProgress(quest: MoneyQuest, transactions: Transaction[]) {
  const inWindow = transactions.filter((item) => item.date >= quest.startsOn && item.date <= quest.endsOn)
  if (quest.type === 'tracking_days') return (new Set(inWindow.map((item) => item.date)).size / Math.max(1, quest.targetCount ?? 1)) * 100
  if (quest.type === 'goal_contribution') return (inWindow.filter((item) => item.type === 'goal_saving' && item.goalId === quest.goalId).reduce((sum, item) => sum + item.amount, 0) / Math.max(1, quest.targetAmount ?? 1)) * 100
  if (quest.type === 'category_limit') { const spent = inWindow.filter((item) => item.type === 'expense' && item.categoryId === quest.categoryId).reduce((sum, item) => sum + item.amount, 0); return spent <= (quest.targetAmount ?? 0) ? 100 - (spent / Math.max(1, quest.targetAmount ?? 1)) * 30 : 0 }
  const start = new Date(`${quest.startsOn}T12:00:00`); const today = new Date(); let count = 0; for (const date = new Date(start); date <= today && date.toISOString().slice(0, 10) <= quest.endsOn; date.setDate(date.getDate() + 1)) { const key = date.toISOString().slice(0, 10); if (!inWindow.some((item) => item.type === 'expense' && item.date === key)) count += 1 } return (count / Math.max(1, quest.targetCount ?? 1)) * 100
}

function Empty({ icon: Icon, title, detail, action, onAction }: { icon: typeof WalletCards; title: string; detail: string; action: string; onAction: () => void }) {
  return <div className="col-span-full rounded-2xl border border-dashed border-[var(--border-strong)] px-5 py-9 text-center"><Icon className="mx-auto text-[var(--muted-2)]" size={23} /><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-[var(--muted)]">{detail}</p><button className="mt-4 text-sm font-semibold text-[var(--accent)]" onClick={onAction}>{action}</button></div>
}

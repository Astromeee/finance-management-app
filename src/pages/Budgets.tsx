import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Account, Budget, Category, MoneyQuest, Transaction, UpcomingExpense, WishlistItem } from '../types/finance'
import { budgetUsage } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import { AddUpcomingExpenseModal, RecordUpcomingExpensePaidModal } from './GoalsDebts'
import { CoolOffSheet } from '../components/sheets/CoolOffSheet'
import { trackEvent } from '../lib/analytics'
import { questProgress } from '../utils/retention'

/* ============================================================
   Plan — "The plan." (Vault spec 16a)
   Four former tabs folded into one scroll with anchor chips.
   Renames: Budgets → Spending limits · Bills → Locked for bills ·
   Wishlist → Cooling off · Quest → This week's quest.
   ============================================================ */

type SectionKey = 'limits' | 'bills' | 'cooling' | 'quest'
type QuestDraftType = Exclude<MoneyQuest['type'], 'goal_contribution'>
type UpcomingPayload = Omit<UpcomingExpense, 'id' | 'status' | 'createdAt' | 'paidTransactionId'>

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

function formatDue(date: string) {
  const value = new Date(`${date}T12:00:00`)
  if (Number.isNaN(value.getTime())) return date
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

function daysUntil(date: string) {
  const value = new Date(`${date}T12:00:00`)
  if (Number.isNaN(value.getTime())) return Infinity
  const today = new Date()
  return Math.ceil((new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
}

export function Budgets({ budgets, upcomingExpenses, accounts, categories, transactions, wishlistItems, activeQuest, onNavigateSettings, onAddUpcoming, onUpdateUpcoming, onDeleteUpcoming, onMarkUpcomingPaid, onSaveWishlist, onDeleteWishlist, onBuyWishlist, onSaveQuest, onCancelQuest }: {
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  wishlistItems: WishlistItem[]
  activeQuest?: MoneyQuest
  onNavigateSettings: () => void
  onAddUpcoming: (payload: UpcomingPayload) => void
  onUpdateUpcoming: (id: string, payload: UpcomingPayload) => void
  onDeleteUpcoming: (id: string) => void
  onMarkUpcomingPaid: (expense: UpcomingExpense, payload: { accountId: string; paymentDate: string; notes?: string }) => void
  onSaveWishlist: (item: WishlistItem) => void
  onDeleteWishlist: (id: string) => void
  onBuyWishlist: (item: WishlistItem) => void
  onSaveQuest: (quest: MoneyQuest) => void
  onCancelQuest: (quest: MoneyQuest) => void
}) {
  const [activeChip, setActiveChip] = useState<SectionKey>('limits')
  // frozen per mount: keeps render pure (react-compiler) — the page remounts on nav
  const [now] = useState(() => Date.now())
  const [addingBill, setAddingBill] = useState(false)
  const [editingBill, setEditingBill] = useState<UpcomingExpense | null>(null)
  const [payingBill, setPayingBill] = useState<UpcomingExpense | null>(null)
  const [decidingItem, setDecidingItem] = useState<WishlistItem | null>(null)
  const [addingWish, setAddingWish] = useState(false)
  const [startingQuest, setStartingQuest] = useState(false)
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({ limits: null, bills: null, cooling: null, quest: null })
  const scrollingTo = useRef<SectionKey | null>(null)

  const chips: Array<{ key: SectionKey; label: string }> = [
    { key: 'limits', label: 'Limits' },
    { key: 'bills', label: 'Bills' },
    { key: 'cooling', label: 'Cooling off' },
    { key: 'quest', label: 'Quest' },
  ]

  /* Anchor chips: tapping scrolls, active follows scroll (spec 16a §2). */
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      if (!visible.length) return
      const first = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const key = (first.target as HTMLElement).dataset.section as SectionKey | undefined
      if (!key) return
      if (scrollingTo.current && scrollingTo.current !== key) return
      if (scrollingTo.current === key) scrollingTo.current = null
      setActiveChip(key)
    }, { rootMargin: '-20% 0px -55% 0px' })
    for (const node of Object.values(sectionRefs.current)) if (node) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const goTo = (key: SectionKey) => {
    setActiveChip(key)
    scrollingTo.current = key
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const totalBudget = budgets.reduce((sum, item) => sum + item.amount, 0)
  const totalUsed = budgets.reduce((sum, item) => sum + item.used, 0)
  const leftThisMonth = Math.max(0, totalBudget - totalUsed)

  const sortedBills = useMemo(
    () => [...upcomingExpenses].sort((a, b) => a.status === 'paid' ? 1 : b.status === 'paid' ? -1 : a.dueDate.localeCompare(b.dueDate)),
    [upcomingExpenses],
  )
  const coolingItems = wishlistItems.filter((item) => item.status === 'waiting' || item.status === 'ready')
  const progress = useMemo(() => activeQuest ? questProgress(activeQuest, transactions) : 0, [activeQuest, transactions])

  const eyebrow = `${new Date().toLocaleDateString('en-GB', { month: 'long' })} · Plan`.toUpperCase()

  return (
    <div className="vault-screen">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{eyebrow}</p>
        <div className="vault-topbar-actions">
          <button aria-label="Add a bill" className="vault-iconbtn" type="button" onClick={() => setAddingBill(true)}>
            <Plus size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <h1 className="vault-title">The <em>plan.</em></h1>

      <div className="vault-chiprow sticky top-0 z-10 -mx-[26px] mt-6 bg-[var(--bone)] px-[26px] py-2">
        {chips.map((chip) => (
          <button key={chip.key} className={cn('vault-chip', activeChip === chip.key && 'is-active')} type="button" onClick={() => goTo(chip.key)}>
            {chip.label}
          </button>
        ))}
      </div>

      {/* ---- Spending limits ---- */}
      <section ref={(node) => { sectionRefs.current.limits = node }} data-section="limits" aria-label="Spending limits" className="mt-6 scroll-mt-16">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="vault-h2">Spending limits</h2>
          <p className="vault-h2-sub"><span className="vault-digits font-semibold text-[var(--ink)]">Rs {nf(leftThisMonth)}</span> left this month</p>
        </div>
        <div className="mt-2">
          {budgets.length ? budgets.map((budget) => {
            const usage = budgetUsage(budget)
            const left = Math.max(0, budget.amount - budget.used)
            const hot = usage >= 70
            return (
              <div key={budget.id} className="border-b border-[var(--rule-soft)] py-3.5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="vault-row-title">{budget.category}</p>
                  <p className="vault-row-amount">
                    <span className={cn(hot && 'text-[var(--clay)]')}>{nf(left)} left</span>
                    <span className="font-normal text-[var(--taupe)]"> · {usage}% used</span>
                  </p>
                </div>
                <div className="vault-line mt-2.5">
                  <div className={cn('vault-line-fill', hot && 'is-clay')} style={{ width: `${Math.min(100, usage)}%` }} />
                </div>
              </div>
            )
          }) : (
            <p className="py-5 text-sm leading-6 text-[var(--taupe)]">
              No limits yet. Add only the category limits that help you decide.{' '}
              <button className="font-semibold text-[var(--clay)]" type="button" onClick={onNavigateSettings}>Add in Settings</button>
            </p>
          )}
        </div>
      </section>

      {/* ---- Locked for bills ---- */}
      <section ref={(node) => { sectionRefs.current.bills = node }} data-section="bills" aria-label="Locked for bills" className="mt-9 scroll-mt-16">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="vault-h2">Locked for bills</h2>
          <p className="vault-h2-sub">paid before you can spend it</p>
        </div>
        <div className="mt-1">
          {sortedBills.length ? sortedBills.map((bill) => {
            const paid = bill.status === 'paid'
            const actionable = !paid && daysUntil(bill.dueDate) <= 7
            return (
              <div key={bill.id} className={cn('vault-row', paid && 'is-paid')}>
                <span className={cn('vault-row-dot', paid && 'is-paid')} />
                <button className="vault-row-main text-left" type="button" onClick={() => { if (!paid) setEditingBill(bill) }}>
                  <span className="vault-row-title block">{bill.title}</span>
                  <span className="vault-row-meta block">{paid ? `Paid · ${formatDue(bill.dueDate)}` : `Due ${formatDue(bill.dueDate)}`}</span>
                </button>
                {actionable && <button className="vault-pay" type="button" onClick={() => setPayingBill(bill)}>Pay</button>}
                <span className="vault-row-amount">{nf(bill.amount)}{paid && ' ✓'}</span>
              </div>
            )
          }) : (
            <p className="py-5 text-sm leading-6 text-[var(--taupe)]">
              No bills locked yet.{' '}
              <button className="font-semibold text-[var(--clay)]" type="button" onClick={() => setAddingBill(true)}>Add rent, fees, or a subscription</button>
            </p>
          )}
        </div>
      </section>

      {/* ---- Cooling off ---- */}
      <section ref={(node) => { sectionRefs.current.cooling = node }} data-section="cooling" aria-label="Cooling off" className="mt-9 scroll-mt-16">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="vault-h2">Cooling off</h2>
          <p className="vault-h2-sub">sleep on it before you buy</p>
        </div>
        <div className="vault-espresso mt-4 px-5 py-1">
          {coolingItems.map((item) => {
            const ready = item.status === 'ready' || new Date(item.reconsiderAt).getTime() <= now
            const daysLeft = Math.max(1, Math.ceil((new Date(item.reconsiderAt).getTime() - now) / 86_400_000))
            const until = new Date(item.reconsiderAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
            return (
              <div key={item.id} className="flex items-center gap-4 border-b border-[var(--rule-dark)] py-4 last:border-b-0">
                <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setDecidingItem(item)}>
                  <p className="truncate text-sm font-semibold text-[var(--bone-text)]">{item.name}</p>
                  <p className="mt-1 truncate text-[11.5px] text-[var(--sand-text)]">
                    <span className="vault-digits">Rs {nf(item.amount)}</span> · {ready ? 'your head is clear now' : `thinking until ${until}`}
                  </p>
                </button>
                {ready
                  ? <button className="vault-decide" type="button" onClick={() => setDecidingItem(item)}>Decide</button>
                  : <span className="vault-digits flex-none text-[13px] font-medium text-[var(--sand-text)]">{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</span>}
              </div>
            )
          })}
          <button className="flex w-full items-center gap-2 py-4 text-[12.5px] font-semibold text-[var(--sand-dim)]" type="button" onClick={() => setAddingWish(true)}>
            <Plus size={14} strokeWidth={2} /> Cool off a purchase
          </button>
        </div>
      </section>

      {/* ---- This week's quest ---- */}
      <section ref={(node) => { sectionRefs.current.quest = node }} data-section="quest" aria-label="This week's quest" className="mt-6 scroll-mt-16">
        {activeQuest ? (
          <QuestCard quest={activeQuest} progress={progress} onCancel={() => onCancelQuest(activeQuest)} />
        ) : (
          <button className="vault-dashed" type="button" onClick={() => setStartingQuest(true)}>
            + Start this week&rsquo;s quest
          </button>
        )}
      </section>

      {/* ---- Sheets & modals ---- */}
      <AddUpcomingExpenseModal accounts={accounts} key={addingBill ? 'add-bill' : 'closed-add'} open={addingBill} onClose={() => setAddingBill(false)} onSubmit={onAddUpcoming} />
      <AddUpcomingExpenseModal
        accounts={accounts}
        key={editingBill?.id ?? 'closed-edit'}
        expense={editingBill ?? undefined}
        open={Boolean(editingBill)}
        onClose={() => setEditingBill(null)}
        onSubmit={(payload) => { if (editingBill) onUpdateUpcoming(editingBill.id, payload) }}
        onDelete={() => { if (editingBill) onDeleteUpcoming(editingBill.id) }}
      />
      <RecordUpcomingExpensePaidModal accounts={accounts} expense={payingBill} onClose={() => setPayingBill(null)} onConfirm={(payload) => { if (payingBill) onMarkUpcomingPaid(payingBill, payload) }} />

      {decidingItem && (
        <DecideSheet
          item={decidingItem}
          onClose={() => setDecidingItem(null)}
          onBuy={() => { onBuyWishlist(decidingItem); setDecidingItem(null) }}
          onSkip={() => { onSaveWishlist({ ...decidingItem, status: 'skipped' }); setDecidingItem(null) }}
          onWait={() => { onSaveWishlist({ ...decidingItem, reconsiderAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), status: 'waiting' }); setDecidingItem(null) }}
          onRemove={() => { onDeleteWishlist(decidingItem.id); setDecidingItem(null) }}
        />
      )}
      <CoolOffSheet open={addingWish} categories={categories} onClose={() => setAddingWish(false)} onSave={onSaveWishlist} />
      {startingQuest && <StartQuestSheet categories={categories} onClose={() => setStartingQuest(false)} onSave={(quest) => { onSaveQuest(quest); setStartingQuest(false) }} />}
    </div>
  )
}

/* ---------- quest card (clay, segment ticks) ---------- */

function QuestCard({ quest, progress, onCancel }: { quest: MoneyQuest; progress: number; onCancel: () => void }) {
  const total = Math.min(7, quest.targetCount ?? 3)
  const done = Math.max(0, Math.min(total, Math.round((progress / 100) * total)))
  const ends = new Date(`${quest.endsOn}T12:00:00`)
  const endsLabel = Number.isNaN(ends.getTime()) ? quest.endsOn : ends.toLocaleDateString('en-GB', { weekday: 'long' })
  return (
    <article className="vault-clay p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--clay-ink)]">This week&rsquo;s quest</p>
        <p className="text-[11.5px] font-semibold text-[var(--espresso)]">ends {endsLabel}</p>
      </div>
      <h3 className="mt-2 font-display text-[20px] text-[var(--espresso)]">{quest.title}</h3>
      <div className="vault-ticks mt-4">
        {Array.from({ length: total }, (_, index) => <span key={index} className={cn('vault-tick', index < done && 'is-done')} />)}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-semibold text-[var(--espresso)]">{done} of {total} done — no streak shame, ever.</p>
        <button className="text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--clay-ink)]" type="button" onClick={onCancel}>End</button>
      </div>
    </article>
  )
}

/* ---------- vault sheets ---------- */

function SheetShell({ title, label, onClose, children }: { title: React.ReactNode; label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] grid items-end bg-[rgba(43,36,29,.45)]" onClick={onClose}>
      <div className="vault-outline mx-auto w-full max-w-[27rem] rounded-b-none px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5" role="dialog" aria-label={label} onClick={(event) => event.stopPropagation()}>
        <h2 className="vault-h2">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function DecideSheet({ item, onClose, onBuy, onSkip, onWait, onRemove }: { item: WishlistItem; onClose: () => void; onBuy: () => void; onSkip: () => void; onWait: () => void; onRemove: () => void }) {
  const ready = item.status === 'ready' || new Date(item.reconsiderAt) <= new Date()
  return (
    <SheetShell title={<>{item.name} — <span className="vault-digits">Rs {nf(item.amount)}</span></>} label={`Decide on ${item.name}`} onClose={onClose}>
      <p className="mt-1 text-[12px] text-[var(--taupe)]">{ready ? 'The wait is over. Decide with a clear head.' : 'Still cooling off — you can decide early or keep waiting.'}</p>
      <div className="mt-2">
        {ready && (
          <button className="vault-row" type="button" onClick={() => { onBuy(); trackEvent('wishlist_decision', { surface: 'plan', action: 'buy' }) }}>
            <span className="vault-row-dot is-in" />
            <span className="vault-row-main"><span className="vault-row-title block">Buy and record it</span><span className="vault-row-meta block">Opens the expense sheet with everything filled in</span></span>
          </button>
        )}
        <button className="vault-row" type="button" onClick={onSkip}>
          <span className="vault-row-dot" />
          <span className="vault-row-main"><span className="vault-row-title block">Skip it</span><span className="vault-row-meta block">The money stays unspent — that counts as a win</span></span>
        </button>
        <button className="vault-row" type="button" onClick={onWait}>
          <span className="vault-row-dot is-move" />
          <span className="vault-row-main"><span className="vault-row-title block">Wait 3 more days</span><span className="vault-row-meta block">No rush. It will resurface when the time is up</span></span>
        </button>
        <button className="vault-row" type="button" onClick={onRemove}>
          <span className="vault-row-dot is-paid" />
          <span className="vault-row-main"><span className="vault-row-title block">Remove from the list</span></span>
        </button>
      </div>
    </SheetShell>
  )
}

function StartQuestSheet({ categories, onClose, onSave }: { categories: Category[]; onClose: () => void; onSave: (quest: MoneyQuest) => void }) {
  const [type, setType] = useState<QuestDraftType>('no_spend_days')
  const [target, setTarget] = useState('3')
  const [categoryId, setCategoryId] = useState(categories.find((item) => item.kind === 'expense')?.id ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 6)
    const value = Math.max(1, Number(target))
    const title = type === 'tracking_days' ? `Track money on ${value} days` : type === 'no_spend_days' ? `${value} no-spend days` : `Keep category spending under Rs ${nf(value)}`
    onSave({ id: crypto.randomUUID(), type, title, categoryId: type === 'category_limit' ? categoryId : undefined, targetCount: type === 'tracking_days' || type === 'no_spend_days' ? value : undefined, targetAmount: type === 'category_limit' ? value : undefined, startsOn: start.toISOString().slice(0, 10), endsOn: end.toISOString().slice(0, 10), status: 'active' })
    trackEvent('quest_started', { surface: 'plan' })
  }
  return (
    <SheetShell title={<>This week&rsquo;s <em className="italic text-[var(--clay)]">quest.</em></>} label="Start this week's quest" onClose={onClose}>
      <p className="mt-1 text-[12px] text-[var(--taupe)]">One small challenge at a time. Recovery is always allowed.</p>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <select className="form-input" value={type} onChange={(event) => setType(event.target.value as QuestDraftType)}>
          <option value="no_spend_days">No-spend days</option>
          <option value="tracking_days">Tracking consistency</option>
          <option value="category_limit">Category spending limit</option>
        </select>
        {type === 'category_limit' && <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        <label><span className="form-label">{type === 'category_limit' ? 'PKR amount' : 'Number of days'}</span><input className="form-input" min="1" step="1" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
        <button className="btn-primary justify-center">Start quest</button>
      </form>
    </SheetShell>
  )
}

import { PencilLine } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Account, SafeSpendResult, Transaction } from '../../types/finance'
import { cn } from '../../utils/ui'
import { Numpad, VaultSheet } from './VaultSheet'
import { formatAmount, pressKey } from './numpad'
import { localDateKey } from '../../lib/date'

/* ============================================================
   Record sheet (spec 17a/17b) — ONE sheet for income and
   expenses. Direction flips with the segmented toggle; the
   active side declares itself in color (espresso = out,
   clay = in). The custom numpad feeds the amount and the
   impact line answers "what does this do to my day?" live.
   ============================================================ */

export type RecordDirection = 'expense' | 'income'

export type RecordPayload = {
  direction: RecordDirection
  amount: number
  category: string
  accountId: string
  date: string
  notes?: string
}

const nf = (value: number) => Math.round(Math.abs(value)).toLocaleString('en-PK')

function rememberedAccount(accounts: Account[]) {
  const saved = localStorage.getItem('pl-last-account')
  return accounts.some((account) => account.id === saved) ? saved! : accounts[0]?.id ?? ''
}

/** Categories ordered by how often they appear in the ledger, most-used first. */
function byUsage(names: string[], transactions: Transaction[], type: 'expense' | 'income') {
  const counts = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.type !== type) continue
    const key = type === 'income' ? transaction.source ?? transaction.category ?? transaction.title : transaction.category ?? transaction.title
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...names].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
}

function shortName(account: Account) {
  return account.name.split(' ')[0]
}

export function RecordSheet({
  open,
  initialDirection,
  accounts,
  expenseCategories,
  incomeCategories,
  transactions,
  safeSpend,
  initialAmount,
  initialCategory,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialDirection: RecordDirection
  accounts: Account[]
  expenseCategories: string[]
  incomeCategories: string[]
  transactions: Transaction[]
  safeSpend: SafeSpendResult
  initialAmount?: number
  initialCategory?: string
  onClose: () => void
  onSubmit: (payload: RecordPayload) => void
}) {
  const [direction, setDirection] = useState<RecordDirection>(initialDirection)
  const [value, setValue] = useState(initialAmount ? String(initialAmount) : '')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [accountId, setAccountId] = useState(() => rememberedAccount(accounts))
  const [date, setDate] = useState(localDateKey())
  const [noteOpen, setNoteOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const spentOrder = useMemo(() => byUsage(expenseCategories, transactions, 'expense'), [expenseCategories, transactions])
  const receivedOrder = useMemo(() => byUsage(incomeCategories, transactions, 'income'), [incomeCategories, transactions])

  // Per-direction selection: flipping back restores the previous pick.
  const [spentCategory, setSpentCategory] = useState(() => (initialDirection === 'expense' && initialCategory) || spentOrder[0] || 'Miscellaneous')
  const [receivedCategory, setReceivedCategory] = useState(() => (initialDirection === 'income' && initialCategory) || receivedOrder[0] || 'Other Income')

  const isSpent = direction === 'expense'
  const order = isSpent ? spentOrder : receivedOrder
  const category = isSpent ? spentCategory : receivedCategory
  const setCategory = isSpent ? setSpentCategory : setReceivedCategory

  // Top 4 most-used + the current selection (a draft category may sit in the long tail).
  const visibleCategories = useMemo(() => {
    if (showAllCategories) return order
    const top = order.slice(0, 4)
    return top.includes(category) || !order.includes(category) ? top : [...top.slice(0, 3), category]
  }, [order, category, showAllCategories])

  const amount = Number(value) || 0
  const account = accounts.find((item) => item.id === accountId)
  const included = account ? account.includeInSafeSpend !== false : true
  const today = localDateKey()

  /* Impact line (17a §4). Spent hits today in full — negative means dipping
     into tomorrow. Received spreads over the days left in the cycle. */
  const impact = useMemo(() => {
    if (safeSpend.state === 'needs_setup') return null
    const base = safeSpend.safeToSpendToday
    if (account && !included) {
      return { kind: 'excluded' as const, text: `${shortName(account)} sits outside safe spend — today's number doesn't move.` }
    }
    if (amount <= 0) return { kind: 'base' as const, base }
    if (isSpent) {
      const after = base - amount
      return { kind: 'spent' as const, base, after }
    }
    const days = Math.max(1, safeSpend.cycle?.daysRemaining ?? 1)
    return { kind: 'received' as const, base, after: base + Math.floor(amount / days) }
  }, [safeSpend, account, included, amount, isSpent])

  const commit = () => {
    if (amount <= 0 || !accountId) return
    localStorage.setItem('pl-last-account', accountId)
    onSubmit({ direction, amount, category, accountId, date, notes: notes.trim() || undefined })
    onClose()
  }

  return (
    <VaultSheet open={open} label={isSpent ? 'Record spending' : 'Record money received'} onClose={onClose}>
      {/* Direction toggle */}
      <div className="vault-seg" role="tablist" aria-label="Direction">
        <button aria-selected={isSpent} className={cn('vault-seg-btn', isSpent && 'is-spent')} role="tab" type="button" onClick={() => setDirection('expense')}>Spent</button>
        <button aria-selected={!isSpent} className={cn('vault-seg-btn', !isSpent && 'is-received')} role="tab" type="button" onClick={() => setDirection('income')}>Received</button>
      </div>

      {/* Amount */}
      <div aria-live="polite" className={cn('vault-amount mt-6', !isSpent && 'is-received')}>
        <span className="vault-amount-currency">Rs</span>
        <span className="vault-amount-value">{formatAmount(value)}<span aria-hidden className="vault-amount-caret" /></span>
      </div>

      {/* Impact line */}
      {impact && (
        <p className="vault-impact mt-3">
          {impact.kind === 'excluded' && impact.text}
          {impact.kind === 'base' && <>Safe today <strong>Rs {nf(impact.base)}</strong></>}
          {impact.kind === 'spent' && <>
            Safe today <strong>Rs {nf(impact.base)}</strong> → <strong className={cn(impact.after < 0 && 'is-clay')}>{impact.after < 0 ? '−' : ''}Rs {nf(impact.after)}</strong>
            {impact.after < 0 && <> · dips into tomorrow</>}
          </>}
          {impact.kind === 'received' && <>
            Safe today grows <strong>Rs {nf(impact.base)}</strong> → <strong>Rs {nf(impact.after)}</strong>
          </>}
        </p>
      )}

      {/* Category chips */}
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {visibleCategories.map((name) => (
          <button key={name} className={cn('vault-chip-lg', category === name && 'is-active')} type="button" onClick={() => setCategory(name)}>{name}</button>
        ))}
        {!showAllCategories && order.length > visibleCategories.length && (
          <button className="vault-chip-lg" type="button" onClick={() => setShowAllCategories(true)}>More…</button>
        )}
      </div>

      {/* Account + date pills */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {accounts.map((item) => (
          <button key={item.id} className={cn('vault-pill-sm', accountId === item.id && 'is-selected')} type="button" onClick={() => setAccountId(item.id)}>{shortName(item)}</button>
        ))}
        <label className="vault-pill-sm cursor-pointer">
          {date === today ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ▾
          <input aria-label="Entry date" className="absolute inset-0 cursor-pointer opacity-0" max={today} type="date" value={date} onChange={(event) => setDate(event.target.value || today)} />
        </label>
      </div>

      {/* Numpad */}
      <div className="mt-5">
        <Numpad onKey={(key) => setValue((current) => pressKey(current, key))} />
      </div>

      {noteOpen && (
        <input autoFocus className="form-input mt-4" placeholder="Add a note (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
      )}

      {/* Commit row */}
      <div className="vault-commit-row mt-4">
        <button className={cn('vault-commit', isSpent ? 'is-clay' : 'is-espresso')} disabled={amount <= 0 || !accountId} type="button" onClick={commit}>
          {amount > 0
            ? <>Record <span className="vault-digits">Rs {nf(amount)}</span> {isSpent ? 'spent' : 'received'}</>
            : <>Record {isSpent ? 'spending' : 'money in'}</>}
        </button>
        <button aria-expanded={noteOpen} aria-label="Add a note" className={cn('vault-note-btn', noteOpen && 'is-open')} type="button" onClick={() => setNoteOpen((current) => !current)}>
          <PencilLine size={19} strokeWidth={1.8} />
        </button>
      </div>
    </VaultSheet>
  )
}

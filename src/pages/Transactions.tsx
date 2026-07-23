import { PencilLine, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { formatPKR } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import type { Account, Transaction, TransactionType } from '../types/finance'
import { localDateKey } from '../lib/date'

const editableTypes: TransactionType[] = ['income', 'expense', 'transfer', 'goal_saving', 'debt_payment']
type TransactionFilterChip = 'All' | 'Spent' | 'Received' | 'Moved'

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

function categoryLabel(transaction: Transaction) {
  return transaction.category ?? transaction.source ?? transaction.title
}

function monthKey(date: string) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return key
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

/* Friendlier verbs than expense/income/transfer (spec 14a §4).
   Goal savings and debt payments are money out, so they read as "Spent". */
function matchesChip(transaction: Transaction, chip: TransactionFilterChip) {
  if (chip === 'All') return true
  if (chip === 'Received') return transaction.type === 'income'
  if (chip === 'Moved') return transaction.type === 'transfer'
  return transaction.type !== 'income' && transaction.type !== 'transfer'
}

function isMoneyOut(transaction: Transaction) {
  return transaction.type !== 'income' && transaction.type !== 'transfer'
}

function groupLabel(date: string) {
  const today = new Date()
  const then = new Date(`${date}T12:00:00`)
  if (Number.isNaN(then.getTime())) return date
  const days = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return then.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function timeOf(transaction: Transaction) {
  if (!transaction.createdAt) return null
  const value = new Date(transaction.createdAt)
  if (Number.isNaN(value.getTime())) return null
  return value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

export function Transactions({
  transactions,
  accounts,
  onUpdateTransaction,
  onDeleteTransaction,
  expenseCategories,
  incomeCategories,
}: {
  transactions: Transaction[]
  accounts: Account[]
  expenseCategories: string[]
  incomeCategories: string[]
  onUpdateTransaction: (transaction: Transaction) => void
  onDeleteTransaction: (transactionId: string) => void
}) {
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [viewing, setViewing] = useState<Transaction | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [activeChip, setActiveChip] = useState<TransactionFilterChip>('All')
  const chips: TransactionFilterChip[] = ['All', 'Spent', 'Received', 'Moved']

  const categoryOptions = useMemo(() => {
    const matchingTransactionLabels = transactions
      .filter((transaction) => matchesChip(transaction, activeChip))
      .map((transaction) => categoryLabel(transaction))
      .filter(Boolean)
    const baseCategories =
      activeChip === 'Received' ? incomeCategories
        : activeChip === 'Spent' ? expenseCategories
          : activeChip === 'All' ? [...expenseCategories, ...incomeCategories]
            : []
    return Array.from(new Set([...baseCategories, ...matchingTransactionLabels])).sort((a, b) => a.localeCompare(b))
  }, [activeChip, expenseCategories, incomeCategories, transactions])

  const monthOptions = useMemo(() => {
    const monthKeys = Array.from(new Set(transactions.map((transaction) => monthKey(transaction.date)).filter(Boolean)))
    return monthKeys.sort((a, b) => b.localeCompare(a)).map((value) => ({ value, label: monthLabel(value) }))
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    const search = query.trim().toLowerCase()
    return transactions.filter((transaction) => {
      if (!matchesChip(transaction, activeChip)) return false
      if (categoryFilter !== 'all' && categoryLabel(transaction) !== categoryFilter) return false
      if (monthFilter !== 'all' && monthKey(transaction.date) !== monthFilter) return false
      if (!search) return true
      return [
        transaction.title,
        transaction.category,
        transaction.source,
        transaction.account,
        transaction.date,
        transaction.notes,
        transaction.type.replace('_', ' '),
        formatPKR(transaction.amount),
      ].some((value) => value?.toLowerCase().includes(search))
    })
  }, [activeChip, categoryFilter, monthFilter, query, transactions])

  /* IN / OUT / NET across the current view — chip filter narrows the list,
     but the strip always tells the whole in/out/net story for the period. */
  const strip = useMemo(() => {
    const scope = transactions.filter((transaction) => {
      if (monthFilter !== 'all' && monthKey(transaction.date) !== monthFilter) return false
      return true
    })
    const moneyIn = scope.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const moneyOut = scope.filter((t) => isMoneyOut(t)).reduce((sum, t) => sum + t.amount, 0)
    return { moneyIn, moneyOut, net: moneyIn - moneyOut }
  }, [transactions, monthFilter])

  const groups = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date) || new Date(b.createdAt ?? `${b.date}T00:00:00`).getTime() - new Date(a.createdAt ?? `${a.date}T00:00:00`).getTime())
    const byDate = new Map<string, Transaction[]>()
    for (const transaction of sorted) {
      const list = byDate.get(transaction.date) ?? []
      list.push(transaction)
      byDate.set(transaction.date, list)
    }
    return Array.from(byDate.entries()).map(([date, items]) => ({
      date,
      label: groupLabel(date),
      out: items.filter(isMoneyOut).reduce((sum, t) => sum + t.amount, 0),
      items,
    }))
  }, [filteredTransactions])

  const hasActiveFilters = query.trim() || categoryFilter !== 'all' || monthFilter !== 'all' || activeChip !== 'All'
  const clearFilters = () => {
    setQuery('')
    setCategoryFilter('all')
    setMonthFilter('all')
    setActiveChip('All')
  }

  const eyebrow = `${new Date().toLocaleDateString('en-GB', { month: 'long' })} · Ledger`.toUpperCase()

  return (
    <div className="vault-screen">
      <header className="vault-topbar">
        <p className="vault-eyebrow">{eyebrow}</p>
        <div className="vault-topbar-actions">
          <button aria-expanded={searchOpen} aria-label="Search the ledger" className={cn('vault-iconbtn', searchOpen && 'bg-[var(--espresso)] text-[var(--bone-text)]')} type="button" onClick={() => setSearchOpen((open) => !open)}><Search size={15} strokeWidth={1.8} /></button>
          <button aria-expanded={filtersOpen} aria-label="Filter the ledger" className={cn('vault-iconbtn', filtersOpen && 'bg-[var(--espresso)] text-[var(--bone-text)]')} type="button" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={15} strokeWidth={1.8} /></button>
        </div>
      </header>

      <h1 className="vault-title">The <em>ledger.</em></h1>

      {searchOpen && (
        <input
          autoFocus
          className="mt-5 w-full rounded-full border border-[var(--rule)] bg-[var(--vault-surface)] px-5 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--taupe)]"
          placeholder="Search the ledger"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      {filtersOpen && (
        <div className="mt-5 flex gap-2">
          <select aria-label="Transaction category" className="min-w-0 flex-1 rounded-full border border-[var(--rule)] bg-[var(--vault-surface)] px-4 py-2.5 text-sm text-[var(--ink)]" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select aria-label="Transaction month" className="min-w-0 flex-1 rounded-full border border-[var(--rule)] bg-[var(--vault-surface)] px-4 py-2.5 text-sm text-[var(--ink)]" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">All months</option>
            {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </div>
      )}

      <section aria-label="Money in, out and kept" className="vault-strip mt-6">
        <div className="vault-cell">
          <p className="vault-cell-label">In</p>
          <p className="vault-cell-value">{nf(strip.moneyIn)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">Out</p>
          <p className="vault-cell-value">{nf(strip.moneyOut)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">Net</p>
          <p className={cn('vault-cell-value', strip.net > 0 && 'is-clay')}>{strip.net > 0 ? '+' : ''}{nf(strip.net)}</p>
        </div>
      </section>

      <div className="vault-chiprow mt-5">
        {chips.map((chip) => (
          <button key={chip} className={cn('vault-chip', activeChip === chip && 'is-active')} type="button" onClick={() => { setActiveChip(chip); setCategoryFilter('all') }}>
            {chip}
          </button>
        ))}
      </div>

      {groups.length ? groups.map((group) => (
        <section key={group.date} className="mt-7">
          <h2 className="vault-h2 text-[20px]">
            {group.label}
            {group.out > 0 && <span className="vault-h2-sub vault-digits"> — Rs {nf(group.out)} out</span>}
          </h2>
          <div className="mt-1">
            {group.items.map((transaction) => <LedgerRow key={transaction.id} transaction={transaction} onOpen={() => setViewing(transaction)} />)}
          </div>
        </section>
      )) : (
        <div className="mt-10 text-center">
          <p className="font-semibold text-[var(--ink)]">Nothing here yet.</p>
          <p className="mt-2 text-sm text-[var(--taupe)]">{hasActiveFilters ? 'Try a different search, verb, category, or month.' : 'Tap + to record your first entry.'}</p>
          {hasActiveFilters && <button className="vault-chip is-active mx-auto mt-4" onClick={clearFilters}>Clear filters</button>}
        </div>
      )}

      <TransactionDetailsModal
        transaction={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null) }}
        onDelete={() => { setDeleting(viewing); setViewing(null) }}
      />
      <EditTransactionModal
        key={editing?.id ?? 'edit-transaction-closed'}
        transaction={editing}
        accounts={accounts}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onClose={() => setEditing(null)}
        onSave={(transaction) => {
          onUpdateTransaction(transaction)
          setEditing(null)
        }}
      />
      <ConfirmTransactionDelete
        transaction={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) onDeleteTransaction(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}

function LedgerRow({ transaction, onOpen }: { transaction: Transaction; onOpen: () => void }) {
  const isIncome = transaction.type === 'income'
  const isTransfer = transaction.type === 'transfer'
  const time = timeOf(transaction)
  const meta = [transaction.account, time].filter(Boolean).join(' · ')
  return (
    <button className="vault-row" type="button" onClick={onOpen}>
      <span className={cn('vault-row-dot', isIncome && 'is-in', isTransfer && 'is-move')} />
      <span className="vault-row-main">
        <span className="vault-row-title block">{transaction.title}</span>
        <span className="vault-row-meta block">{meta || categoryLabel(transaction)}</span>
      </span>
      <span className={cn('vault-row-amount', isIncome && 'is-in', isTransfer && 'is-move')}>
        {isTransfer ? nf(transaction.amount) : `${isIncome ? '+' : '−'}${nf(transaction.amount)}`}
      </span>
    </button>
  )
}

function TransactionDetailsModal({ transaction, onClose, onEdit, onDelete }: { transaction: Transaction | null; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  if (!transaction) return null

  const rows = [
    ['Type', transaction.type.replace('_', ' ')],
    ['Amount', formatPKR(transaction.amount)],
    ['Category / Source', transaction.category ?? transaction.source ?? transaction.title],
    ['Account', transaction.account],
    ['Date', transaction.date],
    transaction.createdAt ? ['Created', new Date(transaction.createdAt).toLocaleString()] : null,
  ].filter(Boolean) as Array<[string, string]>

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(43,36,29,.45)] p-5" onMouseDown={onClose}>
      <motion.section initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="vault-outline w-full max-w-md p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="vault-eyebrow">Entry</p>
            <h2 className="vault-h2 mt-1 truncate">{transaction.title}</h2>
          </div>
          <button className="vault-iconbtn" onClick={onClose} aria-label="Close entry details"><X size={15} strokeWidth={1.8} /></button>
        </div>
        <div className="mt-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-[var(--rule-soft)] py-2.5 last:border-b-0">
              <span className="vault-cell-label pt-0.5">{label}</span>
              <span className="max-w-[60%] text-right text-sm font-semibold capitalize text-[var(--ink)]">{value}</span>
            </div>
          ))}
        </div>
        {transaction.notes?.trim() && <p className="mt-3 text-sm text-[var(--ink-soft)]">{transaction.notes}</p>}
        <div className="mt-5 flex gap-2">
          <button className="vault-chip is-active flex-1 justify-center" onClick={onEdit}><PencilLine className="mr-1.5" size={13} /> Edit</button>
          <button className="vault-chip flex-1 justify-center text-[var(--clay)]" onClick={onDelete}><Trash2 className="mr-1.5" size={13} /> Delete</button>
        </div>
      </motion.section>
    </div>
  )
}

function EditTransactionModal({ transaction, accounts, expenseCategories, incomeCategories, onClose, onSave }: { transaction: Transaction | null; accounts: Account[]; expenseCategories: string[]; incomeCategories: string[]; onClose: () => void; onSave: (transaction: Transaction) => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense')
  const [title, setTitle] = useState(transaction?.title ?? '')
  const [amount, setAmount] = useState(transaction?.amount.toString() ?? '')
  const [category, setCategory] = useState(transaction?.category ?? transaction?.source ?? '')
  const [accountId, setAccountId] = useState(transaction?.accountId ?? accounts[0]?.id ?? '')
  const [fromAccountId, setFromAccountId] = useState(transaction?.fromAccountId ?? accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId ?? accounts.find((account) => account.id !== fromAccountId)?.id ?? '')
  const [date, setDate] = useState(transaction?.date ?? localDateKey())
  const [notes, setNotes] = useState(transaction?.notes ?? '')

  if (!transaction) return null

  const amountValue = Number(amount)
  const isTransfer = type === 'transfer'
  const invalid = !title.trim() || amountValue <= 0 || !date || (isTransfer ? !fromAccountId || !toAccountId || fromAccountId === toAccountId : !accountId)
  const account = accounts.find((item) => item.id === accountId)
  const from = accounts.find((item) => item.id === fromAccountId)
  const to = accounts.find((item) => item.id === toAccountId)
  const categoryOptions = type === 'income'
    ? Array.from(new Set([...(category ? [category] : []), ...incomeCategories]))
    : type === 'expense'
      ? Array.from(new Set([...(category ? [category] : []), ...expenseCategories]))
      : [category || title]

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-[rgba(43,36,29,.45)] p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <motion.section
        initial={{ opacity: 0, y: 76, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 30, mass: 1 }}
        className="modal-sheet-scroll vault-outline mx-auto max-h-[86svh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:max-h-[90vh] sm:rounded-[26px] sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[var(--rule)]" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="vault-eyebrow">Reverse and replay</p>
            <h2 className="vault-h2 mt-1">Edit entry</h2>
          </div>
          <button className="vault-iconbtn" onClick={onClose} aria-label="Close edit transaction"><X size={15} strokeWidth={1.8} /></button>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          if (invalid) return
          onSave({
            ...transaction,
            type,
            title: title.trim(),
            amount: amountValue,
            category: category || title.trim(),
            source: type === 'income' ? category : undefined,
            account: isTransfer ? `${from?.name ?? 'Account'} to ${to?.name ?? 'Account'}` : account?.name ?? transaction.account,
            accountId: isTransfer ? undefined : accountId,
            fromAccountId: isTransfer ? fromAccountId : undefined,
            toAccountId: isTransfer ? toAccountId : undefined,
            date,
            notes: notes.trim() || undefined,
          })
        }}>
          <label><span className="form-label">Type</span><select className="form-input" value={type} onChange={(event) => setType(event.target.value as TransactionType)}>{editableTypes.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></label>
          <label><span className="form-label">Title</span><input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label><span className="form-label">Amount</span><input className="form-input" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          {!isTransfer && <label><span className="form-label">{type === 'income' ? 'Source' : 'Category'}</span><select className="form-input" value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>}
          {isTransfer ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="form-label">From account</span><select className="form-input" value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span className="form-label">To account</span><select className="form-input" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            </div>
          ) : (
            <label><span className="form-label">Account</span><select className="form-input" value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          )}
          <label><span className="form-label">Date</span><input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label><span className="form-label">Notes</span><textarea className="form-input min-h-20 resize-none" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          {fromAccountId === toAccountId && isTransfer && <p className="text-sm text-[var(--clay)]">From and To account cannot be the same.</p>}
          <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>Save entry</button>
        </form>
      </motion.section>
    </div>
  )
}

function ConfirmTransactionDelete({ transaction, onClose, onConfirm }: { transaction: Transaction | null; onClose: () => void; onConfirm: () => void }) {
  if (!transaction) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(43,36,29,.45)] p-5" onMouseDown={onClose}>
      <motion.section initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="vault-outline w-full max-w-sm p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="vault-eyebrow">Delete entry</p>
            <h2 className="vault-h2 mt-1">Delete {transaction.title}?</h2>
          </div>
          <button className="vault-iconbtn" onClick={onClose} aria-label="Close delete confirmation"><X size={15} strokeWidth={1.8} /></button>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">This will reverse its account, budget, goal, or debt effects.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="vault-chip is-active justify-center" onClick={onClose}>Keep it</button>
          <button className="vault-chip justify-center text-[var(--clay)]" onClick={onConfirm}>Delete</button>
        </div>
      </motion.section>
    </div>
  )
}

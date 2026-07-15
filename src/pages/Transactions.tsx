import { Eye, PencilLine, Search, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CategoryIcon } from '../components/icons/CategoryIcon'
import { formatPKR } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import type { Account, Transaction, TransactionType } from '../types/finance'
import { localDateKey } from '../lib/date'

const editableTypes: TransactionType[] = ['income', 'expense', 'transfer', 'goal_saving', 'debt_payment']
type TransactionFilterChip = 'All' | 'Income' | 'Expense' | 'Transfer' | 'Goal' | 'Debt'

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

function matchesChip(transaction: Transaction, chip: TransactionFilterChip) {
  if (chip === 'All') return true
  if (chip === 'Income') return transaction.type === 'income'
  if (chip === 'Expense') return transaction.type === 'expense'
  if (chip === 'Transfer') return transaction.type === 'transfer'
  if (chip === 'Goal') return transaction.type === 'goal' || transaction.type === 'goal_saving'
  return transaction.type === 'debt' || transaction.type === 'debt_payment'
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
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [activeChip, setActiveChip] = useState<TransactionFilterChip>('All')
  const chips: TransactionFilterChip[] = ['All', 'Income', 'Expense', 'Transfer', 'Goal', 'Debt']
  const categoryOptions = useMemo(() => {
    const matchingTransactionLabels = transactions
      .filter((transaction) => matchesChip(transaction, activeChip))
      .map((transaction) => categoryLabel(transaction))
      .filter(Boolean)

    const baseCategories =
      activeChip === 'Income'
        ? incomeCategories
        : activeChip === 'Expense'
          ? expenseCategories
          : activeChip === 'All'
            ? [...expenseCategories, ...incomeCategories]
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
  const filteredTotal = useMemo(
    () => filteredTransactions.reduce((total, transaction) => total + transaction.amount, 0),
    [filteredTransactions],
  )
  const hasActiveFilters = query.trim() || categoryFilter !== 'all' || monthFilter !== 'all' || activeChip !== 'All'
  const clearFilters = () => {
    setQuery('')
    setCategoryFilter('all')
    setMonthFilter('all')
    setActiveChip('All')
  }

  return (
    <div className="space-y-4 pt-[max(0.5rem,env(safe-area-inset-top))] sm:space-y-5 sm:pt-0">
      {/* ---- Header (matches Accounts / Analytics / Goals) ---- */}
      <section>
        <p className="text-sm text-[var(--muted)]">Activity</p>
        <h2 className="mt-0.5 text-[32px] font-semibold leading-tight text-white">Transactions</h2>
      </section>

      <div className="transaction-filter-card">
        <div className="transaction-filter-grid">
          <label className="transaction-search-field">
            <Search className="transaction-search-icon" size={20} />
            <input className="transaction-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" />
          </label>
          <label className="transaction-select-wrap" aria-label="Transaction category">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="transaction-select-wrap" aria-label="Transaction month">
            <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
              <option value="all">All months</option>
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>
        </div>
        <div className="transaction-chip-row">
          {chips.map((chip) => (
            <button
              key={chip}
              className={cn('transaction-chip', activeChip === chip && 'transaction-chip-active')}
              onClick={() => {
                setActiveChip(chip)
                setCategoryFilter('all')
              }}
            >
              {chip}
            </button>
          ))}
        </div>
        <p className="transaction-filter-summary">
          Total shown: <strong>{formatPKR(filteredTotal)}</strong> across {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
        </p>
      </div>
      <section className="grid gap-3">
        {filteredTransactions.length ? filteredTransactions.map((transaction) => (
          <article key={transaction.id} className="card transaction-row">
            <span className="action-orb shrink-0">
              <CategoryIcon label={categoryLabel(transaction)} type={transaction.type} size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-white sm:text-lg">{transaction.title}</h3>
                <span className={cn('type-badge', transaction.type)}>{transaction.type}</span>
              </div>
              <p className="mt-1 truncate text-xs text-[var(--muted)] sm:text-sm">{transaction.category ?? transaction.source ?? transaction.title} · {transaction.account} · {transaction.date}</p>
              {transaction.notes && <p className="mt-2 text-sm text-[var(--muted-2)]">{transaction.notes}</p>}
            </div>
            <div className="transaction-row-side">
              <strong className={cn('shrink-0 text-sm sm:text-xl', transaction.type === 'income' && 'amount-positive', transaction.type === 'expense' && 'amount-negative', transaction.type !== 'income' && transaction.type !== 'expense' && 'amount-neutral')}>
                {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatPKR(transaction.amount)}
              </strong>
              <div className="transaction-row-actions">
                <button className="transaction-row-action" aria-label={`View ${transaction.title}`} onClick={() => setViewing(transaction)}><Eye size={16} /></button>
                <button className="transaction-row-action" aria-label={`Edit ${transaction.title}`} onClick={() => setEditing(transaction)}><PencilLine size={16} /></button>
                <button className="transaction-row-action transaction-row-delete" aria-label={`Delete ${transaction.title}`} onClick={() => setDeleting(transaction)}><Trash2 size={16} /></button>
              </div>
            </div>
          </article>
        )) : (
          <div className="card p-5 text-center">
            <p className="font-semibold text-white">No transactions match these filters.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Try a different search, type, category, or month.</p>
            {hasActiveFilters && <button className="btn-primary mx-auto mt-4 justify-center" onClick={clearFilters}>Clear filters</button>}
          </div>
        )}
      </section>
      <TransactionDetailsModal transaction={viewing} onClose={() => setViewing(null)} />
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

function TransactionDetailsModal({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  if (!transaction) return null

  const rows = [
    ['Type', transaction.type.replace('_', ' ')],
    ['Amount', formatPKR(transaction.amount)],
    ['Category / Source', transaction.category ?? transaction.source ?? transaction.title],
    ['Account', transaction.account],
    ['Date', transaction.date],
    transaction.fromAccountId ? ['From account ID', transaction.fromAccountId] : null,
    transaction.toAccountId ? ['To account ID', transaction.toAccountId] : null,
    transaction.goalId ? ['Goal ID', transaction.goalId] : null,
    transaction.debtId ? ['Debt ID', transaction.debtId] : null,
    transaction.createdAt ? ['Created', new Date(transaction.createdAt).toLocaleString()] : null,
  ].filter(Boolean) as Array<[string, string]>

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.section initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[var(--surface)] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Transaction details</p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-white">{transaction.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close transaction details"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 rounded-2xl bg-white/[.035] px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
              <span className="max-w-[60%] text-right text-sm font-semibold capitalize text-white">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--surface-2)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Description</p>
          <p className="mt-2 text-sm text-white">{transaction.notes?.trim() || 'No description added.'}</p>
        </div>
        <button className="btn-primary mt-5 w-full justify-center" onClick={onClose}>Done</button>
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
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <motion.section
        initial={{ opacity: 0, y: 76, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 30, mass: 1 }}
        className="modal-sheet-scroll mx-auto max-h-[86svh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/18" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--muted)]">Reverse and replay ledger effect</p>
            <h2 className="text-xl font-semibold text-white">Edit transaction</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close edit transaction"><X size={19} /></button>
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
          {fromAccountId === toAccountId && isTransfer && <p className="text-sm text-[var(--negative)]">From and To account cannot be the same.</p>}
          <button className="btn-primary justify-center disabled:opacity-60" disabled={invalid}>Save transaction</button>
        </form>
      </motion.section>
    </div>
  )
}

function ConfirmTransactionDelete({ transaction, onClose, onConfirm }: { transaction: Transaction | null; onClose: () => void; onConfirm: () => void }) {
  if (!transaction) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.section initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-sm rounded-[1.6rem] border border-white/10 bg-[var(--surface)] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--muted)]">Delete transaction</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Delete {transaction.title}?</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close delete confirmation"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">This will reverse its account, budget, goal, or debt effects.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Keep it</button>
          <button className="rounded-2xl border border-[rgba(233,141,103,.24)] bg-[rgba(233,141,103,.1)] px-4 py-3 text-sm font-semibold text-[var(--negative)]" onClick={onConfirm}>Delete</button>
        </div>
      </motion.section>
    </div>
  )
}

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, BadgeDollarSign, Eye, Filter, Landmark, PencilLine, Search, Target, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { formatPKR } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import type { Account, Transaction, TransactionType } from '../types/finance'

const editableTypes: TransactionType[] = ['income', 'expense', 'transfer', 'goal_saving', 'debt_payment']

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
  const chips = ['All', 'Income', 'Expense', 'Transfer', 'Goal', 'Debt']
  const iconMap = {
    income: ArrowDownLeft,
    expense: ArrowUpRight,
    transfer: ArrowRightLeft,
    goal: Target,
    debt: Landmark,
    goal_saving: Target,
    debt_payment: Landmark,
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="transaction-filter-card">
        <div className="transaction-filter-grid">
          <label className="transaction-search-field">
            <Search className="transaction-search-icon" size={20} />
            <input className="transaction-search-input" placeholder="Search transactions" />
          </label>
          <label className="transaction-select-wrap" aria-label="Transaction type">
            <select><option>All types</option><option>Income</option><option>Expense</option><option>Transfer</option></select>
          </label>
          <label className="transaction-select-wrap" aria-label="Transaction category">
            <select><option>All categories</option><option>Food and Groceries</option><option>Clothes</option><option>Parents Support</option><option>Freelancing Payment</option></select>
          </label>
          <label className="transaction-select-wrap" aria-label="Transaction month">
            <select><option>June 2026</option><option>May 2026</option></select>
          </label>
          <button className="transaction-filter-button" aria-label="Filter transactions"><Filter size={19} /></button>
        </div>
        <div className="transaction-chip-row">
          {chips.map((chip, index) => <button key={chip} className={cn('transaction-chip', index === 0 && 'transaction-chip-active')}>{chip}</button>)}
        </div>
      </div>
      <section className="grid gap-3">
        {transactions.map((transaction) => (
          <article key={transaction.id} className="card transaction-row">
            <span className="action-orb shrink-0">
              {(() => {
                const Icon = iconMap[transaction.type] ?? BadgeDollarSign
                return <Icon size={19} />
              })()}
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
        ))}
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
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10))
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

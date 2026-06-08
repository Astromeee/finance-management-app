import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, BadgeDollarSign, Filter, Landmark, Search, Target } from 'lucide-react'
import { formatPKR } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import type { Transaction } from '../types/finance'

export function Transactions({ transactions }: { transactions: Transaction[] }) {
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
            <select><option>All categories</option><option>Food & Groceries</option><option>Clothes</option><option>Parents Support</option><option>Freelancing Payment</option></select>
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
          <article key={transaction.id} className="card transaction-row flex items-center gap-3 sm:gap-4">
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
            <strong className={cn('shrink-0 text-sm sm:text-xl', transaction.type === 'income' && 'amount-positive', transaction.type === 'expense' && 'amount-negative', transaction.type !== 'income' && transaction.type !== 'expense' && 'amount-neutral')}>
              {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatPKR(transaction.amount)}
            </strong>
          </article>
        ))}
      </section>
    </div>
  )
}

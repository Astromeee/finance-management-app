import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, BadgeDollarSign, Landmark, Search, Target } from 'lucide-react'
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
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="card">
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" size={18} />
            <input className="form-input pl-11" placeholder="Search transactions" />
          </label>
          <select className="form-input"><option>All types</option><option>Income</option><option>Expense</option><option>Transfer</option></select>
          <select className="form-input"><option>All categories</option><option>Food & Groceries</option><option>Clothes</option><option>Parents Support</option><option>Freelancing Payment</option></select>
          <select className="form-input"><option>June 2026</option><option>May 2026</option></select>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {chips.map((chip, index) => <button key={chip} className={cn('chip', index === 0 && 'chip-active')}>{chip}</button>)}
        </div>
      </div>
      <section className="grid gap-3">
        {transactions.map((transaction) => (
          <article key={transaction.id} className="card transaction-row flex items-center gap-3 sm:gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--accent)]">
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
              <p className="mt-1 truncate text-xs text-[var(--muted)] sm:text-sm">{transaction.category} · {transaction.account} · {transaction.date}</p>
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

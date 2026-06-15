import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, type InputHTMLAttributes } from 'react'
import { accounts, debts, expenseCategories, goals, incomeSources } from '../../data/mockData'
import type { TransactionType } from '../../types/finance'
import { cn } from '../../utils/ui'

interface AddTransactionModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (type: TransactionType) => void
}

const tabs: { id: TransactionType; label: string }[] = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'goal', label: 'Goal' },
  { id: 'debt', label: 'Debt' },
]

export function AddTransactionModal({ open, onClose, onSubmit }: AddTransactionModalProps) {
  const [active, setActive] = useState<TransactionType>('expense')
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)] sm:text-sm">Local mock entry</p>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Add transaction</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={19} /></button>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1 rounded-2xl bg-[var(--surface-2)] p-1 sm:mt-5 sm:gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} className={cn('rounded-xl px-1.5 py-2 text-xs text-[var(--muted)] transition sm:px-3 sm:text-sm', active === tab.id && 'bg-[var(--accent)] text-[#171910]')} onClick={() => setActive(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <form className="mt-4 grid gap-3.5 sm:mt-5 sm:grid-cols-2 sm:gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(active); onClose() }}>
          <Field label={active === 'debt' ? 'Amount paid' : 'Amount'} type="number" placeholder="Rs. 5,000" />
          {active === 'income' && <Select label="Source" options={incomeSources.map((source) => source.name)} />}
          {active === 'expense' && <Select label="Category" options={expenseCategories.map((category) => category.name)} />}
          {active === 'transfer' && <Select label="From account" options={accounts.map((account) => account.name)} />}
          {active === 'transfer' && <Select label="To account" options={accounts.map((account) => account.name)} />}
          {active === 'goal' && <Select label="Goal" options={goals.map((goal) => goal.name)} />}
          {active === 'debt' && <Select label="Debt" options={debts.map((debt) => debt.title || debt.name || 'Debt')} />}
          {active === 'goal' && <Select label="From account" options={accounts.map((account) => account.name)} />}
          {(active === 'income' || active === 'expense' || active === 'debt') && <Select label={active === 'income' ? 'Received in account' : 'Paid from account'} options={accounts.map((account) => account.name)} />}
          {active === 'expense' && <Select label="Payment method" options={['Cash', 'Debit card', 'Wallet', 'Bank transfer']} />}
          <Field label="Date" type="date" />
          <label className="sm:col-span-2">
            <span className="form-label">Notes</span>
            <textarea className="form-input min-h-20 resize-none sm:min-h-24" placeholder="Optional details" />
          </label>
          <button className="btn-primary justify-center sm:col-span-2" type="submit">Save mock transaction</button>
        </form>
      </motion.section>
    </div>
  )
}

function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label><span className="form-label">{label}</span><input className="form-input" {...props} /></label>
}

function Select({ label, options }: { label: string; options: string[] }) {
  return <label><span className="form-label">{label}</span><select className="form-input">{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

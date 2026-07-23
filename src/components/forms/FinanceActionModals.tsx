import { useState, type ReactNode } from 'react'
import { BottomSheet as Sheet } from '../BottomSheet'
import type { Account, Debt } from '../../types/finance'
import { formatPKR } from '../../utils/financeCalculations'
import { localDateKey } from '../../lib/date'
import { parseWholePkr } from '../../lib/money'

type SubmitButtonProps = { children: ReactNode; disabled?: boolean }

function today() {
  return localDateKey()
}

function numeric(value: string) {
  return parseWholePkr(value) ?? 0
}

function rememberedAccount(accounts: Account[]) {
  const saved = localStorage.getItem('pl-last-account')
  return accounts.some((account) => account.id === saved) ? saved! : accounts[0]?.id ?? ''
}

function SubmitButton({ children, disabled }: SubmitButtonProps) {
  return <button className="btn-primary justify-center disabled:opacity-60" type="submit" disabled={disabled}>{children}</button>
}

function ActionFooter({ submit, disabled, onCancel }: { submit: ReactNode; disabled?: boolean; onCancel: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button className="hidden rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink)] sm:block" type="button" onClick={onCancel}>Cancel</button>
      <SubmitButton disabled={disabled}>{submit}</SubmitButton>
    </div>
  )
}

export function AddGoalModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: { name: string; target: number; dueDate?: string; notes?: string }) => void
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const targetAmount = numeric(target)
  const invalid = !name.trim() || targetAmount <= 0

  return (
    <Sheet title="Add goal" eyebrow="Savings target" open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!invalid) { onSubmit({ name: name.trim(), target: targetAmount, dueDate: dueDate || undefined, notes }); onClose() } }}>
        <Field label="Goal name" value={name} onChange={setName} placeholder="New laptop" />
        <Field label="Target amount" type="number" value={target} onChange={setTarget} placeholder="Rs. 250,000" />
        <Field label="Deadline optional" type="date" value={dueDate} onChange={setDueDate} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <ActionFooter submit="Create goal" disabled={invalid} onCancel={onClose} />
      </form>
    </Sheet>
  )
}

export function DebtPaymentModal({
  open,
  debts,
  accounts,
  initialDebtId,
  onClose,
  onSubmit,
}: {
  open: boolean
  debts: Debt[]
  accounts: Account[]
  initialDebtId?: string
  onClose: () => void
  onSubmit: (payload: { debtId: string; amount: number; accountId: string; date: string; notes?: string }) => void
}) {
  const [debtId, setDebtId] = useState(initialDebtId ?? debts[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(() => rememberedAccount(accounts))
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const parsedAmount = numeric(amount)
  const invalid = !debtId || parsedAmount <= 0 || !accountId || !date

  return (
    <Sheet title="Add payment" eyebrow="Debt or money owed" open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!invalid) { onSubmit({ debtId, amount: parsedAmount, accountId, date, notes }); onClose() } }}>
        <Select label="Debt / money owed item" value={debtId} onChange={setDebtId} options={debts.map((item) => ({ value: item.id, label: item.title || item.name || 'Debt' }))} />
        <Field label="Amount paid" type="number" value={amount} onChange={setAmount} />
        <Select label="Paid from account" value={accountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: `${item.name} · ${formatPKR(item.balance)}` }))} />
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <ActionFooter submit="Record payment" disabled={invalid} onCancel={onClose} />
      </form>
    </Sheet>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label><span className="form-label">{label}</span><input className="form-input" type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="form-label">{label}</span><textarea className="form-input min-h-20 resize-none" value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] | Array<{ value: string; label: string }> }) {
  return (
    <label>
      <span className="form-label">{label}</span>
      <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}


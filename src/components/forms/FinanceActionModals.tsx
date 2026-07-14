import { useState, type ReactNode } from 'react'
import { BottomSheet as Sheet } from '../BottomSheet'
import type { Account, Debt } from '../../types/finance'
import { formatPKR } from '../../utils/financeCalculations'

type SubmitButtonProps = { children: ReactNode; disabled?: boolean }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function numeric(value: string) {
  return Number(value)
}

function SubmitButton({ children, disabled }: SubmitButtonProps) {
  return <button className="btn-primary justify-center disabled:opacity-60" type="submit" disabled={disabled}>{children}</button>
}

function ActionFooter({ submit, disabled, onCancel }: { submit: ReactNode; disabled?: boolean; onCancel: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button className="hidden rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white sm:block" type="button" onClick={onCancel}>Cancel</button>
      <SubmitButton disabled={disabled}>{submit}</SubmitButton>
    </div>
  )
}

function ErrorText({ children }: { children?: ReactNode }) {
  return children ? <p className="rounded-2xl border border-[rgba(233,141,103,.18)] bg-[rgba(233,141,103,.08)] px-3 py-2 text-xs text-[var(--negative)]">{children}</p> : null
}

export function AddIncomeModal({
  open,
  accounts,
  incomeCategories,
  siblingNames,
  onClose,
  onSubmit,
}: {
  open: boolean
  accounts: Account[]
  incomeCategories: string[]
  siblingNames: string[]
  onClose: () => void
  onSubmit: (payload: { amount: number; source: string; accountId: string; date: string; notes?: string }) => void
}) {
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState(incomeCategories[0] ?? 'Other Income')
  const [sibling, setSibling] = useState(siblingNames[0] ?? '')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const ublAccount = accounts.find((account) => account.name.toLowerCase().includes('ubl'))
  const selectedAccountId = accountId || ublAccount?.id || accounts[0]?.id || ''
  const needsSibling = source === 'Siblings Support' && siblingNames.length > 0
  const invalid = numeric(amount) <= 0 || !source || !selectedAccountId || !date

  return (
    <Sheet title="Add income" eyebrow="Money received" open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (!invalid) {
          onSubmit({ amount: numeric(amount), source: needsSibling && sibling ? `${source} - ${sibling}` : source, accountId: selectedAccountId, date, notes })
          onClose()
        }
      }}>
        <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="Rs. 5,000" />
        <Select label="Source" value={source} onChange={setSource} options={incomeCategories} />
        {needsSibling && <Select label="Sibling" value={sibling} onChange={setSibling} options={siblingNames} />}
        <Select label="Account received in" value={selectedAccountId} onChange={setAccountId} options={accounts.map((account) => ({ value: account.id, label: account.name }))} />
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <ActionFooter submit="Add income" disabled={invalid} onCancel={onClose} />
      </form>
    </Sheet>
  )
}

export function AddExpenseModal({
  open,
  accounts,
  categories,
  onClose,
  onSubmit,
}: {
  open: boolean
  accounts: Account[]
  categories: string[]
  onClose: () => void
  onSubmit: (payload: { amount: number; category: string; accountId: string; date: string; notes?: string }) => void
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food and Groceries')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const ublAccount = accounts.find((account) => account.name.toLowerCase().includes('ubl'))
  const selectedAccountId = accountId || ublAccount?.id || accounts[0]?.id || ''
  const account = accounts.find((item) => item.id === selectedAccountId)
  const parsedAmount = numeric(amount)
  const invalid = parsedAmount <= 0 || !category || !selectedAccountId || !date
  const warning = account && parsedAmount > account.balance ? 'This will make the account balance negative.' : ''

  return (
    <Sheet title="Add expense" eyebrow="Record spending" open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!invalid) { onSubmit({ amount: parsedAmount, category, accountId: selectedAccountId, date, notes }); onClose() } }}>
        <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="Rs. 2,500" />
        <Select label="Category" value={category} onChange={setCategory} options={categories} />
        <Select label="Account paid from" value={selectedAccountId} onChange={setAccountId} options={accounts.map((item) => ({ value: item.id, label: `${item.name} · ${formatPKR(item.balance)}` }))} />
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <ErrorText>{warning}</ErrorText>
        <ActionFooter submit="Record expense" disabled={invalid} onCancel={onClose} />
      </form>
    </Sheet>
  )
}

export function TransferModal({
  open,
  accounts,
  onClose,
  onSubmit,
}: {
  open: boolean
  accounts: Account[]
  onClose: () => void
  onSubmit: (payload: { amount: number; fromAccountId: string; toAccountId: string; date: string; notes?: string }) => void
}) {
  const fromAccounts = accounts.filter((account) => account.id !== 'savings')
  const [amount, setAmount] = useState('')
  const [fromAccountId, setFromAccountId] = useState(fromAccounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts.find((account) => account.id === 'savings')?.id ?? accounts.find((account) => account.id !== fromAccounts[0]?.id)?.id ?? '')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const selectedFromAccountId = fromAccountId || fromAccounts[0]?.id || ''
  const selectedToAccountId = toAccountId || accounts.find((item) => item.id !== selectedFromAccountId)?.id || ''
  const fromAccount = fromAccounts.find((item) => item.id === selectedFromAccountId)
  const parsedAmount = numeric(amount)
  const insufficient = fromAccount ? parsedAmount > fromAccount.balance : false
  const sameAccount = selectedFromAccountId === selectedToAccountId
  const invalid = parsedAmount <= 0 || !selectedFromAccountId || !selectedToAccountId || !date || insufficient || sameAccount

  return (
    <Sheet title="Transfer money" eyebrow="Move between accounts" open={open} onClose={onClose}>
      <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!invalid) { onSubmit({ amount: parsedAmount, fromAccountId: selectedFromAccountId, toAccountId: selectedToAccountId, date, notes }); onClose() } }}>
        {fromAccounts.length < 1 && <ErrorText>Add at least one cash, bank, or wallet account before transferring to savings.</ErrorText>}
        <Field label="Amount" type="number" value={amount} onChange={setAmount} placeholder="Rs. 10,000" />
        <Select label="From account" value={selectedFromAccountId} onChange={setFromAccountId} options={fromAccounts.map((item) => ({ value: item.id, label: `${item.name} · ${formatPKR(item.balance)}` }))} />
        <Select label="To account" value={selectedToAccountId} onChange={setToAccountId} options={accounts.map((item) => ({ value: item.id, label: item.id === 'savings' ? `${item.name} · ${formatPKR(item.balance)}` : item.name }))} />
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
        <ErrorText>{sameAccount ? 'From and To account cannot be the same.' : insufficient ? 'Insufficient balance in selected account.' : ''}</ErrorText>
        <ActionFooter submit="Transfer" disabled={invalid} onCancel={onClose} />
      </form>
    </Sheet>
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
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
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

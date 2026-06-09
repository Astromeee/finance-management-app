import { ArrowRightLeft, PencilLine, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { AccountPreviewCard } from '../components/cards/AccountPreviewCard'
import type { Account, Transaction } from '../types/finance'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import { cn } from '../utils/ui'

const cardColorOptions = [
  { name: 'Red', value: '#c2413d' },
  { name: 'Black', value: '#111317' },
  { name: 'Silver', value: '#b9bec7' },
  { name: 'Navy Blue', value: '#162a4a' },
  { name: 'Green', value: '#1f4938' },
  { name: 'Orange', value: '#c57b45' },
  { name: 'Yellow', value: '#c9b431' },
]

function normalizeHex(value: string) {
  const cleaned = value.trim().replace(/^#/, '').slice(0, 6)
  return `#${cleaned}`
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function adjustHexLightness(hex: string, amount: number) {
  if (!isValidHex(hex)) return hex
  const clean = hex.slice(1)
  const channels = [0, 2, 4].map((start) => Number.parseInt(clean.slice(start, start + 2), 16))
  const adjusted = channels.map((channel) => {
    const target = amount >= 0 ? 255 : 0
    return clampColorChannel(channel + (target - channel) * Math.abs(amount / 100))
  })
  return `#${adjusted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

interface AccountsProps {
  accounts: Account[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  onTransfer: () => void
}

const makeAccountId = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account'}-${Date.now().toString(36)}`

export function Accounts({ accounts, setAccounts, setTransactions, onTransfer }: AccountsProps) {
  const [addingAccount, setAddingAccount] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [notice, setNotice] = useState('')

  const breakdown = useMemo(() => ({
    cash: accounts.filter((account) => account.type === 'cash').reduce((sum, account) => sum + account.balance, 0),
    banks: accounts.filter((account) => account.type === 'bank').reduce((sum, account) => sum + account.balance, 0),
    wallets: accounts.filter((account) => account.type === 'wallet').reduce((sum, account) => sum + account.balance, 0),
  }), [accounts])

  return (
    <div className="space-y-4 sm:space-y-5">
      {notice && <div className="rounded-2xl border border-[rgba(221,255,69,.2)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{notice}</div>}

      <section className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <article className="balance-card">
          <p className="text-sm font-semibold uppercase text-[var(--muted)]">Total Balance</p>
          <h3 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{formatPKR(totalBalance(accounts))}</h3>
          <div className="mt-5 grid gap-2 text-sm text-[var(--muted)]">
            <div className="premium-row flex justify-between px-3 py-2.5"><span>Cash</span><strong className="text-white">{formatPKR(breakdown.cash)}</strong></div>
            <div className="premium-row flex justify-between px-3 py-2.5"><span>Banks</span><strong className="text-white">{formatPKR(breakdown.banks)}</strong></div>
            <div className="premium-row flex justify-between px-3 py-2.5"><span>Wallets</span><strong className="text-white">{formatPKR(breakdown.wallets)}</strong></div>
          </div>
        </article>

        <article className="card">
          <div className="section-title"><div><p>Account actions</p><h3>Wallet tools</h3></div></div>
          <div className="grid grid-cols-3 gap-3">
            <button className="quick-action" onClick={() => setAddingAccount(true)}><Plus className="mx-auto" size={18} /><span className="mt-2 block text-xs font-semibold">Add account</span></button>
            <button className="quick-action disabled:cursor-not-allowed disabled:opacity-45" onClick={onTransfer} disabled={accounts.length < 2} title={accounts.length < 2 ? 'Add at least two accounts to transfer money.' : undefined}><ArrowRightLeft className="mx-auto" size={18} /><span className="mt-2 block text-xs font-semibold">Transfer</span></button>
            <button className="quick-action quick-action-primary disabled:cursor-not-allowed disabled:opacity-45" onClick={() => accounts[0] && setSelectedAccount(accounts[0])} disabled={!accounts.length}><PencilLine className="mx-auto" size={18} /><span className="mt-2 block text-xs font-semibold">Adjust</span></button>
          </div>
          {accounts.length < 2 && <p className="mt-3 text-xs text-[var(--muted)]">Transfers need at least two accounts.</p>}
        </article>
      </section>

      <section>
        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Wallet cards</p>
              <h3 className="text-2xl font-semibold text-white">Your accounts</h3>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map((account) => <AccountPreviewCard key={account.id} account={account} onEdit={setEditingAccount} />)}
            {!accounts.length && (
              <button className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/[.03] px-5 py-10 text-left transition hover:border-[rgba(221,255,69,.35)] hover:bg-[rgba(221,255,69,.06)]" onClick={() => setAddingAccount(true)}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-[#171910]"><Plus size={22} /></span>
                <span className="mt-5 block text-xl font-semibold text-white">Add your first account</span>
                <span className="mt-2 block text-sm text-[var(--muted)]">Create cash, bank, or wallet accounts to start tracking.</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <AddAccountModal
        open={addingAccount}
        onClose={() => setAddingAccount(false)}
        onNotice={setNotice}
        setAccounts={setAccounts}
      />
      <AdjustBalanceModal
        key={selectedAccount?.id ?? 'closed'}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onNotice={setNotice}
        setAccounts={setAccounts}
        setTransactions={setTransactions}
      />
      <EditAccountModal
        key={editingAccount?.id ?? 'edit-closed'}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onNotice={setNotice}
        setAccounts={setAccounts}
      />
    </div>
  )
}

function AddAccountModal({
  open,
  onClose,
  onNotice,
  setAccounts,
}: {
  open: boolean
  onClose: () => void
  onNotice: (message: string) => void
  setAccounts: Dispatch<SetStateAction<Account[]>>
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<Account['type']>('bank')
  const [balance, setBalance] = useState('')
  const [cardLabel, setCardLabel] = useState('')
  const [color, setColor] = useState('#1d2026')
  const [baseColor, setBaseColor] = useState('#1d2026')
  const [lightness, setLightness] = useState(0)
  const [hexInput, setHexInput] = useState('#1d2026')

  if (!open) return null

  const setColorFromBase = (nextBase: string, nextLightness = lightness) => {
    setBaseColor(nextBase)
    setLightness(nextLightness)
    const nextColor = adjustHexLightness(nextBase, nextLightness)
    setColor(nextColor)
    setHexInput(nextColor)
  }

  const setColorFromHex = (value: string) => {
    const normalized = normalizeHex(value)
    setHexInput(normalized)
    if (!isValidHex(normalized)) return
    setBaseColor(normalized)
    setLightness(0)
    setColor(normalized)
  }

  const saveAccount = () => {
    const parsedBalance = Number(balance || 0)
    if (!name.trim() || !Number.isFinite(parsedBalance) || !isValidHex(color)) return
    const label = cardLabel.trim().toUpperCase() || name.trim().slice(0, 5).toUpperCase()
    const account: Account = {
      id: makeAccountId(name),
      name: name.trim(),
      type,
      balance: parsedBalance,
      color,
      activity: '',
      cardLabel: label,
    }

    setAccounts((current) => [account, ...current])
    onNotice(`${account.name} added.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">New account card</p>
            <h2 className="text-xl font-semibold text-white">Add account</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close add account"><X size={19} /></button>
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="form-label">Account name</span>
            <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="HBL Account" />
          </label>
          <label>
            <span className="form-label">Account type</span>
            <select className="form-input" value={type} onChange={(event) => setType(event.target.value as Account['type'])}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
            </select>
          </label>
          <label>
            <span className="form-label">Opening balance</span>
            <input className="form-input text-2xl font-semibold" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="Rs. 0" />
          </label>
          <label>
            <span className="form-label">Masked card label</span>
            <input className="form-input uppercase" maxLength={8} placeholder="HBL" value={cardLabel} onChange={(event) => setCardLabel(event.target.value)} />
          </label>
          <CardColorPicker
            baseColor={baseColor}
            color={color}
            hexInput={hexInput}
            lightness={lightness}
            setColorFromBase={setColorFromBase}
            setColorFromHex={setColorFromHex}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center disabled:opacity-60" onClick={saveAccount} disabled={!name.trim() || !Number.isFinite(Number(balance || 0)) || !isValidHex(color)}>Save</button>
        </div>
      </motion.section>
    </div>
  )
}

function EditAccountModal({
  account,
  onClose,
  onNotice,
  setAccounts,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  setAccounts: Dispatch<SetStateAction<Account[]>>
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<Account['type']>(account?.type ?? 'bank')
  const [balance, setBalance] = useState(account?.balance.toString() ?? '')
  const [cardLabel, setCardLabel] = useState(account?.cardLabel ?? '')
  const [color, setColor] = useState(account?.color ?? '#1d2026')
  const [baseColor, setBaseColor] = useState(account?.color ?? '#1d2026')
  const [lightness, setLightness] = useState(0)
  const [hexInput, setHexInput] = useState(account?.color ?? '#1d2026')

  if (!account) return null

  const setColorFromBase = (nextBase: string, nextLightness = lightness) => {
    setBaseColor(nextBase)
    setLightness(nextLightness)
    const nextColor = adjustHexLightness(nextBase, nextLightness)
    setColor(nextColor)
    setHexInput(nextColor)
  }

  const setColorFromHex = (value: string) => {
    const normalized = normalizeHex(value)
    setHexInput(normalized)
    if (!isValidHex(normalized)) return
    setBaseColor(normalized)
    setLightness(0)
    setColor(normalized)
  }

  const saveAccount = () => {
    const parsedBalance = Number(balance)
    if (!name.trim() || !Number.isFinite(parsedBalance) || !isValidHex(color)) return

    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id
          ? { ...item, name: name.trim(), type, balance: parsedBalance, color, cardLabel: cardLabel.trim().toUpperCase() || item.cardLabel }
          : item,
      ),
    )
    onNotice(`${name.trim()} updated. Home card stack is synced.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">Edit account card</p>
            <h2 className="text-xl font-semibold text-white">{account.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close edit account"><X size={19} /></button>
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="form-label">Account name</span>
            <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Account type</span>
            <select className="form-input" value={type} onChange={(event) => setType(event.target.value as Account['type'])}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
            </select>
          </label>
          <label>
            <span className="form-label">Balance</span>
            <input className="form-input text-2xl font-semibold" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Masked card label</span>
            <input className="form-input uppercase" maxLength={8} placeholder="HBL" value={cardLabel} onChange={(event) => setCardLabel(event.target.value)} />
          </label>
          <CardColorPicker
            baseColor={baseColor}
            color={color}
            hexInput={hexInput}
            lightness={lightness}
            setColorFromBase={setColorFromBase}
            setColorFromHex={setColorFromHex}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center disabled:opacity-60" onClick={saveAccount} disabled={!name.trim() || !Number.isFinite(Number(balance)) || !isValidHex(color)}>Save</button>
        </div>
      </motion.section>
    </div>
  )
}

function CardColorPicker({
  baseColor,
  color,
  hexInput,
  lightness,
  setColorFromBase,
  setColorFromHex,
}: {
  baseColor: string
  color: string
  hexInput: string
  lightness: number
  setColorFromBase: (nextBase: string, nextLightness?: number) => void
  setColorFromHex: (value: string) => void
}) {
  return (
    <div>
      <span className="form-label">Card color</span>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {cardColorOptions.map((option) => (
          <button
            key={option.name}
            aria-label={`Use ${option.name}`}
            className={cn('h-12 rounded-2xl border transition', baseColor === option.value ? 'border-[var(--accent)] ring-2 ring-[rgba(221,255,69,.22)]' : 'border-white/10')}
            title={option.name}
            style={{ background: option.value }}
            onClick={() => setColorFromBase(option.value, 0)}
            type="button"
          />
        ))}
      </div>
      <label className="mt-4 block">
        <span className="form-label">Lighten / darken</span>
        <input className="w-full accent-[var(--accent)]" type="range" min="-55" max="55" value={lightness} onChange={(event) => setColorFromBase(baseColor, Number(event.target.value))} />
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]"><span>Darker</span><span>{lightness > 0 ? `+${lightness}` : lightness}</span><span>Lighter</span></div>
      </label>
      <label className="mt-4 block">
        <span className="form-label">Hex code</span>
        <div className="grid grid-cols-[1fr_3.25rem] gap-3">
          <input className="form-input uppercase" value={hexInput} onChange={(event) => setColorFromHex(event.target.value)} placeholder="#1D2026" />
          <input className="form-input h-12 p-2" type="color" value={isValidHex(color) ? color : '#1d2026'} onChange={(event) => setColorFromHex(event.target.value)} aria-label="Custom card color" />
        </div>
        {!isValidHex(hexInput) && <p className="mt-2 text-xs text-[var(--negative)]">Use a 6-digit hex color, like #162A4A.</p>}
      </label>
      <div className="mt-4 h-12 rounded-2xl border border-white/10" style={{ background: isValidHex(color) ? color : '#1d2026' }} />
    </div>
  )
}

function AdjustBalanceModal({
  account,
  onClose,
  onNotice,
  setAccounts,
  setTransactions,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}) {
  const [actualBalance, setActualBalance] = useState('')
  const [date, setDate] = useState('2026-06-05')
  const [note, setNote] = useState('Balance adjusted manually')

  if (!account) return null

  const parsedBalance = Number(actualBalance)
  const hasValue = actualBalance !== '' && Number.isFinite(parsedBalance)
  const difference = hasValue ? parsedBalance - account.balance : 0
  const isIncrease = difference > 0
  const isDecrease = difference < 0
  const absoluteDifference = Math.abs(difference)
  const adjustmentLabel = isIncrease ? 'Unexplained Income' : isDecrease ? 'Unexplained Expense' : 'No adjustment needed'

  const confirmAdjustment = () => {
    if (!hasValue || difference === 0) {
      onNotice('No adjustment needed.')
      onClose()
      return
    }

    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id
          ? { ...item, balance: parsedBalance, activity: `${adjustmentLabel}: ${formatPKR(absoluteDifference)}` }
          : item,
      ),
    )

    setTransactions((current) => [
      {
        id: `adj-${account.id}-${current.length + 1}`,
        title: adjustmentLabel,
        amount: absoluteDifference,
        type: isIncrease ? 'income' : 'expense',
        category: adjustmentLabel,
        account: account.name,
        date,
        notes: note || 'Balance adjusted manually',
      },
      ...current,
    ])
    onNotice(`${adjustmentLabel} recorded for ${account.name}.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">Adjust Balance</p>
            <h2 className="text-xl font-semibold text-white">{account.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close adjust balance"><X size={19} /></button>
        </div>

        <div className="mt-5 rounded-3xl bg-[var(--surface-2)] p-4">
          <p className="text-sm text-[var(--muted)]">Recorded balance</p>
          <strong className="mt-1 block text-3xl text-white">{formatPKR(account.balance)}</strong>
        </div>

        <div className="mt-4 grid gap-4">
          <label>
            <span className="form-label">Actual balance</span>
            <input className="form-input text-2xl font-semibold" type="number" placeholder="Rs. 42,000" value={actualBalance} onChange={(event) => setActualBalance(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Date</span>
            <input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Note / reason</span>
            <textarea className="form-input min-h-20 resize-none" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>

        <div className="mt-4 rounded-3xl border border-white/8 bg-[var(--surface-2)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--muted)]">Difference</span>
            <strong className={cn(isIncrease && 'amount-positive', isDecrease && 'amount-negative', !difference && 'amount-neutral')}>
              {hasValue ? `${formatPKR(absoluteDifference)}${isIncrease ? ' increase' : isDecrease ? ' decrease' : ''}` : 'Enter actual balance'}
            </strong>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {hasValue && difference !== 0
              ? `This will be recorded as ${adjustmentLabel} ${isIncrease ? 'into' : 'from'} ${account.name}.`
              : 'No transaction is created when balances are equal.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center" onClick={confirmAdjustment}>Confirm</button>
        </div>
      </motion.section>
    </div>
  )
}

import { ArrowRightLeft, PencilLine, Plus, ShieldCheck, Trash2, WalletCards, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, type Dispatch, type SetStateAction } from 'react'
import type { Account, Transaction } from '../types/finance'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import { localDateKey } from '../lib/date'

/* ============================================================
   Accounts — "Your wallet." (Vault spec 14b)
   Stacked account cards cycling exactly three surface treatments
   (espresso / clay / outlined), a TOTAL + SAFE SPEND USES strip,
   and the cash helper line. All modals, the color picker, and
   account CRUD are preserved.
   ============================================================ */

const cardColorOptions = [
  { name: 'Red', value: '#c2413d' },
  { name: 'Black', value: '#111317' },
  { name: 'Silver', value: '#b9bec7' },
  { name: 'Navy Blue', value: '#162a4a' },
  { name: 'Green', value: '#1f4938' },
  { name: 'Clay', value: '#E2703A' },
  { name: 'Yellow', value: '#c9b431' },
]

function normalizeHex(value: string) {
  const cleaned = value.trim().replace(/^#/, '').slice(0, 6)
  return `#${cleaned}`
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function adjustHexLightness(hex: string, amount: number) {
  if (!isValidHex(hex)) return hex
  const clean = hex.slice(1)
  const channels = [0, 2, 4].map((start) => Number.parseInt(clean.slice(start, start + 2), 16))
  const adjusted = channels.map((channel) => {
    const target = amount >= 0 ? 255 : 0
    return Math.max(0, Math.min(255, Math.round(channel + (target - channel) * Math.abs(amount / 100))))
  })
  return `#${adjusted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

interface AccountsProps {
  accounts: Account[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  onTransfer: () => void
  /** optional — pass transactions={transactions} from App.tsx to light up per-card trends */
  transactions?: Transaction[]
  /** optional — "Details →" on the top-category row opens the Transactions page */
  onOpenTransactions?: () => void
  onSaveAccount?: (account: Account, openingBalance?: number) => Promise<void>
  onAdjustBalance?: (account: Account, transaction: Transaction) => Promise<void>
  onArchiveAccount?: (id: string) => Promise<void>
}

const makeAccountId = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account'}-${Date.now().toString(36)}`

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

/* Exactly three surface treatments, one per account type; clay at most
   once per viewport (spec 14b §3). */
function cardTreatments(accounts: Account[]) {
  let clayUsed = false
  return accounts.map((account) => {
    if (account.type === 'cash') return 'is-outline'
    if (account.type === 'wallet' && !clayUsed) {
      clayUsed = true
      return 'is-clay'
    }
    return 'is-espresso'
  })
}

function typeTag(account: Account) {
  if (account.type === 'cash') return 'On hand'
  if (account.type === 'wallet') return 'Wallet'
  return 'Bank'
}

/* ============================================================ */

export function Accounts({ accounts, setAccounts, setTransactions, onTransfer, onSaveAccount, onAdjustBalance, onArchiveAccount }: AccountsProps) {
  const [addingAccount, setAddingAccount] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [menuAccount, setMenuAccount] = useState<Account | null>(null)
  const [notice, setNotice] = useState('')

  const total = totalBalance(accounts)
  const treatments = cardTreatments(accounts)
  const safeSpendUses = accounts.filter((account) => account.includeInSafeSpend !== false).length
  const hasCash = accounts.some((account) => account.type === 'cash' && account.includeInSafeSpend === false)

  const toggleSafeSpend = async (account: Account) => {
    const updated = { ...account, includeInSafeSpend: account.includeInSafeSpend === false }
    try {
      await onSaveAccount?.(updated)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update account.')
      return
    }
    setAccounts((current) => current.map((item) => item.id === account.id ? updated : item))
    setNotice(updated.includeInSafeSpend ? `${account.name} now counts toward safe spend.` : `${account.name} excluded from safe spend.`)
    setMenuAccount(null)
  }

  return (
    <div className="vault-screen">
      {notice && <div className="vault-outline mb-4 px-4 py-3 text-sm text-[var(--clay)]" role="status">{notice}</div>}

      <header className="vault-topbar">
        <p className="vault-eyebrow">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
        <div className="vault-topbar-actions">
          <button aria-label="Add account" className="vault-iconbtn" type="button" onClick={() => setAddingAccount(true)}>
            <Plus size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <h1 className="vault-title">Your <em>wallet.</em></h1>

      {accounts.length > 0 ? (
        <section aria-label="Your accounts" className="mt-7 grid gap-3">
          {accounts.map((account, index) => {
            const treatment = treatments[index]
            const included = account.includeInSafeSpend !== false
            return (
              <button key={account.id} className={cn('vault-wallet-card', treatment)} type="button" onClick={() => setMenuAccount(account)}>
                <span className="vault-acct-top">
                  <span className="vault-acct-name">{account.name}</span>
                  <span className="vault-acct-tag">{typeTag(account)}</span>
                </span>
                {account.type !== 'cash' && (
                  <span className="vault-acct-number block">···· ···· {account.cardLabel || '····'}</span>
                )}
                <span className="vault-acct-foot">
                  <span className="vault-acct-balance">Rs {nf(account.balance)}</span>
                  <span className="vault-acct-safe">{included ? 'In safe spend' : 'Excluded'}</span>
                </span>
              </button>
            )
          })}
        </section>
      ) : (
        <button className="vault-dashed mt-7" type="button" onClick={() => setAddingAccount(true)}>
          + Add your first account
        </button>
      )}

      <section aria-label="Wallet totals" className="vault-strip mt-7">
        <div className="vault-cell">
          <p className="vault-cell-label">Total</p>
          <p className="vault-cell-value">Rs {nf(total)}</p>
        </div>
        <div className="vault-cell">
          <p className="vault-cell-label">Safe spend uses</p>
          <p className="vault-cell-value">{safeSpendUses} <span className="vault-sub">of {accounts.length}</span></p>
        </div>
      </section>

      {hasCash && (
        <p className="mt-5 text-xs leading-5 text-[var(--taupe)]">
          Cash stays out of your daily number — flip it on anytime from the card&rsquo;s settings.
        </p>
      )}

      {/* ---- Card action sheet ---- */}
      {menuAccount && (
        <div className="fixed inset-0 z-50 grid items-end bg-[rgba(43,36,29,.45)] sm:items-center sm:p-6" onClick={() => setMenuAccount(null)}>
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            className="vault-outline mx-auto w-full max-w-lg rounded-b-none p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-[26px]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="vault-eyebrow px-1">{menuAccount.name}</p>
            <div className="mt-3 grid gap-2">
              <button
                className="flex items-center gap-3 rounded-2xl border border-[var(--rule)] px-4 py-3.5 text-sm font-semibold text-[var(--ink)]"
                onClick={() => { setEditingAccount(menuAccount); setMenuAccount(null) }}
              >
                <PencilLine size={17} className="text-[var(--clay)]" /> Edit card
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-[var(--rule)] px-4 py-3.5 text-sm font-semibold text-[var(--ink)]"
                onClick={() => { setSelectedAccount(menuAccount); setMenuAccount(null) }}
              >
                <WalletCards size={17} className="text-[var(--clay)]" /> Adjust balance
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-[var(--rule)] px-4 py-3.5 text-sm font-semibold text-[var(--ink)]"
                onClick={() => void toggleSafeSpend(menuAccount)}
              >
                <ShieldCheck size={17} className="text-[var(--clay)]" /> {menuAccount.includeInSafeSpend === false ? 'Include in safe spend' : 'Exclude from safe spend'}
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-[var(--rule)] px-4 py-3.5 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={accounts.length < 2}
                title={accounts.length < 2 ? 'Add at least two accounts to transfer money.' : undefined}
                onClick={() => { setMenuAccount(null); onTransfer() }}
              >
                <ArrowRightLeft size={17} className="text-[var(--clay)]" /> Transfer money
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-[var(--rule)] px-4 py-3.5 text-sm font-semibold text-[var(--clay)] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={accounts.length < 2}
                onClick={async () => {
                  if (!menuAccount || accounts.length < 2) return
                  try {
                    await onArchiveAccount?.(menuAccount.id)
                    setAccounts((current) => current.filter((item) => item.id !== menuAccount.id))
                    setNotice(`${menuAccount.name} archived.`)
                    setMenuAccount(null)
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : 'Could not archive account.')
                  }
                }}
              >
                <Trash2 size={17} /> Archive account
              </button>
            </div>
            <button className="vault-chip is-active mt-3 w-full justify-center" onClick={() => setMenuAccount(null)}>
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <AddAccountModal
        open={addingAccount}
        onClose={() => setAddingAccount(false)}
        onNotice={setNotice}
        onSaveAccount={onSaveAccount}
        setAccounts={setAccounts}
      />
      <AdjustBalanceModal
        key={selectedAccount?.id ?? 'closed'}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onNotice={setNotice}
        onAdjustBalance={onAdjustBalance}
        setAccounts={setAccounts}
        setTransactions={setTransactions}
      />
      <EditAccountModal
        key={editingAccount?.id ?? 'edit-closed'}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onNotice={setNotice}
        onAdjustBalance={onAdjustBalance}
        onSaveAccount={onSaveAccount}
        setAccounts={setAccounts}
        setTransactions={setTransactions}
      />
    </div>
  )
}

/* ============================================================
   Modals & color picker — unchanged behavior, V3 accents only
   ============================================================ */

function AddAccountModal({
  open,
  onClose,
  onNotice,
  onSaveAccount,
  setAccounts,
}: {
  open: boolean
  onClose: () => void
  onNotice: (message: string) => void
  onSaveAccount?: (account: Account, openingBalance?: number) => Promise<void>
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

  const saveAccount = async () => {
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
      includeInSafeSpend: true,
    }

    try {
      await onSaveAccount?.(account, parsedBalance)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not add account.')
      return
    }
    setAccounts((current) => [account, ...current])
    onNotice(`${account.name} added.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-[rgba(43,36,29,.45)] p-0 sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-[var(--rule)] bg-[var(--vault-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">New account card</p>
            <h2 className="text-xl font-semibold text-[var(--ink)]">Add account</h2>
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
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink)]" onClick={onClose}>Cancel</button>
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
  onAdjustBalance,
  onSaveAccount,
  setAccounts,
  setTransactions,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  onAdjustBalance?: (account: Account, transaction: Transaction) => Promise<void>
  onSaveAccount?: (account: Account, openingBalance?: number) => Promise<void>
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
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

  const saveAccount = async () => {
    const parsedBalance = Number(balance)
    if (!name.trim() || !Number.isFinite(parsedBalance) || !isValidHex(color)) return
    const balanceDifference = parsedBalance - account.balance
    const absoluteDifference = Math.abs(balanceDifference)
    const adjustmentLabel = balanceDifference > 0 ? 'Unexplained Income' : 'Unexplained Expense'
    const updatedName = name.trim()

    const updatedAccount: Account = {
      ...account,
      name: updatedName,
      type,
      balance: parsedBalance,
      color,
      cardLabel: cardLabel.trim().toUpperCase() || account.cardLabel,
      activity: balanceDifference === 0 ? account.activity : `${adjustmentLabel}: ${formatPKR(absoluteDifference)}`,
    }
    let adjustment: Transaction | undefined
    if (balanceDifference !== 0) {
      adjustment = {
          id: `edit-adj-${account.id}-${Date.now().toString(36)}`,
          title: adjustmentLabel,
          amount: absoluteDifference,
          type: balanceDifference > 0 ? 'income' : 'expense',
          category: adjustmentLabel,
          source: balanceDifference > 0 ? adjustmentLabel : undefined,
          account: updatedName,
          accountId: account.id,
          date: localDateKey(),
          notes: `Balance edited from ${formatPKR(account.balance)} to ${formatPKR(parsedBalance)}`,
          createdAt: new Date().toISOString(),
        }
    }

    try {
      if (adjustment) await onAdjustBalance?.(updatedAccount, adjustment)
      else await onSaveAccount?.(updatedAccount)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not update account.')
      return
    }
    setAccounts((current) => current.map((item) => item.id === account.id ? updatedAccount : item))
    if (adjustment) setTransactions((current) => [adjustment, ...current])

    onNotice(balanceDifference === 0 ? `${updatedName} updated. Card carousel is synced.` : `${adjustmentLabel} recorded for ${updatedName}.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-[rgba(43,36,29,.45)] p-0 sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-[var(--rule)] bg-[var(--vault-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">Edit account card</p>
            <h2 className="text-xl font-semibold text-[var(--ink)]">{account.name}</h2>
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
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink)]" onClick={onClose}>Cancel</button>
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
            className={cn('h-12 rounded-2xl border transition', baseColor === option.value ? 'border-[var(--accent)] ring-2 ring-[rgba(255, 122, 26,.25)]' : 'border-[var(--rule)]')}
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
      <div className="mt-4 h-12 rounded-2xl border border-[var(--rule)]" style={{ background: isValidHex(color) ? color : '#1d2026' }} />
    </div>
  )
}

function AdjustBalanceModal({
  account,
  onClose,
  onNotice,
  onAdjustBalance,
  setAccounts,
  setTransactions,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  onAdjustBalance?: (account: Account, transaction: Transaction) => Promise<void>
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}) {
  const [actualBalance, setActualBalance] = useState('')
  const [date, setDate] = useState(() => localDateKey())
  const [note, setNote] = useState('Balance adjusted manually')

  if (!account) return null

  const parsedBalance = Number(actualBalance)
  const hasValue = actualBalance !== '' && Number.isFinite(parsedBalance)
  const difference = hasValue ? parsedBalance - account.balance : 0
  const isIncrease = difference > 0
  const isDecrease = difference < 0
  const absoluteDifference = Math.abs(difference)
  const adjustmentLabel = isIncrease ? 'Unexplained Income' : isDecrease ? 'Unexplained Expense' : 'No adjustment needed'

  const confirmAdjustment = async () => {
    if (!hasValue || difference === 0) {
      onNotice('No adjustment needed.')
      onClose()
      return
    }

    const updatedAccount = { ...account, balance: parsedBalance, activity: `${adjustmentLabel}: ${formatPKR(absoluteDifference)}` }
    const adjustment: Transaction = {
        id: crypto.randomUUID(),
        title: adjustmentLabel,
        amount: absoluteDifference,
        type: isIncrease ? 'income' : 'expense',
        category: adjustmentLabel,
        account: account.name,
        accountId: account.id,
        date,
        notes: note || 'Balance adjusted manually',
        createdAt: new Date().toISOString(),
      }
    try {
      await onAdjustBalance?.(updatedAccount, adjustment)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not adjust balance.')
      return
    }
    setAccounts((current) => current.map((item) => item.id === account.id ? updatedAccount : item))
    setTransactions((current) => [adjustment, ...current])
    onNotice(`${adjustmentLabel} recorded for ${account.name}.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-[rgba(43,36,29,.45)] p-0 sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-[var(--rule)] bg-[var(--vault-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">Adjust Balance</p>
            <h2 className="text-xl font-semibold text-[var(--ink)]">{account.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close adjust balance"><X size={19} /></button>
        </div>

        <div className="mt-5 rounded-3xl bg-[var(--surface-2)] p-4">
          <p className="text-sm text-[var(--muted)]">Recorded balance</p>
          <strong className="mt-1 block text-3xl text-[var(--ink)]">{formatPKR(account.balance)}</strong>
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

        <div className="mt-4 rounded-3xl border border-[var(--rule)] bg-[var(--surface-2)] p-4">
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
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink)]" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center" onClick={confirmAdjustment}>Confirm</button>
        </div>
      </motion.section>
    </div>
  )
}

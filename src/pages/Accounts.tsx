import { ArrowRightLeft, GripVertical, PencilLine, Plus, ShieldCheck, Trash2, WalletCards, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from 'react'
import type { Account, Transaction } from '../types/finance'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import { localDateKey } from '../lib/date'
import { saveAccountOrder } from '../lib/accountOrder'
import { hapticTap } from '../components/sheets/numpad'

/* ============================================================
   Accounts — "Your wallet." (Vault spec 14b)
   Stacked account cards in the Vault's surface treatments.
   Cards reorder by dragging the grip handle (haptic on every
   swap; the Home carousel follows the same order). Card color
   is one of four theme surfaces and only ever affects this
   page — the Home balance cards stay espresso.
   ============================================================ */

/* The only card surfaces — every option is a Vault token. */
const cardColorOptions = [
  { name: 'Espresso', value: '#2B241D', treatment: 'is-espresso' },
  { name: 'Clay', value: '#E2703A', treatment: 'is-clay' },
  { name: 'Bone', value: '#FBF8F1', treatment: 'is-outline' },
  { name: 'Taupe', value: '#9A8F7D', treatment: 'is-taupe' },
] as const

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
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

/** Chosen theme surface, or the spec's type-based cycle for legacy colors. */
function treatmentFor(account: Account, fallback: string) {
  const option = cardColorOptions.find((item) => item.value.toLowerCase() === account.color?.toLowerCase())
  return option?.treatment ?? fallback
}

/* Fallback cycle (spec 14b §3): cash = outlined, first wallet = clay,
   the rest espresso. */
function fallbackTreatments(accounts: Account[]) {
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
  const fallbacks = fallbackTreatments(accounts)
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

  /* Every reorder step gets a light haptic; the new order persists locally
     and flows straight into the Home carousel (same accounts state). */
  const reorder = (next: Account[]) => {
    hapticTap()
    setAccounts(next)
    saveAccountOrder(next)
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
        <WalletList
          accounts={accounts}
          treatments={accounts.map((account, index) => treatmentFor(account, fallbacks[index]))}
          onOpen={setMenuAccount}
          onReorder={reorder}
        />
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
   Reorderable card stack. Drag is driven manually via pointer
   events on the grip (same approach as BottomSheet) so page
   scrolling and card taps stay untouched: the dragged card
   follows the finger, its neighbours slide out of the way with
   a spring-eased transform, and every position swap fires a
   light haptic. The committed order feeds the Home carousel.
   ============================================================ */

const CARD_GAP = 12

type DragState = { id: string; from: number; to: number; dy: number; height: number }

function projectedIndex(rects: Array<{ mid: number }>, from: number, draggedCenter: number) {
  let to = from
  for (let index = from + 1; index < rects.length; index++) {
    if (draggedCenter > rects[index].mid) to = index
  }
  for (let index = from - 1; index >= 0; index--) {
    if (draggedCenter < rects[index].mid) to = index
  }
  return to
}

function WalletList({ accounts, treatments, onOpen, onReorder }: {
  accounts: Account[]
  treatments: string[]
  onOpen: (account: Account) => void
  onReorder: (next: Account[]) => void
}) {
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const [drag, setDrag] = useState<DragState | null>(null)
  const session = useRef({ pointerId: -1, startY: 0, from: 0, rects: [] as Array<{ height: number; mid: number }> })

  const beginDrag = (event: ReactPointerEvent, index: number) => {
    if (!event.isPrimary) return
    event.preventDefault()
    event.stopPropagation()
    const rects = accounts.map((account) => {
      const rect = itemRefs.current.get(account.id)!.getBoundingClientRect()
      return { height: rect.height, mid: rect.top + rect.height / 2 }
    })
    session.current = { pointerId: event.pointerId, startY: event.clientY, from: index, rects }
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) } catch { /* ignore */ }
    hapticTap()
    setDrag({ id: accounts[index].id, from: index, to: index, dy: 0, height: rects[index].height })
  }

  const moveDrag = (event: ReactPointerEvent) => {
    const { pointerId, startY, from, rects } = session.current
    if (pointerId !== event.pointerId || !drag) return
    const dy = event.clientY - startY
    const to = projectedIndex(rects, from, rects[from].mid + dy)
    setDrag((current) => {
      if (!current) return current
      if (to !== current.to) hapticTap() // a card slid out of the way
      return { ...current, dy, to }
    })
  }

  const endDrag = (event: ReactPointerEvent) => {
    if (session.current.pointerId !== event.pointerId || !drag) return
    session.current.pointerId = -1
    if (drag.to !== drag.from) {
      const next = [...accounts]
      const [moved] = next.splice(drag.from, 1)
      next.splice(drag.to, 0, moved)
      onReorder(next)
    }
    hapticTap() // snap into place
    setDrag(null)
  }

  /* Keyboard fallback: arrow keys on the grip nudge the card. */
  const nudge = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= accounts.length) return
    const next = [...accounts]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onReorder(next)
  }

  /* While dragging, neighbours between the old and projected slot shift
     by the dragged card's height (+gap); the dragged card follows dy. */
  const shiftFor = (index: number): number => {
    if (!drag) return 0
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -(drag.height + CARD_GAP)
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return drag.height + CARD_GAP
    return 0
  }

  return (
    <div aria-label="Your accounts — drag the grip to reorder" className="mt-7 flex flex-col gap-3" role="list">
      {accounts.map((account, index) => {
        const included = account.includeInSafeSpend !== false
        const isDragged = drag?.id === account.id
        return (
          <div
            key={account.id}
            ref={(node) => { if (node) itemRefs.current.set(account.id, node); else itemRefs.current.delete(account.id) }}
            role="listitem"
            className={cn('vault-wallet-card cursor-pointer', treatments[index], isDragged && 'is-dragging')}
            style={{
              transform: isDragged ? `translateY(${drag.dy}px) scale(1.02)` : `translateY(${shiftFor(index)}px)`,
              transition: isDragged ? 'none' : drag ? 'transform .25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            }}
            tabIndex={0}
            aria-label={`${account.name} — open card actions`}
            onClick={() => { if (!drag) onOpen(account) }}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(account) } }}
          >
            <span className="vault-acct-top">
              <span className="vault-acct-name">{account.name}</span>
              <span className="flex items-center gap-1.5">
                <span className="vault-acct-tag">{typeTag(account)}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Reorder ${account.name} — drag, or use the arrow keys`}
                  className="vault-grip"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => beginDrag(event, index)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); nudge(index, -1) }
                    if (event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); nudge(index, 1) }
                  }}
                >
                  <GripVertical size={17} strokeWidth={1.8} />
                </span>
              </span>
            </span>
            {account.type !== 'cash' && (
              <span className="vault-acct-number block">···· ···· {account.cardLabel || '····'}</span>
            )}
            <span className="vault-acct-foot">
              <span className="vault-acct-balance">Rs {nf(account.balance)}</span>
              <span className="vault-acct-safe">{included ? 'In safe spend' : 'Excluded'}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   Modals & color picker
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
  const [color, setColor] = useState<string>(cardColorOptions[0].value)

  if (!open) return null

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
          <CardColorPicker color={color} onPick={setColor} />
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
  const [color, setColor] = useState(account?.color ?? cardColorOptions[0].value)

  if (!account) return null

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

    onNotice(balanceDifference === 0 ? `${updatedName} updated.` : `${adjustmentLabel} recorded for ${updatedName}.`)
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
          <CardColorPicker color={color} onPick={setColor} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink)]" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center disabled:opacity-60" onClick={saveAccount} disabled={!name.trim() || !Number.isFinite(Number(balance)) || !isValidHex(color)}>Save</button>
        </div>
      </motion.section>
    </div>
  )
}

/* Four Vault surfaces, nothing else. Only the Wallet page reads this —
   the Home balance cards stay espresso regardless. */
function CardColorPicker({ color, onPick }: { color: string; onPick: (value: string) => void }) {
  return (
    <div>
      <span className="form-label">Card surface</span>
      <div className="grid grid-cols-4 gap-2">
        {cardColorOptions.map((option) => {
          const selected = color.toLowerCase() === option.value.toLowerCase()
          return (
            <button
              key={option.name}
              aria-label={`Use ${option.name}`}
              aria-pressed={selected}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border transition',
                selected ? 'border-[var(--clay)] ring-2 ring-[rgba(226,112,58,.25)]' : 'border-[var(--rule)]',
              )}
              title={option.name}
              type="button"
              onClick={() => onPick(option.value)}
            >
              <span className="h-6 w-9 rounded-lg border border-[rgba(43,36,29,.12)]" style={{ background: option.value }} />
              <span className="text-[10.5px] font-semibold text-[var(--ink-soft)]">{option.name}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--taupe)]">Changes how the card looks here — the Home carousel stays espresso.</p>
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
            <strong className={cn('text-[var(--ink)]', (isIncrease || isDecrease) && 'text-[var(--clay)]')}>
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

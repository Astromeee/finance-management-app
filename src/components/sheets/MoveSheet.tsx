import { ArrowDownUp, PencilLine } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Account, SafeSpendResult } from '../../types/finance'
import { cn } from '../../utils/ui'
import { Numpad, VaultSheet } from './VaultSheet'
import { formatAmount, hapticTap, pressKey } from './numpad'
import { localDateKey } from '../../lib/date'

/* ============================================================
   Move sheet (spec 18a) — transfers between accounts. Accounts
   are tiles joined at a 6px seam (espresso = source, outlined
   bone = destination) with the clay swap button punched through
   the junction. Transfers are neutral: the commit is espresso,
   never clay.
   ============================================================ */

export type MovePayload = {
  amount: number
  fromAccountId: string
  toAccountId: string
  date: string
  notes?: string
}

const nf = (value: number) => Math.round(Math.abs(value)).toLocaleString('en-PK')

function rememberedAccount(accounts: Account[]) {
  const saved = localStorage.getItem('pl-last-account')
  return accounts.some((account) => account.id === saved) ? saved! : accounts[0]?.id ?? ''
}

function shortName(account: Account) {
  return account.name.split(' ')[0]
}

function typeTag(account: Account) {
  return account.type === 'cash' ? 'CASH' : account.type === 'wallet' ? 'WALLET' : 'BANK'
}

function tileName(account: Account) {
  // "HBL ·· 4821" — the masked tail carries account identity (screenshot 18a)
  return account.type !== 'cash' && account.cardLabel && /^\d+$/.test(account.cardLabel)
    ? `${shortName(account)} ·· ${account.cardLabel}`
    : account.name
}

export function MoveSheet({
  open,
  accounts,
  safeSpend,
  onClose,
  onSubmit,
}: {
  open: boolean
  accounts: Account[]
  safeSpend: SafeSpendResult
  onClose: () => void
  onSubmit: (payload: MovePayload) => void
}) {
  const [fromId, setFromId] = useState(() => rememberedAccount(accounts))
  const [toId, setToId] = useState(() => accounts.find((account) => account.id !== rememberedAccount(accounts))?.id ?? '')
  const [value, setValue] = useState('')
  const [picking, setPicking] = useState<'from' | 'to' | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const from = accounts.find((account) => account.id === fromId)
  const to = accounts.find((account) => account.id === toId)
  const amount = Number(value) || 0

  const quicks = useMemo(() => {
    const balance = from?.balance ?? 0
    return [
      { label: '500', amount: 500, word: false },
      { label: '2,000', amount: 2_000, word: false },
      { label: '5,000', amount: 5_000, word: false },
      { label: 'Half', amount: Math.floor(balance / 2), word: true },
      { label: 'All', amount: balance, word: true },
    ]
  }, [from])

  /* Safe-spend note (18a §4): neutral when the pool doesn't change, clay
     warning with the recomputed Safe today when money leaves it. */
  const note = useMemo(() => {
    if (!from || !to || safeSpend.state === 'needs_setup') return null
    const fromIn = from.includeInSafeSpend !== false
    const toIn = to.includeInSafeSpend !== false
    const days = Math.max(1, safeSpend.cycle?.daysRemaining ?? 1)
    if (fromIn === toIn) {
      return {
        warn: false,
        text: fromIn
          ? <>Both count toward safe spend — today&rsquo;s number doesn&rsquo;t move.</>
          : <>Neither account counts toward safe spend — today&rsquo;s number doesn&rsquo;t move.</>,
      }
    }
    if (!toIn) {
      const after = Math.floor(Math.max(0, safeSpend.flexibleMoneyRemaining - amount) / days)
      return { warn: true, text: <>{shortName(to)} is outside safe spend — Safe today drops to <strong>Rs {nf(after)}</strong>.</> }
    }
    const after = Math.floor(Math.max(0, safeSpend.flexibleMoneyRemaining + amount) / days)
    return { warn: false, text: <>{shortName(from)} joins safe spend — Safe today grows to <strong>Rs {nf(after)}</strong>.</> }
  }, [from, to, amount, safeSpend])

  const swap = () => {
    hapticTap()
    setFromId(toId)
    setToId(fromId)
  }

  const pick = (id: string) => {
    if (picking === 'from') {
      if (id === toId) setToId(fromId) // choosing the other side's account swaps
      setFromId(id)
    } else if (picking === 'to') {
      if (id === fromId) setFromId(toId)
      setToId(id)
    }
    setPicking(null)
  }

  const insufficient = from ? amount > from.balance : false
  const invalid = amount <= 0 || !from || !to || fromId === toId || insufficient

  const commit = () => {
    if (invalid || !from || !to) return
    localStorage.setItem('pl-last-account', fromId)
    onSubmit({ amount, fromAccountId: fromId, toAccountId: toId, date: localDateKey(), notes: notes.trim() || undefined })
    onClose()
  }

  return (
    <VaultSheet compact open={open} label="Move money between accounts" onClose={onClose}>
      <h2 className="vault-sheet-title">Move <em>money.</em></h2>

      {/* From/To tiles joined at the seam */}
      <div className="vault-move-tiles mt-5">
        <button className="vault-move-tile is-from" type="button" onClick={() => setPicking(picking === 'from' ? null : 'from')}>
          <span className="min-w-0">
            <span className="vault-move-eyebrow block">From · {from ? typeTag(from) : '—'}</span>
            <span className="vault-move-name block truncate">{from ? tileName(from) : 'Pick an account'}</span>
          </span>
          <span className="flex-none">
            <span className="vault-move-balance block">Rs {nf(from?.balance ?? 0)}</span>
            <span className="vault-move-change block">tap to change ▾</span>
          </span>
        </button>
        <button aria-label="Swap direction" className="vault-swap" type="button" onClick={swap}>
          <ArrowDownUp size={18} strokeWidth={2} />
        </button>
        <button className="vault-move-tile is-to" type="button" onClick={() => setPicking(picking === 'to' ? null : 'to')}>
          <span className="min-w-0">
            <span className="vault-move-eyebrow block">To · {to ? typeTag(to) : '—'}</span>
            <span className="vault-move-name block truncate">{to ? tileName(to) : 'Pick an account'}</span>
          </span>
          <span className="flex-none">
            <span className="vault-move-balance block">Rs {nf(to?.balance ?? 0)}</span>
            <span className="vault-move-change block">tap to change ▾</span>
          </span>
        </button>
      </div>

      {/* Account picker */}
      {picking && (
        <div className="vault-outline mt-3 px-4 py-1" role="listbox" aria-label={picking === 'from' ? 'Move from which account?' : 'Move to which account?'}>
          {accounts.map((account) => (
            <button key={account.id} className="vault-row" role="option" aria-selected={account.id === (picking === 'from' ? fromId : toId)} type="button" onClick={() => pick(account.id)}>
              <span className={cn('vault-row-dot', account.includeInSafeSpend === false ? 'is-paid' : 'is-in')} />
              <span className="vault-row-main"><span className="vault-row-title block">{account.name}</span></span>
              <span className="vault-row-amount">Rs {nf(account.balance)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Amount */}
      <div aria-live="polite" className="vault-amount mt-6">
        <span className="vault-amount-currency">Rs</span>
        <span className="vault-amount-value">{formatAmount(value)}<span aria-hidden className="vault-amount-caret" /></span>
      </div>

      {/* Preview lines */}
      {from && to && (
        <p className="vault-impact mt-3">
          After: {shortName(from)} <strong>Rs {nf(Math.max(0, from.balance - amount))}</strong> · {shortName(to)} <strong>Rs {nf(to.balance + amount)}</strong>
        </p>
      )}
      {insufficient
        ? <p className="vault-impact-note is-warn mt-1.5">That&rsquo;s more than {from ? shortName(from) : 'this account'} holds.</p>
        : note && <p className={cn('vault-impact-note mt-1.5', note.warn && 'is-warn')}>{note.text}</p>}

      {/* Quick-amount chips */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quicks.map((quick) => (
          <button
            key={quick.label}
            className={cn('vault-quick', quick.word && 'is-word', quick.amount > 0 && amount === quick.amount && 'is-active')}
            type="button"
            onClick={() => { hapticTap(); setValue(String(quick.amount)) }}
          >
            {quick.label}
          </button>
        ))}
      </div>

      {/* Numpad (58px keys via is-compact) */}
      <div className="mt-4">
        <Numpad onKey={(key) => setValue((current) => pressKey(current, key))} />
      </div>

      {noteOpen && (
        <input autoFocus className="form-input mt-4" placeholder="Add a note (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
      )}

      {/* Commit — espresso: transfers are neutral, never clay */}
      <div className="vault-commit-row mt-4">
        <button className="vault-commit is-espresso" disabled={invalid} type="button" onClick={commit}>
          {amount > 0 && to
            ? <>Move <span className="vault-digits">Rs {nf(amount)}</span> to {shortName(to)}</>
            : <>Move money</>}
        </button>
        <button aria-expanded={noteOpen} aria-label="Add a note" className={cn('vault-note-btn', noteOpen && 'is-open')} type="button" onClick={() => setNoteOpen((current) => !current)}>
          <PencilLine size={19} strokeWidth={1.8} />
        </button>
      </div>
    </VaultSheet>
  )
}

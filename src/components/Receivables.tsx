import { useEffect, useState, useRef, type FormEvent } from 'react'
import { ArrowDownLeft, ChevronRight, Plus, X } from 'lucide-react'
import { VaultSheet } from './sheets/VaultSheet'
import { formatMoney } from '../lib/currency'
import { localDateKey } from '../lib/date'
import { loadReceivables, receivePayment, saveReceivable, writeOffReceivable } from '../lib/receivables'
import { outstanding, type Receivable } from '../types/receivable'
import type { Account } from '../types/finance'

export function Receivables({ accounts }: { accounts: Account[] }) {
  const preview = import.meta.env.DEV && window.location.search.includes('vault-preview')
  const [items, setItems] = useState<Receivable[]>([])
  const [filter, setFilter] = useState<'outstanding' | 'bad' | 'settled'>('outstanding')
  const [editing, setEditing] = useState<Receivable | 'new' | null>(null)
  const [detail, setDetail] = useState<Receivable | null>(null)
  const [error, setError] = useState('')
  const reload = async () => { if (!preview) setItems(await loadReceivables()) }
  useEffect(() => {
    if (preview) return
    let live = true
    const refresh = () => { void loadReceivables().then((rows) => { if (live) setItems(rows) }).catch(() => { if (live) setError('Could not load receivables. Please retry.') }) }
    refresh()
    window.addEventListener('pocket-finance-refresh', refresh)
    return () => { live = false; window.removeEventListener('pocket-finance-refresh', refresh) }
  }, [preview])
  const shown = items.filter((item) => !item.archived && (filter === 'bad' ? item.written_off > 0 : filter === 'settled' ? item.received >= item.amount : outstanding(item) > 0))
  return <section id="receivables" className="vault-receivables mt-8" aria-label="Owed to me">
    <div className="flex items-center justify-between"><h2 className="vault-h2">Owed to <em>me.</em></h2><button className="vault-iconbtn" type="button" aria-label="Add receivable" onClick={() => setEditing('new')}><Plus size={17} /></button></div>
    <div className="vault-chiprow mt-4">{([['outstanding', 'Outstanding'], ['bad', 'Bad debts'], ['settled', 'Repaid']] as const).map(([id, label]) => <button key={id} className={`vault-chip${filter === id ? ' is-active' : ''}`} type="button" onClick={() => setFilter(id)}>{label}</button>)}</div>
    {shown.map((item) => <button key={item.id} className="vault-row w-full text-left" type="button" onClick={() => setDetail(item)}><ArrowDownLeft size={18} /><span className="vault-row-main"><span className="vault-row-title block">{item.person}</span><span className="vault-row-meta block">{filter === 'bad' ? 'Written off' : filter === 'settled' ? 'Fully repaid' : item.due_date ? `${item.due_date < localDateKey() ? 'Overdue · ' : 'Due '}${item.due_date}` : 'No due date'}</span></span><span className="vault-digits">{formatMoney(filter === 'bad' ? item.written_off : filter === 'settled' ? item.received : outstanding(item))}</span><ChevronRight size={15} /></button>)}
    {!shown.length && <p className="vault-sheet-note py-5">{filter === 'outstanding' ? 'Keep track of money someone owes you. Add a person to begin.' : filter === 'bad' ? 'No written-off amounts.' : 'Fully repaid amounts will appear here.'}</p>}
    {error && <p role="alert" className="vault-sheet-note">{error} <button type="button" className="vault-link" onClick={() => { setError(''); void reload().catch(() => setError('Could not load receivables. Please retry.')) }}>Retry</button></p>}
    {editing && <ReceivableForm item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSave={async (item) => { if (!preview) await saveReceivable(item); setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)]); setEditing(null) }} />}
    {detail && <ReceivableDetail item={items.find((item) => item.id === detail.id) ?? detail} accounts={accounts} onClose={() => setDetail(null)} onEdit={() => { setEditing(items.find((item) => item.id === detail.id) ?? detail); setDetail(null) }} onPayment={async (amount, account, date, paymentId) => {
      if (!preview) { await receivePayment(detail, account, amount, date, paymentId); await reload() }
      else setItems((current) => current.map((item) => item.id === detail.id ? { ...item, received: item.received + amount, written_off: Math.max(0, item.written_off - Math.max(0, amount - outstanding(item))) } : item))
    }} onWriteOff={async () => { if (!preview) { await writeOffReceivable(detail.id); await reload() } else setItems((current) => current.map((item) => item.id === detail.id ? { ...item, written_off: item.written_off + outstanding(item) } : item)) }} />}
  </section>
}

function ReceivableForm({ item, onClose, onSave }: { item?: Receivable; onClose: () => void; onSave: (item: Receivable) => Promise<void> }) {
  const [person, setPerson] = useState(item?.person ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [due, setDue] = useState(item?.due_date ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const valid = person.trim() && Number.isSafeInteger(Number(amount)) && Number(amount) > 0 && Number(amount) <= 999999999999 && Number(amount) >= (item?.received ?? 0) + (item?.written_off ?? 0)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!valid || busy) return
    setBusy(true); setError('')
    try { await onSave({ id: item?.id ?? crypto.randomUUID(), person: person.trim(), amount: Number(amount), received: item?.received ?? 0, written_off: item?.written_off ?? 0, due_date: due || null, notes: notes.trim() || null, created_at: item?.created_at ?? new Date().toISOString(), archived: false }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Try again.'); setBusy(false) }
  }
  return <VaultSheet open label={item ? 'Edit receivable' : 'Add receivable'} onClose={onClose}><h2 className="vault-sheet-title text-left">{item ? 'Edit' : 'Owed to'} <em>{item ? 'receivable.' : 'you.'}</em></h2><form className="grid gap-4 mt-5" onSubmit={submit}>
    <label>Person<input className="form-input mt-2" required maxLength={100} value={person} onChange={(e) => setPerson(e.target.value)} /></label>
    <label>Amount owed<input className="form-input mt-2" inputMode="numeric" required type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
    <label>Due date <span className="vault-sheet-note">(optional)</span><input className="form-input mt-2" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
    <details><summary className="vault-link">Add a note (optional)</summary><label className="block mt-2">Note<textarea className="form-input mt-2" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label></details>
    <p className="vault-sheet-note">Tracks an existing amount owed. Adding it does not change your account balance.</p>
    {error && <p role="alert">{error}</p>}<button className="vault-commit is-espresso" disabled={!valid || busy}>{busy ? 'Saving…' : 'Save receivable'}</button>
  </form></VaultSheet>
}

function ReceivableDetail({ item, accounts, onClose, onEdit, onPayment, onWriteOff }: { item: Receivable; accounts: Account[]; onClose: () => void; onEdit: () => void; onPayment: (amount: number, account: Account, date: string, paymentId: string) => Promise<void>; onWriteOff: () => Promise<void> }) {
  const paymentAttempt = useRef({ signature: '', id: '' })
  const [mode, setMode] = useState<'view' | 'pay' | 'writeoff'>('view')
  const [amount, setAmount] = useState(''), [accountId, setAccountId] = useState(accounts[0]?.id ?? ''), [date, setDate] = useState(localDateKey())
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); try { await action(); setMode('view'); setAmount('') } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Please retry.') } finally { setBusy(false) } }
  const account = accounts.find((entry) => entry.id === accountId)
  const valid = account && date && Number.isSafeInteger(Number(amount)) && Number(amount) > 0 && Number(amount) <= item.amount - item.received
  return <VaultSheet open label={`Owed by ${item.person}`} onClose={onClose}><div className="vault-recap-head"><h2 className="vault-sheet-title text-left">{item.person}</h2><button className="vault-iconbtn" aria-label="Close receivable" type="button" onClick={onClose}><X size={18} /></button></div>
    <p className="vault-recap-amount">{formatMoney(outstanding(item))}</p><p className="vault-sheet-note">Outstanding · {formatMoney(item.received)} repaid of {formatMoney(item.amount)}</p>
    {item.written_off > 0 && <p className="vault-sheet-note mt-3">{formatMoney(item.written_off)} written off. You can still record a recovery.</p>}
    {item.notes && <p className="vault-sheet-note mt-3">{item.notes}</p>}
    {mode === 'view' && <div className="grid gap-3 mt-6">{item.received < item.amount && <button className="vault-commit is-espresso" type="button" onClick={() => setMode('pay')}>{outstanding(item) ? 'Record repayment' : 'Record recovery'}</button>}<button className="vault-link" type="button" onClick={onEdit}>Edit details</button>{outstanding(item) > 0 && <button className="vault-link" type="button" onClick={() => setMode('writeoff')}>Write off remaining amount</button>}</div>}
    {mode === 'writeoff' && <div className="grid gap-3 mt-6"><p className="vault-sheet-note">Move {formatMoney(outstanding(item))} to Bad debts? Your history and cash balances stay intact.</p><button className="vault-commit is-espresso" type="button" disabled={busy} onClick={() => void run(onWriteOff)}>{busy ? 'Saving…' : 'Confirm write-off'}</button><button className="vault-link" type="button" disabled={busy} onClick={() => setMode('view')}>Cancel</button></div>}
    {mode === 'pay' && <form className="grid gap-4 mt-6" onSubmit={(e) => { e.preventDefault(); if (valid) { const signature = `${amount}:${accountId}:${date}`; if (paymentAttempt.current.signature !== signature) paymentAttempt.current = { signature, id: crypto.randomUUID() }; void run(async () => { await onPayment(Number(amount), account!, date, paymentAttempt.current.id); paymentAttempt.current = { signature: '', id: '' } }) } }}><label>Amount received<input className="form-input mt-2" type="number" min="1" step="1" max={item.amount - item.received} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><label>Received into<select className="form-input mt-2" value={accountId} onChange={(e) => setAccountId(e.target.value)} required><option value="" disabled>Choose account</option>{accounts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>Date<input className="form-input mt-2" type="date" required max={localDateKey()} value={date} onChange={(e) => setDate(e.target.value)} /></label><p className="vault-sheet-note">Adds money to this account as a repayment, separate from income.</p><button className="vault-commit is-espresso" disabled={!valid || busy}>{busy ? 'Saving…' : 'Record received'}</button><button className="vault-link" type="button" disabled={busy} onClick={() => setMode('view')}>Cancel</button></form>}
    {error && <p role="alert" className="vault-sheet-note mt-4">{error}</p>}
  </VaultSheet>
}

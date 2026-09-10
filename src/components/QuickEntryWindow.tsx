import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { syncMonthlyWidget } from '../lib/monthlyWidget'
import { QuickEntry, validQuickAmount, type EntryDirection } from '../lib/quickEntry'
import { loadFinanceData, recordFinanceAction, type FinanceData } from '../lib/financeRepository'
import { currencySymbol } from '../lib/currency'
import { localDateKey } from '../lib/date'
import { supabase } from '../lib/supabase'
import './quick-entry.css'

export function QuickEntryWindow() {
  const [direction, setDirection] = useState<EntryDirection>('expense')
  const [data, setData] = useState<FinanceData | null>(null)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const busy = useRef(false)
  const transactionId = useRef(crypto.randomUUID())

  useEffect(() => {
    let live = true
    const timer = window.setTimeout(() => { if (live) { setLoading(false); setError('Connection is taking too long. Close this window and try again with internet access.') } }, 15000)
    void Promise.all([QuickEntry.context(), loadFinanceData()]).then(async ([context, finance]) => {
      if (!live) return
      await syncMonthlyWidget(finance.transactions).catch(() => {})
      if (!live) return
      if (context.refreshOnly) { await QuickEntry.close({}); return }
      setDirection(context.direction)
      setData(finance)
      const last = localStorage.getItem('pl-last-account')
      setAccountId(finance.accounts.find(a => a.id === last)?.id ?? finance.accounts[0]?.id ?? '')
      setCategoryId(finance.categories.find(c => c.kind === context.direction)?.id ?? '')
      setError('')
    }).catch(() => { if (live) setError('Could not load your ledger. Check your connection, or open Ledger to sign in.') })
      .finally(() => { clearTimeout(timer); if (live) setLoading(false) })
    return () => { live = false; clearTimeout(timer) }
  }, [])

  async function save() {
    if (busy.current || !data || !validQuickAmount(amount)) return
    const account = data.accounts.find(a => a.id === accountId)
    const category = data.categories.find(c => c.id === categoryId && c.kind === direction)
    if (!account || !category) return
    busy.current = true
    setSaving(true)
    setAttempted(true)
    setError('')
    // A stable ID makes retries safe: duplicate inserts roll back the RPC's balance update.
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    try {
      try {
        await recordFinanceAction({ id: transactionId.current, type: direction, title: category.name,
          amount: Number(amount), category: category.name, categoryId: direction === 'expense' ? category.id : undefined,
          source: direction === 'income' ? category.name : undefined, accountId, account: account.name, date: localDateKey() }, controller.signal)
      } catch (cause) {
        // A lost response may follow a successful commit. Confirm before offering a retry.
        const existing = await supabase?.from('transactions').select('id').eq('id', transactionId.current).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
        if (!existing?.data) throw cause
      }
      localStorage.setItem('pl-last-account', accountId)
      localStorage.setItem('pl-widget-saved', String(Date.now()))
      setSaved(true)
      setError('')
      await syncMonthlyWidget([...data.transactions, { id: transactionId.current, type: direction, title: category.name,
        amount: Number(amount), category: category.name, accountId, account: account.name, date: localDateKey() }]).catch(() => {})
      await QuickEntry.close({ saved: true })
    } catch {
      setError('Could not confirm the save. Check your connection and retry here; your entry is kept.')
    } finally {
      clearTimeout(timer)
      busy.current = false
      setSaving(false)
    }
  }

  return <main className="qe-window">
    <header><span className="qe-brand">Ledger <span>QUICK ADD</span></span><button aria-label="Close" disabled={saving} onClick={() => void QuickEntry.close({})}><X size={20}/></button></header>
    {loading ? <p role="status">Loading your accounts…</p> : saved ? <p role="status"><Check/> Saved to your ledger.</p> : data ? <form onSubmit={e => { e.preventDefault(); void save() }}>
      <fieldset disabled={saving}>
        <div className="qe-direction" role="group" aria-label="Transaction type">
          {(['expense', 'income'] as const).map(type => <button type="button" key={type} disabled={attempted} aria-pressed={direction === type} className={direction === type ? 'selected' : ''} onClick={() => { setDirection(type); setCategoryId(data.categories.find(c => c.kind === type)?.id ?? '') }}>{type === 'expense' ? '− Expense' : '+ Income'}</button>)}
        </div>
        <label className="qe-amount">AMOUNT<div><span>{currencySymbol()}</span><input disabled={attempted} aria-label="Amount" inputMode="numeric" autoComplete="off" placeholder="0" value={amount} maxLength={12} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}/></div></label>
        <label className="qe-select">{direction === 'expense' ? 'Category' : 'Source'}<select disabled={attempted} value={categoryId} onChange={e => setCategoryId(e.target.value)} aria-label={direction === 'expense' ? 'Category' : 'Source'}>{data.categories.filter(c => c.kind === direction).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="qe-select">Account<select disabled={attempted} aria-label="Account" value={accountId} onChange={e => setAccountId(e.target.value)}>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <div className="qe-date">Recording for today</div>
        {(!accountId || !categoryId) && <p>Create an account and categories in Ledger first.</p>}
        <button className={`qe-save ${direction}`} disabled={!validQuickAmount(amount) || !accountId || !categoryId}>{saving ? 'Saving…' : direction === 'expense' ? 'Save expense' : 'Save income'}<Check size={19}/></button>
      </fieldset>
    </form> : <button className="qe-save" onClick={() => void QuickEntry.openApp()}>Open Ledger to sign in</button>}
    {error && <p className="qe-error" role="alert">{error}</p>}
  </main>
}

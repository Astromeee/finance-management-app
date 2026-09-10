import { useEffect, useState } from 'react'
import { Check, ChevronRight, Sun, X } from 'lucide-react'
import { VaultSheet } from './sheets/VaultSheet'
import { weeklyRecap, openWeeklyRecap } from '../lib/weeklyRecap'
import { formatMoney } from '../lib/currency'
import type { Transaction } from '../types/finance'

export function WeeklyRecapLink() {
  return <button className="vault-recap-link" type="button" onClick={openWeeklyRecap}><Sun size={18} /><span>Your latest weekly recap</span><ChevronRight size={16} /></button>
}

export function WeeklyRecap({ transactions, userId, enabled }: { transactions: Transaction[]; userId: string; enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const recap = weeklyRecap(transactions, now)
  const seenKey = `pl-weekly-recap:${userId}`
  useEffect(() => {
    const refresh = () => setNow(new Date())
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => { document.removeEventListener('visibilitychange', refresh); clearInterval(timer) }
  }, [])
  useEffect(() => {
    const show = () => { setNow(new Date()); setOpen(true) }
    window.addEventListener('pocket-weekly-recap', show)
    return () => window.removeEventListener('pocket-weekly-recap', show)
  }, [])
  useEffect(() => {
    if (!enabled || now.getDay() !== 0 || !recap.hasEntries) return
    try { if (localStorage.getItem(seenKey) === recap.id) return } catch { /* optional persistence */ }
    const timer = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      setOpen(true)
      try { localStorage.setItem(seenKey, recap.id) } catch { /* optional persistence */ }
    }, 800)
    return () => clearTimeout(timer)
  }, [enabled, now, recap.hasEntries, recap.id, seenKey])
  return <VaultSheet open={open && enabled} label="Your Sunday recap" onClose={() => setOpen(false)}>
    <div className="vault-recap-head"><Sun size={24} /><button className="vault-iconbtn" type="button" aria-label="Close weekly recap" onClick={() => setOpen(false)}><X size={18} /></button></div>
    <p className="vault-eyebrow">Your Sunday recap</p>
    <h2 className="vault-sheet-title text-left">A little look <em>back.</em></h2>
    <p className="vault-sheet-note">{recap.label}</p>
    {recap.hasEntries ? <>
      <p className="vault-recap-amount">{formatMoney(recap.total)}</p>
      <p className="vault-sheet-note">Across {recap.count} recorded {recap.count === 1 ? 'expense' : 'expenses'}</p>
      <p className="vault-recap-positive"><Check size={18} />You kept track on {recap.days} {recap.days === 1 ? 'day' : 'days'}.</p>
    </> : <p className="vault-sheet-note mt-6">Your next recap starts with your next entry. Come back on Sunday for a little look back.</p>}
    <button className="vault-commit is-espresso mt-6 w-full" type="button" onClick={() => setOpen(false)}>Done</button>
    <p className="vault-sheet-note mt-4 text-center">Always available in Insights.</p>
  </VaultSheet>
}

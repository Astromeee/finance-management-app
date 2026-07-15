import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'
import type { AffordabilityResult, Category, SafeSpendResult } from '../types/finance'
import { formatPKR } from '../utils/financeCalculations'
import { calculateAffordability } from '../utils/journeyCalculations'
import { cn } from '../utils/ui'
import { BottomSheet } from './BottomSheet'

export function PurchaseSimulator({ open, safeSpend, categories, onClose, onManageCategories, onRecordExpense }: {
  open: boolean
  safeSpend: SafeSpendResult
  categories: Category[]
  onClose: () => void
  onManageCategories: () => void
  onRecordExpense: (draft: { amount: number; category: string }) => void
}) {
  const expenseCategories = categories.filter((category) => category.kind === 'expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? 'Miscellaneous')
  const parsedAmount = Math.max(0, Math.floor(Number(amount) || 0))
  const result = useMemo(() => calculateAffordability(parsedAmount, safeSpend), [parsedAmount, safeSpend])
  const lastTrackedState = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (parsedAmount > 0 && result.state !== lastTrackedState.current) {
      trackEvent('simulator_result_viewed', { surface: 'home', state: result.state })
      lastTrackedState.current = result.state
    }
  }, [parsedAmount, result.state])

  return <BottomSheet eyebrow="Plan before you pay" onClose={onClose} open={open} title="Can today afford it?">
    <div className="mt-5 grid gap-4">
      <label><span className="form-label">Purchase amount (PKR)</span><input autoFocus className="form-input font-display text-2xl font-semibold tabular-nums" inputMode="numeric" min="1" step="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="2,500" /></label>
      <label><span className="form-label">Category</span><select className="form-input" value={category} onChange={(event) => setCategory(event.target.value)}>{expenseCategories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
      <button className="-mt-2 w-fit text-xs font-semibold text-[var(--accent)] hover:underline" onClick={onManageCategories}>Manage categories in Settings</button>
      {parsedAmount > 0 ? <SimulatorResult result={result} /> : <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-center"><Sparkles className="mx-auto text-[var(--accent)]" size={22} /><p className="mt-3 font-semibold">Enter an amount to preview the impact</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Nothing is recorded while you simulate.</p></div>}
      <div className="grid gap-3 sm:grid-cols-2"><button className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold" onClick={onClose}>Keep planning</button><button className="btn-primary min-h-12 justify-center disabled:opacity-45" disabled={parsedAmount <= 0 || result.state === 'needs_setup'} onClick={() => onRecordExpense({ amount: parsedAmount, category })}>Record this expense <ArrowRight size={17} /></button></div>
      <p className="text-center text-xs leading-5 text-[var(--muted-2)]">Simulation never changes your ledger. Money is recorded only after you submit the expense form.</p>
    </div>
  </BottomSheet>
}

function SimulatorResult({ result }: { result: AffordabilityResult }) {
  const config = result.state === 'safe'
    ? { label: 'Safe', icon: CheckCircle2, className: 'border-[color-mix(in_srgb,var(--positive)_35%,transparent)] bg-[color-mix(in_srgb,var(--positive)_9%,transparent)]', iconClass: 'text-[var(--positive)]' }
    : result.state === 'caution'
      ? { label: 'Caution', icon: AlertTriangle, className: 'border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_9%,transparent)]', iconClass: 'text-[var(--warning)]' }
      : { label: result.state === 'needs_setup' ? 'Needs setup' : 'Risky', icon: ShieldAlert, className: 'border-[color-mix(in_srgb,var(--negative)_35%,transparent)] bg-[color-mix(in_srgb,var(--negative)_9%,transparent)]', iconClass: 'text-[var(--negative)]' }
  const Icon = config.icon
  return <div className={cn('rounded-2xl border p-5', config.className)}><div className="flex items-center gap-2"><Icon className={config.iconClass} size={20} /><p className="font-semibold">{config.label}</p></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{result.explanation}</p><div className="mt-4 flex justify-between border-t border-[var(--border)] pt-3 text-sm"><span className="text-[var(--muted)]">Today after purchase</span><span className="font-semibold tabular-nums">{formatPKR(result.safeToSpendAfter)}</span></div></div>
}

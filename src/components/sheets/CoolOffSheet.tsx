import { useState, type FormEvent } from 'react'
import type { Category, WishlistItem } from '../../types/finance'
import { trackEvent } from '../../lib/analytics'
import { VaultSheet } from './VaultSheet'

/* ============================================================
   Cool-off sheet — logs a tempting purchase into Plan →
   Cooling off (spec 19a: the FAB's fourth action feeds the
   app's behavioral core). Shared by the FAB menu and the
   Plan page.
   ============================================================ */

export function CoolOffSheet({ open, categories, onClose, onSave }: { open: boolean; categories: Category[]; onClose: () => void; onSave: (item: WishlistItem) => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [days, setDays] = useState('3')
  const [categoryId, setCategoryId] = useState(categories.find((item) => item.kind === 'expense')?.id ?? '')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!name.trim() || !Number.isSafeInteger(value) || value <= 0) return
    const reconsider = new Date()
    reconsider.setDate(reconsider.getDate() + Number(days))
    onSave({ id: crypto.randomUUID(), name: name.trim(), amount: value, categoryId: categoryId || undefined, reconsiderAt: reconsider.toISOString(), status: 'waiting' })
    trackEvent('wishlist_item_added', { surface: 'plan' })
    onClose()
  }

  return (
    <VaultSheet open={open} label="Cool off a purchase" onClose={onClose}>
      <h2 className="vault-sheet-title">Cool off a <em>buy.</em></h2>
      <p className="mt-2 text-center text-[12px] text-[var(--taupe)]">Park it here, sleep on it, decide with a clear head.</p>
      <form className="mt-5 grid gap-3" onSubmit={submit}>
        <label><span className="form-label">Item</span><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="What are you considering?" /></label>
        <label><span className="form-label">Amount</span><input className="form-input" inputMode="numeric" min="1" step="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="PKR amount" /></label>
        <label><span className="form-label">Category</span><select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span className="form-label">Wait before deciding</span><select aria-label="Cool-off duration" className="form-input" value={days} onChange={(event) => setDays(event.target.value)}><option value="1">24 hours</option><option value="3">3 days</option><option value="7">7 days</option></select></label>
        <button className="vault-commit is-espresso mt-1" disabled={!name.trim() || Number(amount) <= 0} type="submit">Start the cool-off</button>
      </form>
    </VaultSheet>
  )
}

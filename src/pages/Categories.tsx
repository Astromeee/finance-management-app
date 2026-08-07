import { formatMoney } from '../lib/currency'
import { ChevronLeft, PencilLine, Plus, ShoppingBag } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { CategoryAppearancePicker } from '../components/categories/CategoryAppearancePicker'
import { VaultSheet } from '../components/sheets/VaultSheet'
import { cn } from '../utils/ui'
import { categoryPresentationFor } from '../utils/categoryPresentation'
import type { Category, Transaction } from '../types/finance'

/* Categories manager (spec 22c) — colour-coded tiles with monthly total and
   transaction count. Colours/icons follow the design's palette by name,
   falling back to the category's own colour + a generic tag. */

const money = (value: number) => formatMoney(value)

export function Categories({
  categories,
  transactions,
  onNavigate,
  onSaveCategory,
  onArchiveCategory,
}: {
  categories: Category[]
  transactions: Transaction[]
  onNavigate: (page: string) => void
  onSaveCategory: (category: Category) => Promise<void>
  onArchiveCategory: (id: string) => Promise<void>
}) {
  const [kind, setKind] = useState<Category['kind']>('expense')
  const [editor, setEditor] = useState<{ category?: Category; kind: Category['kind'] } | null>(null)

  // Monthly total + count per category (this calendar month).
  const stats = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const totals = new Map<string, { total: number; count: number }>()
    for (const transaction of transactions) {
      if (!transaction.date.startsWith(month)) continue
      const key = (transaction.category ?? transaction.source ?? '').toLowerCase()
      if (!key) continue
      const current = totals.get(key) ?? { total: 0, count: 0 }
      current.total += transaction.amount
      current.count += 1
      totals.set(key, current)
    }
    return totals
  }, [transactions])

  const shown = categories.filter((category) => category.kind === kind)

  return (
    <div className="vault-screen">
      <header className="vault-detail-header relative flex items-center justify-center">
        <button aria-label="Back to settings" className="vault-iconbtn absolute left-0" type="button" onClick={() => onNavigate('settings')}><ChevronLeft size={18} strokeWidth={2} /></button>
        <p className="vault-eyebrow">Settings</p>
        <button aria-label="Edit first category" className="vault-iconbtn absolute right-0" disabled={!shown[0]} type="button" onClick={() => shown[0] && setEditor({ category: shown[0], kind })}><PencilLine size={15} strokeWidth={1.8} /></button>
      </header>

      <h1 className="vault-title">Categories</h1>

      <div className="vault-seg vault-catseg mt-6">
        <button className={cn('vault-seg-btn', kind === 'expense' && 'is-spent')} type="button" onClick={() => setKind('expense')}>Expenses</button>
        <button className={cn('vault-seg-btn', kind === 'income' && 'is-spent')} type="button" onClick={() => setKind('income')}>Income</button>
      </div>

      <p className="vault-cathelper mt-4">{shown.length} categories · Tap a card to edit its name, color, or icon</p>

      <div className="vault-catgrid mt-4">
        {shown.map((category) => {
          const { color, icon: Icon } = categoryPresentationFor(category)
          const stat = stats.get(category.name.toLowerCase())
          return (
            <button key={category.id} className="vault-cattile" type="button" onClick={() => setEditor({ category, kind })}>
              <span className="vault-cat-chip" style={{ background: color }}><Icon size={17} strokeWidth={2} /></span>
              <span className="vault-cat-name">{category.name}</span>
              <span className="vault-cat-stat">{money(stat?.total ?? 0)} · {stat?.count ?? 0}</span>
            </button>
          )
        })}
        <button className="vault-cattile is-new" type="button" onClick={() => setEditor({ kind })}>
          <span className="vault-cat-chip"><Plus size={18} strokeWidth={2} /></span>
          <span className="vault-cat-name">New category</span>
        </button>
      </div>

      <div className="vault-cathint">
        <ShoppingBag className="mt-0.5 flex-none text-[var(--taupe)]" size={16} />
        <p>Use distinct colors and icons to make categories easier to recognize throughout your ledger and reports.</p>
      </div>
      {editor && <CategoryEditor key={editor.category?.id ?? `new-${editor.kind}`} categories={categories} category={editor.category} initialKind={editor.kind} onClose={() => setEditor(null)} onSave={onSaveCategory} onArchive={onArchiveCategory}/>}
    </div>
  )
}

function CategoryEditor({ categories, category, initialKind, onClose, onSave, onArchive }: { categories: Category[]; category?: Category; initialKind: Category['kind']; onClose: () => void; onSave: (category: Category) => Promise<void>; onArchive: (id: string) => Promise<void> }) {
  const presentation = category ? categoryPresentationFor(category) : null
  const [name, setName] = useState(category?.name ?? '')
  const [kind, setKind] = useState<Category['kind']>(category?.kind ?? initialKind)
  const [nature, setNature] = useState<Category['spendingNature']>(category?.spendingNature ?? 'flexible')
  const [color, setColor] = useState(category?.color || presentation?.color || (initialKind === 'income' ? '#7C8A6B' : '#E2703A'))
  const [icon, setIcon] = useState<Category['icon']>(presentation?.iconName ?? (initialKind === 'income' ? 'work' : 'wallet'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !icon) return
    if (categories.some((item) => item.id !== category?.id && item.kind === kind && item.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A category with this name already exists.')
      return
    }
    setSaving(true)
    try {
      await onSave({ id: category?.id ?? crypto.randomUUID(), name: trimmed, kind, color, icon, spendingNature: kind === 'income' ? 'essential' : nature })
      onClose()
    } catch {
      setError('Could not save this category. Please try again.')
      setSaving(false)
    }
  }

  return <VaultSheet open label={category ? `Edit ${category.name}` : 'Create a category'} onClose={onClose}>
    <h2 className="vault-sheet-title">{category ? 'Edit' : 'New'} <em>category.</em></h2>
    <form className="category-editor-form" onSubmit={submit}>
      <label><span className="form-label">Name</span><input autoFocus className="form-input" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="e.g. Home repairs" /></label>
      <div className="vault-seg" role="group" aria-label="Category type"><button type="button" className={cn('vault-seg-btn', kind === 'expense' && 'is-spent')} aria-pressed={kind === 'expense'} onClick={() => setKind('expense')}>Expense</button><button type="button" className={cn('vault-seg-btn', kind === 'income' && 'is-spent')} aria-pressed={kind === 'income'} onClick={() => setKind('income')}>Income</button></div>
      {kind === 'expense' && <div className="vault-seg" role="group" aria-label="Spending type"><button type="button" className={cn('vault-seg-btn', nature === 'essential' && 'is-spent')} aria-pressed={nature === 'essential'} onClick={() => setNature('essential')}>Essential</button><button type="button" className={cn('vault-seg-btn', nature === 'flexible' && 'is-spent')} aria-pressed={nature === 'flexible'} onClick={() => setNature('flexible')}>Flexible</button></div>}
      <CategoryAppearancePicker color={color} icon={icon ?? 'wallet'} onColorChange={setColor} onIconChange={setIcon}/>
      {error && <p className="category-editor-error" role="alert">{error}</p>}
      <button className="vault-commit is-espresso" disabled={!name.trim() || saving} type="submit">{saving ? 'Saving...' : category ? 'Save category' : 'Create category'}</button>
      {category && <button className="category-editor-archive" type="button" onClick={async () => { setSaving(true); try { await onArchive(category.id); onClose() } catch { setError('Could not archive this category. Please try again.'); setSaving(false) } }} disabled={saving}>Archive category</button>}
    </form>
  </VaultSheet>
}

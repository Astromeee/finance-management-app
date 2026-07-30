import { Car, ChevronLeft, GraduationCap, Heart, Home, Music, PencilLine, Plus, Receipt, ShoppingBag, ShoppingBasket, Smartphone, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../utils/ui'
import type { Category, Transaction } from '../types/finance'

/* Categories manager (spec 22c) — colour-coded tiles with monthly total and
   transaction count. Colours/icons follow the design's palette by name,
   falling back to the category's own colour + a generic tag. */

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')

const STYLE: Array<{ match: RegExp; color: string; icon: LucideIcon }> = [
  { match: /din(e|ing)|food|restaurant/i, color: '#E2703A', icon: UtensilsCrossed },
  { match: /transport|fuel|travel|car/i, color: '#6B7A85', icon: Car },
  { match: /grocer/i, color: '#7C8A6B', icon: ShoppingBasket },
  { match: /bill|util|rent|housing/i, color: '#B08968', icon: Receipt },
  { match: /shop|cloth/i, color: '#9B6A7D', icon: ShoppingBag },
  { match: /health|care|medic/i, color: '#C79A3E', icon: Heart },
  { match: /fun|entertain|game/i, color: '#8A8A3F', icon: Music },
  { match: /mobile|internet|phone/i, color: '#6B7A85', icon: Smartphone },
  { match: /educat|school|fee/i, color: '#8A7B63', icon: GraduationCap },
  { match: /home|family/i, color: '#B08968', icon: Home },
]

function styleFor(category: Category) {
  const found = STYLE.find((entry) => entry.match.test(category.name))
  return { color: found?.color ?? category.color ?? '#9A8F7D', icon: found?.icon ?? Wallet }
}

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

  const addCategory = async () => {
    const name = window.prompt(`New ${kind} category`)?.trim()
    if (!name) return
    if (categories.some((item) => item.kind === kind && item.name.toLowerCase() === name.toLowerCase())) return
    await onSaveCategory({ id: crypto.randomUUID(), name, kind, color: kind === 'income' ? '#E2703A' : '#8A7B63', spendingNature: 'flexible' })
  }

  const editCategory = async (category: Category) => {
    const name = window.prompt('Rename category, or clear it to archive', category.name)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) { await onArchiveCategory(category.id); return }
    if (trimmed === category.name) return
    await onSaveCategory({ ...category, name: trimmed })
  }

  return (
    <div className="vault-screen">
      <header className="vault-detail-header relative flex items-center justify-center">
        <button aria-label="Back to settings" className="vault-iconbtn absolute left-0" type="button" onClick={() => onNavigate('settings')}><ChevronLeft size={18} strokeWidth={2} /></button>
        <p className="vault-eyebrow">Settings</p>
        <button aria-label="Edit categories" className="vault-iconbtn absolute right-0" type="button" onClick={() => shown[0] && void editCategory(shown[0])}><PencilLine size={15} strokeWidth={1.8} /></button>
      </header>

      <h1 className="vault-title">Categories</h1>

      <div className="vault-seg vault-catseg mt-6">
        <button className={cn('vault-seg-btn', kind === 'expense' && 'is-spent')} type="button" onClick={() => setKind('expense')}>Expenses</button>
        <button className={cn('vault-seg-btn', kind === 'income' && 'is-spent')} type="button" onClick={() => setKind('income')}>Income</button>
      </div>

      <p className="vault-cathelper mt-4">{shown.length} categories · drag to reorder, tap to edit</p>

      <div className="vault-catgrid mt-4">
        {shown.map((category) => {
          const { color, icon: Icon } = styleFor(category)
          const stat = stats.get(category.name.toLowerCase())
          return (
            <button key={category.id} className="vault-cattile" type="button" onClick={() => void editCategory(category)}>
              <span className="vault-cat-chip" style={{ background: color }}><Icon size={17} strokeWidth={2} /></span>
              <span className="vault-cat-name">{category.name}</span>
              <span className="vault-cat-stat">Rs {nf(stat?.total ?? 0)} · {stat?.count ?? 0}</span>
            </button>
          )
        })}
        <button className="vault-cattile is-new" type="button" onClick={() => void addCategory()}>
          <span className="vault-cat-chip"><Plus size={18} strokeWidth={2} /></span>
          <span className="vault-cat-name">New category</span>
        </button>
      </div>

      <div className="vault-cathint">
        <ShoppingBag className="mt-0.5 flex-none text-[var(--taupe)]" size={16} />
        <p>Long-press two tiles to <strong>merge</strong> them, or swipe a tile to archive without losing history.</p>
      </div>
    </div>
  )
}

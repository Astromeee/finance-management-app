import { Banknote, Building2, MoreHorizontal, PencilLine, Smartphone, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Account } from '../../types/finance'
import { formatPKR } from '../../utils/financeCalculations'
import { cn } from '../../utils/ui'

const iconMap: Record<Account['type'], LucideIcon> = { cash: Banknote, bank: Building2, wallet: Smartphone }

function readableTextClass(color: string) {
  const hex = color.replace('#', '')
  if (hex.length !== 6) return 'text-white'
  const [r, g, b] = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? 'text-[#151719]' : 'text-white'
}

function cardStyle(color: string): CSSProperties {
  return {
    background: `radial-gradient(circle at 84% 82%, rgba(255,255,255,.18), transparent 34%), linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 42%, #05070a))`,
  }
}

interface AccountPreviewCardProps {
  account: Account
  stacked?: boolean
  onEdit?: (account: Account) => void
  action?: 'edit' | 'adjust'
}

export function AccountPreviewCard({ account, stacked, onEdit, action = 'edit' }: AccountPreviewCardProps) {
  const Icon = iconMap[account.type]
  const ActionIcon = action === 'edit' ? PencilLine : MoreHorizontal
  const label = account.cardLabel || account.id.slice(0, 4).toUpperCase()

  return (
    <article className={cn('account-card', readableTextClass(account.color), stacked && 'account-card-stacked')} style={cardStyle(account.color)}>
      <div className="relative z-10 flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/18 shadow-inner shadow-white/10"><Icon size={21} /></span>
        {onEdit && (
          <button className="grid h-9 w-9 place-items-center rounded-full bg-black/18" aria-label={`${action === 'edit' ? 'Edit' : 'Adjust'} ${account.name}`} onClick={() => onEdit(account)}>
            <ActionIcon size={18} />
          </button>
        )}
      </div>
      <div className="relative z-10 mt-7">
        <p className="text-sm opacity-75">{account.name}</p>
        <h4 className="mt-1 text-3xl font-semibold tracking-tight">{formatPKR(account.balance)}</h4>
      </div>
      <div className="relative z-10 mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.16em] opacity-60">{account.type}</p>
        </div>
        <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-semibold">**** {label}</span>
      </div>
    </article>
  )
}

import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/ui'

interface MetricCardProps {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
  tone?: 'positive' | 'info' | 'accent' | 'negative'
  compact?: boolean
}

const tones = {
  positive: 'text-[var(--positive)]',
  info: 'text-[var(--info)]',
  accent: 'text-[var(--accent)]',
  negative: 'text-[var(--negative)]',
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'accent', compact }: MetricCardProps) {
  return (
    <article className={cn('card metric-card', compact && 'metric-card-compact')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted)] sm:text-sm">{label}</p>
          <h3 className="mt-1.5 text-xl font-semibold text-white sm:mt-2 sm:text-2xl">{value}</h3>
        </div>
        <span className={cn('metric-icon grid shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)]', tones[tone])}>
          <Icon size={compact ? 17 : 21} />
        </span>
      </div>
      {detail && <p className="mt-3 text-xs leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-sm">{detail}</p>}
    </article>
  )
}

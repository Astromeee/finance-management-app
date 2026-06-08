import { formatPKR, percent } from '../../utils/financeCalculations'
import { cn } from '../../utils/ui'

interface ProgressCardProps {
  title: string
  current: number
  total: number
  label: string
  status?: string
  dueDate?: string
  warning?: boolean
}

export function ProgressCard({ title, current, total, label, status, dueDate, warning }: ProgressCardProps) {
  const progress = percent(current, total)
  const remaining = Math.max(0, total - current)

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--muted)] sm:text-sm">{label}</p>
          <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">{title}</h3>
        </div>
        {status && (
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', status === 'Overdue' || warning ? 'bg-[rgba(233,141,103,.13)] text-[var(--negative)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>
            {status}
          </span>
        )}
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)] shadow-inner shadow-black/20 sm:mt-5">
        <div className={cn('h-full rounded-full shadow-[0_0_18px_currentColor]', warning ? 'bg-[var(--negative)] text-[var(--negative)]' : 'bg-[var(--accent)] text-[var(--accent)]')} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 sm:mt-4">
        <div>
          <p className="text-xs text-[var(--muted)] sm:text-sm">{formatPKR(current)} of {formatPKR(total)}</p>
          <p className="mt-1 text-xs text-[var(--muted-2)]">{formatPKR(remaining)} remaining{dueDate ? ` · Due ${dueDate}` : ''}</p>
        </div>
        <strong className="text-xl text-white">{progress}%</strong>
      </div>
    </article>
  )
}

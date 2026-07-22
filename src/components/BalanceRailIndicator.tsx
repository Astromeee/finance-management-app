import { cn } from '../utils/ui'

type BalanceRailItem = { id: string; label: string }

export function BalanceRailIndicator({ activeIndex, items, onSelect }: { activeIndex: number; items: BalanceRailItem[]; onSelect: (index: number) => void }) {
  if (items.length < 2) return null

  return (
    <nav aria-label="Balance card position" className="balance-rail-indicator">
      {items.map((item, index) => (
        <button
          key={item.id}
          aria-label={`Go to ${item.label}`}
          aria-current={index === activeIndex ? 'true' : undefined}
          className={cn('balance-rail-indicator-dot', index === activeIndex && 'is-active')}
          onClick={() => onSelect(index)}
          type="button"
        />
      ))}
    </nav>
  )
}

import { CircleEllipsis } from 'lucide-react'
import { useState } from 'react'
import { navItems } from '../../data/navigation'
import type { NavItem } from '../../types/finance'
import { cn } from '../../utils/ui'

function navigate(setActivePage: (page: string) => void, page: string) {
  setActivePage(page)
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

export function Sidebar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-[var(--border)] bg-[var(--bg-deep)] p-5 lg:block">
      <div className="flex items-center gap-3">
        <img className="h-12 w-12 rounded-2xl" src="/pocket-ledger-icon.png" alt="" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-white">Pocket Ledger</h1>
          <p className="text-sm text-[var(--muted)]">Personal finance</p>
        </div>
      </div>
      <nav className="mt-9 space-y-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={cn('nav-button w-full', activePage === id && 'nav-button-active')} onClick={() => navigate(setActivePage, id)}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-white">Moeed</p>
        <p>PKR · Local data</p>
      </div>
    </aside>
  )
}

/* Floating pill dock: the active tab is a compact "menu button" (a light circle)
   that expands into a labeled pill revealing the current page name when tapped.
   Inactive items are plain circular icon buttons. */
export function BottomNav({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  const primaryOrder = ['dashboard', 'transactions', 'accounts', 'budgets']
  const overflowOrder = ['goals', 'reports', 'settings']
  const mobileItems = primaryOrder
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
  const overflowItems = overflowOrder
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
  const activeOverflow = overflowItems.some((item) => item.id === activePage)
  // The active pill shows its page name by default; tapping the menu button
  // collapses it. Tracking the *collapsed* page (rather than a boolean) means
  // navigating always lands expanded again, with no state-syncing effect.
  const [collapsedPage, setCollapsedPage] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const openPage = (page: string) => {
    setMoreOpen(false)
    setCollapsedPage(null)
    navigate(setActivePage, page)
  }

  return (
    <>
      {moreOpen && (
        <div className="dock-v3-more" role="menu" aria-label="More destinations">
          {overflowItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={activePage === id ? 'page' : undefined}
              className={cn('dock-v3-more-item', activePage === id && 'dock-v3-more-item-active')}
              onClick={() => openPage(id)}
              role="menuitem"
              type="button"
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      <nav className="dock-v3" aria-label="Primary navigation">
        {mobileItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id
          if (active) {
            const expanded = collapsedPage !== id
            return (
              <button
                key={id}
                type="button"
                className={cn('dock-v3-active', expanded && 'dock-v3-active-expanded')}
                aria-current="page"
                aria-expanded={expanded}
                aria-label={expanded ? `${label}, current page, hide name` : `${label}, current page, show name`}
                onClick={() => setCollapsedPage(expanded ? id : null)}
              >
                <span className="dock-v3-label">{label}</span>
                <span className="dock-v3-circle"><Icon size={19} /></span>
              </button>
            )
          }
          return (
            <button key={id} type="button" aria-label={label} className="dock-v3-icon" onClick={() => openPage(id)}>
              <Icon size={23} />
            </button>
          )
        })}
        {activeOverflow ? (
          <button
            type="button"
            className={cn('dock-v3-active', collapsedPage !== 'more' && 'dock-v3-active-expanded')}
            aria-current="page"
            aria-expanded={moreOpen}
            aria-label="More destinations"
            onClick={() => {
              setCollapsedPage(collapsedPage === 'more' ? 'more' : null)
              setMoreOpen((open) => !open)
            }}
          >
            <span className="dock-v3-label">More</span>
            <span className="dock-v3-circle"><CircleEllipsis size={19} /></span>
          </button>
        ) : (
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label="More destinations"
            className="dock-v3-icon"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <CircleEllipsis size={23} />
          </button>
        )}
      </nav>
    </>
  )
}

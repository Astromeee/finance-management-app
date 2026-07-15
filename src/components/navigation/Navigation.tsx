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

/* Floating pill dock (home mock): active item = label + light circle icon,
   inactive items = plain circular icon buttons. */
export function BottomNav({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  const order = ['dashboard', 'transactions', 'budgets', 'goals', 'reports']
  const mobileItems = order
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))

  return (
    <nav className="dock-v3" aria-label="Primary navigation">
      {mobileItems.map(({ id, label, icon: Icon }) => {
        const active = activePage === id
        if (active) {
          return (
            <button key={id} className="dock-v3-active" onClick={() => navigate(setActivePage, id)}>
              <span>{label}</span>
              <span className="dock-v3-circle"><Icon size={19} /></span>
            </button>
          )
        }
        return (
          <button key={id} aria-label={label} className="dock-v3-icon" onClick={() => navigate(setActivePage, id)}>
            <Icon size={20} />
          </button>
        )
      })}
    </nav>
  )
}

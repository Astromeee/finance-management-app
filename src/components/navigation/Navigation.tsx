import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation'
import { cn } from '../../utils/ui'

function navigate(setActivePage: (page: string) => void, page: string) {
  setActivePage(page)
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

export function Sidebar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/8 bg-[var(--bg-deep)]/88 p-5 backdrop-blur-xl lg:block">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[1.25rem] bg-[var(--accent)] font-bold text-[#171910] shadow-lg shadow-[rgba(221,255,69,.12)]">PL</div>
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
      <div className="mt-8 rounded-3xl border border-white/8 bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-white">Moeed</p>
        <p>Dark mode · PKR · Local data</p>
      </div>
    </aside>
  )
}

export function BottomNav({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  const mobileItems = navItems.filter((item) => ['dashboard', 'transactions', 'accounts', 'goals', 'reports'].includes(item.id))
  const activeWidths: Record<string, number> = {
    dashboard: 134,
    transactions: 174,
    accounts: 132,
    goals: 128,
    reports: 162,
  }
  return (
    <nav className="mobile-nav-dock" aria-label="Primary navigation">
      {mobileItems.map(({ id, label, icon: Icon }) => {
        const active = activePage === id
        return (
          <motion.button
            key={id}
            layout
            aria-label={label}
            className={cn('mobile-nav-item', active && 'mobile-nav-item-active')}
            initial={false}
            animate={{ width: active ? activeWidths[id] : 62 }}
            transition={{ type: 'spring', stiffness: 760, damping: 42, mass: 0.42 }}
            onClick={() => navigate(setActivePage, id)}
          >
            {active && <motion.span className="mobile-nav-label" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.1 }}>{label}</motion.span>}
            <span className="mobile-nav-icon">
              <Icon size={21} />
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}

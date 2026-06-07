import { navItems } from '../../data/navigation'
import { cn } from '../../utils/ui'

export function Sidebar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/8 bg-[var(--bg-deep)] p-5 lg:block">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] font-bold text-[#171910]">PL</div>
        <div>
          <h1 className="text-xl font-semibold text-white">Pocket Ledger</h1>
          <p className="text-sm text-[var(--muted)]">Personal finance</p>
        </div>
      </div>
      <nav className="mt-9 space-y-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={cn('nav-button w-full', activePage === id && 'nav-button-active')} onClick={() => setActivePage(id)}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto rounded-3xl border border-white/8 bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-white">Moeed</p>
        <p>Dark mode · PKR · Local data</p>
      </div>
    </aside>
  )
}

export function BottomNav({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  const mobileItems = navItems.filter((item) => ['dashboard', 'transactions', 'accounts', 'goals', 'reports'].includes(item.id))
  return (
    <nav className="fixed inset-x-5 bottom-4 z-30 rounded-[1.45rem] border border-white/10 bg-[#17181b]/94 px-2 py-2 shadow-2xl shadow-black/45 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-5 gap-1">
        {mobileItems.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-label={label} className={cn('grid h-12 place-items-center rounded-2xl text-[var(--muted)] transition', activePage === id && 'bg-[var(--surface-3)] text-white shadow-inner shadow-white/5')} onClick={() => setActivePage(id)}>
            <Icon size={20} />
          </button>
        ))}
      </div>
    </nav>
  )
}

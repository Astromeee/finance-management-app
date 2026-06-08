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
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-max -translate-x-1/2 rounded-full border border-white/10 bg-[#17181b]/68 px-5 py-2 shadow-2xl shadow-black/45 backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-5 gap-2">
        {mobileItems.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-label={label} className={cn('grid h-11 w-11 place-items-center rounded-full text-[var(--muted)] transition hover:text-white', activePage === id && 'bg-[var(--accent)] text-[#101214] shadow-[0_10px_28px_rgba(221,255,69,.22)] ring-1 ring-[rgba(221,255,69,.28)] hover:text-[#101214] [&_svg]:text-[#101214] hover:[&_svg]:text-[#101214]')} onClick={() => navigate(setActivePage, id)}>
            <Icon size={20} />
          </button>
        ))}
      </div>
    </nav>
  )
}

import { ArrowDown, ArrowLeftRight, ArrowUpRight, Calculator, Hourglass, House, List, PieChart, Plus, Target } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { navItems } from '../../data/navigation'
import { cn } from '../../utils/ui'

export type AddAction = 'expense' | 'income' | 'transfer' | 'cooloff' | 'simulator'

function navigate(setActivePage: (page: string) => void, page: string) {
  setActivePage(page)
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

export function Sidebar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-[var(--rule)] bg-[var(--bone)] p-5 lg:block">
      <div className="flex items-center gap-3">
        <img className="h-12 w-12 rounded-2xl" src="/pocket-ledger-icon.png" alt="" aria-hidden="true" />
        <div>
          <h1 className="font-display text-2xl text-[var(--ink)]">Pocket <em className="italic text-[var(--clay)]">ledger.</em></h1>
          <p className="text-sm text-[var(--taupe)]">Personal finance</p>
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
      <div className="vault-outline mt-8 p-4 text-sm text-[var(--taupe)]">
        <p className="font-semibold text-[var(--ink)]">Moeed</p>
        <p>PKR · Local data</p>
      </div>
    </aside>
  )
}

/* FAB menu actions (spec 19a §3) — bottom→top order = frequency, each circle
   wears its destination's color so the palette reads as a vocabulary. */
const FAB_ACTIONS: Array<{ action: AddAction; label: string; circle: string; icon: typeof ArrowUpRight }> = [
  { action: 'expense', label: 'Record spent', circle: 'is-bone', icon: ArrowUpRight },
  { action: 'income', label: 'Record received', circle: 'is-clay', icon: ArrowDown },
  { action: 'transfer', label: 'Move money', circle: 'is-espresso', icon: ArrowLeftRight },
  { action: 'cooloff', label: 'Cool off a buy', circle: 'is-dashed', icon: Hourglass },
  /* the affordability check shares the "about to spend" moment with cool-off.
     It had no entry point on any surface until it was added here. */
  { action: 'simulator', label: 'Can I afford it?', circle: 'is-dashed', icon: Calculator },
]

/* "The Vault" dock (spec §5.7) — a floating espresso pill with exactly four
   destinations (Home · Ledger · Paths · Insights) plus a separate clay FAB.
   The third slot used to swap between Wallet/Plan/Goals depending on the
   current page, which meant it could only ever confirm you had arrived at
   Paths, never take you there. It is now a fixed Paths destination; Wallet
   and Plan keep their Home shortcuts ("Open wallet" / "Open plan") and
   Wallet is also in Settings. The FAB opens the 19a action fan. */
/* Pushed detail screens (reached from a link, dismissed with their own back
   chevron) hide the dock + FAB to match the design. */
const DOCKLESS_PAGES = new Set(['settings', 'categories', 'profile'])

export function BottomNav({ activePage, setActivePage, onAdd }: { activePage: string; setActivePage: (page: string) => void; onAdd: (action: AddAction) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  const slots = [
    { id: 'dashboard', label: 'Home', icon: House },
    { id: 'transactions', label: 'Ledger', icon: List },
    { id: 'goals', label: 'Paths', icon: Target },
    { id: 'reports', label: 'Insights', icon: PieChart },
  ]

  // Escape closes; Tab cycles between the four actions and the FAB (a11y trap).
  useEffect(() => {
    if (!menuOpen) return
    window.setTimeout(() => menuRef.current?.querySelector('button')?.focus(), 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        fabRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('button') ?? []), fabRef.current].filter(Boolean) as HTMLElement[]
      if (!items.length) return
      const index = items.indexOf(document.activeElement as HTMLElement)
      event.preventDefault()
      const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index === items.length - 1 ? 0 : index + 1)
      items[next].focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const pick = (action: AddAction) => {
    setMenuOpen(false)
    onAdd(action)
  }

  if (DOCKLESS_PAGES.has(activePage)) return null

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="fab-scrim"
            aria-hidden
            className="vault-fabmenu-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className={cn('vault-dock-wrap lg:hidden', menuOpen && 'is-menu-open')}>
        <nav className="vault-dock" aria-label="Primary navigation">
          {slots.map(({ id, label, icon: Icon }) => {
            const active = activePage === id
            return (
              <button
                key={label}
                type="button"
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn('vault-dock-btn', active && 'is-active')}
                onClick={() => { if (!active) navigate(setActivePage, id) }}
              >
                <Icon size={18} strokeWidth={2} />
              </button>
            )
          })}
        </nav>
        {/* The FAB and its action fan share one positioning context, so the
            circles sit dead-centre over the + button on every screen width. */}
        <div className="vault-fab-wrap">
          <AnimatePresence>
            {menuOpen && (
              <div key="fab-menu" ref={menuRef} className="vault-fabmenu" role="menu" aria-label="Add to the ledger">
                {FAB_ACTIONS.map(({ action, label, circle, icon: Icon }, index) => (
                  <motion.button
                    key={action}
                    className="vault-fabmenu-item"
                    role="menuitem"
                    type="button"
                    initial={{ opacity: 0, y: 18, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.9, transition: { duration: 0.12, delay: (FAB_ACTIONS.length - 1 - index) * 0.02 } }}
                    transition={{ type: 'spring', stiffness: 480, damping: 22, delay: index * 0.03 }}
                    onClick={() => pick(action)}
                  >
                    <span className="vault-fabmenu-label">{label}</span>
                    <span className={cn('vault-fabmenu-circle', circle)}><Icon size={20} strokeWidth={2} /></span>
                  </motion.button>
                ))}
              </div>
            )}
          </AnimatePresence>
          <button
            ref={fabRef}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={menuOpen ? 'Close menu' : 'Add entry'}
            className={cn('vault-fab', menuOpen && 'is-open')}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="vault-fab-icon"><Plus size={22} strokeWidth={2.2} /></span>
          </button>
        </div>
      </div>
    </>
  )
}

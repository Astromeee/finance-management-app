import { Plus, UserRound } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { BottomNav, Sidebar } from '../navigation/Navigation'

interface AppShellProps {
  activePage: string
  title: string
  subtitle: string
  children: ReactNode
  setActivePage: (page: string) => void
  onAdd: () => void
}

export function AppShell({ activePage, title, subtitle, children, setActivePage, onAdd }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#151619_0%,#111214_48%,#0d0e10_100%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="w-full pb-[calc(7.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[var(--bg-deep)]/88 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">{title}</h2>
                <p className="mt-1 hidden text-sm text-[var(--muted)] sm:block">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <select className="hidden rounded-2xl border border-white/10 bg-[var(--surface-2)] px-4 py-3 text-sm text-white outline-none sm:block">
                  <option>June 2026</option>
                </select>
                <button className="btn-primary desktop-quick-add" onClick={onAdd}>
                  <Plus size={18} />
                  Quick add
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[var(--surface-2)] text-[var(--text)] lg:hidden" aria-label="Profile">
                  <UserRound size={18} />
                </button>
              </div>
            </div>
          </header>
          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <button aria-label="Add transaction" className="fixed bottom-[calc(5.85rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)] text-[#171910] shadow-2xl shadow-black/30 transition hover:scale-105 sm:hidden" onClick={onAdd}>
        <Plus size={21} />
      </button>
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  )
}

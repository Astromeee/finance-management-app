import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { BottomNav, Sidebar } from '../navigation/Navigation'

interface AppShellProps {
  activePage: string
  children: ReactNode
  setActivePage: (page: string) => void
}

export function AppShell({ activePage, children, setActivePage }: AppShellProps) {
  const isDashboard = activePage === 'dashboard'

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(221,255,69,.08),transparent_24rem),linear-gradient(180deg,#151619_0%,#111214_48%,#0d0e10_100%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="w-full pb-[calc(8.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${isDashboard ? 'py-0 sm:py-5' : 'pt-[max(1.4rem,calc(env(safe-area-inset-top)+0.75rem))] pb-4 sm:py-5'}`}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  )
}

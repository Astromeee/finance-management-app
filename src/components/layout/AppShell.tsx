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
      <div className="pointer-events-none fixed inset-0" />
      <div className="relative flex min-h-screen">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="w-full pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0">
          {/* keyed remount replays a lightweight CSS fade per page — no JS opacity
              tween to stall the heavily-animated Goals/Analytics screens */}
          <div key={activePage} className={`app-shell-page pl-page-enter mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${isDashboard ? 'py-0 sm:py-5' : 'pt-[max(1.1rem,calc(env(safe-area-inset-top)+0.55rem))] pb-4 sm:py-5'}`}>
            {children}
          </div>
        </main>
      </div>
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  )
}

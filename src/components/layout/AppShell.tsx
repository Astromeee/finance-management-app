import type { ReactNode } from 'react'
import { BottomNav, Sidebar, type AddAction } from '../navigation/Navigation'

/* The six Vault screens own their padding via .vault-screen (26px sides,
   118px dock clearance) — the shell stays out of their way. Legacy screens
   (settings/profile) keep the old shell padding. */
const VAULT_PAGES = new Set(['dashboard', 'transactions', 'accounts', 'budgets', 'goals', 'reports'])

interface AppShellProps {
  activePage: string
  children: ReactNode
  setActivePage: (page: string) => void
  onAdd: (action: AddAction) => void
}

export function AppShell({ activePage, children, setActivePage, onAdd }: AppShellProps) {
  const isVaultPage = VAULT_PAGES.has(activePage)

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="relative flex min-h-screen">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className={`w-full ${isVaultPage ? '' : 'pb-[calc(7rem+env(safe-area-inset-bottom))]'} lg:pb-0`}>
          {/* keyed remount replays a lightweight CSS fade per page — no JS opacity
              tween to stall the heavily-animated Goals/Analytics screens */}
          <div key={activePage} className={`app-shell-page pl-page-enter mx-auto ${isVaultPage ? 'w-full' : 'max-w-7xl px-4 pt-[max(1.1rem,calc(env(safe-area-inset-top)+0.55rem))] pb-4 sm:px-6 sm:py-5 lg:px-8'}`}>
            {children}
          </div>
        </main>
      </div>
      <BottomNav activePage={activePage} setActivePage={setActivePage} onAdd={onAdd} />
    </div>
  )
}

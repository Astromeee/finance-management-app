import { BookOpen, Database, Download, Moon, Sun, Upload, Wallet } from 'lucide-react'
import { useState } from 'react'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'

/**
 * Settings — V3 redesign.
 * Same 8 items, now grouped (iOS-style) with a working dark/light toggle.
 */

export function Settings() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())

  const onToggleTheme = () => setThemeState(toggleTheme())

  const groups: { heading: string; items: { title: string; detail: string; icon: typeof Moon; trailing?: 'theme' }[] }[] = [
    {
      heading: 'Preferences',
      items: [
        { title: 'Currency', detail: 'PKR / Rs.', icon: Wallet },
        { title: 'Theme', detail: theme === 'dark' ? 'Dark — orange on black' : 'Light — orange on white', icon: theme === 'dark' ? Moon : Sun, trailing: 'theme' },
      ],
    },
    {
      heading: 'Data',
      items: [
        { title: 'Manage categories', detail: 'Income sources and expense groups', icon: BookOpen },
        { title: 'Manage accounts', detail: 'Cash, banks, and wallets', icon: Database },
        { title: 'Export data', detail: 'Placeholder for CSV/XLSX export', icon: Download },
        { title: 'Import bank statement', detail: 'Placeholder for future import flow', icon: Upload },
      ],
    },
    {
      heading: 'About',
      items: [
        { title: 'Supabase connection', detail: 'Not connected yet', icon: Database },
        { title: 'Documentation', detail: 'See /docs for product notes', icon: BookOpen },
      ],
    },
  ]

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      {groups.map((group) => (
        <section key={group.heading}>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-2)]">{group.heading}</p>
          <div className="overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
            {group.items.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-4 px-4 py-3.5"
                  style={{ borderTop: index > 0 ? '1px solid var(--border)' : undefined }}
                >
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-[14px] border border-[rgba(255,92,0,.22)] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{item.detail}</p>
                  </div>
                  {item.trailing === 'theme' && (
                    <button
                      role="switch"
                      aria-checked={theme === 'light'}
                      aria-label="Toggle light theme"
                      onClick={onToggleTheme}
                      className="relative h-8 w-14 flex-none rounded-full transition-colors"
                      style={{ background: theme === 'light' ? '#FF5C00' : 'var(--surface-3)' }}
                    >
                      <span
                        className="absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow-md transition-all"
                        style={{ left: theme === 'light' ? 'calc(100% - 1.75rem)' : '0.25rem' }}
                      >
                        {theme === 'light' ? <Sun size={13} color="#FF5C00" /> : <Moon size={13} color="#6E6B66" />}
                      </span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

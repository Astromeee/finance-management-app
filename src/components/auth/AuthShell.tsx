import type { ReactNode } from 'react'

export function AuthShell({ children, panel, progress, variant }: {
  children: ReactNode
  panel?: ReactNode
  progress?: ReactNode
  variant: 'login' | 'wizard'
}) {
  return <main className={`ao-page is-${variant}`}>
    <div className={`ao-shell is-${variant}`}>
      {panel && <aside className="ao-panel">{panel}</aside>}
      <section className="ao-surface">
        {progress && <div className="ao-surface-progress">{progress}</div>}
        <div className="ao-surface-body">{children}</div>
      </section>
    </div>
  </main>
}

import type { ReactNode } from 'react'
import { BrandLockup } from './BrandLockup'
import { FeatureRibbon } from './FeatureRibbon'

/** The auth/onboarding chrome.
 *
 *  `login` renders the desktop "Dark Room": one full-bleed espresso plane with
 *  a top bar, a centred form column and the feature ribbon pinned to the bottom
 *  edge. Below 900px that chrome is hidden and the children fall back to the
 *  mobile hero-band + sheet layout.
 *
 *  `wizard` is unchanged: the espresso rail + cream question surface. */
export function AuthShell({ children, panel, progress, topRight, variant }: {
  children: ReactNode
  panel?: ReactNode
  progress?: ReactNode
  topRight?: ReactNode
  variant: 'login' | 'wizard'
}) {
  const isLogin = variant === 'login'
  return <main className={`ao-page is-${variant}`}>
    <div className={`ao-shell is-${variant}`}>
      {isLogin && <header className="ao-topbar">
        <BrandLockup tone="espresso" />
        {topRight && <div className="ao-topswitch">{topRight}</div>}
      </header>}
      {panel && <aside className="ao-panel">{panel}</aside>}
      <section className="ao-surface">
        {progress && <div className="ao-surface-progress">{progress}</div>}
        <div className="ao-surface-body">{children}</div>
      </section>
      {isLogin && <FeatureRibbon />}
    </div>
  </main>
}

import { useEffect, useState } from 'react'

/* The real Pocket Ledger geometry, animated as if each ledger line is being
   written. This one mark is shared by startup, route and widget-popup waits. */
export function LedgerMark({ compact = false, showCopy = true }: { compact?: boolean; showCopy?: boolean }) {
  return (
    <div className={`pl-loader-mark${compact ? ' is-compact' : ''}`}>
      <style>{`
        .pl-loader-mark{display:flex;flex-direction:column;align-items:center;gap:20px;color:#2B241D}
        .pl-loader-logo{width:100px;height:100px;filter:drop-shadow(0 20px 20px rgba(43,36,29,.2))}
        .pl-loader-line{transform-box:fill-box;transform-origin:left center;animation:pl-line-write 2.8s cubic-bezier(.3,0,.2,1) infinite}
        .pl-loader-line:nth-child(2){animation-delay:.18s}.pl-loader-line:nth-child(3){animation-delay:.36s}
        .pl-loader-cursor{animation:pl-cursor-ink 2.8s ease infinite}
        .pl-loader-wordmark{margin:0;font-family:'Instrument Serif',Georgia,serif;font-size:24px;letter-spacing:-.5px}
        .pl-loader-wordmark em{color:#E2703A}.pl-loader-label{margin:5px 0 0;font:600 10px 'Schibsted Grotesk',sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#9A8F7D;text-align:center}
        .pl-loader-mark.is-compact{gap:10px;min-height:112px;justify-content:center}.pl-loader-mark.is-compact .pl-loader-logo{width:54px;height:54px;filter:drop-shadow(0 10px 12px rgba(43,36,29,.16))}.pl-loader-mark.is-compact .pl-loader-wordmark{font-size:18px}.pl-loader-mark.is-compact .pl-loader-label{font-size:8px;letter-spacing:1.2px}
        @keyframes pl-line-write{0%,8%{transform:scaleX(.08);opacity:.25}35%,78%{transform:scaleX(1);opacity:1}100%{transform:scaleX(.08);opacity:.25}}
        @keyframes pl-cursor-ink{0%,30%,100%{opacity:.4}45%,85%{opacity:1}}
        @media(prefers-reduced-motion:reduce){.pl-loader-line,.pl-loader-cursor{animation:none!important}}
      `}</style>
      <svg className="pl-loader-logo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="114" fill="#2B241D"/><g fill="#F3EEE4"><rect className="pl-loader-line" x="136" y="153" width="240" height="42" rx="13"/><rect className="pl-loader-line" x="136" y="235" width="240" height="42" rx="13"/><rect className="pl-loader-line" x="136" y="317" width="150" height="42" rx="13"/></g><rect className="pl-loader-cursor" x="304" y="317" width="42" height="42" rx="13" fill="#E2703A"/></svg>
      {showCopy && <div><p className="pl-loader-wordmark">Pocket <em>ledger.</em></p><p className="pl-loader-label">Every rupee, written</p></div>}
    </div>
  )
}

/**
 * Pocket Ledger splash — "the ledger boots", Vault edition.
 * Mount once near the root (see main.tsx). Self-dismisses after `duration` ms.
 * Pure overlay: no interaction with app state.
 */
export function SplashScreen({ duration = 2000 }: { duration?: number }) {
  const [phase, setPhase] = useState<'shown' | 'leaving' | 'gone'>('shown')

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('leaving'), duration)
    const t2 = window.setTimeout(() => setPhase('gone'), duration + 450)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [duration])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        background: '#F3EEE4',
        opacity: phase === 'leaving' ? 0 : 1,
        transition: 'opacity 420ms ease',
        pointerEvents: phase === 'leaving' ? 'none' : 'auto',
      }}
    >
      <LedgerMark />
    </div>
  )
}

/**
 * Persistent loader — the same animated logo, shown while a lazy page
 * chunk or the private ledger data is loading. No PL block, no text:
 * just the mark, matching the boot splash exactly. `fill` sits inside a
 * container; the default overlays the viewport (bone canvas over the app).
 */
export function LedgerLoader({ fill = false, compact = false, label = 'Loading' }: { fill?: boolean; compact?: boolean; label?: string }) {
  return (
    <div
      aria-label={label}
      aria-busy="true"
      role="status"
      style={{
        position: fill ? 'absolute' : 'fixed',
        inset: 0,
        zIndex: fill ? 5 : 9990,
        display: 'grid',
        placeItems: 'center',
        background: '#F3EEE4',
      }}
    >
      <LedgerMark compact={compact} />
    </div>
  )
}

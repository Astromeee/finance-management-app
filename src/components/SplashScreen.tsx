import { useEffect, useState } from 'react'

/* Shared animated mark — espresso tile, bone ledger bars, clay cursor,
   wordmark, and the sweep loader. Used by both the boot splash and the
   in-app loader so every "loading" state looks identical. */
function LedgerMark() {
  const bar = (width: string, delay: string) => ({
    display: 'block',
    width,
    height: 9,
    borderRadius: 2.5,
    background: '#F3EEE4',
    transformOrigin: 'left center',
    animation: `pl-bar-grow 3.4s ease-in-out ${delay} infinite`,
  } as const)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
      <style>{`
        @keyframes pl-bar-grow { 0%{transform:scaleX(0)} 18%{transform:scaleX(1)} 82%{transform:scaleX(1)} 94%,100%{transform:scaleX(0)} }
        @keyframes pl-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pl-sweep { 0%{left:0} 100%{left:138px} }
      `}</style>

      {/* Logo tile */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          background: '#2B241D',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(43,36,29,.35)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: 52 }}>
          <span style={bar('52px', '0s')} />
          <span style={bar('52px', '0.35s')} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={bar('30px', '0.7s')} />
            <span style={{ display: 'block', width: 9, height: 9, borderRadius: 2.5, background: '#E2703A', animation: 'pl-cursor 1.1s steps(1) infinite' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 24, fontWeight: 400, letterSpacing: '-0.5px', color: '#2B241D' }}>
          Pocket <em style={{ color: '#E2703A' }}>ledger.</em>
        </p>
        <p style={{ margin: 0, fontFamily: "'Schibsted Grotesk',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 2.2, textTransform: 'uppercase', color: '#9A8F7D' }}>Every rupee, written</p>
      </div>

      {/* sweep loader */}
      <div style={{ position: 'relative', width: 148, height: 4, borderRadius: 2, background: '#E6DECD' }}>
        <span style={{ position: 'absolute', top: -3, left: 0, width: 10, height: 10, borderRadius: 3, background: '#E2703A', animation: 'pl-sweep 1.6s ease-in-out infinite alternate' }} />
      </div>
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
export function LedgerLoader({ fill = false, label = 'Loading' }: { fill?: boolean; label?: string }) {
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
      <LedgerMark />
    </div>
  )
}

import { useEffect, useState } from 'react'

/**
 * Pocket Ledger splash — "the ledger boots".
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

  const light = document.documentElement.getAttribute('data-theme') === 'light'
  const barColor = '#F6F3EF'

  const bar = (width: string, delay: string) => ({
    display: 'block',
    width,
    height: 9,
    borderRadius: 2.5,
    background: barColor,
    transformOrigin: 'left center',
    animation: `pl-bar-grow 3.4s ease-in-out ${delay} infinite`,
  } as const)

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        background: light
          ? 'radial-gradient(80% 46% at 76% 22%, rgba(242,100,25,.85) 0%, rgba(255,138,71,.45) 42%, transparent 72%), radial-gradient(55% 32% at 8% 100%, rgba(255,178,122,.5), transparent 68%), #FFFDFB'
          : 'radial-gradient(85% 48% at 82% 12%, #F26419 0%, #D14E0C 30%, rgba(199,75,14,.38) 55%, transparent 76%), radial-gradient(60% 35% at 12% 96%, rgba(242,100,25,.22), transparent 68%), #1B1A19',
        opacity: phase === 'leaving' ? 0 : 1,
        transition: 'opacity 420ms ease',
        pointerEvents: phase === 'leaving' ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes pl-bar-grow { 0%{transform:scaleX(0)} 18%{transform:scaleX(1)} 82%{transform:scaleX(1)} 94%,100%{transform:scaleX(0)} }
        @keyframes pl-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pl-sweep { 0%{left:0} 100%{left:138px} }
      `}</style>

      {/* Logo C tile */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          background: '#16130F',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.07) inset',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: 52 }}>
          <span style={bar('52px', '0s')} />
          <span style={bar('52px', '0.35s')} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={bar('30px', '0.7s')} />
            <span style={{ display: 'block', width: 9, height: 9, borderRadius: 2.5, background: '#FF5C00', animation: 'pl-cursor 1.1s steps(1) infinite' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <p style={{ margin: 0, fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: '-0.5px', color: light ? '#16130F' : '#F6F3EF' }}>Pocket Ledger</p>
        <p style={{ margin: 0, fontSize: 11.5, letterSpacing: 3, textTransform: 'uppercase', color: light ? 'rgba(22,19,15,.5)' : 'rgba(246,243,239,.55)' }}>Every rupee, written</p>
      </div>

      {/* sweep loader */}
      <div style={{ position: 'relative', width: 148, height: 4, borderRadius: 2, background: light ? 'rgba(22,19,15,.14)' : 'rgba(255,255,255,.14)' }}>
        <span style={{ position: 'absolute', top: -3, left: 0, width: 10, height: 10, borderRadius: 3, background: '#FF5C00', animation: 'pl-sweep 1.6s ease-in-out infinite alternate' }} />
      </div>
    </div>
  )
}

import { animate, motion, useMotionValue } from 'framer-motion'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { hapticTap } from './numpad'

/**
 * "The Vault" bottom-sheet shell (spec 17a §1 / CHANGES "System consistency"):
 * bone + paper-grain surface, 36px top radius, 40×4 drag handle, scrim #181410.
 * Drag down anywhere (when the content is scrolled to the top) or tap the scrim
 * to dismiss — same pointer-capture trick as BottomSheet so tall content still
 * scrolls normally. Escape closes; focus is trapped while open.
 */
export function VaultSheet({
  open,
  label,
  compact,
  onClose,
  children,
}: {
  open: boolean
  label: string
  /** Move sheet uses the slightly shorter 58px numpad keys (spec 18a §6). */
  compact?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const y = useMotionValue(0)
  const dialogRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ startY: 0, active: false, pointerId: -1 })

  // slide-up entrance each time it opens
  useEffect(() => {
    if (!open) return
    y.set(64)
    const controls = animate(y, 0, { type: 'spring', stiffness: 260, damping: 30 })
    return () => controls.stop()
  }, [open, y])

  // Escape + focus trap
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    window.setTimeout(() => (focusable()[0] ?? dialog)?.focus(), 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  const onPointerDown = (event: ReactPointerEvent) => {
    if (!event.isPrimary) return
    drag.current = { startY: event.clientY, active: false, pointerId: event.pointerId }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const state = drag.current
    if (state.pointerId !== event.pointerId) return
    const delta = event.clientY - state.startY
    if (!state.active) {
      // only start a dismiss-drag when swiping down with the content at the top
      if (delta > 8 && (scrollRef.current?.scrollTop ?? 0) <= 0) {
        state.active = true
        try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) } catch { /* ignore */ }
      } else {
        return
      }
    }
    y.set(Math.max(0, event.clientY - state.startY))
  }

  const endDrag = (event: ReactPointerEvent) => {
    const state = drag.current
    if (state.pointerId !== event.pointerId) return
    if (!state.active) return
    state.active = false
    if (y.get() > 96) onClose()
    else animate(y, 0, { type: 'spring', stiffness: 420, damping: 38 })
  }

  return (
    <div className="vault-sheet-scrim" onPointerDown={onClose}>
      <motion.section
        ref={dialogRef}
        aria-label={label}
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        style={{ y, touchAction: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`vault-sheet${compact ? ' is-compact' : ''}`}
        onPointerDown={(event) => { event.stopPropagation(); onPointerDown(event) }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span aria-hidden className="vault-sheet-handle" />
        <div ref={scrollRef} className="vault-sheet-body" style={{ touchAction: 'pan-y' }}>
          {children}
        </div>
      </motion.section>
    </div>
  )
}

export function Numpad({ onKey }: { onKey: (key: string) => void }) {
  const press = (key: string) => {
    hapticTap()
    onKey(key)
  }
  return (
    <div className="vault-numpad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <button key={digit} className="vault-key" type="button" onClick={() => press(digit)}>{digit}</button>
      ))}
      <button aria-label="Decimal point" className="vault-key is-quiet" type="button" onClick={() => press('.')}>·</button>
      <button className="vault-key" type="button" onClick={() => press('0')}>0</button>
      <button aria-label="Delete last digit" className="vault-key is-quiet" type="button" onClick={() => press('back')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 6H8l-5 6 5 6h13a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z" />
          <path d="m12 9 6 6M18 9l-6 6" />
        </svg>
      </button>
    </div>
  )
}

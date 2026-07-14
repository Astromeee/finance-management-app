import { X } from 'lucide-react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

/**
 * Bottom sheet that can be swiped down to dismiss from ANYWHERE on it, not
 * just the top handle — and still lets tall forms scroll normally.
 *
 * The trick for touchscreens: the sheet frame is the drag surface
 * (touch-action: none) while the content lives in a separate inner scroller
 * (touch-action: pan-y). A downward drag only becomes a dismiss gesture when
 * the content is already scrolled to the top; otherwise the browser scrolls
 * the content as usual. Drag is driven manually via pointer events (with
 * pointer capture) so the browser never steals the gesture the way it did
 * when the scroll container and the draggable were the same element.
 */
export function BottomSheet({
  title,
  eyebrow,
  open,
  onClose,
  children,
}: {
  title: string
  eyebrow: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const y = useMotionValue(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ startY: 0, active: false, pointerId: -1 })

  // slide-up entrance each time it opens
  useEffect(() => {
    if (!open) return
    y.set(56)
    const controls = animate(y, 0, { type: 'spring', stiffness: 260, damping: 30 })
    return () => controls.stop()
  }, [open, y])

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
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onPointerDown={onClose}>
      <motion.section
        style={{ y, touchAction: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto flex max-h-[86svh] w-full max-w-lg select-none flex-col rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem]"
        onPointerDown={(event) => { event.stopPropagation(); onPointerDown(event) }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="shrink-0 px-4 pt-3 sm:px-5">
          <span aria-hidden className="mx-auto mb-3 block h-1.5 w-14 rounded-full bg-white/18" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">{eyebrow}</p>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label={`Close ${title}`}><X size={19} /></button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="modal-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-5"
          style={{ touchAction: 'pan-y' }}
        >
          {children}
        </div>
      </motion.section>
    </div>
  )
}

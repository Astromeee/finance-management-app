import { useEffect, useRef } from 'react'

const layers = new Map<symbol, () => void>()
let installed = false
let consuming = false
let queued = false
function reconcile() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    if (consuming) return
    const marked = Boolean(window.history.state?.pocketOverlay)
    if (layers.size && !marked) window.history.pushState({ ...window.history.state, pocketOverlay: true }, '', window.location.href)
    else if (!layers.size && marked) { consuming = true; window.history.back() }
  })
}

/** Back closes the top overlay without navigating away from its underlying page. */
export function useBackDismiss(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    if (!installed) {
      installed = true
      window.addEventListener('popstate', (event) => {
        if (consuming) {
          consuming = false
          event.stopImmediatePropagation()
          reconcile()
        } else if (layers.size) {
          event.stopImmediatePropagation()
          const entry = [...layers.entries()].at(-1)
          if (entry) { layers.delete(entry[0]); entry[1]() }
          reconcile()
        }
      }, true)
    }
    const id = Symbol('overlay')
    layers.set(id, () => close.current())
    reconcile()
    return () => { layers.delete(id); reconcile() }
  }, [open])
}

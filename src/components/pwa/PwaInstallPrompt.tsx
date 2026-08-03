import { Download, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { requestEvent } from '../../lib/pwaInstall'
import type { BeforeInstallPromptEvent } from '../../types/pwa'

const seenKey = 'pocket-ledger-pwa-install-prompt-seen'

function isStandaloneDisplay() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isMobileSafari() {
  const userAgent = navigator.userAgent
  return /iphone|ipad|ipod/i.test(userAgent) && /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent)
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(() => !isStandaloneDisplay() && !localStorage.getItem(seenKey))

  const dismiss = useCallback(() => {
    localStorage.setItem(seenKey, 'true')
    setVisible(false)
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    if (choice.outcome === 'accepted') dismiss()
  }, [dismiss, installPrompt])

  useEffect(() => {
    if (isStandaloneDisplay()) return
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => dismiss()
    const onInstallRequest = () => {
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener(requestEvent, onInstallRequest)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener(requestEvent, onInstallRequest)
    }
  }, [dismiss])

  if (!visible || isStandaloneDisplay()) return null

  const instructions = isMobileSafari()
    ? 'Tap Share, then choose Add to Home Screen.'
    : 'Install it for a faster, app-like experience with offline access.'

  return <aside className="pwa-install-prompt" aria-label="Install Pocket Ledger">
    <Download aria-hidden="true" size={19} />
    <p><strong>Install Pocket Ledger</strong><span>{instructions}</span></p>
    {installPrompt && <button className="pwa-install-action" type="button" onClick={() => void install()}>Install</button>}
    <button aria-label="Dismiss install prompt" className="pwa-install-dismiss" type="button" onClick={dismiss}><X size={17} /></button>
  </aside>
}

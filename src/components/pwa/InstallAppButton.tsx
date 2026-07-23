import { Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BeforeInstallPromptEvent } from '../../types/pwa'

function isStandaloneDisplay() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isMobileSafari() {
  const userAgent = navigator.userAgent
  return /iphone|ipad|ipod/i.test(userAgent) && /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent)
}

function isMobileBrowser() {
  return window.matchMedia('(max-width: 760px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(() => !isStandaloneDisplay() && isMobileSafari())
  const [showMobileInstall, setShowMobileInstall] = useState(() => !isStandaloneDisplay() && isMobileBrowser())
  const [hidden, setHidden] = useState(() => isStandaloneDisplay())

  const shouldShow = useMemo(
    () => !hidden && (installPrompt || showIOSHint || showMobileInstall),
    [hidden, installPrompt, showIOSHint, showMobileInstall],
  )

  useEffect(() => {
    if (isStandaloneDisplay()) return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setHidden(true)
      setInstallPrompt(null)
      setShowIOSHint(false)
      setShowMobileInstall(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!shouldShow) return null

  const installApp = async () => {
    if (!installPrompt) {
      setShowIOSHint(true)
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setHidden(true)
    setInstallPrompt(null)
  }

  return (
    <div className="relative">
      <button className="home-install-button" onClick={installApp} aria-label="Install Pocket Ledger app">
        <Download size={20} />
      </button>
      {showIOSHint && !installPrompt && (
        <div className="home-install-hint">
          <button className="home-install-close" onClick={() => setShowIOSHint(false)} aria-label="Hide install instructions">x</button>
          <p className="font-semibold text-[var(--ink)]">Install Pocket Ledger</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {isMobileSafari() ? 'Tap Share, then Add to Home Screen.' : 'Use your browser menu, then Install app.'}
          </p>
        </div>
      )}
    </div>
  )
}

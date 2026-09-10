import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/schibsted-grotesk/800.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import './index.css'
import './theme.css' // ← V4 "Ink & Ember" layer (must come after index.css)
import './theme-v5.css' // ← V5 "Lifted Ink" patch (must come after theme.css)
import './theme-vault.css' // ← "The Vault" layer (final authority — must come last)
import './desktop-vault.css' // ← desktop redesign; scoped to 1280px and wider
import './auth-onboarding.css' // ← auth + onboarding surfaces (namespaced .ao-*)
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineBanner } from './components/OfflineBanner'
import { installClientErrorMonitoring } from './lib/errorMonitoring'
import { SplashScreen } from './components/SplashScreen'
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt'
import { initTheme } from './lib/theme'
import { isNativeApp } from './lib/platform'
import { installNativeNavigation } from './lib/nativeNavigation'
import { installNativeAuth } from './lib/nativeAuth'
import { isQuickEntry } from './lib/quickEntry'

// Entry-point lazy modules intentionally live here so Android quick entry never downloads the main app chunk.
// eslint-disable-next-line react-refresh/only-export-components
const App = lazy(() => import('./App.tsx'))
// eslint-disable-next-line react-refresh/only-export-components
const QuickEntryWindow = lazy(() => import('./components/QuickEntryWindow').then(module => ({ default: module.QuickEntryWindow })))

const quickEntryPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('quick-entry-preview')
initTheme() // apply saved dark/light theme before first paint
if (isQuickEntry || quickEntryPreview) document.documentElement.classList.add('quick-entry')
if (isNativeApp && !isQuickEntry) {
  document.documentElement.classList.add('native-app')
  void installNativeNavigation().catch(() => console.warn('Android navigation could not be initialized.'))
  void installNativeAuth().catch(() => console.warn('Native sign-in could not be initialized.'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={isQuickEntry || quickEntryPreview ? <main className="qe-window" aria-label="Opening quick record" /> : null}>
      {isQuickEntry || quickEntryPreview ? <QuickEntryWindow /> : <BrowserRouter>
        <SplashScreen duration={900} />
        <OfflineBanner />
        {!isNativeApp && <PwaInstallPrompt />}
        <App />
      </BrowserRouter>}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
installClientErrorMonitoring()

import { StrictMode } from 'react'
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
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineBanner } from './components/OfflineBanner'
import { installClientErrorMonitoring } from './lib/errorMonitoring'
import { SplashScreen } from './components/SplashScreen'
import { initTheme } from './lib/theme'

initTheme() // apply saved dark/light theme before first paint

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SplashScreen duration={900} />
        <OfflineBanner />
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
installClientErrorMonitoring()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/sora/600.css'
import '@fontsource/sora/700.css'
import '@fontsource/sora/800.css'
import './index.css'
import './theme.css' // ← V3 redesign layer (must come after index.css)
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

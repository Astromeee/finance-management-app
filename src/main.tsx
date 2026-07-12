import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
import { SplashScreen } from './components/SplashScreen'
import { initTheme } from './lib/theme'

initTheme() // apply saved dark/light theme before first paint

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashScreen duration={2000} />
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}

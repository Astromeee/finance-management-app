/**
 * Pocket Ledger theme controller.
 * Persists 'dark' | 'light' in localStorage and sets <html data-theme="...">.
 * theme.css reacts to the attribute — no component re-renders needed.
 */

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'pl-theme'

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#FFFDFB' : '#171716')
}

export function initTheme(): Theme {
  const theme = getTheme()
  applyTheme(theme)
  return theme
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new CustomEvent('pl-theme-change', { detail: theme }))
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

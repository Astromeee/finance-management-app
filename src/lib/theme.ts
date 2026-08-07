/**
 * Pocket Ledger theme controller.
 * "The Vault" ships exactly one warm theme — no light/dark modes.
 * <html data-theme="vault"> keeps old [data-theme='light'|'dark']
 * CSS from matching, and the theme-color meta follows the bone
 * page background.
 */

const BONE = '#F3EEE4'

export function initTheme() {
  document.documentElement.setAttribute('data-theme', 'vault')
  document.documentElement.style.colorScheme = 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BONE)
}

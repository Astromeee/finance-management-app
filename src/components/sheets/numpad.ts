/** Light haptic on numpad keys / snaps — skipped under prefers-reduced-motion. */
export function hapticTap() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate?.(8)
}

/** Numpad state helpers: value is a plain string like "700" or "2.5". */
export function pressKey(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1)
  if (key === '.') {
    if (value.includes('.')) return value
    return value === '' ? '0.' : `${value}.`
  }
  // digit
  if (value === '0') return key // no leading zeros
  const [, decimals] = value.split('.')
  if (decimals !== undefined && decimals.length >= 2) return value
  if (value.replace('.', '').length >= 9) return value
  return value + key
}

/** "48250.5" → "48,250.5" for display (digits stay Space Grotesk). */
export function formatAmount(value: string) {
  if (!value) return ''
  const [whole, decimals] = value.split('.')
  const grouped = whole ? Number(whole).toLocaleString('en-PK') : '0'
  return decimals !== undefined ? `${grouped}.${decimals}` : grouped
}

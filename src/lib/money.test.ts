import { describe, expect, it } from 'vitest'
import { MAX_PKR_AMOUNT, isWholePkr, parseWholePkr } from './money'

describe('whole-PKR validation', () => {
  it('accepts positive safe whole amounts', () => {
    expect(parseWholePkr('12500')).toBe(12_500)
    expect(parseWholePkr(MAX_PKR_AMOUNT)).toBe(MAX_PKR_AMOUNT)
    expect(isWholePkr(0)).toBe(true)
  })

  it.each(['', '1.5', '-1', 'Infinity', 'NaN', String(MAX_PKR_AMOUNT + 1)])('rejects %s', (value) => {
    expect(parseWholePkr(value)).toBeNull()
  })
})

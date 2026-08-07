import { describe, expect, it } from 'vitest'
import { formatPKR, percent, totalBalance } from './financeCalculations'
import type { Account } from '../types/finance'

const account = (balance: number, includeInSafeSpend = true): Account => ({
  id: `a-${balance}`, name: 'Account', type: 'cash', balance,
  color: '#000', activity: '', cardLabel: 'ACC', includeInSafeSpend,
})

describe('percent', () => {
  it('returns a rounded share of the total', () => {
    expect(percent(25, 100)).toBe(25)
    expect(percent(1, 3)).toBe(33)
  })

  it('guards against a zero or negative total', () => {
    expect(percent(500, 0)).toBe(0)
    expect(percent(500, -100)).toBe(0)
  })

  it('clamps to the 0-100 range', () => {
    expect(percent(150, 100)).toBe(100)
    // regression: a negative value used to produce a negative-width bar
    expect(percent(-50, 100)).toBe(0)
  })
})

describe('totalBalance', () => {
  it('sums every account, including excluded ones', () => {
    expect(totalBalance([account(1_000), account(2_500, false)])).toBe(3_500)
  })

  it('is zero for an empty wallet', () => {
    expect(totalBalance([])).toBe(0)
  })

  it('handles a negative balance', () => {
    expect(totalBalance([account(1_000), account(-250)])).toBe(750)
  })
})

describe('formatPKR', () => {
  /* en-PK resolves to "Rs<nbsp>48,250" on current ICU, which is why the
     rest of the UI writes a bare "Rs" prefix. Asserted with a normalised
     space so the test does not hinge on the non-breaking separator. */
  const normalise = (value: string) => value.replace(/\u00a0/g, ' ')

  it('renders whole rupees with an Rs prefix and grouped digits', () => {
    expect(normalise(formatPKR(48_250))).toBe('Rs 48,250')
  })

  it('drops fractional paisa', () => {
    expect(normalise(formatPKR(99.6))).toBe('Rs 100')
  })

  it('keeps a negative amount signed', () => {
    expect(normalise(formatPKR(-1_200))).toContain('1,200')
  })
})

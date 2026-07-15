import { describe, expect, it } from 'vitest'
import { passwordValidationMessage } from './password'

describe('password validation', () => {
  it('accepts a password that satisfies every requirement', () => {
    expect(passwordValidationMessage('Ledger!Safe2026')).toBeNull()
  })

  it.each([
    ['Short!2A', 'Use at least 12 characters.'],
    ['LEDGER!SAFE2026', 'Add at least one lowercase letter.'],
    ['ledger!safe2026', 'Add at least one uppercase letter.'],
    ['Ledger!SafePass', 'Add at least one number.'],
    ['LedgerSafe2026', 'Add at least one symbol.'],
  ])('rejects an invalid password', (password, message) => {
    expect(passwordValidationMessage(password)).toBe(message)
  })
})

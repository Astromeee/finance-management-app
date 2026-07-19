import { describe, expect, it } from 'vitest'
import { passwordValidationMessage } from './password'

describe('password validation', () => {
  it('accepts a password that satisfies every requirement', () => {
    expect(passwordValidationMessage('Ledger2')).toBeNull()
  })

  it.each([
    ['Abc12', 'Use at least 6 characters.'],
    ['ledger2', 'Add at least one uppercase letter.'],
    ['LedgerA', 'Add at least one number.'],
  ])('rejects an invalid password', (password, message) => {
    expect(passwordValidationMessage(password)).toBe(message)
  })
})

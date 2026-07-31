import { describe, expect, it } from 'vitest'
import type { Category } from '../types/finance'
import { suggestedCategoryIcon } from './categoryPresentation'

const category = (name: string, kind: Category['kind'] = 'expense', icon?: Category['icon']): Category => ({
  id: name,
  name,
  kind,
  color: '',
  icon,
  spendingNature: 'flexible',
})

describe('suggestedCategoryIcon', () => {
  it.each([
    ['Business/Freelance', 'laptop'],
    ['Reimbursement', 'refund'],
    ['Salary', 'salary'],
    ['Investment Income', 'investment'],
    ['Allowance/Pocket Money', 'allowance'],
    ['Utilities', 'utilities'],
    ['Subscriptions', 'subscription'],
    ['Charity/Zakat', 'charity'],
    ['Family Support', 'family'],
    ['Miscellaneous', 'miscellaneous'],
  ])('suggests %s for %s', (name, expected) => {
    expect(suggestedCategoryIcon(category(name))).toBe(expected)
  })

  it('keeps an icon explicitly chosen by the user', () => {
    expect(suggestedCategoryIcon(category('Reimbursement', 'income', 'gift'))).toBe('gift')
  })
})

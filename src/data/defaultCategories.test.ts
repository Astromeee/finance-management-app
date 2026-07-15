import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, generalizeCategory } from './defaultCategories'

describe('public categories', () => {
  it('contains the public beta defaults without personal categories', () => {
    expect(DEFAULT_INCOME_CATEGORIES).toContain('Family Support')
    expect(DEFAULT_EXPENSE_CATEGORIES).toContain('Groceries')
    expect([...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES].join(' ')).not.toMatch(/sibling|vendor/i)
  })

  it('generalizes historical sibling support labels', () => {
    expect(generalizeCategory('Siblings Support')).toBe('Family Support')
    expect(generalizeCategory('Siblings Support - Ayesha')).toBe('Family Support')
    expect(generalizeCategory('Custom Income')).toBe('Custom Income')
  })
})

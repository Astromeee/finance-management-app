export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Business/Freelance',
  'Family Support',
  'Allowance/Pocket Money',
  'Rental Income',
  'Investment Income',
  'Gift',
  'Refund',
  'Other Income',
] as const

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing/Rent',
  'Utilities',
  'Groceries',
  'Dining Out',
  'Transport/Fuel',
  'Mobile & Internet',
  'Healthcare',
  'Education',
  'Shopping/Clothing',
  'Entertainment',
  'Subscriptions',
  'Family & Gifts',
  'Charity/Zakat',
  'Miscellaneous',
] as const

export const generalizeCategory = (value: string) =>
  /^siblings support(?:\s*-.*)?$/i.test(value.trim()) ? 'Family Support' : value.trim()

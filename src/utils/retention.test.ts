import { describe, expect, it } from 'vitest'
import type { MoneyQuest, Transaction } from '../types/finance'
import { questProgress, resolveQuestStatus } from './retention'

const expense = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  title: 'Food',
  amount: 500,
  type: 'expense',
  category: 'Food',
  categoryId: 'food',
  account: 'Cash',
  date: '2026-07-03',
  ...overrides,
})

describe('weekly quest retention', () => {
  it('uses category IDs when measuring a category spending limit', () => {
    const quest: MoneyQuest = {
      id: 'food-limit', type: 'category_limit', title: 'Keep food under PKR 2,000',
      categoryId: 'food', targetAmount: 2_000, startsOn: '2026-07-01', endsOn: '2026-07-07', status: 'active',
    }
    const progress = questProgress(quest, [expense(), expense({ categoryId: 'transport', category: 'Transport' })], '2026-07-04')
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThan(100)
  })

  it('does not complete a category-limit quest before its end date', () => {
    const quest: MoneyQuest = {
      id: 'food-limit', type: 'category_limit', title: 'Keep food under PKR 2,000',
      categoryId: 'food', targetAmount: 2_000, startsOn: '2026-07-01', endsOn: '2026-07-07', status: 'active',
    }
    expect(resolveQuestStatus(quest, [expense()], '2026-07-04')).toBeNull()
    expect(resolveQuestStatus(quest, [expense()], '2026-07-08')).toBe('completed')
  })

  it('completes tracking quests after their transaction-day target', () => {
    const quest: MoneyQuest = {
      id: 'tracking', type: 'tracking_days', title: 'Track money on 3 days',
      targetCount: 3, startsOn: '2026-07-01', endsOn: '2026-07-07', status: 'active',
    }
    const transactions = [expense({ date: '2026-07-01' }), expense({ date: '2026-07-02' }), expense({ date: '2026-07-03' })]
    expect(resolveQuestStatus(quest, transactions, '2026-07-03')).toBe('completed')
  })

  it('expires an unfinished quest after its window', () => {
    const quest: MoneyQuest = {
      id: 'tracking', type: 'tracking_days', title: 'Track money on 3 days',
      targetCount: 3, startsOn: '2026-07-01', endsOn: '2026-07-07', status: 'active',
    }
    expect(resolveQuestStatus(quest, [expense({ date: '2026-07-01' })], '2026-07-08')).toBe('expired')
  })
})

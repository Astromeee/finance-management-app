import { describe, expect, it } from 'vitest'
import type { Debt, Goal } from '../../types/finance'
import { buildGoalMilestones, goalPace, monthlyContributionNeeded, selectFeaturedGoal } from './goalsDesktopLogic'

const today = new Date('2026-08-01T12:00:00')

function goal(overrides: Partial<Goal> & Pick<Goal, 'id' | 'name'>): Goal {
  return { target: 100_000, saved: 10_000, status: 'Active', ...overrides }
}

function debt(overrides: Partial<Debt> & Pick<Debt, 'id' | 'title'>): Debt {
  return { totalAmount: 50_000, paidAmount: 5_000, category: 'Debt', status: 'Active', createdAt: '2026-01-01', ...overrides }
}

describe('desktop goals calculations', () => {
  it('features overdue goals before future and undated goals', () => {
    const featured = selectFeaturedGoal([
      goal({ id: 'undated', name: 'Undated', saved: 90_000 }),
      goal({ id: 'future', name: 'Future', dueDate: '2026-09-01' }),
      goal({ id: 'overdue', name: 'Overdue', dueDate: '2026-07-20' }),
    ], today)
    expect(featured?.id).toBe('overdue')
  })

  it('uses highest progress when every active goal is undated', () => {
    const featured = selectFeaturedGoal([
      goal({ id: 'low', name: 'Low', saved: 20_000 }),
      goal({ id: 'high', name: 'High', saved: 75_000 }),
    ], today)
    expect(featured?.id).toBe('high')
  })

  it('orders incomplete goals and unpaid debts by overdue, future, then undated', () => {
    const milestones = buildGoalMilestones([
      goal({ id: 'g-undated', name: 'No date' }),
      goal({ id: 'g-future', name: 'Later goal', dueDate: '2026-09-15' }),
      goal({ id: 'g-complete', name: 'Done', saved: 100_000, status: 'Completed', dueDate: '2026-07-01' }),
    ], [
      debt({ id: 'd-overdue', title: 'Old debt', dueDate: '2026-07-10' }),
      debt({ id: 'd-paid', title: 'Paid debt', paidAmount: 50_000, status: 'Paid', dueDate: '2026-08-10' }),
    ], today)
    expect(milestones.map((item) => item.id)).toEqual(['d-overdue', 'g-future', 'g-undated'])
  })

  it('calculates pace from creation and target dates with useful fallbacks', () => {
    expect(goalPace(goal({ id: 'ahead', name: 'Ahead', createdAt: '2026-01-01', dueDate: '2026-12-31', saved: 80_000 }), today)).toBe('Ahead of pace')
    expect(goalPace(goal({ id: 'late', name: 'Late', createdAt: '2026-01-01', dueDate: '2026-12-31', saved: 5_000 }), today)).toBe('Needs contribution')
    expect(goalPace(goal({ id: 'undated', name: 'Undated', saved: 10_000 }), today)).toBe('In progress')
    expect(goalPace(goal({ id: 'overdue', name: 'Overdue', dueDate: '2026-07-01' }), today)).toBe('Overdue')
  })

  it('splits the remaining target across the months left', () => {
    expect(monthlyContributionNeeded(goal({ id: 'monthly', name: 'Monthly', target: 100_000, saved: 40_000, dueDate: '2026-11-01' }), today)).toBe(15_000)
  })
})

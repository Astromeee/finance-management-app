import type { Debt, Goal } from '../../types/finance'

const DAY_MS = 86_400_000

function dateValue(value?: string) {
  if (!value) return null
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function goalProgress(goal: Goal) {
  return Math.min(100, Math.max(0, Math.round((goal.saved / Math.max(1, goal.target)) * 100)))
}

export type GoalPace = 'Completed' | 'Ahead of pace' | 'On track' | 'Needs contribution' | 'In progress' | 'Overdue' | 'No date'

export function goalPace(goal: Goal, today = new Date()): GoalPace {
  if (goal.status === 'Completed' || goal.saved >= goal.target) return 'Completed'
  const due = dateValue(goal.dueDate)
  if (!due) return goal.saved > 0 ? 'In progress' : 'No date'
  if (due.getTime() < today.getTime()) return 'Overdue'
  const created = dateValue(goal.createdAt)
  if (!created || created.getTime() >= due.getTime()) return goal.saved > 0 ? 'In progress' : 'Needs contribution'

  const elapsed = Math.max(0, today.getTime() - created.getTime())
  const duration = due.getTime() - created.getTime()
  const expectedProgress = elapsed / duration
  const actualProgress = goal.saved / Math.max(1, goal.target)
  if (actualProgress >= Math.min(1, expectedProgress + 0.08)) return 'Ahead of pace'
  if (actualProgress >= Math.max(0, expectedProgress - 0.08)) return 'On track'
  return 'Needs contribution'
}

export function monthlyContributionNeeded(goal: Goal, today = new Date()) {
  const remaining = Math.max(0, goal.target - goal.saved)
  if (!remaining) return 0
  const due = dateValue(goal.dueDate)
  if (!due || due.getTime() <= today.getTime()) return remaining
  const months = Math.max(1, Math.ceil((due.getTime() - today.getTime()) / (DAY_MS * 30.4375)))
  return Math.ceil(remaining / months)
}

function goalUrgency(goal: Goal, today: Date) {
  const due = dateValue(goal.dueDate)
  if (!due) return { group: 2, date: Number.POSITIVE_INFINITY, progress: goalProgress(goal) }
  return { group: due.getTime() < today.getTime() ? 0 : 1, date: due.getTime(), progress: goalProgress(goal) }
}

export function selectFeaturedGoal(goals: Goal[], today = new Date()) {
  const active = goals.filter((goal) => goal.status !== 'Completed' && goal.saved < goal.target)
  const pool = active.length ? active : goals
  return [...pool].sort((a, b) => {
    const left = goalUrgency(a, today)
    const right = goalUrgency(b, today)
    return left.group - right.group || left.date - right.date || right.progress - left.progress
  })[0]
}

export type GoalMilestone = {
  id: string
  kind: 'goal' | 'debt'
  title: string
  date?: string
  remaining: number
  timing: 'Overdue' | 'Upcoming' | 'Date not set'
}

export function buildGoalMilestones(goals: Goal[], debts: Debt[], today = new Date()): GoalMilestone[] {
  const items: GoalMilestone[] = [
    ...goals
      .filter((goal) => goal.status !== 'Completed' && goal.saved < goal.target)
      .map((goal) => ({ id: goal.id, kind: 'goal' as const, title: goal.name, date: goal.dueDate, remaining: Math.max(0, goal.target - goal.saved) })),
    ...debts
      .filter((debt) => debt.status !== 'Paid' && (debt.paidAmount ?? debt.paid ?? 0) < (debt.totalAmount ?? debt.total ?? 0))
      .map((debt) => ({ id: debt.id, kind: 'debt' as const, title: debt.title || debt.name || 'Debt', date: debt.dueDate, remaining: Math.max(0, (debt.totalAmount ?? debt.total ?? 0) - (debt.paidAmount ?? debt.paid ?? 0)) })),
  ].map((item) => {
    const due = dateValue(item.date)
    return { ...item, timing: (!due ? 'Date not set' : due.getTime() < today.getTime() ? 'Overdue' : 'Upcoming') as GoalMilestone['timing'] }
  })

  const order = { Overdue: 0, Upcoming: 1, 'Date not set': 2 }
  return items.sort((a, b) => order[a.timing] - order[b.timing]
    || (dateValue(a.date)?.getTime() ?? Number.POSITIVE_INFINITY) - (dateValue(b.date)?.getTime() ?? Number.POSITIVE_INFINITY)
    || a.title.localeCompare(b.title))
}

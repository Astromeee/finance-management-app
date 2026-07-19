import { localDateKey } from '../lib/date'
import type { MoneyQuest, QuestStatus, Transaction } from '../types/finance'

const DAY_MS = 86_400_000

function localNoon(value: string) {
  return new Date(`${value}T12:00:00`)
}

function daysInclusive(start: string, end: string) {
  return Math.max(1, Math.floor((localNoon(end).getTime() - localNoon(start).getTime()) / DAY_MS) + 1)
}

function transactionsInQuestWindow(quest: MoneyQuest, transactions: Transaction[], today: string) {
  const end = today < quest.endsOn ? today : quest.endsOn
  return transactions.filter((transaction) => transaction.date >= quest.startsOn && transaction.date <= end)
}

/**
 * Returns understandable progress for the one active, transaction-derived quest.
 * A category-limit quest remains "on track" until its end date; it must not be
 * marked complete simply because the user has not spent the limit on day one.
 */
export function questProgress(quest: MoneyQuest, transactions: Transaction[], today = localDateKey()) {
  const inWindow = transactionsInQuestWindow(quest, transactions, today)

  if (quest.type === 'tracking_days') {
    const trackedDays = new Set(inWindow.map((item) => item.date)).size
    return (trackedDays / Math.max(1, quest.targetCount ?? 1)) * 100
  }

  if (quest.type === 'goal_contribution') {
    const contributed = inWindow
      .filter((item) => item.type === 'goal_saving' && item.goalId === quest.goalId)
      .reduce((sum, item) => sum + item.amount, 0)
    return (contributed / Math.max(1, quest.targetAmount ?? 1)) * 100
  }

  if (quest.type === 'category_limit') {
    const spent = inWindow
      .filter((item) => item.type === 'expense' && item.categoryId === quest.categoryId)
      .reduce((sum, item) => sum + item.amount, 0)
    if (spent > Math.max(0, quest.targetAmount ?? 0)) return 0
    if (today >= quest.endsOn) return 100
    const elapsed = daysInclusive(quest.startsOn, today)
    const total = daysInclusive(quest.startsOn, quest.endsOn)
    return Math.min(99, (elapsed / total) * 100)
  }

  const end = today < quest.endsOn ? today : quest.endsOn
  let noSpendDays = 0
  for (let date = localNoon(quest.startsOn); localDateKey(date) <= end; date.setDate(date.getDate() + 1)) {
    const key = localDateKey(date)
    if (!inWindow.some((item) => item.type === 'expense' && item.date === key)) noSpendDays += 1
  }
  return (noSpendDays / Math.max(1, quest.targetCount ?? 1)) * 100
}

/** Returns the first terminal state that should be persisted, otherwise null. */
export function resolveQuestStatus(quest: MoneyQuest, transactions: Transaction[], today = localDateKey()): Extract<QuestStatus, 'completed' | 'expired'> | null {
  if (quest.status !== 'active') return null
  const progress = questProgress(quest, transactions, today)
  if (quest.type === 'category_limit') {
    return today > quest.endsOn
      ? progress >= 100 ? 'completed' : 'expired'
      : null
  }
  if (progress >= 100) return 'completed'
  return today > quest.endsOn ? 'expired' : null
}

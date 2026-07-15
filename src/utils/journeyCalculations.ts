import type {
  Account,
  AffordabilityResult,
  Budget,
  Category,
  CycleStory,
  IncomeCycle,
  IncomeCadence,
  JourneySettings,
  MoneyLeakInsight,
  SafeSpendResult,
  Transaction,
  UpcomingExpense,
  WeeklyReveal,
} from '../types/finance'
import { localDateKey } from '../lib/date'

const DAY_MS = 86_400_000

function midday(date: string) {
  return new Date(`${date}T12:00:00`)
}

function daysBetween(from: string, to: string) {
  return Math.max(0, Math.ceil((midday(to).getTime() - midday(from).getTime()) / DAY_MS))
}

function previousCycleDate(nextIncomeDate: string, cadence: IncomeCadence) {
  const next = midday(nextIncomeDate)
  if (cadence === 'weekly') next.setDate(next.getDate() - 7)
  else {
    const day = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() - 1)
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate()
    next.setDate(Math.min(day, lastDay))
  }
  return localDateKey(next)
}

export function calculateIncomeCycle(settings: JourneySettings, today = localDateKey()): IncomeCycle | null {
  if (!settings.incomeCadence || !settings.nextIncomeDate || settings.nextIncomeDate <= today) return null
  const startDate = previousCycleDate(settings.nextIncomeDate, settings.incomeCadence)
  const totalDays = Math.max(1, daysBetween(startDate, settings.nextIncomeDate))
  const daysRemaining = Math.max(1, daysBetween(today, settings.nextIncomeDate))
  return {
    startDate,
    endDate: settings.nextIncomeDate,
    totalDays,
    daysRemaining,
    daysElapsed: Math.min(totalDays, Math.max(0, totalDays - daysRemaining)),
  }
}

function protectedBeforePayday(budgets: Budget[], categories: Category[], upcomingExpenses: UpcomingExpense[], endDate: string) {
  const reserves = new Map<string, { budget: number; upcoming: number }>()
  for (const category of categories.filter((item) => item.kind === 'expense' && item.spendingNature === 'essential')) {
    reserves.set(category.name.toLowerCase(), { budget: 0, upcoming: 0 })
  }
  for (const budget of budgets) {
    const category = categories.find((item) => item.id === budget.categoryId)
    if (!category || category.spendingNature !== 'essential') continue
    const key = category.name.toLowerCase()
    const reserve = reserves.get(key) ?? { budget: 0, upcoming: 0 }
    reserve.budget += Math.max(0, budget.amount - budget.used)
    reserves.set(key, reserve)
  }
  let unmatchedUpcoming = 0
  for (const expense of upcomingExpenses.filter((item) => item.status !== 'paid' && item.dueDate <= endDate)) {
    const key = expense.category.toLowerCase()
    const reserve = reserves.get(key)
    if (reserve) reserve.upcoming += expense.amount
    else unmatchedUpcoming += expense.amount
  }
  return unmatchedUpcoming + [...reserves.values()].reduce((sum, reserve) => sum + Math.max(reserve.budget, reserve.upcoming), 0)
}

export function calculateSafeSpend(input: {
  accounts: Account[]
  budgets: Budget[]
  categories: Category[]
  upcomingExpenses: UpcomingExpense[]
  settings: JourneySettings
  today?: string
}): SafeSpendResult {
  const missing: string[] = []
  if (!input.settings.incomeCadence) missing.push('income cadence')
  if (!input.settings.nextIncomeDate) missing.push('next income date')
  if (!input.accounts.length) missing.push('account balance')
  const cycle = calculateIncomeCycle(input.settings, input.today)
  if (!cycle && input.settings.nextIncomeDate) missing.push('a future income date')
  const includedBalance = input.accounts.filter((account) => account.includeInSafeSpend).reduce((sum, account) => sum + account.balance, 0)
  // Match bills to essential category budgets before taking the larger amount, avoiding double-counting.
  const reservedForBills = cycle ? protectedBeforePayday(input.budgets, input.categories, input.upcomingExpenses, cycle.endDate) : 0
  const flexibleMoneyRemaining = Math.floor(includedBalance - reservedForBills - input.settings.safetyReserve)

  if (missing.length || !cycle) {
    return {
      state: 'needs_setup', safeToSpendToday: 0, flexibleMoneyRemaining,
      includedBalance, reservedForBills, safetyReserve: input.settings.safetyReserve,
      cycle: null, explanation: `Add ${missing.join(' and ')} to calculate a daily amount.`, missing,
    }
  }

  const safeToSpendToday = Math.floor(Math.max(0, flexibleMoneyRemaining) / cycle.daysRemaining)
  const expectedDaily = input.settings.typicalIncome > 0 ? input.settings.typicalIncome / cycle.totalDays : safeToSpendToday
  const state = flexibleMoneyRemaining <= 0 || safeToSpendToday < expectedDaily * 0.5
    ? 'protect'
    : safeToSpendToday < expectedDaily
      ? 'watchful'
      : 'comfortable'
  const explanation = state === 'comfortable'
    ? `You are comfortably covered until ${cycle.endDate}.`
    : state === 'watchful'
      ? `Your plan still works, but keep flexible spending measured for the next ${cycle.daysRemaining} days.`
      : `Pause flexible spending so bills and your safety reserve stay protected.`

  return {
    state, safeToSpendToday, flexibleMoneyRemaining, includedBalance, reservedForBills,
    safetyReserve: input.settings.safetyReserve, cycle, explanation, missing: [],
  }
}

export function calculateAffordability(amount: number, safeSpend: SafeSpendResult): AffordabilityResult {
  const roundedAmount = Math.max(0, Math.floor(amount))
  if (safeSpend.state === 'needs_setup') {
    return { state: 'needs_setup', amount: roundedAmount, safeToSpendAfter: 0, flexibleMoneyAfter: safeSpend.flexibleMoneyRemaining - roundedAmount, explanation: 'Finish your income-cycle setup before checking a purchase.' }
  }
  const safeToSpendAfter = safeSpend.safeToSpendToday - roundedAmount
  const flexibleMoneyAfter = safeSpend.flexibleMoneyRemaining - roundedAmount
  if (roundedAmount <= safeSpend.safeToSpendToday) {
    return { state: 'safe', amount: roundedAmount, safeToSpendAfter, flexibleMoneyAfter, explanation: 'This fits inside today’s safe-to-spend amount.' }
  }
  if (flexibleMoneyAfter >= 0 && roundedAmount <= safeSpend.safeToSpendToday * 3) {
    return { state: 'caution', amount: roundedAmount, safeToSpendAfter, flexibleMoneyAfter, explanation: 'You can cover this, but it borrows from the next few days.' }
  }
  return { state: 'risky', amount: roundedAmount, safeToSpendAfter, flexibleMoneyAfter, explanation: 'This would put protected bills or your safety reserve at risk.' }
}

export function detectMoneyLeak(transactions: Transaction[], today = localDateKey()): MoneyLeakInsight | null {
  const windowStart = midday(today)
  windowStart.setDate(windowStart.getDate() - 29)
  const startKey = localDateKey(windowStart)
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense' && transaction.date >= startKey && transaction.date <= today)
  if (expenseTransactions.length < 3) return null
  const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const groups = new Map<string, { categoryId?: string; name: string; amount: number; count: number }>()
  for (const transaction of expenseTransactions) {
    const key = transaction.categoryId ?? transaction.category ?? transaction.title
    const current = groups.get(key) ?? { categoryId: transaction.categoryId, name: transaction.category ?? transaction.title, amount: 0, count: 0 }
    current.amount += transaction.amount
    current.count += 1
    groups.set(key, current)
  }
  const candidate = [...groups.values()]
    .filter((group) => group.count >= 3 && group.amount >= Math.max(1_000, totalExpense * 0.05))
    .sort((a, b) => b.amount - a.amount)[0]
  if (!candidate) return null
  return {
    id: `repeat-${candidate.categoryId ?? candidate.name.toLowerCase().replace(/\W+/g, '-')}`,
    title: `${candidate.name} is quietly adding up`,
    explanation: `${candidate.count} purchases added up to PKR ${candidate.amount.toLocaleString('en-PK')} in the last 30 days.`,
    action: `Try a simple limit for ${candidate.name} this week.`,
    amount: candidate.amount,
    transactionCount: candidate.count,
    categoryId: candidate.categoryId,
    confidence: candidate.count >= 6 ? 'high' : candidate.count >= 4 ? 'medium' : 'low',
  }
}

export function buildWeeklyReveal(transactions: Transaction[], today = localDateKey()): WeeklyReveal | null {
  const start = midday(today)
  start.setDate(start.getDate() - 6)
  const startKey = localDateKey(start)
  const expenses = transactions.filter((item) => item.type === 'expense' && item.date >= startKey && item.date <= today)
  if (!expenses.length) return { title: 'A quiet spending week', detail: 'No expenses were recorded in the last seven days.', metric: 7, kind: 'no_spend' }
  const categories = new Map<string, number>()
  const days = new Set<string>()
  for (const item of expenses) {
    const category = item.category ?? item.title
    categories.set(category, (categories.get(category) ?? 0) + item.amount)
    days.add(item.date)
  }
  const [category, amount] = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]
  const noSpendDays = 7 - days.size
  return noSpendDays >= 3
    ? { title: `${noSpendDays} no-spend days`, detail: `${category} was still the week’s largest flexible pattern at PKR ${amount.toLocaleString('en-PK')}.`, metric: noSpendDays, kind: 'no_spend' }
    : { title: `${category} led this week`, detail: `It accounted for PKR ${amount.toLocaleString('en-PK')} across the last seven days.`, metric: amount, kind: 'category' }
}

export function buildPreviousCycleStory(settings: JourneySettings, transactions: Transaction[], today = localDateKey()): CycleStory | null {
  const current = calculateIncomeCycle(settings, today)
  if (!current || !settings.incomeCadence) return null
  const startDate = previousCycleDate(current.startDate, settings.incomeCadence)
  const endDate = current.startDate
  const cycleTransactions = transactions.filter((item) => item.date >= startDate && item.date < endDate)
  if (!cycleTransactions.length) return null
  const openingMoney = cycleTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const spent = cycleTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const protectedMoney = cycleTransactions.filter((item) => item.type === 'goal_saving' || item.type === 'debt_payment').reduce((sum, item) => sum + item.amount, 0)
  const categoryTotals = new Map<string, number>()
  for (const item of cycleTransactions.filter((entry) => entry.type === 'expense')) {
    const category = item.category ?? item.title
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + item.amount)
  }
  const strongestCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const closingMoney = openingMoney - spent - protectedMoney
  return {
    cycle: { startDate, endDate, totalDays: Math.max(1, daysBetween(startDate, endDate)), daysElapsed: Math.max(1, daysBetween(startDate, endDate)), daysRemaining: 0 },
    openingMoney, spent, protected: protectedMoney, closingMoney, strongestCategory,
    headline: closingMoney >= 0 ? `You kept ${Math.round((closingMoney / Math.max(1, openingMoney)) * 100)}% of incoming money.` : 'Spending ran ahead of income in this cycle.',
  }
}

import type { Account, Budget, Debt, Goal, JourneySettings, MoneyQuest, MoneyWin, Transaction, UpcomingExpense, WishlistItem } from '../types/finance'

/* ============================================================
   Dev-only demo dataset for /app?vault-preview (design QA).
   Mirrors the design-package screenshots (13a–16a) with dates
   computed relative to "today" so the screens always look alive.
   Never bundled into user flows — only read when the dev-only
   designPreview flag is on in App.tsx.
   ============================================================ */

const DAY = 86_400_000

function key(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * DAY)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function at(offsetDays: number, hour: number, minute: number) {
  const date = new Date(Date.now() + offsetDays * DAY)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export const accounts: Account[] = [
  { id: 'hbl-bank', name: 'HBL Bank', type: 'bank', balance: 35_600, color: '#2B241D', activity: '', cardLabel: '4821', includeInSafeSpend: true },
  { id: 'jazzcash', name: 'JazzCash', type: 'wallet', balance: 9_850, color: '#E2703A', activity: '', cardLabel: '8214', includeInSafeSpend: true },
  { id: 'cash', name: 'Cash', type: 'cash', balance: 2_800, color: '#FBF8F1', activity: '', cardLabel: 'CASH', includeInSafeSpend: false },
]

export const transactions: Transaction[] = [
  // today
  { id: 'p1', title: 'Dining Out', type: 'expense', amount: 700, category: 'Dining Out', account: 'JazzCash', accountId: 'jazzcash', date: key(0), notes: 'Karachi Broast', createdAt: at(0, 13, 20) },
  { id: 'p2', title: 'Transport / Fuel', type: 'expense', amount: 850, category: 'Transport', account: 'Cash', accountId: 'cash', date: key(0), notes: 'PSO', createdAt: at(0, 9, 40) },
  // yesterday
  { id: 'p3', title: 'Pocket money', type: 'income', amount: 5_000, source: 'Pocket Money', category: 'Pocket Money', account: 'Cash', accountId: 'cash', date: key(-1), createdAt: at(-1, 18, 0) },
  { id: 'p4', title: 'Mobile top-up', type: 'expense', amount: 300, category: 'Bills & utilities', account: 'JazzCash', accountId: 'jazzcash', date: key(-1), notes: 'Jazz', createdAt: at(-1, 14, 10) },
  { id: 'p5', title: 'To savings', type: 'transfer', amount: 2_000, category: 'Transfer', account: 'HBL Bank to JazzCash', fromAccountId: 'hbl-bank', toAccountId: 'jazzcash', date: key(-1), createdAt: at(-1, 11, 0) },
  // earlier this cycle — enough Dining Out repeats to surface the money leak
  { id: 'p6', title: 'Salary', type: 'income', amount: 20_000, source: 'Salary', category: 'Salary', account: 'HBL Bank', accountId: 'hbl-bank', date: key(-19), createdAt: at(-19, 10, 0) },
  { id: 'p7', title: 'Dining Out', type: 'expense', amount: 950, category: 'Dining Out', account: 'JazzCash', accountId: 'jazzcash', date: key(-3), createdAt: at(-3, 20, 15) },
  { id: 'p8', title: 'Dining Out', type: 'expense', amount: 620, category: 'Dining Out', account: 'Cash', accountId: 'cash', date: key(-6), createdAt: at(-6, 13, 5) },
  { id: 'p9', title: 'Groceries', type: 'expense', amount: 1_100, category: 'Food & Essentials', account: 'HBL Bank', accountId: 'hbl-bank', date: key(-7), createdAt: at(-7, 17, 30) },
  { id: 'p10', title: 'Dining Out', type: 'expense', amount: 780, category: 'Dining Out', account: 'JazzCash', accountId: 'jazzcash', date: key(-10), createdAt: at(-10, 21, 0) },
  { id: 'p11', title: 'Transport / Fuel', type: 'expense', amount: 1_200, category: 'Transport', account: 'Cash', accountId: 'cash', date: key(-12), createdAt: at(-12, 8, 45) },
  { id: 'p12', title: 'Dining Out', type: 'expense', amount: 700, category: 'Dining Out', account: 'JazzCash', accountId: 'jazzcash', date: key(-14), createdAt: at(-14, 19, 40) },
  { id: 'p13', title: 'Internet bill', type: 'expense', amount: 1_380, category: 'Bills & utilities', account: 'HBL Bank', accountId: 'hbl-bank', date: key(-16), createdAt: at(-16, 12, 0) },
  { id: 'p14', title: 'Jazz bundle', type: 'expense', amount: 600, category: 'Bills & utilities', account: 'JazzCash', accountId: 'jazzcash', date: key(-5), createdAt: at(-5, 9, 10) },
]

export const goals: Goal[] = [
  { id: 'goal-laptop', name: 'New laptop', target: 30_000, saved: 17_000, dueDate: key(115), status: 'Active' },
  { id: 'goal-umrah', name: 'Umrah fund', target: 30_000, saved: 4_500, dueDate: key(320), status: 'Active' },
]

export const debts: Debt[] = [
  { id: 'debt-bike', title: 'Bike installment', name: 'Bike installment', totalAmount: 12_000, total: 12_000, paidAmount: 4_000, paid: 4_000, dueDate: key(13), category: 'Installment', status: 'Active', notes: 'Rs 4,000/month · 2 payments to freedom', createdAt: at(-60, 12, 0) },
]

export const budgets: Budget[] = [
  { id: 'budget-dining', category: 'Dining Out', categoryId: 'dining-out', amount: 4_000, used: 3_120, periodMonth: `${key(0).slice(0, 7)}-01` },
  { id: 'budget-transport', category: 'Transport / Fuel', categoryId: 'transport', amount: 5_000, used: 2_250, periodMonth: `${key(0).slice(0, 7)}-01` },
  { id: 'budget-groceries', category: 'Groceries', categoryId: 'food-essentials', amount: 3_650, used: 1_100, periodMonth: `${key(0).slice(0, 7)}-01` },
]

export const upcomingExpenses: UpcomingExpense[] = [
  { id: 'bill-rent', title: 'Rent', amount: 8_000, category: 'Rent', dueDate: key(5), status: 'upcoming', isRecurring: true, recurringFrequency: 'monthly', createdAt: at(-30, 9, 0) },
  { id: 'bill-internet', title: 'Internet', amount: 2_400, category: 'Bills & utilities', dueDate: key(7), status: 'upcoming', isRecurring: true, recurringFrequency: 'monthly', createdAt: at(-30, 9, 0) },
  { id: 'bill-jazz', title: 'Jazz bundle', amount: 600, category: 'Bills & utilities', dueDate: key(-5), status: 'paid', isRecurring: false, createdAt: at(-30, 9, 0), paidTransactionId: 'p14' },
]

export const wishlistItems: WishlistItem[] = [
  { id: 'wish-earbuds', name: 'Wireless earbuds', amount: 6_500, categoryId: 'shopping', reconsiderAt: at(-1, 9, 0), status: 'ready' },
  { id: 'wish-mouse', name: 'Gaming mouse', amount: 4_200, categoryId: 'shopping', reconsiderAt: at(5, 9, 0), status: 'waiting' },
]

export const moneyQuests: MoneyQuest[] = [
  { id: 'quest-nospend', type: 'no_spend_days', title: 'Three no-spend days', targetCount: 3, startsOn: key(-4), endsOn: key(2), status: 'active' },
]

export const moneyWins: MoneyWin[] = [
  { id: 'win-best-cycle', type: 'quest_completed', title: 'You kept Rs 15,680 — your best cycle since April.', earnedAt: at(-2, 12, 0) },
]

export const journeySettings: JourneySettings = {
  incomeSourceType: 'salary',
  incomeCadence: 'monthly',
  typicalIncome: 25_000,
  nextIncomeDate: key(11),
  safetyReserve: 2_000,
  onboardingVersion: 2,
  onboardingStep: 5,
  tourCompleted: true,
  analyticsConsent: false,
}

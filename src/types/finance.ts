import type { LucideIcon } from 'lucide-react'

export type AccountType = 'cash' | 'bank' | 'wallet'
export type TransactionType = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | 'goal_saving' | 'debt_payment'
export type Status = 'Active' | 'Completed' | 'Overdue'
export type DebtCategory = 'Debt' | 'Overdue Payment' | 'Money I Owe' | 'Installment' | 'Other'
export type DebtStatus = 'Active' | 'Due Soon' | 'Overdue' | 'Paid'
export type UpcomingExpenseStatus = 'upcoming' | 'due_soon' | 'overdue' | 'paid'
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly'
export type IncomeSourceType = 'salary' | 'allowance' | 'irregular' | 'mixed'
export type IncomeCadence = 'weekly' | 'monthly' | 'custom'
export type MoneyPriority = 'stretch' | 'save' | 'control_spending' | 'bills_debt' | 'understand'
export type SpendingNature = 'essential' | 'flexible'
export type JourneyState = 'comfortable' | 'watchful' | 'protect' | 'needs_setup'
export type AffordabilityState = 'safe' | 'caution' | 'risky' | 'needs_setup'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  color: string
  activity: string
  cardLabel: string
  includeInSafeSpend: boolean
}

export interface Category {
  id: string
  name: string
  kind: 'income' | 'expense'
  color: string
  spendingNature: SpendingNature
}

export interface JourneySettings {
  incomeSourceType?: IncomeSourceType
  /** All income sources the user selected during onboarding (multi-select).
   *  incomeSourceType stays the primary (first) choice for storage/back-compat. */
  incomeSourceTypes?: IncomeSourceType[]
  incomeCadence?: IncomeCadence
  typicalIncome: number
  nextIncomeDate?: string
  primaryPriority?: MoneyPriority
  /** All focuses the user selected (multi-select); primaryPriority = first choice. */
  moneyPriorities?: MoneyPriority[]
  safetyReserve: number
  onboardingVersion: number
  onboardingStep: number
  tourCompleted: boolean
  analyticsConsent: boolean
}

export interface IncomeCycle {
  startDate: string
  endDate: string
  totalDays: number
  daysRemaining: number
  daysElapsed: number
}

export interface SafeSpendResult {
  state: JourneyState
  safeToSpendToday: number
  flexibleMoneyRemaining: number
  includedBalance: number
  reservedForBills: number
  safetyReserve: number
  cycle: IncomeCycle | null
  explanation: string
  missing: string[]
}

export interface AffordabilityResult {
  state: AffordabilityState
  amount: number
  safeToSpendAfter: number
  flexibleMoneyAfter: number
  explanation: string
}

export interface MoneyLeakInsight {
  id: string
  title: string
  explanation: string
  action: string
  amount: number
  transactionCount: number
  categoryId?: string
  confidence: 'low' | 'medium' | 'high'
}

export interface CycleStory {
  cycle: IncomeCycle
  openingMoney: number
  spent: number
  protected: number
  closingMoney: number
  strongestCategory?: string
  headline: string
}

export interface WeeklyReveal {
  title: string
  detail: string
  metric: number
  kind: 'category' | 'day' | 'no_spend'
}

export type QuestType = 'no_spend_days' | 'category_limit' | 'tracking_days' | 'goal_contribution'
export type QuestStatus = 'active' | 'completed' | 'expired' | 'cancelled'

export interface MoneyQuest {
  id: string
  type: QuestType
  title: string
  categoryId?: string
  goalId?: string
  targetAmount?: number
  targetCount?: number
  startsOn: string
  endsOn: string
  status: QuestStatus
  createdAt?: string
  updatedAt?: string
}

export type WishlistStatus = 'waiting' | 'ready' | 'bought' | 'skipped' | 'moved_to_goal'

export interface WishlistItem {
  id: string
  name: string
  amount: number
  categoryId?: string
  goalId?: string
  reconsiderAt: string
  status: WishlistStatus
  transactionId?: string
  createdAt?: string
  updatedAt?: string
}

export type MoneyWinType = 'quest_completed' | 'goal_milestone' | 'budget_recovered' | 'cycle_improved' | 'tracking_consistency' | 'wishlist_skipped'

export interface MoneyWin {
  id: string
  type: MoneyWinType
  title: string
  detail?: string
  cycleStart?: string
  cycleEnd?: string
  earnedAt: string
}

export interface Transaction {
  id: string
  title: string
  amount: number
  type: TransactionType
  category?: string
  categoryId?: string
  source?: string
  account: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  goalId?: string
  debtId?: string
  paymentMethod?: string
  date: string
  notes?: string
  createdAt?: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  dueDate?: string
  linkedAccountId?: string
  notes?: string
  status: Status
}

export interface Debt {
  id: string
  title: string
  name?: string
  personOrCompany?: string
  totalAmount: number
  total?: number
  paidAmount: number
  paid?: number
  dueDate?: string
  category: DebtCategory
  status: DebtStatus
  notes?: string
  createdAt: string
}

export interface Budget {
  id: string
  category: string
  amount: number
  used: number
  categoryId?: string
  periodMonth?: string
}

export interface UpcomingExpense {
  id: string
  title: string
  amount: number
  category: string
  dueDate: string
  linkedAccountId?: string
  notes?: string
  status: UpcomingExpenseStatus
  isRecurring: boolean
  recurringFrequency?: RecurringFrequency
  repeatStartDate?: string
  repeatEndDate?: string
  reminderDaysBefore?: number
  createdAt: string
  paidTransactionId?: string
}

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

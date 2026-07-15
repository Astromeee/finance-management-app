import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, generalizeCategory } from '../data/defaultCategories'
import type { Account, Budget, Category, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'
import type { Json, TablesInsert } from '../types/database'
import { localMonthKey } from './date'
import type { Profile } from './profile'
import { supabase } from './supabase'

export type FinanceData = {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  categories: Category[]
  profile: Profile
  onboardingCompleted: boolean
}

type Row = Record<string, unknown>

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function value(row: Row, key: string) {
  return row[key] as never
}

function accountFromRow(row: Row): Account {
  return {
    id: value(row, 'id'),
    name: value(row, 'name'),
    type: value(row, 'type'),
    balance: Number(row.balance ?? 0),
    color: value(row, 'color'),
    activity: value(row, 'activity'),
    cardLabel: value(row, 'card_label'),
  }
}

function transactionFromRow(row: Row): Transaction {
  return {
    id: value(row, 'id'),
    title: value(row, 'title'),
    amount: Number(row.amount ?? 0),
    type: value(row, 'type'),
    category: (row.category_name_snapshot ?? row.category ?? undefined) as string | undefined,
    categoryId: row.category_id as string | undefined,
    source: row.source as string | undefined,
    account: (row.account ?? '') as string,
    accountId: row.account_id as string | undefined,
    fromAccountId: row.from_account_id as string | undefined,
    toAccountId: row.to_account_id as string | undefined,
    goalId: row.goal_id as string | undefined,
    debtId: row.debt_id as string | undefined,
    paymentMethod: row.payment_method as string | undefined,
    date: value(row, 'transaction_date'),
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string | undefined,
  }
}

function goalFromRow(row: Row): Goal {
  return {
    id: value(row, 'id'), name: value(row, 'name'), target: Number(row.target ?? 0),
    saved: Number(row.saved ?? 0), dueDate: row.due_date as string | undefined,
    linkedAccountId: row.linked_account_id as string | undefined,
    notes: row.notes as string | undefined, status: value(row, 'status'),
  }
}

function debtFromRow(row: Row): Debt {
  const total = Number(row.total ?? 0)
  const paid = Number(row.paid ?? 0)
  return {
    id: value(row, 'id'), title: (row.title ?? row.name ?? 'Debt') as string,
    name: row.name as string | undefined, personOrCompany: row.person_or_company as string | undefined,
    totalAmount: total, total, paidAmount: paid, paid,
    dueDate: row.due_date as string | undefined, category: value(row, 'category'),
    status: value(row, 'status'), notes: row.notes as string | undefined,
    createdAt: value(row, 'created_at'),
  }
}

function upcomingFromRow(row: Row): UpcomingExpense {
  return {
    id: value(row, 'id'), title: value(row, 'title'), amount: Number(row.amount ?? 0),
    category: value(row, 'category'), dueDate: value(row, 'due_date'),
    linkedAccountId: row.linked_account_id as string | undefined,
    notes: row.notes as string | undefined, status: value(row, 'status'),
    isRecurring: Boolean(row.is_recurring), recurringFrequency: row.recurring_frequency as UpcomingExpense['recurringFrequency'],
    repeatStartDate: row.repeat_start_date as string | undefined,
    repeatEndDate: row.repeat_end_date as string | undefined,
    reminderDaysBefore: row.reminder_days_before as number | undefined,
    createdAt: value(row, 'created_at'), paidTransactionId: row.paid_transaction_id as string | undefined,
  }
}

async function requireUserId() {
  const { data, error } = await client().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Authentication required.')
  return data.user.id
}

export async function ensureDefaultCategories() {
  const userId = await requireUserId()
  const { data, error } = await client().from('categories').select('id').limit(1)
  if (error) throw error
  if (data?.length) return
  const rows = [
    ...DEFAULT_INCOME_CATEGORIES.map((name, index) => ({ name, kind: 'income', index })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name, index) => ({ name, kind: 'expense', index })),
  ].map(({ name, kind, index }) => ({
    user_id: userId,
    id: `${kind}-${crypto.randomUUID()}`,
    name,
    kind,
    color: kind === 'income' ? '#2d9d78' : '#ff5c00',
    sort_order: index,
    archived: false,
  }))
  const { error: insertError } = await client().from('categories').insert(rows)
  if (insertError) throw insertError
}

export async function loadFinanceData(): Promise<FinanceData> {
  await ensureDefaultCategories()
  const [accounts, transactions, goals, debts, budgets, upcoming, categories, settings] = await Promise.all([
    client().from('accounts').select('*').eq('archived', false).order('created_at'),
    client().from('transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
    client().from('goals').select('*').order('created_at', { ascending: false }),
    client().from('debts').select('*').order('created_at', { ascending: false }),
    client().from('budgets').select('*').eq('archived', false).order('created_at'),
    client().from('upcoming_expenses').select('*').order('due_date'),
    client().from('categories').select('*').eq('archived', false).order('kind').order('sort_order'),
    client().from('user_settings').select('*').maybeSingle(),
  ])
  for (const result of [accounts, transactions, goals, debts, budgets, upcoming, categories, settings]) {
    if (result.error) throw result.error
  }
  const transactionModels = (transactions.data as Row[]).map(transactionFromRow)
  const budgetModels = (budgets.data as Row[]).map((row) => {
    const periodMonth = String(row.period_month ?? `${localMonthKey()}-01`)
    const month = periodMonth.slice(0, 7)
    const categoryId = row.category_id as string | undefined
    const category = String(row.category ?? '')
    const used = transactionModels.reduce((sum, transaction) => (
      transaction.type === 'expense' && transaction.date.startsWith(month)
      && (categoryId ? transaction.categoryId === categoryId : transaction.category === category)
        ? sum + transaction.amount : sum
    ), 0)
    return { id: value(row, 'id'), category, categoryId, amount: Number(row.amount ?? 0), used, periodMonth }
  })
  const settingsRow = settings.data as Row | null
  return {
    accounts: (accounts.data as Row[]).map(accountFromRow),
    transactions: transactionModels,
    goals: (goals.data as Row[]).map(goalFromRow),
    debts: (debts.data as Row[]).map(debtFromRow),
    budgets: budgetModels,
    upcomingExpenses: (upcoming.data as Row[]).map(upcomingFromRow),
    categories: (categories.data as Row[]).map((row) => ({
      id: value(row, 'id'), name: value(row, 'name'), kind: value(row, 'kind'), color: value(row, 'color'),
    })),
    profile: { name: (settingsRow?.display_name as string | undefined) || 'Pocket Ledger user', avatar: settingsRow?.avatar as string | undefined },
    onboardingCompleted: Boolean(settingsRow?.onboarding_completed),
  }
}

export type FinanceAction = Omit<Transaction, 'id' | 'createdAt'> & { id?: string }

export async function recordFinanceAction(action: FinanceAction) {
  const normalizedCategory = generalizeCategory(action.category ?? action.source ?? '')
  const { data, error } = await client().rpc('record_finance_action', {
    p_action: {
      ...action,
      id: action.id ?? crypto.randomUUID(),
      category: normalizedCategory || undefined,
      source: action.source ? generalizeCategory(action.source) : undefined,
    },
  })
  if (error) throw error
  return data as { id: string; ok: boolean }
}

export async function markUpcomingExpensePaid(
  upcomingId: string,
  action: FinanceAction,
  nextUpcoming?: UpcomingExpense,
) {
  const normalizedCategory = generalizeCategory(action.category ?? '')
  const { data, error } = await client().rpc('mark_upcoming_expense_paid', {
    p_upcoming_id: upcomingId,
    p_action: { ...action, id: action.id ?? crypto.randomUUID(), category: normalizedCategory },
    p_next_upcoming: (nextUpcoming ?? null) as unknown as Json,
  })
  if (error) throw error
  return data as { id: string; ok: boolean }
}

export async function saveTransaction(transaction: Transaction) {
  const userId = await requireUserId()
  const { error } = await client().from('transactions').upsert({
    user_id: userId, id: transaction.id, title: transaction.title, amount: transaction.amount,
    type: transaction.type, category: transaction.category, category_id: transaction.categoryId,
    category_name_snapshot: transaction.category, source: transaction.source,
    account: transaction.account, account_id: transaction.accountId,
    from_account_id: transaction.fromAccountId, to_account_id: transaction.toAccountId,
    goal_id: transaction.goalId, debt_id: transaction.debtId,
    payment_method: transaction.paymentMethod, transaction_date: transaction.date,
    notes: transaction.notes, created_at: transaction.createdAt,
  })
  if (error) throw error
}

export async function updateFinanceTransaction(transaction: Transaction) {
  const { data, error } = await client().rpc('update_finance_transaction', {
    p_id: transaction.id,
    p_action: {
      ...transaction,
      category: generalizeCategory(transaction.category ?? transaction.source ?? ''),
    },
  })
  if (error) throw error
  return data
}

export async function deleteFinanceTransaction(id: string) {
  const { error } = await client().rpc('delete_finance_transaction', { p_id: id })
  if (error) throw error
}

export async function saveAccount(account: Account, openingBalance?: number) {
  const userId = await requireUserId()
  const row: TablesInsert<'accounts'> = {
    user_id: userId, id: account.id, name: account.name, type: account.type,
    balance: account.balance, color: account.color,
    activity: account.activity, card_label: account.cardLabel, archived: false,
  }
  if (openingBalance !== undefined) row.opening_balance = openingBalance
  const { error } = await client().from('accounts').upsert(row)
  if (error) throw error
}

export async function adjustAccountBalance(account: Account, transaction: Transaction) {
  const { data, error } = await client().rpc('adjust_account_balance', {
    p_account: account as unknown as Json,
    p_action: { id: transaction.id, date: transaction.date, notes: transaction.notes },
  })
  if (error) throw error
  return data as { id: string; difference: number; ok: boolean }
}

export async function archiveAccount(id: string) {
  const { error } = await client().from('accounts').update({ archived: true }).eq('id', id)
  if (error) throw error
}

export async function saveCategory(category: Category) {
  const userId = await requireUserId()
  const { error } = await client().from('categories').upsert({
    user_id: userId, id: category.id, name: category.name, kind: category.kind,
    color: category.color, sort_order: 100, archived: false,
  })
  if (error) throw error
}

export async function archiveCategory(id: string) {
  const { error } = await client().from('categories').update({ archived: true }).eq('id', id)
  if (error) throw error
}

export async function saveBudget(budget: Budget) {
  const userId = await requireUserId()
  const { error } = await client().from('budgets').upsert({
    user_id: userId, id: budget.id, category: budget.category, category_id: budget.categoryId,
    amount: budget.amount, used: 0, period_month: budget.periodMonth ?? `${localMonthKey()}-01`, archived: false,
  })
  if (error) throw error
}

export async function deleteBudget(id: string) {
  const { error } = await client().from('budgets').update({ archived: true }).eq('id', id)
  if (error) throw error
}

export async function saveGoal(goal: Goal) {
  const userId = await requireUserId()
  const { error } = await client().from('goals').upsert({
    user_id: userId, id: goal.id, name: goal.name, target: goal.target, saved: goal.saved,
    due_date: goal.dueDate, linked_account_id: goal.linkedAccountId, notes: goal.notes, status: goal.status,
  })
  if (error) throw error
}

export async function deleteGoal(id: string) {
  const { error } = await client().from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function saveDebt(debt: Debt) {
  const userId = await requireUserId()
  const { error } = await client().from('debts').upsert({
    user_id: userId, id: debt.id, name: debt.title, title: debt.title,
    person_or_company: debt.personOrCompany, total: debt.totalAmount, paid: debt.paidAmount,
    due_date: debt.dueDate, category: debt.category, status: debt.status, notes: debt.notes,
  })
  if (error) throw error
}

export async function deleteDebt(id: string) {
  const { error } = await client().from('debts').delete().eq('id', id)
  if (error) throw error
}

export async function saveUpcomingExpense(expense: UpcomingExpense) {
  const userId = await requireUserId()
  const { error } = await client().from('upcoming_expenses').upsert({
    user_id: userId, id: expense.id, title: expense.title, amount: expense.amount,
    category: expense.category, due_date: expense.dueDate, linked_account_id: expense.linkedAccountId,
    notes: expense.notes, status: expense.status, is_recurring: expense.isRecurring,
    recurring_frequency: expense.recurringFrequency, repeat_start_date: expense.repeatStartDate,
    repeat_end_date: expense.repeatEndDate, reminder_days_before: expense.reminderDaysBefore,
    paid_transaction_id: expense.paidTransactionId,
  })
  if (error) throw error
}

export async function deleteUpcomingExpense(id: string) {
  const { error } = await client().from('upcoming_expenses').delete().eq('id', id)
  if (error) throw error
}

export async function saveUserSettings(profile: Profile, onboardingCompleted: boolean) {
  const userId = await requireUserId()
  const { error } = await client().from('user_settings').upsert({
    user_id: userId, display_name: profile.name, avatar: profile.avatar,
    currency: 'PKR', timezone: 'Asia/Karachi', onboarding_completed: onboardingCompleted,
  })
  if (error) throw error
}

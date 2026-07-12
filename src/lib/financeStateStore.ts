import { supabase } from './supabase'
import type { Profile } from './profile'
import type { Account, Budget, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'

export type FinanceState = {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  expenseCategories?: string[]
  incomeCategories?: string[]
  /** display name + avatar data URL — synced so the profile follows the account across devices */
  profile?: Profile
}

type FinanceStateRow = {
  user_id: string
  data: FinanceState
}

async function ensureFinanceSession() {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData.session?.user) return sessionData.session.user

  throw new Error('Sign in before syncing finance data.')
}

export async function loadFinanceState(seed: FinanceState) {
  if (!supabase) return seed

  const user = await ensureFinanceSession()
  const { data, error } = await supabase
    .from('finance_states')
    .select('user_id, data')
    .eq('user_id', user.id)
    .maybeSingle<FinanceStateRow>()

  if (error) throw error
  if (data?.data) return data.data

  await saveFinanceState(seed)
  return seed
}

export async function saveFinanceState(state: FinanceState) {
  if (!supabase) return

  const user = await ensureFinanceSession()
  const { error } = await supabase
    .from('finance_states')
    .upsert({
      user_id: user.id,
      data: state,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

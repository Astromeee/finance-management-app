import type { Transaction } from '../types/finance'
import { generalizeCategory } from '../data/defaultCategories'
import { recordAppActivity } from './activity'
import { trackEvent } from './analytics'
import { localMonthKey } from './date'
import { supabase } from './supabase'

export type QuickEntryData = {
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string; kind: 'income' | 'expense' }[]
  transactions: Transaction[]
}

type Row = Record<string, unknown>
const CACHE_KEY = 'pl-quick-entry-data-v1'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function mapAccount(row: Row) {
  return { id: String(row.id), name: String(row.name) }
}

function mapCategory(row: Row) {
  return { id: String(row.id), name: String(row.name), kind: row.kind as 'income' | 'expense' }
}

function mapTransaction(row: Row): Transaction {
  return {
    id: String(row.id), title: String(row.title ?? ''), amount: Number(row.amount ?? 0),
    type: row.type as Transaction['type'], category: String(row.category_name_snapshot ?? row.category ?? ''),
    categoryId: row.category_id as string | undefined, source: row.source as string | undefined,
    account: String(row.account ?? ''), accountId: row.account_id as string | undefined,
    date: String(row.transaction_date), createdAt: row.created_at as string | undefined,
  }
}

export async function readQuickEntryCache() {
  const { data: sessionData } = await client().auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Authentication required.')
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { userId: string; data: QuickEntryData } | null
    return { userId, data: cached?.userId === userId ? cached.data : null }
  } catch {
    return { userId, data: null }
  }
}

export function writeQuickEntryCache(userId: string, data: QuickEntryData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, data }))
}

export function clearQuickEntryCache() {
  localStorage.removeItem(CACHE_KEY)
}

export type QuickFinanceAction = Omit<Transaction, 'id' | 'createdAt'> & { id?: string }

export async function recordQuickFinanceAction(action: QuickFinanceAction, signal?: AbortSignal) {
  const normalizedCategory = generalizeCategory(action.category ?? action.source ?? '')
  const request = client().rpc('record_finance_action', {
    p_action: {
      ...action,
      id: action.id ?? crypto.randomUUID(),
      category: normalizedCategory || undefined,
      source: action.source ? generalizeCategory(action.source) : undefined,
    },
  })
  const { data, error } = await (signal ? request.abortSignal(signal) : request)
  if (error) throw error
  void recordAppActivity('meaningful_action')
  trackEvent('finance_action_recorded', { finance_action: action.type })
  return data as { id: string; ok: boolean }
}

/** Fetch only the three small datasets used by quick entry. */
export async function loadQuickEntryData(userId: string): Promise<QuickEntryData> {
  const monthStart = `${localMonthKey()}-01`
  const [accounts, categories, transactions] = await Promise.all([
    client().from('accounts').select('id,name').eq('archived', false).order('created_at'),
    client().from('categories').select('id,name,kind').eq('archived', false).order('kind').order('sort_order'),
    client().from('transactions').select('id,title,amount,type,category,category_id,category_name_snapshot,source,account,account_id,transaction_date,created_at').gte('transaction_date', monthStart).order('transaction_date', { ascending: false }),
  ])
  for (const result of [accounts, categories, transactions]) if (result.error) throw result.error
  const data = {
    accounts: (accounts.data as Row[]).map(mapAccount),
    categories: (categories.data as Row[]).map(mapCategory),
    transactions: (transactions.data as Row[]).map(mapTransaction),
  }
  writeQuickEntryCache(userId, data)
  return data
}

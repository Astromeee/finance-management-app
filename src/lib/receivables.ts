import { supabase } from './supabase'
import type { Receivable } from '../types/receivable'
import type { Account } from '../types/finance'
import { localDateKey } from './date'

export function refreshFinance() { window.dispatchEvent(new Event('pocket-finance-refresh')) }
export async function loadReceivables(): Promise<Receivable[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('receivables').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Receivable[]
}
export async function saveReceivable(item: Receivable) {
  if (!supabase) throw new Error('Sign in to save receivables.')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw authError ?? new Error('Sign in to continue.')
  const fields = { person: item.person, amount: item.amount, due_date: item.due_date, notes: item.notes, archived: item.archived }
  const { data: existing, error: readError } = await supabase.from('receivables').select('id').eq('id', item.id).eq('user_id', user.id).maybeSingle()
  if (readError) throw readError
  const { error } = existing
    ? await supabase.from('receivables').update(fields).eq('id', item.id).eq('user_id', user.id)
    : await supabase.from('receivables').insert({ ...fields, id: item.id, user_id: user.id })
  if (error) throw error
}
export async function receivePayment(item: Receivable, account: Account, amount: number, date: string, paymentId: string) {
  if (!supabase) throw new Error('Sign in to record a repayment.')
  const { error } = await supabase.rpc('record_receivable_payment', { p_id: item.id, p_action: { id: paymentId, amount, accountId: account.id, date: date || localDateKey(), title: `Repayment from ${item.person}` } })
  if (error) throw error
  refreshFinance()
}
export async function writeOffReceivable(id: string) {
  if (!supabase) throw new Error('Sign in to write off a receivable.')
  const { error } = await supabase.rpc('write_off_receivable', { p_id: id })
  if (error) throw error
}

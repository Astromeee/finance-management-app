import { supabase } from './supabase'

export type ActivityKind = 'session' | 'page_view' | 'meaningful_action'

export async function recordAppActivity(kind: ActivityKind) {
  if (!supabase || !navigator.onLine) return
  const { error } = await supabase.rpc('record_app_activity', { p_kind: kind })
  if (error) console.warn('Could not record aggregate app activity:', error.message)
}

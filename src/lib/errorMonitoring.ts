import { supabase } from './supabase'

type ClientErrorType = 'render_failure' | 'unhandled_error' | 'unhandled_rejection'

function safeRoute() {
  const parts = window.location.pathname.split('/').filter(Boolean).slice(0, 2)
  return `/${parts.join('/')}`.slice(0, 80) || '/'
}

function safeErrorName(value: unknown) {
  if (value instanceof Error && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(value.name)) return value.name
  return 'UnknownError'
}

export async function reportClientError(eventType: ClientErrorType, error: unknown) {
  if (!supabase || !navigator.onLine) return
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return
  await supabase.from('client_error_events').insert({
    user_id: userId,
    event_type: eventType,
    error_name: safeErrorName(error),
    route: safeRoute(),
    app_version: '0.1.0-beta.1',
  })
}

export function installClientErrorMonitoring() {
  window.addEventListener('error', (event) => { void reportClientError('unhandled_error', event.error) })
  window.addEventListener('unhandledrejection', (event) => { void reportClientError('unhandled_rejection', event.reason) })
}

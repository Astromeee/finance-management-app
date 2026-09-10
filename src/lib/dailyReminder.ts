import { supabase } from './supabase'
import { isNativeApp } from './platform'
import { getStoredNativeDailyReminder, setNativeDailyReminder } from './nativeNotifications'

export function reminderSupport() {
  if (isNativeApp) return null
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      ? 'On iPhone or iPad, add Pocket Ledger to your Home Screen, then enable reminders there.'
      : 'Push reminders are not supported in this browser.'
  }
  return null
}
async function registration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (!existing?.active) throw new Error('Finish installing the app update, then reload to enable reminders.')
  return existing
}
export async function getDailyReminder() {
  if (isNativeApp) return getStoredNativeDailyReminder()
  if (!supabase || reminderSupport()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return null
  const { data, error } = await supabase.from('push_subscriptions').select('*').eq('endpoint', subscription.endpoint).maybeSingle()
  if (error) throw error
  return data && Notification.permission === 'granted' ? data : null
}
export async function setDailyReminder(enabled: boolean, time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid reminder time.')
  if (isNativeApp) return setNativeDailyReminder(enabled, time)
  if (!supabase) throw new Error('Sign in to enable reminders.')
  const unsupported = reminderSupport()
  if (unsupported) throw new Error(unsupported)
  // Request permission immediately in the user's click event (required on iOS).
  if (enabled && await Notification.requestPermission() !== 'granted') throw new Error('Allow notifications in your browser or device settings to enable reminders.')
  const reg = await registration()
  let subscription = await reg.pushManager.getSubscription()
  if (!enabled) {
    if (subscription) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      if (error) throw error
      await subscription.unsubscribe()
    }
    return
  }
  const { data: config, error: configError } = await supabase.functions.invoke('daily-reminders', { method: 'GET' })
  if (configError || !config?.publicKey) throw new Error('Reminders are temporarily unavailable. Please try again later.')
  const raw = atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/'))
  const key = Uint8Array.from(raw, (char) => char.charCodeAt(0))
  subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys.auth) throw new Error('Could not register this device for notifications.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to enable reminders.')
  const fields = { p256dh: json.keys.p256dh, auth: json.keys.auth, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi', reminder_time: time, enabled: true }
  const { data: existing, error: readError } = await supabase.from('push_subscriptions').select('endpoint').eq('endpoint', subscription.endpoint).maybeSingle()
  if (readError) throw readError
  const { error } = existing
    ? await supabase.from('push_subscriptions').update(fields).eq('endpoint', subscription.endpoint)
    : await supabase.from('push_subscriptions').insert({ ...fields, endpoint: subscription.endpoint, user_id: user.id })
  if (error) throw error
}

export async function detachDailyReminder() {
  if (isNativeApp) return
  if (!supabase || !('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}

import type { UpcomingExpense } from '../types/finance'
import { registerPlugin } from '@capacitor/core'
import { formatMoney } from './currency'
import { localDateKey } from './date'

const dailyReminderId = 73_001
const dailyStorageKey = 'pl-native-daily-reminder'
const billIdsStorageKey = 'pl-native-bill-reminder-ids'
const nativeCallTimeoutMs = 10_000

type Permission = 'unsupported' | 'default' | 'granted' | 'denied'

const AppSettings = registerPlugin<{ openNotificationSettings: () => Promise<void> }>('AppSettings')

export class NativeNotificationPermissionError extends Error {
  constructor() {
    super('Allow notifications in Android settings, then return and try again.')
    this.name = 'NativeNotificationPermissionError'
  }
}

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications
}

function nativeCall<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), nativeCallTimeoutMs)
    promise.then((value) => { window.clearTimeout(timer); resolve(value) }, (error) => { window.clearTimeout(timer); reject(error) })
  })
}

function mapPermission(display: string): Permission {
  if (display === 'granted') return 'granted'
  if (display === 'denied') return 'denied'
  return 'default'
}

export async function requestNativeNotificationPermission(): Promise<Permission> {
  const notifications = await plugin()
  let permission = await getNativeNotificationPermission()
  if (permission !== 'granted') {
    await nativeCall(notifications.requestPermissions(), 'Android did not finish the notification permission request. Please try again.')
    permission = await getNativeNotificationPermission()
  }
  return permission
}

export async function getNativeNotificationPermission(): Promise<Permission> {
  const notifications = await plugin()
  const permission = mapPermission((await nativeCall(notifications.checkPermissions(), 'Could not read Android notification permission.')).display)
  if (permission !== 'granted') return permission
  return (await nativeCall(notifications.areEnabled(), 'Could not read Android notification settings.')).value ? 'granted' : 'denied'
}

export async function openNativeNotificationSettings() {
  await AppSettings.openNotificationSettings()
}

export async function sendNativeTestNotification() {
  if (await requestNativeNotificationPermission() !== 'granted') throw new NativeNotificationPermissionError()
  const notifications = await plugin()
  const id = 73_003
  await notifications.cancel({ notifications: [{ id }] })
  await nativeCall(notifications.schedule({ notifications: [{
    id,
    title: 'Pocket Ledger reminders are working',
    body: 'You will receive bill and daily logging reminders from this app.',
    schedule: { at: new Date(Date.now() + 2_000), allowWhileIdle: true },
    isExactNotification: false,
  }] }), 'Android did not schedule the test notification.')
}

export async function getStoredNativeDailyReminder() {
  try {
    const saved = JSON.parse(localStorage.getItem(dailyStorageKey) ?? 'null') as { enabled?: boolean; time?: string } | null
    if (!saved?.enabled || !saved.time) return null
    if (await getNativeNotificationPermission() !== 'granted') {
      localStorage.removeItem(dailyStorageKey)
      return null
    }
    return { enabled: true, reminder_time: saved.time }
  } catch {
    return null
  }
}

export async function setNativeDailyReminder(enabled: boolean, time: string) {
  const notifications = await plugin()
  await notifications.cancel({ notifications: [{ id: dailyReminderId }] })
  localStorage.removeItem(dailyStorageKey)
  if (!enabled) {
    return
  }
  if (await requestNativeNotificationPermission() !== 'granted') {
    throw new NativeNotificationPermissionError()
  }
  const [hour, minute] = time.split(':').map(Number)
  await notifications.schedule({ notifications: [{
    id: dailyReminderId,
    title: 'A minute for your money',
    body: 'Open Pocket Ledger and record anything that changed today.',
    schedule: { on: { hour, minute }, allowWhileIdle: true },
    isExactNotification: false,
  }] })
  const pending = await notifications.getPending()
  if (!pending.notifications.some(({ id }) => id === dailyReminderId)) {
    throw new Error('Android did not save the daily reminder. Please try again.')
  }
  localStorage.setItem(dailyStorageKey, JSON.stringify({ enabled: true, time }))
}

function billNotificationId(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = ((hash * 31) + id.charCodeAt(index)) | 0
  return 100_000 + (Math.abs(hash) % 900_000_000)
}

function storedBillIds() {
  try { return JSON.parse(localStorage.getItem(billIdsStorageKey) ?? '[]') as number[] }
  catch { return [] }
}

export async function clearNativeBillReminders() {
  const ids = storedBillIds()
  if (ids.length) await (await plugin()).cancel({ notifications: ids.map((id) => ({ id })) })
  localStorage.removeItem(billIdsStorageKey)
}

export async function syncNativeBillReminders(expenses: UpcomingExpense[]) {
  const notifications = await plugin()
  await clearNativeBillReminders()
  if (await getNativeNotificationPermission() !== 'granted') throw new NativeNotificationPermissionError()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const active = expenses
    .filter((bill) => bill.status !== 'paid' && bill.status !== 'cancelled')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const overdue = active.filter((bill) => new Date(`${bill.dueDate}T00:00:00`) < today)
  const scheduled = active.filter((bill) => new Date(`${bill.dueDate}T00:00:00`) >= today).slice(0, 50)
  const items = scheduled.map((bill) => {
    const at = new Date(`${bill.dueDate}T09:00:00`)
    if (at.getTime() <= Date.now()) at.setTime(Date.now() + 3_000)
    return {
      id: billNotificationId(bill.id),
      title: `${bill.title} is due${bill.dueDate === localDateKey(now) ? ' today' : ''}`,
      body: `${formatMoney(bill.amount)} is reserved in your plan.`,
      schedule: { at, allowWhileIdle: true },
      isExactNotification: false,
    }
  })
  if (overdue.length) items.push({
    id: 73_002,
    title: overdue.length === 1 ? `${overdue[0].title} is overdue` : `${overdue.length} bills are overdue`,
    body: overdue.length === 1 ? `${formatMoney(overdue[0].amount)} is still marked unpaid.` : 'Open Pocket Ledger to review them.',
    schedule: { at: new Date(Date.now() + 3_000), allowWhileIdle: true },
    isExactNotification: false,
  })
  if (!items.length) return 0
  await notifications.schedule({ notifications: items })
  const expectedIds = new Set(items.map(({ id }) => id))
  const pending = await notifications.getPending()
  const saved = pending.notifications.filter(({ id }) => expectedIds.has(id)).length
  if (saved !== expectedIds.size) throw new Error('Android did not save all bill reminders. Please try again.')
  localStorage.setItem(billIdsStorageKey, JSON.stringify(items.map(({ id }) => id)))
  return saved
}

import type { UpcomingExpense } from '../types/finance'
import { registerPlugin } from '@capacitor/core'
import { formatMoney } from './currency'
import { localDateKey } from './date'

const dailyReminderId = 73_001
const dailyStorageKey = 'pl-native-daily-reminder'
const billIdsStorageKey = 'pl-native-bill-reminder-ids'
const nativeCallTimeoutMs = 8_000

type Permission = 'unsupported' | 'default' | 'granted' | 'denied'
type NativeReminder = { id: number; title: string; body: string; at: number; daily?: boolean }

const AppSettings = registerPlugin<{ openNotificationSettings: () => Promise<void> }>('AppSettings')
const PocketNotifications = registerPlugin<{
  getPermissionStatus: () => Promise<{ permission: Permission }>
  requestPermission: () => Promise<{ permission: Permission }>
  schedule: (options: { notifications: NativeReminder[] }) => Promise<{ count: number }>
  cancel: (options: { ids: number[] }) => Promise<void>
  sendTest: () => Promise<void>
}>('PocketNotifications')

export class NativeNotificationPermissionError extends Error {
  constructor() {
    super('Allow notifications in Android settings, then return and try again.')
    this.name = 'NativeNotificationPermissionError'
  }
}

function nativeCall<T>(promise: Promise<T>, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => globalThis.setTimeout(() => reject(new Error(message)), nativeCallTimeoutMs)),
  ])
}

export async function requestNativeNotificationPermission(): Promise<Permission> {
  let permission = await getNativeNotificationPermission()
  if (permission !== 'granted') {
    permission = (await nativeCall(
      PocketNotifications.requestPermission(),
      'Android did not finish the notification permission request. Open Android settings and allow notifications.',
    )).permission
  }
  return permission
}

export async function getNativeNotificationPermission(): Promise<Permission> {
  return (await nativeCall(
    PocketNotifications.getPermissionStatus(),
    'Android did not return the notification permission status.',
  )).permission
}

export async function openNativeNotificationSettings() {
  await AppSettings.openNotificationSettings()
}

export async function sendNativeTestNotification() {
  if (await requestNativeNotificationPermission() !== 'granted') throw new NativeNotificationPermissionError()
  await nativeCall(PocketNotifications.sendTest(), 'Android did not send the test notification.')
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

function nextDailyTime(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const at = new Date()
  at.setHours(hour, minute, 0, 0)
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)
  return at.getTime()
}

export async function setNativeDailyReminder(enabled: boolean, time: string) {
  await nativeCall(PocketNotifications.cancel({ ids: [dailyReminderId] }), 'Android did not update the daily reminder.')
  localStorage.removeItem(dailyStorageKey)
  if (!enabled) return
  if (await requestNativeNotificationPermission() !== 'granted') throw new NativeNotificationPermissionError()
  const result = await nativeCall(PocketNotifications.schedule({ notifications: [{
    id: dailyReminderId,
    title: 'A minute for your money',
    body: 'Open Pocket Ledger and record anything that changed today.',
    at: nextDailyTime(time),
    daily: true,
  }] }), 'Android did not save the daily reminder.')
  if (result.count !== 1) throw new Error('Android did not save the daily reminder. Please try again.')
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
  if (ids.length) await nativeCall(PocketNotifications.cancel({ ids }), 'Android did not clear old bill reminders.')
  localStorage.removeItem(billIdsStorageKey)
}

export async function syncNativeBillReminders(expenses: UpcomingExpense[]) {
  await clearNativeBillReminders()
  if (await getNativeNotificationPermission() !== 'granted') throw new NativeNotificationPermissionError()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const active = expenses
    .filter((bill) => bill.status !== 'paid' && bill.status !== 'cancelled')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const overdue = active.filter((bill) => new Date(`${bill.dueDate}T00:00:00`) < today)
  const scheduled = active.filter((bill) => new Date(`${bill.dueDate}T00:00:00`) >= today).slice(0, 50)
  const items: NativeReminder[] = scheduled.map((bill) => {
    const at = new Date(`${bill.dueDate}T09:00:00`)
    if (at.getTime() <= Date.now()) at.setTime(Date.now() + 3_000)
    return {
      id: billNotificationId(bill.id),
      title: `${bill.title} is due${bill.dueDate === localDateKey(now) ? ' today' : ''}`,
      body: `${formatMoney(bill.amount)} is reserved in your plan.`,
      at: at.getTime(),
    }
  })
  if (overdue.length) items.push({
    id: 73_002,
    title: overdue.length === 1 ? `${overdue[0].title} is overdue` : `${overdue.length} bills are overdue`,
    body: overdue.length === 1 ? `${formatMoney(overdue[0].amount)} is still marked unpaid.` : 'Open Pocket Ledger to review them.',
    at: Date.now() + 3_000,
  })
  if (!items.length) return 0
  const result = await nativeCall(PocketNotifications.schedule({ notifications: items }), 'Android did not save the bill reminders.')
  if (result.count !== items.length) throw new Error('Android did not save all bill reminders. Please try again.')
  localStorage.setItem(billIdsStorageKey, JSON.stringify(items.map(({ id }) => id)))
  return result.count
}

import type { UpcomingExpense } from '../types/finance'
import { formatMoney } from './currency'
import { localDateKey } from './date'

const dailyReminderId = 73_001
const dailyStorageKey = 'pl-native-daily-reminder'
const billIdsStorageKey = 'pl-native-bill-reminder-ids'

type Permission = 'unsupported' | 'default' | 'granted' | 'denied'

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications
}

function mapPermission(display: string): Permission {
  if (display === 'granted') return 'granted'
  if (display === 'denied') return 'denied'
  return 'default'
}

export async function requestNativeNotificationPermission(): Promise<Permission> {
  const notifications = await plugin()
  let status = await notifications.checkPermissions()
  if (status.display !== 'granted') status = await notifications.requestPermissions()
  return mapPermission(status.display)
}

export async function getStoredNativeDailyReminder() {
  try {
    const saved = JSON.parse(localStorage.getItem(dailyStorageKey) ?? 'null') as { enabled?: boolean; time?: string } | null
    if (!saved?.enabled || !saved.time) return null
    if (mapPermission((await (await plugin()).checkPermissions()).display) !== 'granted') {
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
    throw new Error('Allow notifications in Android settings to enable reminders.')
  }
  const [hour, minute] = time.split(':').map(Number)
  const at = new Date()
  at.setHours(hour, minute, 0, 0)
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)
  await notifications.schedule({ notifications: [{
    id: dailyReminderId,
    title: 'A minute for your money',
    body: 'Open Pocket Ledger and record anything that changed today.',
    schedule: { at, repeats: true, every: 'day', allowWhileIdle: true },
    isExactNotification: false,
  }] })
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
  if (await requestNativeNotificationPermission() !== 'granted') return

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
  if (!items.length) return
  await notifications.schedule({ notifications: items })
  localStorage.setItem(billIdsStorageKey, JSON.stringify(items.map(({ id }) => id)))
}

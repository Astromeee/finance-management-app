/**
 * Bill reminders.
 *
 * The Settings toggle used to write `pl-notifications` to localStorage and
 * nothing ever read it, so the switch animated and did nothing. It now gates
 * real Notification API reminders for bills that are due or overdue.
 *
 * Deliberately modest: reminders fire when the app is opened, not from a
 * service worker on a schedule. A PWA can only do scheduled push with a server
 * and a subscription, which this app has no backend for.
 */

import type { UpcomingExpense } from '../types/finance'
import { formatMoney } from './currency'
import { localDateKey } from './date'

const ENABLED_KEY = 'pl-notifications'
const SENT_KEY = 'pl-notifications-sent'

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission as NotificationPermissionState
}

export function notificationsEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'on'
  } catch {
    return false
  }
}

function setEnabledFlag(enabled: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    // A locked storage jar just means the preference does not survive a reload.
  }
}

/**
 * Turning reminders on has to ask the browser first — a stored "on" with no
 * permission is exactly the silent lie this module exists to remove.
 * Returns the state actually reached.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<NotificationPermissionState> {
  if (!enabled) {
    setEnabledFlag(false)
    return notificationPermission()
  }
  if (!notificationsSupported()) return 'unsupported'
  let permission = notificationPermission()
  if (permission === 'default') {
    try {
      permission = (await Notification.requestPermission()) as NotificationPermissionState
    } catch {
      permission = 'denied'
    }
  }
  setEnabledFlag(permission === 'granted')
  return permission
}

function alreadySentToday(key: string) {
  const today = localDateKey()
  try {
    const raw = localStorage.getItem(SENT_KEY)
    const sent = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    if (sent[key] === today) return true
    // keep only today's marks so the record cannot grow without bound
    const next: Record<string, string> = { [key]: today }
    for (const [id, day] of Object.entries(sent)) if (day === today) next[id] = day
    localStorage.setItem(SENT_KEY, JSON.stringify(next))
    return false
  } catch {
    return false
  }
}

/** Remind once per day about bills that are due today or already overdue. */
export function notifyDueBills(upcomingExpenses: UpcomingExpense[]) {
  if (!notificationsEnabled() || notificationPermission() !== 'granted') return
  const today = localDateKey()
  const due = upcomingExpenses.filter((bill) => bill.status !== 'paid' && bill.status !== 'cancelled' && bill.dueDate <= today)
  if (!due.length) return

  if (due.length === 1) {
    const bill = due[0]
    if (alreadySentToday(`bill:${bill.id}`)) return
    show(
      bill.dueDate === today ? `${bill.title} is due today` : `${bill.title} is overdue`,
      `${formatMoney(bill.amount)} is reserved in your plan.`,
    )
    return
  }

  if (alreadySentToday(`bills:${today}`)) return
  const total = due.reduce((sum, bill) => sum + bill.amount, 0)
  show(`${due.length} bills need paying`, `${formatMoney(total)} across ${due.length} bills due or overdue.`)
}

function show(title: string, body: string) {
  try {
    new Notification(title, { body, icon: '/pocket-ledger-icon.png', tag: 'pocket-ledger-bills' })
  } catch {
    // Some browsers only allow construction from a service worker; skip quietly.
  }
}

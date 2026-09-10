import { beforeEach, describe, expect, it, vi } from 'vitest'

const notifications = vi.hoisted(() => ({
  cancel: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  areEnabled: vi.fn(),
  schedule: vi.fn(),
  getPending: vi.fn(),
}))
const appSettings = vi.hoisted(() => ({ openNotificationSettings: vi.fn() }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: notifications }))
vi.mock('@capacitor/core', () => ({ registerPlugin: () => appSettings }))
import { getStoredNativeDailyReminder, sendNativeTestNotification, setNativeDailyReminder, syncNativeBillReminders } from './nativeNotifications'

describe('Android local reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    })
    notifications.cancel.mockResolvedValue(undefined)
    notifications.checkPermissions.mockResolvedValue({ display: 'granted' })
    notifications.requestPermissions.mockResolvedValue({ display: 'granted' })
    notifications.areEnabled.mockResolvedValue({ value: true })
    notifications.schedule.mockResolvedValue({ notifications: [] })
    notifications.getPending.mockImplementation(async () => ({
      notifications: (notifications.schedule.mock.calls.at(-1)?.[0].notifications ?? []).map(({ id }: { id: number }) => ({ id })),
    }))
    appSettings.openNotificationSettings.mockResolvedValue(undefined)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T12:00:00'))
  })

  it('schedules and remembers a repeating daily reminder', async () => {
    await setNativeDailyReminder(true, '21:30')
    expect(notifications.schedule).toHaveBeenCalledWith({ notifications: [expect.objectContaining({
      id: 73001,
      schedule: expect.objectContaining({ on: { hour: 21, minute: 30 } }),
      isExactNotification: false,
    })] })
    await expect(getStoredNativeDailyReminder()).resolves.toEqual({ enabled: true, reminder_time: '21:30' })
  })

  it('does not save a reminder when notification permission is denied', async () => {
    notifications.checkPermissions.mockResolvedValue({ display: 'denied' })
    notifications.requestPermissions.mockResolvedValue({ display: 'denied' })
    await expect(setNativeDailyReminder(true, '21:00')).rejects.toThrow('Allow notifications')
    await expect(getStoredNativeDailyReminder()).resolves.toBeNull()
  })

  it('rejects when Android has disabled notifications at the app level', async () => {
    notifications.areEnabled.mockResolvedValue({ value: false })
    await expect(setNativeDailyReminder(true, '21:00')).rejects.toThrow('Android settings')
    expect(notifications.schedule).not.toHaveBeenCalled()
  })

  it('schedules unpaid bills and omits paid bills', async () => {
    await syncNativeBillReminders([
      { id: 'rent', title: 'Rent', amount: 50000, dueDate: '2026-09-11', status: 'upcoming' },
      { id: 'paid', title: 'Internet', amount: 5000, dueDate: '2026-09-11', status: 'paid' },
    ] as never)
    const call = notifications.schedule.mock.calls[0][0]
    expect(call.notifications).toHaveLength(1)
    expect(call.notifications[0]).toEqual(expect.objectContaining({ title: 'Rent is due', isExactNotification: false }))
  })

  it('schedules an immediate notification that confirms Android delivery', async () => {
    await sendNativeTestNotification()
    const notification = notifications.schedule.mock.calls[0][0].notifications[0]
    expect(notification).toEqual(expect.objectContaining({
      id: 73003,
      title: 'Pocket Ledger reminders are working',
      isExactNotification: false,
    }))
    expect(notification.schedule.at.getTime()).toBe(Date.now() + 2_000)
  })
})

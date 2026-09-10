import { beforeEach, describe, expect, it, vi } from 'vitest'

const nativeNotifications = vi.hoisted(() => ({
  cancel: vi.fn(),
  getPermissionStatus: vi.fn(),
  requestPermission: vi.fn(),
  schedule: vi.fn(),
  sendTest: vi.fn(),
}))
const appSettings = vi.hoisted(() => ({ openNotificationSettings: vi.fn() }))
vi.mock('@capacitor/core', () => ({
  registerPlugin: (name: string) => name === 'PocketNotifications' ? nativeNotifications : appSettings,
}))
import { getStoredNativeDailyReminder, sendNativeTestNotification, setNativeDailyReminder, syncNativeBillReminders } from './nativeNotifications'

describe('Android native reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    })
    nativeNotifications.cancel.mockResolvedValue(undefined)
    nativeNotifications.getPermissionStatus.mockResolvedValue({ permission: 'granted' })
    nativeNotifications.requestPermission.mockResolvedValue({ permission: 'granted' })
    nativeNotifications.schedule.mockImplementation(async ({ notifications }: { notifications: unknown[] }) => ({ count: notifications.length }))
    nativeNotifications.sendTest.mockResolvedValue(undefined)
    appSettings.openNotificationSettings.mockResolvedValue(undefined)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T12:00:00'))
  })

  it('schedules and remembers a repeating daily reminder', async () => {
    await setNativeDailyReminder(true, '21:30')
    expect(nativeNotifications.schedule).toHaveBeenCalledWith({ notifications: [expect.objectContaining({
      id: 73001,
      at: new Date('2026-09-10T21:30:00').getTime(),
      daily: true,
    })] })
    await expect(getStoredNativeDailyReminder()).resolves.toEqual({ enabled: true, reminder_time: '21:30' })
  })

  it('does not save a reminder when notification permission is denied', async () => {
    nativeNotifications.getPermissionStatus.mockResolvedValue({ permission: 'denied' })
    nativeNotifications.requestPermission.mockResolvedValue({ permission: 'denied' })
    await expect(setNativeDailyReminder(true, '21:00')).rejects.toThrow('Allow notifications')
    await expect(getStoredNativeDailyReminder()).resolves.toBeNull()
  })

  it('schedules unpaid bills and omits paid bills', async () => {
    await syncNativeBillReminders([
      { id: 'rent', title: 'Rent', amount: 50000, dueDate: '2026-09-11', status: 'upcoming' },
      { id: 'paid', title: 'Internet', amount: 5000, dueDate: '2026-09-11', status: 'paid' },
    ] as never)
    const call = nativeNotifications.schedule.mock.calls[0][0]
    expect(call.notifications).toHaveLength(1)
    expect(call.notifications[0]).toEqual(expect.objectContaining({ title: 'Rent is due', at: new Date('2026-09-11T09:00:00').getTime() }))
  })

  it('uses the direct native test notification method', async () => {
    await sendNativeTestNotification()
    expect(nativeNotifications.sendTest).toHaveBeenCalledOnce()
  })
})

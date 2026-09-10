import { Bell } from 'lucide-react'
import { useEffect, useRef, useState, useId } from 'react'
import { getDailyReminder, reminderSupport, setDailyReminder } from '../lib/dailyReminder'
import { NativeNotificationPermissionError, openNativeNotificationSettings } from '../lib/nativeNotifications'
import { isNativeApp } from '../lib/platform'

export function DailyReminderSetting() {
  const timeId = useId()
  const [enabled, setEnabled] = useState(false), [time, setTime] = useState('21:00'), [savedTime, setSavedTime] = useState('21:00')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [note, setNote] = useState<string | null>(null)
  const [notificationSettingsNeeded, setNotificationSettingsNeeded] = useState(false)
  const interacted = useRef(false)
  useEffect(() => {
    let live = true
    void getDailyReminder().then((row) => { if (!live || interacted.current) return; setEnabled(Boolean(row?.enabled)); if (row) { setTime(row.reminder_time.slice(0, 5)); setSavedTime(row.reminder_time.slice(0, 5)) } }).catch(() => { if (live && !interacted.current) setNote('Could not check reminder settings. You can still turn it on below.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])
  const unsupported = reminderSupport()
  const save = async (wanted: boolean) => {
    if (busy) return
    interacted.current = true
    setBusy(true); setNote(wanted ? 'Checking Android notification access…' : 'Turning reminder off…'); setNotificationSettingsNeeded(false)
    try { await setDailyReminder(wanted, time); setEnabled(wanted); setSavedTime(time); setNote(wanted ? `On · Every day at ${time}` : 'Off') }
    catch (error) { setNote(error instanceof Error ? error.message : 'Could not update reminders.'); setNotificationSettingsNeeded(isNativeApp && error instanceof NativeNotificationPermissionError) }
    finally { setBusy(false) }
  }
  return <div className="daily-reminder-setting">
    <div className="daily-reminder-row vault-settings-row"><span className="vault-settings-chip"><Bell size={18}/></span><div className="vault-settings-row-title"><strong>Daily logging reminder</strong><p className="vault-sheet-note">A gentle evening check-in on this device.</p></div><button type="button" className={`vault-toggle${enabled ? ' is-on' : ''}`} role="switch" aria-label="Daily logging reminder" aria-checked={enabled} aria-busy={busy || loading} disabled={Boolean(unsupported)} onClick={() => { if (!unsupported) void save(!enabled) }} /></div>
    {enabled && <div className="daily-reminder-time"><label htmlFor={timeId}>Once a day at</label><input id={timeId} className="form-input" aria-label="Daily reminder time" type="time" value={time} disabled={busy} onChange={(e) => setTime(e.target.value)} />{time !== savedTime && <button className="vault-link" type="button" disabled={busy || !time} onClick={() => void save(true)}>Save time</button>}<small>Your device’s time zone</small></div>}
    {(note || reminderSupport()) && <p className="vault-sheet-note mt-2" role="status">{note || reminderSupport()}</p>}
    {notificationSettingsNeeded && <button className="vault-link mt-2" type="button" onClick={() => { void openNativeNotificationSettings() }}>Open Android notification settings</button>}
  </div>
}

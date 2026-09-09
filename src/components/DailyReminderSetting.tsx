import { useEffect, useState, useId } from 'react'
import { getDailyReminder, reminderSupport, setDailyReminder } from '../lib/dailyReminder'

export function DailyReminderSetting() {
  const timeId = useId()
  const [enabled, setEnabled] = useState(false), [time, setTime] = useState('21:00'), [savedTime, setSavedTime] = useState('21:00')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void getDailyReminder().then((row) => { if (!live) return; setEnabled(Boolean(row?.enabled)); if (row) { setTime(row.reminder_time.slice(0, 5)); setSavedTime(row.reminder_time.slice(0, 5)) } }).catch(() => { if (live) setNote('Could not check reminder settings. Please reopen Settings.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])
  const save = async (wanted: boolean) => {
    if (busy) return
    setBusy(true); setNote(null)
    try { await setDailyReminder(wanted, time); setEnabled(wanted); setSavedTime(time) }
    catch (error) { setNote(error instanceof Error ? error.message : 'Could not update reminders.') }
    finally { setBusy(false) }
  }
  return <div className="daily-reminder-setting">
    <div className="daily-reminder-row"><div><strong>Daily logging reminder</strong><p className="vault-sheet-note">A gentle evening check-in on this device.</p></div><button type="button" className={`vault-toggle${enabled ? ' is-on' : ''}`} role="switch" aria-label="Daily logging reminder" aria-checked={enabled} disabled={busy || loading} onClick={() => void save(!enabled)} /></div>
    {enabled && <div className="daily-reminder-time"><label htmlFor={timeId}>Once a day at</label><input id={timeId} className="form-input" aria-label="Daily reminder time" type="time" value={time} disabled={busy} onChange={(e) => setTime(e.target.value)} />{time !== savedTime && <button className="vault-link" type="button" disabled={busy || !time} onClick={() => void save(true)}>Save time</button>}<small>Your device’s time zone</small></div>}
    {(note || reminderSupport()) && <p className="vault-sheet-note mt-2" role="status">{note || reminderSupport()}</p>}
  </div>
}

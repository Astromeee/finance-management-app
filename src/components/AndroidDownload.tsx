import { Download } from 'lucide-react'
import { isNativeApp } from '../lib/platform'

/** A stable release asset URL, updated whenever a new Android build is published. */
export function AndroidDownload() {
  if (isNativeApp) return null
  return <a className="android-download" href="https://github.com/Astromeee/finance-management-app/releases/download/android-latest/pocket-ledger.apk">
    <span className="vault-settings-chip"><Download size={18}/></span>
    <span><strong>Download Android app</strong><small>Latest APK · Widgets, Quick Tap & reminders</small></span>
    <span aria-hidden>↗</span>
  </a>
}

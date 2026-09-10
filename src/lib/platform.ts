import { Capacitor } from '@capacitor/core'

export const isNativeApp = Capacitor.isNativePlatform()
export const nativeAuthRedirectUrl = 'app.pocketledger.mobile://auth/callback'

// Email verification and password recovery finish on the existing website.
// A native OAuth flow will need its own registered callback before enabling it.
export function authRedirectUrl(path: '/auth/callback' | '/reset-password') {
  const origin = isNativeApp
    ? (import.meta.env.VITE_PUBLIC_WEB_URL || 'https://pocket-ledger-seven-phi.vercel.app')
    : window.location.origin
  return `${origin.replace(/\/$/, '')}${path}`
}

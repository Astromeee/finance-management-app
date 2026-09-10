import { Capacitor } from '@capacitor/core'

export const isNativeApp = Capacitor.isNativePlatform()
export const nativeAuthRedirectUrl = 'app.pocketledger.mobile://auth/callback'

const publicWebUrl = import.meta.env.VITE_PUBLIC_WEB_URL || 'https://pocket-ledger-seven-phi.vercel.app'

// Supabase always accepts the production web callback already used by the web app.
// The native marker lets that page hand the one-time PKCE code back to Android.
export const nativeOAuthBridgeUrl = `${publicWebUrl.replace(/\/$/, '')}/auth/callback?native=android`

// Email verification and password recovery finish on the existing website.
// A native OAuth flow will need its own registered callback before enabling it.
export function authRedirectUrl(path: '/auth/callback' | '/reset-password') {
  const origin = isNativeApp
    ? publicWebUrl
    : window.location.origin
  return `${origin.replace(/\/$/, '')}${path}`
}

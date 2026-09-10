import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { nativeAuthRedirectUrl, nativeOAuthBridgeUrl } from './platform'
import { supabase } from './supabase'

export const nativeAuthErrorEvent = 'pocket-ledger:native-auth-error'
export const nativeAuthCancelEvent = 'pocket-ledger:native-auth-cancel'

function reportAuthError(message: string) {
  window.dispatchEvent(new CustomEvent(nativeAuthErrorEvent, { detail: message }))
}

export async function startNativeGoogleSignIn() {
  if (!supabase) throw new Error('Secure sign-in is not configured.')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: nativeOAuthBridgeUrl, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data.url) throw new Error('Google sign-in could not be started.')
  await Browser.open({ url: data.url, toolbarColor: '#F5F2EB' })
}

export async function consumeNativeAuthUrl(url: string) {
  if (!url.startsWith(nativeAuthRedirectUrl) || !supabase) return false
  const parsed = new URL(url)
  const error = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error')
  if (error) {
    reportAuthError(error)
    return true
  }
  const code = parsed.searchParams.get('code')
  if (!code) {
    reportAuthError('Google sign-in returned without an authorization code.')
    return true
  }
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) throw exchangeError
  return true
}

export async function installNativeAuth() {
  await App.addListener('appUrlOpen', ({ url }) => {
    void consumeNativeAuthUrl(url)
      .then((handled) => { if (handled) void Browser.close().catch(() => undefined) })
      .catch((error) => reportAuthError(error instanceof Error ? error.message : 'Google sign-in failed.'))
  })
  await Browser.addListener('browserFinished', () => {
    window.dispatchEvent(new Event(nativeAuthCancelEvent))
  })
  const launch = await App.getLaunchUrl()
  if (launch?.url) {
    try {
      if (await consumeNativeAuthUrl(launch.url)) await Browser.close().catch(() => undefined)
    } catch (error) {
      reportAuthError(error instanceof Error ? error.message : 'Google sign-in failed.')
    }
  }
}

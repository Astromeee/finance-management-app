import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  open: vi.fn(),
}))
vi.mock('./supabase', () => ({ supabase: {
  auth: {
    exchangeCodeForSession: mocks.exchangeCodeForSession,
    signInWithOAuth: mocks.signInWithOAuth,
  },
} }))
vi.mock('@capacitor/browser', () => ({ Browser: {
  open: mocks.open, close: vi.fn(), addListener: vi.fn(),
} }))
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), getLaunchUrl: vi.fn() } }))
import { consumeNativeAuthUrl, startNativeGoogleSignIn } from './nativeAuth'

describe('native Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.test/oauth' }, error: null })
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    mocks.open.mockResolvedValue(undefined)
  })

  it('starts PKCE through the system browser with the app callback', async () => {
    await startNativeGoogleSignIn()
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://pocket-ledger-seven-phi.vercel.app/auth/callback?native=android', skipBrowserRedirect: true },
    })
    expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://accounts.google.test/oauth' }))
  })

  it('exchanges the returned authorization code for a session', async () => {
    await expect(consumeNativeAuthUrl('app.pocketledger.mobile://auth/callback?code=one-time-code')).resolves.toBe(true)
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code')
  })

  it('ignores unrelated links', async () => {
    await expect(consumeNativeAuthUrl('https://pocket-ledger-seven-phi.vercel.app/auth/callback?code=x')).resolves.toBe(false)
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled()
  })
})

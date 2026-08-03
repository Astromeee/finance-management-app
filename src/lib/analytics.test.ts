import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('analytics', () => {
  const commands = () => window.dataLayer?.map((command) => Array.from(command))

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    document.head.innerHTML = ''
    window.sessionStorage.clear()
    delete window.dataLayer
    delete window.gtag
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('waits for consent, then initializes with the signed-in user and flushes auth', async () => {
    const analytics = await import('./analytics')
    analytics.setAnalyticsUserId('user-123')
    analytics.queueAuthEvent('login', 'password')
    analytics.trackEvent('page_view', { surface: 'home' })

    expect(window.dataLayer).toBeUndefined()

    analytics.setAnalyticsConsent(true)

    expect(document.querySelector('script')?.src).toContain('G-TEST123')
    expect(commands()).toEqual(expect.arrayContaining([
      expect.arrayContaining(['config', 'G-TEST123', expect.objectContaining({ user_id: 'user-123' })]),
      ['event', 'login', { method: 'password' }],
    ]))
    expect(window.sessionStorage.getItem('pocket-ledger-pending-auth-event')).toBeNull()
  })

  it('updates and clears GA4 User-ID after initialization', async () => {
    const analytics = await import('./analytics')
    analytics.setAnalyticsConsent(true)
    analytics.setAnalyticsUserId('user-456')
    analytics.setAnalyticsUserId(null)

    expect(commands()).toEqual(expect.arrayContaining([
      ['set', { user_id: 'user-456' }],
      ['set', { user_id: null }],
    ]))
  })

  it('does not send events while consent is denied', async () => {
    const analytics = await import('./analytics')
    analytics.setAnalyticsConsent(false)
    analytics.trackEvent('finance_action_recorded', { finance_action: 'expense' })

    expect(commands()).toBeUndefined()
    expect(document.querySelector('script')).toBeNull()
  })

  it('initializes as granted when the stored account setting loads', async () => {
    const analytics = await import('./analytics')
    analytics.setAnalyticsConsent(false)
    analytics.setAnalyticsConsent(true)
    analytics.trackEvent('page_view', { surface: 'home' })

    expect(commands()).toEqual(expect.arrayContaining([
      ['consent', 'default', expect.objectContaining({ analytics_storage: 'granted' })],
      ['event', 'page_view', { surface: 'home' }],
    ]))
    expect(commands()).not.toEqual(expect.arrayContaining([
      ['consent', 'update', expect.anything()],
    ]))
    expect(document.querySelector('script')?.src).toContain('G-TEST123')
  })
})

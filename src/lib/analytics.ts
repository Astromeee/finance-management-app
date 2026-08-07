type AnalyticsEvent =
  | 'page_view'
  | 'login'
  | 'sign_up'
  | 'finance_action_recorded'
  | 'account_saved'
  | 'budget_saved'
  | 'goal_saved'
  | 'debt_saved'
  | 'upcoming_expense_saved'
  | 'category_saved'
  | 'wishlist_saved'
  | 'quest_saved'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'journey_breakdown_opened'
  | 'simulator_opened'
  | 'simulator_result_viewed'
  | 'simulator_expense_handoff'
  | 'category_management_opened'
  | 'quest_started'
  | 'quest_completed'
  | 'quest_ended'
  | 'wishlist_item_added'
  | 'wishlist_decision'
  | 'insight_viewed'
  | 'story_opened'

type SafeParameters = {
  surface?: 'home' | 'activity' | 'plan' | 'goals' | 'insights' | 'settings' | 'onboarding'
  state?: 'comfortable' | 'watchful' | 'protect' | 'needs_setup' | 'safe' | 'caution' | 'risky' | 'empty' | 'available'
  action?: 'open' | 'complete' | 'cancel' | 'expire' | 'buy' | 'skip' | 'wait' | 'move_to_goal'
  method?: 'password' | 'google'
  finance_action?: 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | 'goal_saving' | 'debt_payment'
}

declare global {
  interface Window {
    dataLayer?: IArguments[]
    gtag?: (...args: unknown[]) => void
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
let consentGranted = false
let consentConfigured = false
let initialized = false
let analyticsUserId: string | null | undefined
const queuedAuthEventKey = 'pocket-ledger-pending-auth-event'

function gtag(..._args: unknown[]) {
  void _args
  window.dataLayer = window.dataLayer ?? []
  // Match Google's canonical snippet exactly. gtag.js expects each command as
  // the function's array-like arguments object, not a manually created array.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
}

export function setAnalyticsConsent(granted: boolean) {
  consentGranted = granted
  // Basic consent mode: do not load or configure Google at all before the
  // account's stored analytics setting is known to be granted.
  if (!granted && !consentConfigured) return
  window.gtag = window.gtag ?? gtag
  gtag('consent', consentConfigured ? 'update' : 'default', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  consentConfigured = true
  if (!granted || !measurementId || initialized) return
  const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  const scriptPresent = [...document.scripts].some((script) => script.src === scriptUrl)
  if (!scriptPresent) {
    const script = document.createElement('script')
    script.async = true
    script.src = scriptUrl
    document.head.appendChild(script)
    gtag('js', new Date())
  }
  gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(analyticsUserId ? { user_id: analyticsUserId } : {}),
  })
  initialized = true
  flushQueuedAuthEvent()
}

export function setAnalyticsUserId(userId: string | null) {
  analyticsUserId = userId
  if (consentGranted && measurementId && initialized) gtag('set', { user_id: userId })
}

export function queueAuthEvent(name: 'login' | 'sign_up', method: 'password' | 'google') {
  try {
    window.sessionStorage.setItem(queuedAuthEventKey, JSON.stringify({ name, method }))
  } catch {
    // Analytics must never block authentication when storage is unavailable.
  }
}

export function clearQueuedAuthEvent() {
  try {
    window.sessionStorage.removeItem(queuedAuthEventKey)
  } catch {
    // Authentication error handling must also work when storage is unavailable.
  }
}

function flushQueuedAuthEvent() {
  if (!consentGranted || !measurementId) return
  try {
    const raw = window.sessionStorage.getItem(queuedAuthEventKey)
    if (!raw) return
    const queued = JSON.parse(raw) as { name?: string; method?: string }
    if ((queued.name === 'login' || queued.name === 'sign_up') && (queued.method === 'password' || queued.method === 'google')) {
      trackEvent(queued.name, { method: queued.method })
    }
    clearQueuedAuthEvent()
  } catch {
    clearQueuedAuthEvent()
  }
}

export function trackEvent(name: AnalyticsEvent, parameters: SafeParameters = {}) {
  if (!consentGranted || !measurementId) return
  // The API accepts only fixed enums. Financial values and free-form content cannot enter the payload.
  gtag('event', name, parameters)
}

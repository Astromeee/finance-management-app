type AnalyticsEvent =
  | 'page_view'
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
}

declare global {
  interface Window {
    dataLayer?: unknown[][]
    gtag?: (...args: unknown[]) => void
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
let consentGranted = false
let initialized = false

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(args)
}

export function setAnalyticsConsent(granted: boolean) {
  consentGranted = granted
  window.gtag = window.gtag ?? gtag
  gtag('consent', initialized ? 'update' : 'default', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  if (!granted || !measurementId || initialized) return
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)
  gtag('js', new Date())
  gtag('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
  initialized = true
}

export function trackEvent(name: AnalyticsEvent, parameters: SafeParameters = {}) {
  if (!consentGranted || !measurementId) return
  // The API accepts only fixed enums. Financial values and free-form content cannot enter the payload.
  gtag('event', name, parameters)
}

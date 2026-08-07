/**
 * Pocket Ledger currency store.
 *
 * The ledger records plain numbers; a currency is a *label* on those numbers,
 * never a conversion. Switching from PKR to USD relabels Rs 500 as $500 — it
 * does not apply an exchange rate, because the app holds no rate data and
 * silently restating someone's balances would be worse than doing nothing.
 *
 * Mirrors the profile store: localStorage for a synchronous read during render,
 * a change event so open screens re-render, and `user_settings.currency` in
 * Supabase as the durable copy.
 */

import { useSyncExternalStore } from 'react'

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED' | 'SAR' | 'BDT' | 'CAD' | 'AUD'

type CurrencyMeta = { code: CurrencyCode; label: string; symbol: string; locale: string }

/** Symbols are declared rather than taken from Intl: ICU output for these
 *  varies by platform, and the symbol is rendered in its own span all over
 *  the UI, so it has to be short and stable. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: 'PKR', label: 'Pakistani rupee', symbol: 'Rs', locale: 'en-PK' },
  { code: 'INR', label: 'Indian rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'BDT', label: 'Bangladeshi taka', symbol: '৳', locale: 'en-BD' },
  { code: 'AED', label: 'UAE dirham', symbol: 'AED', locale: 'en-AE' },
  { code: 'SAR', label: 'Saudi riyal', symbol: 'SAR', locale: 'en-SA' },
  { code: 'USD', label: 'US dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', label: 'British pound', symbol: '£', locale: 'en-GB' },
  { code: 'CAD', label: 'Canadian dollar', symbol: 'CA$', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian dollar', symbol: 'A$', locale: 'en-AU' },
]

export const DEFAULT_CURRENCY: CurrencyCode = 'PKR'

const STORAGE_KEY = 'pl-currency'
const CURRENCY_EVENT = 'pl-currency-change'

const byCode = new Map(CURRENCIES.map((entry) => [entry.code, entry]))

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && byCode.has(value as CurrencyCode)
}

export function currencyMeta(code: CurrencyCode = getCurrency()): CurrencyMeta {
  return byCode.get(code) ?? byCode.get(DEFAULT_CURRENCY)!
}

let cached: CurrencyCode | null = null

export function getCurrency(): CurrencyCode {
  if (cached) return cached
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    cached = isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY
  } catch {
    cached = DEFAULT_CURRENCY
  }
  return cached
}

export function setCurrency(code: CurrencyCode) {
  if (!isCurrencyCode(code) || code === getCurrency()) return
  cached = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // A locked-down storage jar must not stop the app from switching label.
  }
  window.dispatchEvent(new CustomEvent<CurrencyCode>(CURRENCY_EVENT, { detail: code }))
}

/** Adopt the durable copy from Supabase without echoing a change event back. */
export function hydrateCurrency(code: unknown) {
  if (!isCurrencyCode(code) || code === getCurrency()) return
  cached = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // ignored — see setCurrency
  }
  window.dispatchEvent(new CustomEvent<CurrencyCode>(CURRENCY_EVENT, { detail: code }))
}

function subscribe(listener: () => void) {
  window.addEventListener(CURRENCY_EVENT, listener)
  return () => window.removeEventListener(CURRENCY_EVENT, listener)
}

/**
 * Read the active currency inside a component. Returning the code (rather than
 * a formatter) keeps it usable as a `useMemo` dependency, so screens that build
 * money strings inside a memo recompute when the currency changes.
 */
export function useCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribe, getCurrency, () => DEFAULT_CURRENCY)
}

/** "Rs" — rendered in its own span across the UI. */
export function currencySymbol(code: CurrencyCode = getCurrency()) {
  return currencyMeta(code).symbol
}

/** "48,250" — grouped digits with no symbol, for the many places that style
 *  the symbol separately from the numerals. */
export function formatAmount(value: number, code: CurrencyCode = getCurrency()) {
  return Math.round(value).toLocaleString(currencyMeta(code).locale)
}

/** "Rs 48,250" — symbol and amount together. */
export function formatMoney(value: number, code: CurrencyCode = getCurrency()) {
  return `${currencySymbol(code)} ${formatAmount(value, code)}`
}

/** "-Rs 1,200" — keeps the sign outside the symbol so negatives read cleanly. */
export function formatSignedMoney(value: number, code: CurrencyCode = getCurrency()) {
  return `${value < 0 ? '−' : ''}${formatMoney(Math.abs(value), code)}`
}

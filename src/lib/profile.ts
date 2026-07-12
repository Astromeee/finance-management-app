/**
 * Pocket Ledger profile store.
 * Persists the user's display name + avatar (data URL) in localStorage and
 * broadcasts changes so the Dashboard header updates live.
 */

export interface Profile {
  name: string
  avatar?: string
}

const STORAGE_KEY = 'pl-profile'
const PROFILE_EVENT = 'pl-profile-change'

const DEFAULT_PROFILE: Profile = { name: 'Abdul Moeed' }

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<Profile>
    return { ...DEFAULT_PROFILE, ...parsed, name: parsed.name?.trim() || DEFAULT_PROFILE.name }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function setProfile(profile: Profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  window.dispatchEvent(new CustomEvent<Profile>(PROFILE_EVENT, { detail: profile }))
}

export function onProfileChange(listener: (profile: Profile) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<Profile>).detail)
  window.addEventListener(PROFILE_EVENT, handler)
  return () => window.removeEventListener(PROFILE_EVENT, handler)
}

export function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'PL'
  )
}

export function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}

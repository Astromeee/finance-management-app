import { act } from 'react'
import type { ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JourneySettings } from '../types/finance'
import { Onboarding } from './Onboarding'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const storage = new Map<string, string>()
const localStorageMock: Storage = {
  get length() { return storage.size },
  clear: () => storage.clear(),
  getItem: (key) => storage.get(key) ?? null,
  key: (index) => [...storage.keys()][index] ?? null,
  removeItem: (key) => { storage.delete(key) },
  setItem: (key, value) => { storage.set(key, value) },
}
vi.stubGlobal('localStorage', localStorageMock)

const baseSettings: JourneySettings = {
  typicalIncome: 0, safetyReserve: 0, onboardingVersion: 2, onboardingStep: 0,
  tourCompleted: false, analyticsConsent: false,
}

describe('personalized onboarding', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    localStorage.clear()
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('moves through the complete setup and returns a personalized plan', async () => {
    const onProgress = vi.fn(async () => undefined)
    const onComplete = vi.fn(async () => undefined)
    await act(async () => root.render(<Onboarding initialSettings={baseSettings} onProgress={onProgress} onComplete={onComplete} />))

    await click('Set up my journey')
    await click('Pocket money')
    await click('Continue')
    await click('Monthly')
    await change('Typical amount (PKR)', '30000')
    await click('Continue')
    await click('Continue')
    await click('Make my money last')
    await click('Continue')
    expect(container.textContent).toContain('Settings → Categories')
    await change('Safety reserve (PKR)', '5000')
    await click('Start my journey')

    expect(onProgress).toHaveBeenCalledTimes(5)
    expect(onComplete).toHaveBeenCalledTimes(1)
    const [, account, settings] = onComplete.mock.calls[0] as unknown as Parameters<ComponentProps<typeof Onboarding>['onComplete']>
    expect(account?.balance).toBe(0)
    expect(settings).toMatchObject({ incomeSourceType: 'allowance', incomeCadence: 'monthly', typicalIncome: 30_000, safetyReserve: 5_000, onboardingStep: 6 })
  })

  it('resumes from a persisted progress step', async () => {
    await act(async () => root.render(<Onboarding initialSettings={{ ...baseSettings, onboardingStep: 3 }} onProgress={async () => undefined} onComplete={async () => undefined} />))
    expect(container.textContent).toContain('Add your first money place')
    expect(container.textContent).toContain('Current balance (PKR)')
  })

  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label))
    expect(button, `button ${label}`).toBeTruthy()
    await act(async () => { button!.click(); await Promise.resolve() })
  }

  async function change(label: string, value: string) {
    const input = container.querySelector(`[aria-label="${label}"]`) ?? [...container.querySelectorAll('label')].find((item) => item.textContent?.includes(label))?.querySelector('input')
    expect(input, `field ${label}`).toBeTruthy()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, value)
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      input!.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
})

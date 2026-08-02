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
  typicalIncome: 0, safetyReserve: 0, onboardingVersion: 3, onboardingStep: 0,
  tourCompleted: false, analyticsConsent: false,
}

describe('four step onboarding', () => {
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

  it('walks source, timing, bills and reveal, then completes', async () => {
    const onProgress = vi.fn(async () => undefined)
    const onComplete = vi.fn(async () => undefined)
    await act(async () => root.render(<Onboarding initialSettings={baseSettings} onProgress={onProgress} onComplete={onComplete} />))

    expect(container.textContent).toContain('How does money')
    await click('Pocket money')
    await click('Salary')
    await click('Continue')

    await change('Typical amount (PKR)', '30000')
    await change('What you have right now (PKR)', '30000')
    await click('Continue')

    expect(container.textContent).toContain('What must be')
    await click('Continue')

    expect(container.textContent).toContain('Safe to spend today')
    await click('Enter Pocket Ledger')

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onComplete).toHaveBeenCalledTimes(1)
    const [, account, settings, bills] = onComplete.mock.calls[0] as unknown as Parameters<ComponentProps<typeof Onboarding>['onComplete']>
    expect(account?.balance).toBe(30_000)
    expect(settings).toMatchObject({ incomeSourceType: 'allowance', incomeCadence: 'monthly', typicalIncome: 30_000, onboardingStep: 4 })
    expect(settings.incomeSourceTypes).toEqual(['allowance', 'salary'])
    expect(bills).toEqual([])
  })

  it('adds a bill and carries it into the summary and completion', async () => {
    const onComplete = vi.fn(async () => undefined)
    await act(async () => root.render(<Onboarding initialSettings={{ ...baseSettings, onboardingStep: 2, typicalIncome: 30_000, nextIncomeDate: futureDate(20) }} onProgress={async () => undefined} onComplete={onComplete} />))

    await click('Add a custom bill')
    await change('Bill name', 'Rent')
    await change('Amount (PKR)', '18000')
    await click('Save bill')

    expect(container.textContent).toContain('Rent')
    expect(container.textContent).toContain('18,000')

    await click('Continue')
    await click('Enter Pocket Ledger')

    const [, , , bills] = onComplete.mock.calls[0] as unknown as Parameters<ComponentProps<typeof Onboarding>['onComplete']>
    expect(bills).toHaveLength(1)
    expect(bills[0]).toMatchObject({ name: 'Rent', amount: 18_000 })
  })

  it('adds a bill from a suggestion chip and stops offering it', async () => {
    const onComplete = vi.fn(async () => undefined)
    await act(async () => root.render(<Onboarding initialSettings={{ ...baseSettings, onboardingStep: 2, typicalIncome: 30_000, nextIncomeDate: futureDate(20) }} onProgress={async () => undefined} onComplete={onComplete} />))

    expect(container.querySelectorAll('.ao-bill-chip').length).toBe(4)
    await click('Electricity')

    expect(container.querySelectorAll('.ao-bill-chip').length).toBe(3)
    expect(container.querySelector('.ao-bill-summary')?.textContent).toContain('4,500')

    await click('Continue')
    await click('Enter Pocket Ledger')

    const [, , , bills] = onComplete.mock.calls[0] as unknown as Parameters<ComponentProps<typeof Onboarding>['onComplete']>
    expect(bills).toHaveLength(1)
    expect(bills[0]).toMatchObject({ name: 'Electricity', amount: 4_500, category: 'Utilities' })
  })

  it('blocks continue until a source is chosen', async () => {
    await act(async () => root.render(<Onboarding initialSettings={baseSettings} onProgress={async () => undefined} onComplete={async () => undefined} />))
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('Continue'))
    expect(button?.hasAttribute('disabled')).toBe(true)
  })

  it('goes back from timing to source', async () => {
    await act(async () => root.render(<Onboarding initialSettings={{ ...baseSettings, onboardingStep: 1 }} onProgress={async () => undefined} onComplete={async () => undefined} />))
    expect(container.textContent).toContain('When is money')
    await clickLabel('Previous step')
    expect(container.textContent).toContain('How does money')
  })

  it('uses no em dashes in visible copy', async () => {
    await act(async () => root.render(<Onboarding initialSettings={baseSettings} onProgress={async () => undefined} onComplete={async () => undefined} />))
    expect(container.textContent).not.toContain('—')
  })

  function futureDate(days: number) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
  }

  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label))
    expect(button, `button ${label}`).toBeTruthy()
    await act(async () => { button!.click(); await Promise.resolve() })
  }

  async function clickLabel(label: string) {
    const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
    expect(button, `button ${label}`).toBeTruthy()
    await act(async () => { button!.click(); await Promise.resolve() })
  }

  async function change(label: string, value: string) {
    const input = container.querySelector(`[aria-label="${label}"]`)
      ?? [...container.querySelectorAll('label')].find((item) => item.textContent?.includes(label))?.querySelector('input')
    expect(input, `field ${label}`).toBeTruthy()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, value)
      input!.dispatchEvent(new Event('input', { bubbles: true }))
      input!.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
})

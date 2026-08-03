import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account, Debt, Goal, JourneySettings } from '../types/finance'
import { Dashboard } from './Dashboard'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const settings: JourneySettings = {
  typicalIncome: 30_000, safetyReserve: 0, onboardingVersion: 4, onboardingStep: 4,
  tourCompleted: true, analyticsConsent: false, incomeCadence: 'monthly',
}

const accounts: Account[] = [
  { id: 'a1', name: 'Cash', type: 'cash', balance: 20_000, color: '#E2703A', activity: '', cardLabel: 'CASH', includeInSafeSpend: true },
]

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1', name: 'New laptop', target: 30_000, saved: 17_000, status: 'Active', ...over,
})

const debt = (over: Partial<Debt> = {}): Debt => ({
  id: 'd1', title: 'Bike installment', totalAmount: 40_000, paidAmount: 10_000,
  category: 'Installment', status: 'Active', createdAt: new Date().toISOString(), ...over,
})

describe('home paths card', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  const render = async (goals: Goal[], debts: Debt[], onNavigate = vi.fn()) => {
    await act(async () => root.render(
      <Dashboard
        accounts={accounts} transactions={[]} goals={goals} debts={debts} budgets={[]}
        upcomingExpenses={[]} categories={[]} journeySettings={settings} wishlistItems={[]}
        onAction={vi.fn()} onNavigate={onNavigate} onPlanPurchase={vi.fn()}
        onSetupJourney={vi.fn()} onTourComplete={vi.fn()}
      />,
    ))
    return onNavigate
  }

  it('hides the paths card when there are no goals and no debts', async () => {
    await render([], [])
    expect(container.querySelector('.vault-paths')).toBeFalsy()
  })

  it('shows the featured goal with its progress', async () => {
    await render([goal()], [])
    const card = container.querySelector('.vault-paths')
    expect(card).toBeTruthy()
    expect(card?.textContent).toContain('New laptop')
    expect(card?.textContent).toContain('57%')
    expect(card?.textContent).toContain('17,000')
    expect(card?.textContent).toContain('1 goal')
  })

  it('counts open goals and debts in the summary', async () => {
    await render([goal(), goal({ id: 'g2', name: 'Umrah fund' })], [debt()])
    expect(container.querySelector('.vault-paths-link')?.textContent).toContain('2 goals · 1 debt')
  })

  it('falls back to an unpaid debt when there are no goals', async () => {
    await render([], [debt()])
    const card = container.querySelector('.vault-paths')
    expect(card?.textContent).toContain('Bike installment')
    expect(card?.textContent).toContain('25%')
    expect(card?.textContent).not.toContain('goal')
  })

  it('stays hidden when every debt is already paid', async () => {
    await render([], [debt({ status: 'Paid' })])
    expect(container.querySelector('.vault-paths')).toBeFalsy()
  })

  it('opens the paths screen when tapped', async () => {
    const onNavigate = await render([goal()], [])
    await act(async () => { container.querySelector<HTMLButtonElement>('.vault-paths')!.click() })
    expect(onNavigate).toHaveBeenCalledWith('goals')
  })
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account, Budget, Goal, JourneySettings, Transaction, UpcomingExpense } from '../types/finance'
import { Dashboard } from './Dashboard'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const settings: JourneySettings = {
  typicalIncome: 30_000, safetyReserve: 0, onboardingVersion: 4, onboardingStep: 4,
  tourCompleted: true, analyticsConsent: false, incomeCadence: 'monthly',
}

const accounts: Account[] = [
  { id: 'a1', name: 'Cash', type: 'cash', balance: 20_000, color: '#E2703A', activity: '', cardLabel: 'CASH', includeInSafeSpend: true },
  { id: 'a2', name: 'HBL Bank', type: 'bank', balance: 35_600, color: '#2B241D', activity: '', cardLabel: 'HBL', includeInSafeSpend: false },
]

const overdueBill: UpcomingExpense = {
  id: 'rent', title: 'Rent', amount: 8_000, category: 'Housing',
  dueDate: '2020-01-01', status: 'upcoming', isRecurring: false, createdAt: '2019-12-01',
}

const overBudget: Budget = { id: 'b1', category: 'Dining Out', categoryId: 'dining', amount: 4_000, used: 9_000 }

type Options = {
  budgets?: Budget[]
  upcomingExpenses?: UpcomingExpense[]
  goals?: Goal[]
  transactions?: Transaction[]
}

describe('home screen', () => {
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

  const render = async (options: Options = {}) => {
    const onNavigate = vi.fn<(page: string) => void>()
    const onSetupJourney = vi.fn<() => void>()
    await act(async () => root.render(
      <Dashboard
        accounts={accounts}
        transactions={options.transactions ?? []}
        goals={options.goals ?? []}
        budgets={options.budgets ?? []}
        upcomingExpenses={options.upcomingExpenses ?? []}
        categories={[]}
        journeySettings={settings}
        wishlistItems={[]}
        onNavigate={onNavigate}
        onSetupJourney={onSetupJourney}
      />,
    ))
    return { onNavigate, onSetupJourney }
  }

  it('renders four blocks and none of the removed ones', async () => {
    await render({ upcomingExpenses: [overdueBill] })
    expect(container.querySelector('.vault-title')).toBeTruthy()
    expect(container.querySelector('.vault-hero')).toBeTruthy()
    expect(container.querySelector('.vault-next')).toBeTruthy()
    expect(container.querySelector('.vault-recent')).toBeTruthy()
    // the 3-insight row, leak card and paths card belong to other tabs now
    expect(container.querySelector('.vault-insight-row')).toBeFalsy()
    expect(container.querySelector('.vault-leak')).toBeFalsy()
    expect(container.querySelector('.vault-paths')).toBeFalsy()
  })

  it('keeps the account carousel as the hero, one card per account plus a total', async () => {
    await render()
    const cards = container.querySelectorAll('.vault-balance-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].textContent).toContain('Total balance')
    expect(cards[0].textContent).toContain('55,600')
    expect(cards[0].textContent).toContain('Across 2 accounts')
    // the card foot no longer carries the meaningless "updated just now" tag
    expect(cards[0].textContent).not.toContain('updated just now')
    expect(cards[2].textContent).toContain('Excluded from safe spend')
  })

  it('promotes only the single top-ranked attention item', async () => {
    await render({ upcomingExpenses: [overdueBill], budgets: [overBudget] })
    const next = container.querySelectorAll('.vault-next')
    expect(next).toHaveLength(1)
    expect(next[0].textContent).toContain('Do this next')
    expect(next[0].textContent).toContain('Rent')
  })

  it('routes the action card to the page that resolves it', async () => {
    const { onNavigate } = await render({ upcomingExpenses: [overdueBill] })
    await act(async () => { container.querySelector<HTMLButtonElement>('.vault-next')!.click() })
    expect(onNavigate).toHaveBeenCalledWith('budgets')
  })

  it('hides the action card when nothing needs attention', async () => {
    await render()
    expect(container.querySelector('.vault-next')).toBeFalsy()
  })

  it('offers the setup route when the income cycle is incomplete', async () => {
    const { onSetupJourney } = await render()
    const sub = container.querySelector<HTMLButtonElement>('.vault-hero-sub.is-action')
    expect(sub).toBeTruthy()
    await act(async () => sub!.click())
    expect(onSetupJourney).toHaveBeenCalled()
  })

  it('moves the pager dot as the carousel is swiped', async () => {
    await render()
    const rail = container.querySelector<HTMLDivElement>('.vault-carousel')!
    // jsdom performs no layout, so give the first card a width for railStep()
    Object.defineProperty(rail.firstElementChild!, 'offsetWidth', { value: 300, configurable: true })
    const activeDot = () => [...container.querySelectorAll('.vault-carousel-dot')].findIndex((dot) => dot.classList.contains('is-active'))

    expect(activeDot()).toBe(0)
    for (const index of [1, 2, 0]) {
      await act(async () => {
        rail.scrollLeft = index * 300
        rail.dispatchEvent(new Event('scroll', { bubbles: true }))
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      })
      expect(activeDot()).toBe(index)
    }
  })

  it('masks every amount from the single eye toggle', async () => {
    await render()
    const hero = container.querySelector('.vault-hero')!
    expect(hero.textContent).toContain('55,600')
    await act(async () => { container.querySelector<HTMLButtonElement>('.vault-balance-card button')!.click() })
    expect(hero.textContent).not.toContain('55,600')
    expect(hero.textContent).toContain('••••')
  })
})

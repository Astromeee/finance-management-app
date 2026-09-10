import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QuickEntryWindow } from './QuickEntryWindow'
import { validQuickAmount } from '../lib/quickEntry'

const mocks = vi.hoisted(() => ({ context: vi.fn(), close: vi.fn(), load: vi.fn(), save: vi.fn(), existing: vi.fn() }))
vi.mock('../lib/quickEntry', async importOriginal => ({ ...await importOriginal<typeof import('../lib/quickEntry')>(), QuickEntry: { context: mocks.context, close: mocks.close, openApp: vi.fn() } }))
vi.mock('../lib/financeRepository', () => ({ loadFinanceData: mocks.load, recordFinanceAction: mocks.save }))
vi.mock('../lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: mocks.existing }) }) }) }) } }))
vi.mock('../lib/currency', () => ({ currencySymbol: () => 'Rs' }))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  mocks.context.mockResolvedValue({ direction: 'expense' })
  mocks.load.mockResolvedValue({ transactions: [], accounts: [{ id: 'cash', name: 'Cash' }], categories: [{ id: 'food', name: 'Food', kind: 'expense' }, { id: 'salary', name: 'Salary', kind: 'income' }] })
  mocks.existing.mockResolvedValue({ data: null })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals() })
async function renderAndFill() {
  await act(async () => root.render(<QuickEntryWindow/>))
  const input = container.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '850')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() { await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) }) }
it('rejects zero, fractions and out-of-range values before saving', () => {
  for (const value of ['', '0', '-1', '1.5', '1e3', '1000000000000']) expect(validQuickAmount(value)).toBe(false)
  expect(validQuickAmount('850')).toBe(true)
})
it('saves an expense with its category and account, then closes', async () => {
  await renderAndFill(); await submit()
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'expense', amount: 850, accountId: 'cash', categoryId: 'food' }), expect.any(AbortSignal))
  expect(mocks.close).toHaveBeenCalledWith({ saved: true })
})
it('opens income with income sources', async () => {
  mocks.context.mockResolvedValue({ direction: 'income' })
  await renderAndFill(); await submit()
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'income', source: 'Salary', categoryId: undefined }), expect.any(AbortSignal))
})
it('switches from expense to income in the popup', async () => {
  await renderAndFill()
  await act(async () => { container.querySelectorAll<HTMLButtonElement>('.qe-direction button')[1].click() })
  await submit()
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'income', source: 'Salary', amount: 850 }), expect.any(AbortSignal))
})
it('keeps failed entries and retries with the same transaction ID', async () => {
  mocks.save.mockRejectedValue(new Error('offline'))
  await renderAndFill(); await submit()
  expect(mocks.close).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Could not confirm')
  expect(container.querySelector('input')!.disabled).toBe(true)
  const firstId = mocks.save.mock.calls[0][0].id
  await submit()
  expect(mocks.save.mock.calls[1][0].id).toBe(firstId)
})
it('confirms a committed transaction after a lost save response', async () => {
  mocks.save.mockRejectedValue(new Error('lost response'))
  mocks.existing.mockResolvedValue({ data: { id: 'saved' } })
  await renderAndFill(); await submit()
  expect(mocks.close).toHaveBeenCalledWith({ saved: true })
})
it('blocks duplicate submissions and waits for confirmation before closing', async () => {
  let finish!: () => void
  mocks.save.mockReturnValue(new Promise<void>(resolve => { finish = resolve }))
  await renderAndFill(); await submit(); await submit()
  expect(mocks.save).toHaveBeenCalledTimes(1)
  expect(mocks.close).not.toHaveBeenCalled()
  await act(async () => finish())
  expect(mocks.close).toHaveBeenCalledWith({ saved: true })
})
it('offers sign-in recovery without opening the full app automatically', async () => {
  mocks.load.mockRejectedValue(new Error('Authentication required'))
  await act(async () => root.render(<QuickEntryWindow/>))
  expect(container.querySelector('form')).toBeNull()
  expect(container.textContent).toContain('Open Ledger to sign in')
  expect(mocks.save).not.toHaveBeenCalled()
})

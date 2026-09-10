import { afterEach, expect, it, vi } from 'vitest'
const native = vi.hoisted(() => ({ addListener: vi.fn(), minimizeApp: vi.fn() }))
vi.mock('@capacitor/app', () => ({ App: native }))
import { installNativeNavigation } from './nativeNavigation'

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

async function pressBack(canGoBack: boolean) {
  await installNativeNavigation()
  native.addListener.mock.calls.at(-1)![1]({ canGoBack })
}

it('closes an overlay on Home through the existing history handler', async () => {
  window.history.replaceState({ pocketOverlay: true }, '', '/app')
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
  await pressBack(true)
  expect(back).toHaveBeenCalledOnce()
  expect(native.minimizeApp).not.toHaveBeenCalled()
})

it('minimizes on Home instead of returning to a stale login history entry', async () => {
  window.history.replaceState(null, '', '/app')
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
  await pressBack(true)
  expect(native.minimizeApp).toHaveBeenCalledOnce()
  expect(back).not.toHaveBeenCalled()
})

it('navigates back from an inner page', async () => {
  window.history.replaceState(null, '', '/app/settings')
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
  await pressBack(true)
  expect(back).toHaveBeenCalledOnce()
  expect(native.minimizeApp).not.toHaveBeenCalled()
})

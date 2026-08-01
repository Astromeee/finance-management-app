import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginShowcase } from './LoginShowcase'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('login showcase', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('renders every slide with exactly one active at a time', async () => {
    await act(async () => root.render(<LoginShowcase />))
    expect(container.querySelectorAll('.ao-slide').length).toBeGreaterThan(1)
    expect(container.querySelectorAll('.ao-slide.is-active').length).toBe(1)
    expect(container.querySelectorAll('.ao-showcase-dot').length).toBe(container.querySelectorAll('.ao-slide').length)
  })

  it('advances to the next slide on a timer', async () => {
    await act(async () => root.render(<LoginShowcase />))
    const first = container.querySelector('.ao-slide.is-active')
    await act(async () => { vi.advanceTimersByTime(5200) })
    expect(container.querySelector('.ao-slide.is-active')).not.toBe(first)
  })

  it('jumps to a slide when its dot is clicked', async () => {
    await act(async () => root.render(<LoginShowcase />))
    const dots = [...container.querySelectorAll<HTMLButtonElement>('.ao-showcase-dot')]
    await act(async () => { dots[2].click() })
    expect(dots[2].classList.contains('is-active')).toBe(true)
  })
})

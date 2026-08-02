import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthPage } from './Auth'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('auth page', () => {
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

  const render = async (mode: 'login' | 'signup' | 'forgot' | 'reset') => {
    await act(async () => root.render(<MemoryRouter><AuthPage mode={mode} /></MemoryRouter>))
  }

  it('renders the login shell with email and password fields', async () => {
    await render('login')
    expect(container.querySelector('.ao-shell.is-login')).toBeTruthy()
    expect(container.querySelector('input[type="email"]')).toBeTruthy()
    expect(container.querySelector('input[type="password"]')).toBeTruthy()
    expect(container.querySelector('form .ao-cta')?.textContent).toContain('Log in')
  })

  it('keeps the forgot-password flow reachable from login', async () => {
    await render('login')
    expect(container.textContent).toContain('Forgot')
  })

  it('renders the reset mode without an email field', async () => {
    await render('reset')
    expect(container.querySelector('input[type="email"]')).toBeFalsy()
    expect(container.querySelector('input[type="password"]')).toBeTruthy()
  })

  it('uses no em dashes in visible copy', async () => {
    await render('login')
    expect(container.textContent).not.toContain('—')
  })

  it('shows no password strength meter on login', async () => {
    await render('login')
    expect(container.querySelector('.ao-pw-meter')).toBeFalsy()
  })

  it('rates password strength as it is typed on reset', async () => {
    await render('reset')
    const input = container.querySelector<HTMLInputElement>('input[type="password"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    const type = async (value: string) => {
      await act(async () => {
        setter?.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    await type('abc')
    expect(container.querySelector('.ao-pw-label')?.textContent).toBe('Weak')

    await type('Abcdefgh1')
    expect(container.querySelector('.ao-pw-label')?.textContent).toBe('Strong')
    expect(container.querySelector('.ao-pw-bars.is-strong')).toBeTruthy()
  })
})

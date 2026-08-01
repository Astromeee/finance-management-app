import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthShell } from './AuthShell'
import { ProgressDots } from './ProgressDots'
import { StepTracker } from './StepTracker'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('auth shell primitives', () => {
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

  it('renders the panel and the content surface', async () => {
    await act(async () => root.render(
      <AuthShell variant="login" panel={<p>Showcase side</p>}><p>Sign in side</p></AuthShell>,
    ))
    expect(container.querySelector('.ao-shell.is-login')).toBeTruthy()
    expect(container.querySelector('.ao-panel')?.textContent).toContain('Showcase side')
    expect(container.querySelector('.ao-surface')?.textContent).toContain('Sign in side')
  })

  it('marks the current progress segment and reports the step count', async () => {
    await act(async () => root.render(<ProgressDots current={3} total={4} />))
    expect(container.textContent).toContain('3 of 4')
    expect(container.querySelectorAll('.ao-dot').length).toBe(4)
    expect(container.querySelectorAll('.ao-dot.is-current').length).toBe(1)
    expect(container.querySelectorAll('.ao-dot.is-done').length).toBe(2)
  })

  it('marks completed and active steps in the desktop tracker', async () => {
    await act(async () => root.render(
      <StepTracker current={2} steps={[
        { title: 'Income source', detail: 'How money reaches you' },
        { title: 'Income timing', detail: 'When the next one lands' },
        { title: 'Fixed bills', detail: 'What must be paid' },
        { title: 'All set', detail: 'Your first safe number' },
      ]} />,
    ))
    expect(container.querySelectorAll('.ao-track-step').length).toBe(4)
    expect(container.querySelectorAll('.ao-track-step.is-done').length).toBe(1)
    expect(container.querySelectorAll('.ao-track-step.is-current').length).toBe(1)
  })
})

import { Check } from 'lucide-react'

export type TrackerStep = { title: string; detail: string }

export function StepTracker({ current, steps }: { current: number; steps: TrackerStep[] }) {
  return <ol className="ao-tracker">
    {steps.map((step, index) => {
      const position = index + 1
      const state = position === current ? 'is-current' : position < current ? 'is-done' : 'is-upcoming'
      return <li className={`ao-track-step ${state}`} key={step.title}>
        <span className="ao-track-mark">{position < current ? <Check size={14} strokeWidth={3} /> : position}</span>
        <span className="ao-track-copy"><strong>{step.title}</strong><small>{step.detail}</small></span>
      </li>
    })}
  </ol>
}

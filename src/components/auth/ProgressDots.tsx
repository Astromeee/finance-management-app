export function ProgressDots({ current, total }: { current: number; total: number }) {
  return <div className="ao-progress">
    <div
      className="ao-dots"
      role="progressbar"
      aria-label="Onboarding progress"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
    >
      {Array.from({ length: total }, (_, index) => {
        const step = index + 1
        const state = step === current ? 'is-current' : step < current ? 'is-done' : 'is-upcoming'
        return <span className={`ao-dot ${state}`} key={step} />
      })}
    </div>
    <span className="ao-progress-label">{current} of {total}</span>
  </div>
}

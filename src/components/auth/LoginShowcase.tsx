import { useEffect, useState } from 'react'

type Slide = { id: string; label: string; title: string; body: string; image: string }

const SLIDES: Slide[] = [
  { id: 'home', label: 'Home', title: 'One number that answers the question', body: 'Your safe-to-spend is worked out from balances, bills and goals, so you know where you stand before you buy.', image: '/showcase/home.png' },
  { id: 'record', label: 'Record', title: 'Log a purchase in a few taps', body: 'Amount, category, done. Recording stays quick enough that you actually keep it up.', image: '/showcase/record.png' },
  { id: 'plan', label: 'Plan', title: 'See the road to your next payday', body: 'Bills and set-asides are protected first, so what is left is genuinely yours to spend.', image: '/showcase/plan.png' },
  { id: 'insights', label: 'Insights', title: 'See the story behind your spending', body: 'Clean charts turn months of transactions into clear patterns by category and cycle.', image: '/showcase/insights.png' },
  { id: 'goals', label: 'Goals', title: 'Watch the things you want get closer', body: 'Track goals and debts side by side, with the pace you need to stay on schedule.', image: '/showcase/goals.png' },
]

const INTERVAL = 5_000

export function LoginShowcase() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || SLIDES.length < 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActive((current) => (current + 1) % SLIDES.length), INTERVAL)
    return () => window.clearInterval(timer)
  }, [paused])

  return <div className="ao-showcase" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="ao-showcase-stage">
      {SLIDES.map((slide, index) => <article className={`ao-slide ${index === active ? 'is-active' : ''}`} key={slide.id} aria-hidden={index !== active}>
        <img alt="" src={slide.image} loading="lazy" />
        <div className="ao-slide-copy">
          <p className="ao-kicker">{slide.label}</p>
          <h3>{slide.title}</h3>
          <p>{slide.body}</p>
        </div>
      </article>)}
    </div>
    <div className="ao-showcase-dots">
      {SLIDES.map((slide, index) => <button
        aria-label={`Show ${slide.label}`}
        className={`ao-showcase-dot ${index === active ? 'is-active' : ''}`}
        key={slide.id}
        onClick={() => setActive(index)}
        type="button"
      />)}
    </div>
  </div>
}

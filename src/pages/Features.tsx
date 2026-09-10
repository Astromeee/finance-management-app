import { ArrowRight, CalendarDays, ChevronLeft, CreditCard, List, PieChart, Target, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * "What Pocket Ledger can do".
 *
 * Four of the app's features live behind tabs on the Plan screen and two more
 * behind the + button, so it was possible to finish onboarding and never learn
 * they existed. This is the plain list — one line each on what it buys you, and
 * a way straight there. Reachable from Settings so Home stays uncluttered.
 */

type Feature = {
  id: string
  icon: LucideIcon
  title: string
  body: string
  /** Where the feature lives. Omitted when it opens from the + button. */
  page?: string
  hint?: string
}

const GROUPS: Array<{ label: string; features: Feature[] }> = [
  {
    label: 'Every day',
    features: [
      { id: 'record', icon: List, title: 'Record what you spend', body: 'Money in, money out, and transfers between your accounts. The + button opens it from any screen.', page: 'transactions' },
      { id: 'wallet', icon: CreditCard, title: 'Your wallet', body: 'Cash, bank and mobile wallet balances in one place. Tap a balance on Home to correct it.', page: 'accounts' },
    ],
  },
  {
    label: 'Your plan',
    features: [
      { id: 'limits', icon: PieChart, title: 'Spending limits', body: 'Cap a category like Dining Out and get warned as it fills up, not after it has run over.', page: 'budgets' },
    ],
  },
  {
    label: 'Staying ahead',
    features: [
      { id: 'bills', icon: CalendarDays, title: 'Scheduled bills', body: 'Keep rent, subscriptions and instalment due dates in view.', page: 'budgets' },
      { id: 'paths', icon: Target, title: 'Paths', body: 'Savings goals and money you owe, with what each one still needs and by when.', page: 'goals' },
      { id: 'android', icon: Wallet, title: 'Android widgets & quick record', body: 'Download the Android app in Settings, then add a widget or assign Ledger Quick Record to Pixel Quick Tap.', page: 'settings' },
      { id: 'recap', icon: CalendarDays, title: 'Your Sunday recap', body: 'A small weekly summary, always available in Insights.', page: 'reports' },
      { id: 'receivables', icon: Wallet, title: 'Owed to me', body: 'Track repayments and write off amounts you no longer expect to collect.', page: 'goals' },
      { id: 'insights', icon: PieChart, title: 'Insights', body: 'Where the money actually went, which category leads, and how this cycle compares with the last.', page: 'reports' },
    ],
  },
]

export function Features({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="vault-screen">
      <header className="vault-detail-header relative flex items-center justify-center">
        <button aria-label="Back" className="vault-iconbtn absolute left-0" type="button" onClick={() => onNavigate('settings')}><ChevronLeft size={18} strokeWidth={2} /></button>
        <p className="vault-eyebrow">Guide</p>
      </header>

      <h1 className="vault-title">What Pocket Ledger <em>can do.</em></h1>
      <p className="vault-sheet-note mt-3">A few ways to keep track. Tap any of them to go straight there.</p>

      {GROUPS.map((group) => (
        <section key={group.label} className="mt-7">
          <p className="vault-settings-group-label">{group.label}</p>
          <div className="vault-feature-list">
            {group.features.map(({ id, icon: Icon, title, body, page, hint }) => {
              const content = (
                <>
                  <span className="vault-feature-chip"><Icon size={17} strokeWidth={1.9} /></span>
                  <span className="vault-feature-copy">
                    <span className="vault-feature-title">{title}</span>
                    <span className="vault-feature-body">{body}</span>
                    {hint && <span className="vault-feature-hint">{hint}</span>}
                  </span>
                  {page && <ArrowRight className="vault-feature-arrow" size={16} strokeWidth={2} />}
                </>
              )
              return page
                ? <button key={id} className="vault-feature-row is-tappable" type="button" onClick={() => onNavigate(page)}>{content}</button>
                : <div key={id} className="vault-feature-row">{content}</div>
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

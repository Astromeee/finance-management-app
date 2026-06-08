import { WalletCards } from 'lucide-react'
import { ProgressCard } from '../components/cards/ProgressCard'
import { budgetUsage, formatPKR } from '../utils/financeCalculations'
import type { Budget } from '../types/finance'

export function Budgets({ budgets }: { budgets: Budget[] }) {
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.used, 0)
  const nearLimit = budgets.filter((budget) => budgetUsage(budget) >= 80).length

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="balance-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Monthly budget usage</p>
            <h3 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{formatPKR(totalUsed)} / {formatPKR(totalBudget)}</h3>
            <p className="mt-3 text-xs text-[var(--muted)] sm:text-sm">{nearLimit} categories need attention this month</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-[#171910]"><WalletCards size={22} /></span>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {budgets.map((budget) => {
          const usage = budgetUsage(budget)
          const status = usage > 100 ? 'Over budget' : usage >= 80 ? 'Near limit' : 'Healthy'
          return (
            <ProgressCard key={budget.id} title={budget.category} label={`${formatPKR(Math.max(0, budget.amount - budget.used))} remaining`} current={budget.used} total={budget.amount} status={status} warning={usage >= 80} />
          )
        })}
      </section>
    </div>
  )
}

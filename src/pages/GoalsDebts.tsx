import { debts, goals } from '../data/mockData'
import { ProgressCard } from '../components/cards/ProgressCard'

export function GoalsDebts() {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4"><p className="text-sm text-[var(--muted)]">Savings Goals</p><h3 className="text-2xl font-semibold text-white">Build future money</h3></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => <ProgressCard key={goal.id} title={goal.name} label="Saved amount" current={goal.saved} total={goal.target} status={goal.status} dueDate={goal.dueDate} />)}
        </div>
      </section>
      <section>
        <div className="mb-4"><p className="text-sm text-[var(--muted)]">Debt / Overdue Payments</p><h3 className="text-2xl font-semibold text-white">Pay down obligations</h3></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {debts.map((debt) => <ProgressCard key={debt.id} title={debt.name} label="Paid amount" current={debt.paid} total={debt.total} status={debt.status} dueDate={debt.dueDate} warning={debt.status === 'Overdue'} />)}
        </div>
      </section>
    </div>
  )
}

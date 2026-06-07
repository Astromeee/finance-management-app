import { useState } from 'react'
import type { ReactNode } from 'react'
import { AddTransactionModal } from './components/forms/AddTransactionModal'
import { AppShell } from './components/layout/AppShell'
import { accounts as initialAccounts, transactions as initialTransactions } from './data/mockData'
import { Accounts } from './pages/Accounts'
import { Budgets } from './pages/Budgets'
import { Dashboard } from './pages/Dashboard'
import { GoalsDebts } from './pages/GoalsDebts'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Transactions } from './pages/Transactions'
import type { TransactionType } from './types/finance'

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [mockAdds, setMockAdds] = useState<TransactionType[]>([])
  const [accounts, setAccounts] = useState(initialAccounts)
  const [transactions, setTransactions] = useState(initialTransactions)

  const pages: Record<string, { title: string; subtitle: string; component: ReactNode }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Your financial overview', component: <Dashboard accounts={accounts} transactions={transactions} /> },
    transactions: { title: 'Transactions', subtitle: 'Track income, spending, and transfers', component: <Transactions transactions={transactions} /> },
    accounts: {
      title: 'Accounts',
      subtitle: 'Manage cash, banks, and wallets',
      component: <Accounts accounts={accounts} transactions={transactions} setAccounts={setAccounts} setTransactions={setTransactions} />,
    },
    goals: { title: 'Goals & Debts', subtitle: 'Savings and payment progress', component: <GoalsDebts /> },
    budgets: { title: 'Budgets', subtitle: 'Monthly limits and usage', component: <Budgets /> },
    reports: { title: 'Reports', subtitle: 'Spending trends and insights', component: <Reports accounts={accounts} transactions={transactions} /> },
    settings: { title: 'Settings', subtitle: 'Preferences and data tools', component: <Settings /> },
  }

  return (
    <AppShell activePage={activePage} title={pages[activePage].title} subtitle={pages[activePage].subtitle} setActivePage={setActivePage} onAdd={() => setModalOpen(true)}>
      {mockAdds.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[rgba(221,255,69,.2)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
          Added {mockAdds.length} local mock transaction{mockAdds.length > 1 ? 's' : ''}. This prototype keeps them in session state.
        </div>
      )}
      {pages[activePage].component}
      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={(type) => setMockAdds((items) => [type, ...items])} />
    </AppShell>
  )
}

export default App

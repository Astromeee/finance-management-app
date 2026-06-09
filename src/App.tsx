import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AddExpenseModal, AddGoalModal, AddIncomeModal, DebtPaymentModal, TransferModal } from './components/forms/FinanceActionModals'
import { AppShell } from './components/layout/AppShell'
import { accounts as initialAccounts, budgets as initialBudgets, debts as initialDebts, goals as initialGoals, transactions as initialTransactions, upcomingExpenses as initialUpcomingExpenses } from './data/mockData'
import { loadFinanceState, saveFinanceState, type FinanceState } from './lib/financeStateStore'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { Accounts } from './pages/Accounts'
import { Budgets } from './pages/Budgets'
import { Dashboard } from './pages/Dashboard'
import { GoalsDebts } from './pages/GoalsDebts'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Transactions } from './pages/Transactions'
import type { Budget, Debt, Goal, RecurringFrequency, Transaction, UpcomingExpense } from './types/finance'

type ActionModal = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | null

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`

const initialFinanceState: FinanceState = {
  accounts: initialAccounts,
  transactions: initialTransactions,
  goals: initialGoals,
  debts: initialDebts,
  budgets: initialBudgets,
  upcomingExpenses: initialUpcomingExpenses,
}

function nextRecurringDate(dueDate: string, frequency: RecurringFrequency) {
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return ''
  if (frequency === 'weekly') date.setDate(date.getDate() + 7)
  if (frequency === 'monthly') date.setMonth(date.getMonth() + 1)
  if (frequency === 'quarterly') date.setMonth(date.getMonth() + 3)
  if (frequency === 'semi_annual') date.setMonth(date.getMonth() + 6)
  if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [activeModal, setActiveModal] = useState<ActionModal>(null)
  const [activeDebtId, setActiveDebtId] = useState<string | undefined>()
  const [toast, setToast] = useState('')
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [financeUserId, setFinanceUserId] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [accounts, setAccounts] = useState(initialAccounts)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [debts, setDebts] = useState<Debt[]>(initialDebts)
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingExpense[]>(initialUpcomingExpenses)
  const remoteStateLoaded = useRef(!isSupabaseConfigured)
  const saveTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.warn('Supabase session check failed:', error)
      setFinanceUserId(data.session?.user.id ?? null)
      setAuthReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setFinanceUserId(session?.user.id ?? null)
      setAuthReady(true)
      if (!session?.user) remoteStateLoaded.current = false
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadRemoteState() {
      if (!isSupabaseConfigured || !financeUserId) return

      try {
        remoteStateLoaded.current = false
        const remoteState = await loadFinanceState(initialFinanceState)
        if (cancelled) return
        setAccounts(remoteState.accounts)
        setTransactions(remoteState.transactions)
        setGoals(remoteState.goals)
        setDebts(remoteState.debts)
        setBudgets(remoteState.budgets)
        setUpcomingExpenses(remoteState.upcomingExpenses)
        remoteStateLoaded.current = true
        showToast('Supabase connected')
      } catch (error) {
        remoteStateLoaded.current = true
        console.warn('Supabase sync disabled:', error)
        showToast('Using local data')
      }
    }

    loadRemoteState()
    return () => {
      cancelled = true
    }
  }, [financeUserId, showToast])

  useEffect(() => {
    if (!isSupabaseConfigured || !financeUserId || !remoteStateLoaded.current) return

    const state: FinanceState = {
      accounts,
      transactions,
      goals,
      debts,
      budgets,
      upcomingExpenses,
    }

    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveFinanceState(state).catch((error) => {
        console.warn('Supabase save failed:', error)
        showToast('Supabase save failed')
      })
    }, 500)

    return () => window.clearTimeout(saveTimer.current)
  }, [accounts, budgets, debts, financeUserId, goals, showToast, transactions, upcomingExpenses])

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !authEmail.trim() || !authPassword) return

    setAuthLoading(true)
    setAuthMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    })
    setAuthLoading(false)
    setAuthMessage(error ? error.message : '')
  }

  const addTransaction = (transaction: Transaction) => {
    setTransactions((current) => [{ ...transaction, createdAt: new Date().toISOString() }, ...current])
  }

  const updateAccountBalance = (accountId: string, delta: number) => {
    setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, balance: account.balance + delta } : account))
  }

  const pages: Record<string, { title: string; subtitle: string; component: ReactNode }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Your financial overview', component: <Dashboard accounts={accounts} transactions={transactions} goals={goals} debts={debts} budgets={budgets} onAction={setActiveModal} onNavigate={setActivePage} /> },
    transactions: { title: 'Transactions', subtitle: 'Track income, spending, and transfers', component: <Transactions transactions={transactions} /> },
    accounts: {
      title: 'Accounts',
      subtitle: 'Manage cash, banks, and wallets',
      component: <Accounts accounts={accounts} setAccounts={setAccounts} setTransactions={setTransactions} onTransfer={() => setActiveModal('transfer')} />,
    },
    goals: {
      title: 'Goals & Debts',
      subtitle: 'Savings and payment progress',
      component: (
        <GoalsDebts
          goals={goals}
          debts={debts}
          accounts={accounts}
          upcomingExpenses={upcomingExpenses}
          onAddGoal={() => setActiveModal('goal')}
          onDebtPayment={(debtId) => {
            setActiveDebtId(debtId)
            setActiveModal('debt')
          }}
          onAddDebt={({ name, total, paid, dueDate, status }) => {
            setDebts((current) => [{ id: makeId('debt'), name, total, paid, dueDate, status }, ...current])
            showToast('Debt added')
          }}
          onUpdateGoal={(goalId, payload) => {
            setGoals((current) => current.map((goal) => goal.id === goalId ? { ...goal, ...payload } : goal))
            showToast('Goal updated')
          }}
          onDeleteGoal={(goalId) => {
            setGoals((current) => current.filter((goal) => goal.id !== goalId))
            showToast('Goal deleted')
          }}
          onUpdateDebt={(debtId, payload) => {
            setDebts((current) => current.map((debt) => debt.id === debtId ? { ...debt, ...payload } : debt))
            showToast('Debt updated')
          }}
          onDeleteDebt={(debtId) => {
            setDebts((current) => current.filter((debt) => debt.id !== debtId))
            showToast('Debt deleted')
          }}
          onAddSavings={({ goalId, amount, accountId, date, notes }) => {
            const goal = goals.find((item) => item.id === goalId)
            const account = accounts.find((item) => item.id === accountId)
            if (!goal || !account) return
            updateAccountBalance(accountId, -amount)
            setGoals((current) => current.map((item) => {
              if (item.id !== goalId) return item
              const saved = Math.min(item.target, item.saved + amount)
              return { ...item, saved, status: saved >= item.target ? 'Completed' : item.status }
            }))
            addTransaction({ id: makeId('goal-save'), title: 'Goal Saving', type: 'goal_saving', amount, category: goal.name, account: account.name, accountId, goalId, date, notes })
            showToast('Savings added')
          }}
          onAddUpcomingExpense={(payload) => {
            setUpcomingExpenses((current) => [{ ...payload, id: makeId('upcoming'), status: 'upcoming', createdAt: new Date().toISOString() }, ...current])
            showToast('Upcoming expense added')
          }}
          onUpdateUpcomingExpense={(expenseId, payload) => {
            setUpcomingExpenses((current) => current.map((expense) => expense.id === expenseId ? { ...expense, ...payload, status: expense.status === 'paid' ? 'paid' : 'upcoming' } : expense))
            showToast('Upcoming expense updated')
          }}
          onDeleteUpcomingExpense={(expenseId) => {
            setUpcomingExpenses((current) => current.filter((expense) => expense.id !== expenseId))
            showToast('Upcoming expense deleted')
          }}
          onMarkUpcomingPaid={(expense, { accountId, paymentDate, notes }) => {
            const account = accounts.find((item) => item.id === accountId)
            if (!account) return
            const transactionId = makeId('upcoming-paid')
            updateAccountBalance(accountId, -expense.amount)
            setBudgets((current) => current.map((budget) => budget.category === expense.category ? { ...budget, used: budget.used + expense.amount } : budget))
            addTransaction({
              id: transactionId,
              title: expense.title,
              type: 'expense',
              amount: expense.amount,
              category: expense.category,
              account: account.name,
              accountId,
              date: paymentDate,
              notes: notes ?? expense.notes,
            })
            setUpcomingExpenses((current) => {
              const paidItems = current.map((item) => item.id === expense.id ? { ...item, status: 'paid' as const, paidTransactionId: transactionId } : item)
              const nextDueDate = expense.isRecurring && expense.recurringFrequency ? nextRecurringDate(expense.dueDate, expense.recurringFrequency) : undefined
              if (!nextDueDate || (expense.repeatEndDate && nextDueDate > expense.repeatEndDate)) return paidItems
              const nextExpense: UpcomingExpense = {
                ...expense,
                id: makeId('upcoming-next'),
                dueDate: nextDueDate,
                status: 'upcoming',
                createdAt: new Date().toISOString(),
                paidTransactionId: undefined,
              }
              return [nextExpense, ...paidItems]
            })
            showToast(expense.isRecurring ? 'Expense paid and next recurring item created' : 'Expense recorded')
          }}
        />
      ),
    },
    budgets: { title: 'Budgets', subtitle: 'Monthly limits and usage', component: <Budgets budgets={budgets} /> },
    reports: { title: 'Reports', subtitle: 'Spending trends and insights', component: <Reports accounts={accounts} transactions={transactions} goals={goals} debts={debts} budgets={budgets} upcomingExpenses={upcomingExpenses} /> },
    settings: { title: 'Settings', subtitle: 'Preferences and data tools', component: <Settings /> },
  }

  if (isSupabaseConfigured && !authReady) return <SupabaseAuthShell title="Connecting to Supabase" />

  if (isSupabaseConfigured && !financeUserId) {
    return (
      <SupabaseAuthShell title="Pocket Ledger">
        <form className="mt-6 grid gap-4" onSubmit={handlePasswordLogin}>
          <label>
            <span className="form-label">Email address</span>
            <input className="form-input" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" required />
          </label>
          <label>
            <span className="form-label">Password</span>
            <input className="form-input" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Enter your password" required />
          </label>
          <button className="btn-primary justify-center disabled:opacity-60" disabled={authLoading}>{authLoading ? 'Signing in...' : 'Log in'}</button>
          {authMessage && <p className="rounded-2xl border border-[rgba(221,255,69,.16)] bg-[rgba(221,255,69,.06)] p-3 text-sm text-[var(--muted)]">{authMessage}</p>}
        </form>
      </SupabaseAuthShell>
    )
  }

  return (
    <AppShell activePage={activePage} title={pages[activePage].title} subtitle={pages[activePage].subtitle} setActivePage={setActivePage} onAdd={() => setActiveModal('expense')}>
      {toast && <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full border border-[rgba(221,255,69,.25)] bg-[var(--surface)]/95 px-4 py-2 text-sm font-semibold text-[var(--accent)] shadow-2xl shadow-black/30 backdrop-blur-xl">{toast}</div>}
      {pages[activePage].component}
      <AddIncomeModal
        open={activeModal === 'income'}
        accounts={accounts}
        onClose={() => setActiveModal(null)}
        onSubmit={({ amount, source, accountId, date, notes }) => {
          const account = accounts.find((item) => item.id === accountId)
          if (!account) return
          updateAccountBalance(accountId, amount)
          addTransaction({ id: makeId('inc'), title: source, type: 'income', amount, source, category: source, account: account.name, accountId, date, notes })
          showToast('Income added')
        }}
      />
      <AddExpenseModal
        open={activeModal === 'expense'}
        accounts={accounts}
        onClose={() => setActiveModal(null)}
        onSubmit={({ amount, category, accountId, paymentMethod, date, notes }) => {
          const account = accounts.find((item) => item.id === accountId)
          if (!account) return
          updateAccountBalance(accountId, -amount)
          setBudgets((current) => current.map((budget) => budget.category === category ? { ...budget, used: budget.used + amount } : budget))
          addTransaction({ id: makeId('exp'), title: category, type: 'expense', amount, category, account: account.name, accountId, paymentMethod, date, notes })
          showToast('Expense recorded')
        }}
      />
      <TransferModal
        open={activeModal === 'transfer'}
        accounts={accounts}
        onClose={() => setActiveModal(null)}
        onSubmit={({ amount, fromAccountId, toAccountId, date, notes }) => {
          const from = accounts.find((item) => item.id === fromAccountId)
          const to = accounts.find((item) => item.id === toAccountId)
          if (!from || !to) return
          setAccounts((current) => current.map((account) => account.id === fromAccountId ? { ...account, balance: account.balance - amount } : account.id === toAccountId ? { ...account, balance: account.balance + amount } : account))
          addTransaction({ id: makeId('trf'), title: 'Transfer', type: 'transfer', amount, category: 'Transfer', account: `${from.name} to ${to.name}`, fromAccountId, toAccountId, date, notes })
          showToast('Transfer completed')
        }}
      />
      <AddGoalModal
        open={activeModal === 'goal'}
        accounts={accounts}
        onClose={() => setActiveModal(null)}
        onSubmit={({ name, target, saved, linkedAccountId, dueDate, notes }) => {
          const goal: Goal = { id: makeId('goal'), name, target, saved, linkedAccountId, dueDate, notes, status: saved >= target ? 'Completed' : 'Active' }
          setGoals((current) => [goal, ...current])
          if (saved > 0) {
            const account = accounts.find((item) => item.id === linkedAccountId)
            addTransaction({ id: makeId('goal-save'), title: 'Goal Saving', type: 'goal_saving', amount: saved, category: name, account: account?.name ?? 'Goal balance', accountId: linkedAccountId, goalId: goal.id, date: new Date().toISOString().slice(0, 10), notes })
          }
          showToast('Goal created')
        }}
      />
      <DebtPaymentModal
        open={activeModal === 'debt'}
        debts={debts}
        accounts={accounts}
        initialDebtId={activeDebtId}
        onClose={() => { setActiveModal(null); setActiveDebtId(undefined) }}
        onSubmit={({ debtId, amount, accountId, date, notes }) => {
          const debt = debts.find((item) => item.id === debtId)
          const account = accounts.find((item) => item.id === accountId)
          if (!debt || !account) return
          updateAccountBalance(accountId, -amount)
          setDebts((current) => current.map((item) => item.id === debtId ? { ...item, paid: Math.min(item.total, item.paid + amount), status: item.paid + amount >= item.total ? 'Completed' : item.status } : item))
          addTransaction({ id: makeId('debt-pay'), title: 'Debt Payment', type: 'debt_payment', amount, category: debt.name, account: account.name, accountId, debtId, date, notes })
          showToast('Debt payment recorded')
        }}
      />
    </AppShell>
  )
}

function SupabaseAuthShell({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5">
      <section className="w-full max-w-md rounded-[2rem] border border-[rgba(221,255,69,.18)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/35">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--accent)] text-3xl font-black text-[#111318] shadow-[0_0_30px_rgba(221,255,69,.3)]">M</div>
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Supabase sync</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Log in to save and load your private finance ledger.</p>
        </div>
        {children}
      </section>
    </main>
  )
}

export default App

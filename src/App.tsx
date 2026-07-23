import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { accounts as initialAccounts, budgets as initialBudgets, debts as initialDebts, expenseCategories as initialExpenseCategories, goals as initialGoals, incomeSources as initialIncomeSources, transactions as initialTransactions, upcomingExpenses as initialUpcomingExpenses } from './data/mockData'
import * as vaultPreview from './data/vaultPreviewData'
import { adjustAccountBalance, archiveAccount, archiveCategory, deleteBudget, deleteDebt, deleteFinanceTransaction, deleteGoal, deleteUpcomingExpense, deleteWishlistItem, loadFinanceData, markUpcomingExpensePaid, recordFinanceAction, saveAccount, saveBudget, saveCategory, saveDebt, saveGoal, saveJourneySettings, saveMoneyQuest, saveMoneyWin, saveUpcomingExpense, saveUserSettings, saveWishlistItem, updateFinanceTransaction } from './lib/financeRepository'
import { addRecurringDate, localDateKey } from './lib/date'
import { applyAccountOrder } from './lib/accountOrder'
import { setAnalyticsConsent, trackEvent } from './lib/analytics'
import { getProfile, onProfileChange, setProfile, type Profile } from './lib/profile'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { AuthCallback, AuthPage } from './pages/Auth'
import { LegalPage } from './pages/Legal'
import type { Budget, Category, Debt, DebtCategory, DebtStatus, Goal, JourneySettings, MoneyQuest, MoneyWin, RecurringFrequency, Transaction, UpcomingExpense, WishlistItem } from './types/finance'
import { calculateSafeSpend } from './utils/journeyCalculations'
import { resolveQuestStatus } from './utils/retention'

const AddGoalModal = lazy(() => import('./components/forms/FinanceActionModals').then((module) => ({ default: module.AddGoalModal })))
const DebtPaymentModal = lazy(() => import('./components/forms/FinanceActionModals').then((module) => ({ default: module.DebtPaymentModal })))
const RecordSheet = lazy(() => import('./components/sheets/RecordSheet').then((module) => ({ default: module.RecordSheet })))
const MoveSheet = lazy(() => import('./components/sheets/MoveSheet').then((module) => ({ default: module.MoveSheet })))
const CoolOffSheet = lazy(() => import('./components/sheets/CoolOffSheet').then((module) => ({ default: module.CoolOffSheet })))
const PurchaseSimulator = lazy(() => import('./components/PurchaseSimulator').then((module) => ({ default: module.PurchaseSimulator })))
const Accounts = lazy(() => import('./pages/Accounts').then((module) => ({ default: module.Accounts })))
const Budgets = lazy(() => import('./pages/Budgets').then((module) => ({ default: module.Budgets })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const GoalsDebts = lazy(() => import('./pages/GoalsDebts').then((module) => ({ default: module.GoalsDebts })))
const ProfilePage = lazy(() => import('./pages/Profile').then((module) => ({ default: module.ProfilePage })))
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))
const Transactions = lazy(() => import('./pages/Transactions').then((module) => ({ default: module.Transactions })))
const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })))

type ActionModal = 'income' | 'expense' | 'transfer' | 'cooloff' | 'goal' | 'debt' | 'simulator' | null

const defaultJourneySettings: JourneySettings = {
  typicalIncome: 0,
  safetyReserve: 0,
  onboardingVersion: 2,
  onboardingStep: 0,
  tourCompleted: false,
  analyticsConsent: false,
}

const makeId = () => crypto.randomUUID()

type DebtPayload = {
  title: string
  personOrCompany?: string
  totalAmount: number
  paidAmount: number
  dueDate?: string
  category: DebtCategory
  status: DebtStatus
  notes?: string
}
type UpcomingPayload = Omit<UpcomingExpense, 'id' | 'status' | 'createdAt' | 'paidTransactionId'>

function nextRecurringDate(dueDate: string, frequency: RecurringFrequency) {
  return addRecurringDate(dueDate, frequency)
}

function debtTitle(debt: Debt) {
  return debt.title || debt.name || 'Debt'
}

function debtTotal(debt: Debt) {
  return debt.totalAmount ?? debt.total ?? 0
}

function debtPaid(debt: Debt) {
  return debt.paidAmount ?? debt.paid ?? 0
}

function analyticsSurfaceFor(page: string): 'home' | 'activity' | 'plan' | 'goals' | 'insights' | 'settings' {
  if (page === 'transactions') return 'activity'
  if (page === 'budgets') return 'plan'
  if (page === 'goals') return 'goals'
  if (page === 'reports') return 'insights'
  if (page === 'settings' || page === 'profile' || page === 'accounts') return 'settings'
  return 'home'
}

function createDebt(payload: DebtPayload): Debt {
  const paidAmount = Math.min(payload.totalAmount, payload.paidAmount)
  return {
    id: makeId(),
    title: payload.title,
    name: payload.title,
    personOrCompany: payload.personOrCompany,
    totalAmount: payload.totalAmount,
    total: payload.totalAmount,
    paidAmount,
    paid: paidAmount,
    dueDate: payload.dueDate,
    category: payload.category,
    status: paidAmount >= payload.totalAmount ? 'Paid' : payload.status,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
  }
}

function updateDebtFromPayload(debt: Debt, payload: DebtPayload): Debt {
  const paidAmount = Math.min(payload.totalAmount, payload.paidAmount)
  return {
    ...debt,
    title: payload.title,
    name: payload.title,
    personOrCompany: payload.personOrCompany,
    totalAmount: payload.totalAmount,
    total: payload.totalAmount,
    paidAmount,
    paid: paidAmount,
    dueDate: payload.dueDate,
    category: payload.category,
    status: paidAmount >= payload.totalAmount ? 'Paid' : payload.status,
    notes: payload.notes,
    createdAt: debt.createdAt ?? new Date().toISOString(),
  }
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const routePage = location.pathname.startsWith('/app/') ? location.pathname.split('/')[2] : 'dashboard'
  const activePage = routePage
  const [activeModal, setActiveModal] = useState<ActionModal>(null)
  const [activeDebtId, setActiveDebtId] = useState<string | undefined>()
  const [expenseDraft, setExpenseDraft] = useState<{ amount: number; category: string; wishlistId?: string }>()
  const [toast, setToast] = useState('')
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [dataReady, setDataReady] = useState(!isSupabaseConfigured)
  // Dev-only design QA: /app?vault-preview renders the mock ledger without auth.
  // Never active in production builds.
  const [designPreview] = useState(() => import.meta.env.DEV && window.location.search.includes('vault-preview'))
  const [financeUserId, setFinanceUserId] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string>()
  const [authDisplayName, setAuthDisplayName] = useState<string>()
  const [authProvider, setAuthProvider] = useState<string>()
  const [onboardingCompleted, setOnboardingCompleted] = useState(!isSupabaseConfigured)
  const [journeySettings, setJourneySettings] = useState<JourneySettings>(designPreview ? vaultPreview.journeySettings : defaultJourneySettings)
  const [accounts, setAccounts] = useState(() => applyAccountOrder(designPreview ? vaultPreview.accounts : initialAccounts))
  const [transactions, setTransactions] = useState(designPreview ? vaultPreview.transactions : initialTransactions)
  const [goals, setGoals] = useState<Goal[]>(designPreview ? vaultPreview.goals : initialGoals)
  const [debts, setDebts] = useState<Debt[]>(designPreview ? vaultPreview.debts : initialDebts)
  const [budgets, setBudgets] = useState<Budget[]>(designPreview ? vaultPreview.budgets : initialBudgets)
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingExpense[]>(designPreview ? vaultPreview.upcomingExpenses : initialUpcomingExpenses)
  const [categories, setCategories] = useState<Category[]>(() => [...initialIncomeSources, ...initialExpenseCategories])
  const [moneyQuests, setMoneyQuests] = useState<MoneyQuest[]>(designPreview ? vaultPreview.moneyQuests : [])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(designPreview ? vaultPreview.wishlistItems : [])
  const [moneyWins, setMoneyWins] = useState<MoneyWin[]>(designPreview ? vaultPreview.moneyWins : [])
  const [profile, setProfileState] = useState<Profile>(getProfile)
  const expenseCategoryNames = categories.filter((category) => category.kind === 'expense').map((category) => category.name)
  const incomeCategoryNames = categories.filter((category) => category.kind === 'income').map((category) => category.name)
  const expenseCategoryIdFor = useCallback((name?: string) => categories.find((category) => category.kind === 'expense' && category.name === name)?.id, [categories])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const awardMoneyWin = useCallback((win: MoneyWin) => {
    if (moneyWins.some((item) => item.id === win.id)) return
    setMoneyWins((current) => current.some((item) => item.id === win.id) ? current : [win, ...current])
    void saveMoneyWin(win).catch((error) => showToast(error instanceof Error ? error.message : 'Could not save your Tiny Win'))
  }, [moneyWins, showToast])

  // expose the active page to CSS so Home gets its own "ledger paper" canvas (see theme.css §7)
  useEffect(() => { document.documentElement.dataset.page = activePage }, [activePage])
  useEffect(() => { setAnalyticsConsent(journeySettings.analyticsConsent) }, [journeySettings.analyticsConsent])
  useEffect(() => { trackEvent('page_view', { surface: analyticsSurfaceFor(activePage) }) }, [activePage])

  const setActivePage = useCallback((page: string) => {
    navigate(page === 'dashboard' ? '/app' : `/app/${page}`)
  }, [navigate])

  useEffect(() => onProfileChange(setProfileState), [])

  const reconcileActiveQuest = useCallback((nextTransactions: Transaction[]) => {
    const activeQuest = moneyQuests.find((quest) => quest.status === 'active')
    if (!activeQuest) return
    const status = resolveQuestStatus(activeQuest, nextTransactions, localDateKey())
    if (!status) return

    const settledQuest = { ...activeQuest, status }
    setMoneyQuests((current) => current.map((quest) => quest.id === activeQuest.id ? settledQuest : quest))
    void saveMoneyQuest(settledQuest).catch((error) => showToast(error instanceof Error ? error.message : 'Could not update your quest'))

    if (status === 'completed') {
      awardMoneyWin({
        id: `quest-completed:${activeQuest.id}`,
        type: 'quest_completed',
        title: 'Weekly quest completed',
        detail: activeQuest.title,
        earnedAt: new Date().toISOString(),
      })
      trackEvent('quest_completed', { surface: 'plan', action: 'complete' })
      showToast('Quest complete — added to Tiny Wins')
    } else {
      trackEvent('quest_ended', { surface: 'plan', action: 'expire' })
    }
  }, [awardMoneyWin, moneyQuests, showToast])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.warn('Supabase session check failed:', error)
      setFinanceUserId(data.session?.user.id ?? null)
      setAuthEmail(data.session?.user.email)
      setAuthDisplayName((data.session?.user.user_metadata.display_name ?? data.session?.user.user_metadata.full_name) as string | undefined)
      setAuthProvider(data.session?.user.app_metadata.provider as string | undefined)
      setAuthReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setFinanceUserId(session?.user.id ?? null)
      setAuthEmail(session?.user.email)
      setAuthDisplayName((session?.user.user_metadata.display_name ?? session?.user.user_metadata.full_name) as string | undefined)
      setAuthProvider(session?.user.app_metadata.provider as string | undefined)
      setAuthReady(true)
      if (!session?.user) setDataReady(false)
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
        setDataReady(false)
        const remoteState = await loadFinanceData()
        if (cancelled) return
        setAccounts(applyAccountOrder(remoteState.accounts))
        setTransactions(remoteState.transactions)
        setGoals(remoteState.goals)
        setDebts(remoteState.debts)
        setBudgets(remoteState.budgets)
        setUpcomingExpenses(remoteState.upcomingExpenses)
        setCategories(remoteState.categories)
        setMoneyQuests(remoteState.moneyQuests)
        setWishlistItems(remoteState.wishlistItems)
        setMoneyWins(remoteState.moneyWins)
        setProfile(remoteState.profile)
        setProfileState(remoteState.profile)
        setOnboardingCompleted(remoteState.onboardingCompleted)
        setJourneySettings(remoteState.journeySettings)
        setDataReady(true)
      } catch (error) {
        console.warn('Supabase load failed:', error)
        setDataReady(true)
        showToast('Could not load your ledger. Please retry.')
      }
    }

    loadRemoteState()
    return () => {
      cancelled = true
    }
  }, [financeUserId, showToast])

  const addTransaction = (transaction: Transaction) => {
    const nextTransaction = { ...transaction, createdAt: new Date().toISOString() }
    setTransactions((current) => [nextTransaction, ...current])
    reconcileActiveQuest([nextTransaction, ...transactions])
  }

  const updateAccountBalance = (accountId: string, delta: number) => {
    setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, balance: account.balance + delta } : account))
  }

  const applyTransactionEffect = (transaction: Transaction, direction: 1 | -1) => {
    if (transaction.type === 'income' && transaction.accountId) {
      updateAccountBalance(transaction.accountId, direction * transaction.amount)
    }
    if (transaction.type === 'expense' && transaction.accountId) {
      updateAccountBalance(transaction.accountId, direction * -transaction.amount)
      if (transaction.category) {
        setBudgets((current) => current.map((budget) => budget.category === transaction.category ? { ...budget, used: Math.max(0, budget.used + direction * transaction.amount) } : budget))
      }
    }
    if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
      setAccounts((current) => current.map((account) => {
        if (account.id === transaction.fromAccountId) return { ...account, balance: account.balance + direction * -transaction.amount }
        if (account.id === transaction.toAccountId) return { ...account, balance: account.balance + direction * transaction.amount }
        return account
      }))
    }
    if (transaction.type === 'goal_saving' && transaction.accountId) {
      updateAccountBalance(transaction.accountId, direction * -transaction.amount)
      if (transaction.goalId) {
        setGoals((current) => current.map((goal) => {
          if (goal.id !== transaction.goalId) return goal
          const saved = Math.max(0, Math.min(goal.target, goal.saved + direction * transaction.amount))
          return { ...goal, saved, status: saved >= goal.target ? 'Completed' : 'Active' }
        }))
      }
    }
    if (transaction.type === 'debt_payment' && transaction.accountId) {
      updateAccountBalance(transaction.accountId, direction * -transaction.amount)
      if (transaction.debtId) {
        setDebts((current) => current.map((debt) => {
          if (debt.id !== transaction.debtId) return debt
          const totalAmount = debtTotal(debt)
          const paidAmount = Math.max(0, Math.min(totalAmount, debtPaid(debt) + direction * transaction.amount))
          return { ...debt, paidAmount, paid: paidAmount, status: paidAmount >= totalAmount ? 'Paid' : 'Active' }
        }))
      }
    }
  }

  const updateTransaction = async (nextTransaction: Transaction) => {
    const previous = transactions.find((transaction) => transaction.id === nextTransaction.id)
    if (!previous) return
    const normalizedTransaction = nextTransaction.categoryId || nextTransaction.type !== 'expense'
      ? nextTransaction
      : { ...nextTransaction, categoryId: expenseCategoryIdFor(nextTransaction.category) }
    try {
      await updateFinanceTransaction(normalizedTransaction)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update transaction')
      return
    }
    applyTransactionEffect(previous, -1)
    applyTransactionEffect(normalizedTransaction, 1)
    setTransactions((current) => current.map((transaction) => transaction.id === normalizedTransaction.id ? { ...normalizedTransaction, createdAt: transaction.createdAt } : transaction))
    showToast('Transaction updated')
  }

  const deleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find((item) => item.id === transactionId)
    if (!transaction) return
    try {
      await deleteFinanceTransaction(transactionId)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete transaction')
      return
    }
    applyTransactionEffect(transaction, -1)
    setTransactions((current) => current.filter((item) => item.id !== transactionId))
    showToast('Transaction deleted')
  }

  const accountsWithSavings = accounts

  const addUpcoming = (payload: UpcomingPayload) => {
    const expense: UpcomingExpense = { ...payload, id: makeId(), status: 'upcoming', createdAt: new Date().toISOString() }
    setUpcomingExpenses((current) => [expense, ...current])
    void saveUpcomingExpense(expense).catch((error) => showToast(error.message))
    showToast('Upcoming bill added')
  }

  const updateUpcoming = (expenseId: string, payload: UpcomingPayload) => {
    const expense = upcomingExpenses.find((item) => item.id === expenseId)
    if (expense) void saveUpcomingExpense({ ...expense, ...payload, status: expense.status === 'paid' ? 'paid' : 'upcoming' }).catch((error) => showToast(error.message))
    setUpcomingExpenses((current) => current.map((item) => item.id === expenseId ? { ...item, ...payload, status: item.status === 'paid' ? 'paid' : 'upcoming' } : item))
    showToast('Upcoming bill updated')
  }

  const removeUpcoming = (expenseId: string) => {
    void deleteUpcomingExpense(expenseId).catch((error) => showToast(error.message))
    setUpcomingExpenses((current) => current.filter((expense) => expense.id !== expenseId))
    showToast('Upcoming bill deleted')
  }

  const payUpcoming = async (expense: UpcomingExpense, { accountId, paymentDate, notes }: { accountId: string; paymentDate: string; notes?: string }) => {
    const account = accounts.find((item) => item.id === accountId)
    if (!account) return
    const transactionId = makeId()
    const nextDueDate = expense.isRecurring && expense.recurringFrequency ? nextRecurringDate(expense.dueDate, expense.recurringFrequency) : undefined
    const nextExpense = nextDueDate && (!expense.repeatEndDate || nextDueDate <= expense.repeatEndDate) ? { ...expense, id: makeId(), dueDate: nextDueDate, status: 'upcoming' as const, createdAt: new Date().toISOString(), paidTransactionId: undefined } : undefined
    try {
      await markUpcomingExpensePaid(expense.id, { id: transactionId, title: expense.title, type: 'expense', amount: expense.amount, category: expense.category, categoryId: expenseCategoryIdFor(expense.category), account: account.name, accountId, date: paymentDate, notes: notes ?? expense.notes }, nextExpense)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not record the payment')
      return
    }
    updateAccountBalance(accountId, -expense.amount)
    setBudgets((current) => current.map((budget) => budget.category === expense.category ? { ...budget, used: budget.used + expense.amount } : budget))
    addTransaction({ id: transactionId, title: expense.title, type: 'expense', amount: expense.amount, category: expense.category, categoryId: expenseCategoryIdFor(expense.category), account: account.name, accountId, date: paymentDate, notes: notes ?? expense.notes })
    setUpcomingExpenses((current) => {
      const paidItems = current.map((item) => item.id === expense.id ? { ...item, status: 'paid' as const, paidTransactionId: transactionId } : item)
      return nextExpense ? [nextExpense, ...paidItems] : paidItems
    })
    showToast(expense.isRecurring ? 'Bill paid and next item created' : 'Bill paid and recorded')
  }

  const pages: Record<string, { title: string; subtitle: string; component: ReactNode }> = {
    dashboard: { title: 'Home', subtitle: 'Your payday journey', component: <Dashboard accounts={accountsWithSavings} transactions={transactions} goals={goals} debts={debts} budgets={budgets} upcomingExpenses={upcomingExpenses} categories={categories} journeySettings={journeySettings} onAction={setActiveModal} onNavigate={setActivePage} onPlanPurchase={() => { setActiveModal('simulator'); trackEvent('simulator_opened', { surface: 'home' }) }} onSetupJourney={() => navigate('/onboarding')} onTourComplete={() => { const next = { ...journeySettings, tourCompleted: true }; setJourneySettings(next); void saveJourneySettings(next, true) }} /> },
    transactions: { title: 'Transactions', subtitle: 'Track income, spending, and transfers', component: <Transactions transactions={transactions} accounts={accountsWithSavings} expenseCategories={expenseCategoryNames} incomeCategories={incomeCategoryNames} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} /> },
    accounts: {
      title: 'Accounts',
      subtitle: 'Manage cash, banks, and wallets',
      component: <Accounts accounts={accounts} transactions={transactions} setAccounts={setAccounts} setTransactions={setTransactions} onTransfer={() => setActiveModal('transfer')} onOpenTransactions={() => setActivePage('transactions')} onSaveAccount={designPreview ? undefined : saveAccount} onAdjustBalance={designPreview ? undefined : async (account, transaction) => { await adjustAccountBalance(account, transaction) }} onArchiveAccount={designPreview ? undefined : archiveAccount} />,
    },
    goals: {
      title: 'Goals & Debts',
      subtitle: 'Savings and payment progress',
      component: (
        <GoalsDebts
          goals={goals}
          debts={debts}
          accounts={accountsWithSavings}
          upcomingExpenses={upcomingExpenses}
          onAddGoal={() => setActiveModal('goal')}
          onDebtPayment={(debtId) => {
            setActiveDebtId(debtId)
            setActiveModal('debt')
          }}
          onAddDebt={(payload) => {
            const debt = createDebt(payload)
            setDebts((current) => [debt, ...current])
            void saveDebt(debt).catch((error) => showToast(error.message))
            showToast(payload.category === 'Money I Owe' ? 'Money owed item added' : 'Debt added')
          }}
          onUpdateGoal={(goalId, payload) => {
            const goal = goals.find((item) => item.id === goalId)
            if (goal) void saveGoal({ ...goal, ...payload }).catch((error) => showToast(error.message))
            setGoals((current) => current.map((item) => item.id === goalId ? { ...item, ...payload } : item))
            showToast('Goal updated')
          }}
          onDeleteGoal={(goalId) => {
            void deleteGoal(goalId).catch((error) => showToast(error.message))
            setGoals((current) => current.filter((goal) => goal.id !== goalId))
            showToast('Goal deleted')
          }}
          onUpdateDebt={(debtId, payload) => {
            const debt = debts.find((item) => item.id === debtId)
            if (debt) void saveDebt(updateDebtFromPayload(debt, payload)).catch((error) => showToast(error.message))
            setDebts((current) => current.map((item) => item.id === debtId ? updateDebtFromPayload(item, payload) : item))
            showToast('Debt item updated')
          }}
          onDeleteDebt={(debtId) => {
            void deleteDebt(debtId).catch((error) => showToast(error.message))
            setDebts((current) => current.filter((debt) => debt.id !== debtId))
            showToast('Debt deleted')
          }}
          onAddSavings={async ({ goalId, amount, accountId, date, notes }) => {
            const goal = goals.find((item) => item.id === goalId)
            const account = accountsWithSavings.find((item) => item.id === accountId)
            if (!goal || !account) return
            if (account.balance < amount) {
              showToast('Savings does not have enough money')
              return
            }
            const transactionId = makeId()
            try {
              await recordFinanceAction({ id: transactionId, title: 'Goal Saving', type: 'goal_saving', amount, category: goal.name, account: account.name, accountId, goalId, date, notes })
            } catch (error) {
              showToast(error instanceof Error ? error.message : 'Could not add savings')
              return
            }
            updateAccountBalance(accountId, -amount)
            setGoals((current) => current.map((item) => {
              if (item.id !== goalId) return item
              const saved = Math.min(item.target, item.saved + amount)
              return { ...item, saved, status: saved >= item.target ? 'Completed' : item.status }
            }))
            addTransaction({ id: transactionId, title: 'Goal Saving', type: 'goal_saving', amount, category: goal.name, account: account.name, accountId, goalId, date, notes })
            if (goal.saved < goal.target && goal.saved + amount >= goal.target) {
              awardMoneyWin({
                id: `goal-milestone:${goal.id}:complete`,
                type: 'goal_milestone',
                title: `${goal.name} is fully funded`,
                detail: 'You reached a savings goal through recorded contributions.',
                earnedAt: new Date().toISOString(),
              })
            }
            showToast('Savings added')
          }}
          onAddUpcomingExpense={(payload) => {
            const expense: UpcomingExpense = { ...payload, id: makeId(), status: 'upcoming', createdAt: new Date().toISOString() }
            setUpcomingExpenses((current) => [expense, ...current])
            void saveUpcomingExpense(expense).catch((error) => showToast(error.message))
            showToast('Upcoming expense added')
          }}
          onUpdateUpcomingExpense={(expenseId, payload) => {
            const expense = upcomingExpenses.find((item) => item.id === expenseId)
            if (expense) void saveUpcomingExpense({ ...expense, ...payload, status: expense.status === 'paid' ? 'paid' : 'upcoming' }).catch((error) => showToast(error.message))
            setUpcomingExpenses((current) => current.map((expense) => expense.id === expenseId ? { ...expense, ...payload, status: expense.status === 'paid' ? 'paid' : 'upcoming' } : expense))
            showToast('Upcoming expense updated')
          }}
          onDeleteUpcomingExpense={(expenseId) => {
            void deleteUpcomingExpense(expenseId).catch((error) => showToast(error.message))
            setUpcomingExpenses((current) => current.filter((expense) => expense.id !== expenseId))
            showToast('Upcoming expense deleted')
          }}
          onMarkUpcomingPaid={async (expense, { accountId, paymentDate, notes }) => {
            const account = accounts.find((item) => item.id === accountId)
            if (!account) return
            const transactionId = makeId()
            const nextDueDate = expense.isRecurring && expense.recurringFrequency ? nextRecurringDate(expense.dueDate, expense.recurringFrequency) : undefined
            const nextExpense = nextDueDate && (!expense.repeatEndDate || nextDueDate <= expense.repeatEndDate) ? {
              ...expense,
              id: makeId(),
              dueDate: nextDueDate,
              status: 'upcoming' as const,
              createdAt: new Date().toISOString(),
              paidTransactionId: undefined,
            } : undefined
            try {
              await markUpcomingExpensePaid(
                expense.id,
                { id: transactionId, title: expense.title, type: 'expense', amount: expense.amount, category: expense.category, categoryId: expenseCategoryIdFor(expense.category), account: account.name, accountId, date: paymentDate, notes: notes ?? expense.notes },
                nextExpense,
              )
            } catch (error) {
              showToast(error instanceof Error ? error.message : 'Could not record the payment')
              return
            }
            updateAccountBalance(accountId, -expense.amount)
            setBudgets((current) => current.map((budget) => budget.category === expense.category ? { ...budget, used: budget.used + expense.amount } : budget))
            addTransaction({
              id: transactionId,
              title: expense.title,
              type: 'expense',
              amount: expense.amount,
              category: expense.category,
              categoryId: expenseCategoryIdFor(expense.category),
              account: account.name,
              accountId,
              date: paymentDate,
              notes: notes ?? expense.notes,
            })
            setUpcomingExpenses((current) => {
              const paidItems = current.map((item) => item.id === expense.id ? { ...item, status: 'paid' as const, paidTransactionId: transactionId } : item)
              return nextExpense ? [nextExpense, ...paidItems] : paidItems
            })
            showToast(expense.isRecurring ? 'Expense paid and next recurring item created' : 'Expense recorded')
          }}
        />
      ),
    },
    budgets: {
      title: 'Plan',
      subtitle: 'Budgets, bills, and considered purchases',
      component: <Budgets
        budgets={budgets}
        upcomingExpenses={upcomingExpenses}
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        wishlistItems={wishlistItems}
        activeQuest={moneyQuests.find((item) => item.status === 'active')}
        onNavigateSettings={() => setActivePage('settings')}
        onAddUpcoming={addUpcoming}
        onUpdateUpcoming={updateUpcoming}
        onDeleteUpcoming={removeUpcoming}
        onMarkUpcomingPaid={payUpcoming}
        onSaveWishlist={(item) => {
          void saveWishlistItem(item).catch((error) => showToast(error.message))
          setWishlistItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
          if (item.status === 'skipped') {
            awardMoneyWin({
              id: `wishlist-skipped:${item.id}`,
              type: 'wishlist_skipped',
              title: `You chose not to buy ${item.name}`,
              detail: `${item.amount.toLocaleString('en-PK')} PKR remains unspent. It becomes saved only if you move it to a goal.`,
              earnedAt: new Date().toISOString(),
            })
            trackEvent('wishlist_decision', { surface: 'plan', action: 'skip' })
          } else if (item.status === 'waiting') {
            trackEvent('wishlist_decision', { surface: 'plan', action: 'wait' })
          }
        }}
        onDeleteWishlist={(id) => {
          void deleteWishlistItem(id).catch((error) => showToast(error.message))
          setWishlistItems((current) => current.filter((item) => item.id !== id))
        }}
        onBuyWishlist={(item) => {
          setExpenseDraft({ amount: item.amount, category: categories.find((category) => category.id === item.categoryId)?.name ?? 'Miscellaneous', wishlistId: item.id })
          setActiveModal('expense')
          trackEvent('wishlist_decision', { surface: 'plan', action: 'buy' })
        }}
        onSaveQuest={(quest) => {
          void saveMoneyQuest(quest).catch((error) => showToast(error.message))
          setMoneyQuests((current) => [quest, ...current.filter((item) => item.id !== quest.id && item.status !== 'active')])
        }}
        onCancelQuest={(quest) => {
          const next = { ...quest, status: 'cancelled' as const }
          void saveMoneyQuest(next).catch((error) => showToast(error.message))
          setMoneyQuests((current) => current.map((item) => item.id === quest.id ? next : item))
          trackEvent('quest_ended', { surface: 'plan', action: 'cancel' })
        }}
      />,
    },
    reports: {
      title: 'Analytics',
      subtitle: 'Spending trends and insights',
      component: (
        <Reports
          accounts={accounts}
          transactions={transactions}
          goals={goals}
          debts={debts}
          upcomingExpenses={upcomingExpenses}
          journeySettings={journeySettings}
          moneyWins={moneyWins}
        />
      ),
    },
    settings: { title: 'Settings', subtitle: 'Preferences and data tools', component: <Settings accounts={accounts} authEmail={authEmail} authProvider={authProvider} budgets={budgets} categories={categories} debts={debts} expenseCategories={expenseCategoryNames} goals={goals} incomeCategories={incomeCategoryNames} profile={profile} transactions={transactions} upcomingExpenses={upcomingExpenses} analyticsConsent={journeySettings.analyticsConsent} onAnalyticsConsentChange={(analyticsConsent) => { const next = { ...journeySettings, analyticsConsent }; setJourneySettings(next); void saveJourneySettings(next, true) }} onNavigate={setActivePage} onRestartTour={() => navigate('/onboarding')} onProfileChange={(next) => { setProfile(next); setProfileState(next); void saveUserSettings(next, true) }} onSaveCategory={async (category) => { await saveCategory(category); setCategories((current) => [...current.filter((item) => item.id !== category.id), category]) }} onArchiveCategory={async (id) => { await archiveCategory(id); setCategories((current) => current.filter((item) => item.id !== id)) }} onSaveBudget={async (budget) => { await saveBudget(budget); setBudgets((current) => [...current.filter((item) => item.id !== budget.id), budget]) }} onDeleteBudget={async (id) => { await deleteBudget(id); setBudgets((current) => current.filter((item) => item.id !== id)) }} onSignOut={() => supabase?.auth.signOut()} /> },
    profile: { title: 'Profile', subtitle: 'Your name and photo', component: <ProfilePage onBack={() => setActivePage('dashboard')} /> },
  }

  const ledger = (
    <AppShell activePage={activePage} setActivePage={setActivePage} onAdd={(action) => { setExpenseDraft(undefined); setActiveModal(action) }}>
      {toast && <div aria-live="polite" className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full border border-[rgba(255, 122, 26,.28)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--accent-2)] shadow-2xl shadow-black/40" role="status">{toast}</div>}
      <Suspense fallback={<div className="card p-6 text-sm text-[var(--muted)]" role="status">Loading screen…</div>}>{(pages[activePage] ?? pages.dashboard).component}</Suspense>
      <Suspense fallback={null}>
      {(activeModal === 'income' || activeModal === 'expense') && <RecordSheet
        key={expenseDraft ? `${expenseDraft.amount}-${expenseDraft.category}` : `record-${activeModal}`}
        open
        initialDirection={activeModal}
        accounts={accountsWithSavings}
        expenseCategories={expenseCategoryNames}
        incomeCategories={incomeCategoryNames}
        transactions={transactions}
        safeSpend={calculateSafeSpend({ accounts: accountsWithSavings, budgets, categories, upcomingExpenses, settings: journeySettings })}
        initialAmount={expenseDraft?.amount}
        initialCategory={expenseDraft?.category}
        onClose={() => { setActiveModal(null); setExpenseDraft(undefined) }}
        onSubmit={async ({ direction, amount, category, accountId, date, notes }) => {
          const account = accountsWithSavings.find((item) => item.id === accountId)
          if (!account) return
          const transactionId = makeId()
          if (direction === 'income') {
            try {
              await recordFinanceAction({ id: transactionId, title: category, type: 'income', amount, source: category, category, account: account.name, accountId, date, notes })
            } catch (error) {
              showToast(error instanceof Error ? error.message : 'Could not add income')
              return
            }
            updateAccountBalance(accountId, amount)
            addTransaction({ id: transactionId, title: category, type: 'income', amount, source: category, category, account: account.name, accountId, date, notes })
            showToast('Income added')
            return
          }
          try {
            await recordFinanceAction({ id: transactionId, title: category, type: 'expense', amount, category, categoryId: expenseCategoryIdFor(category), account: account.name, accountId, date, notes })
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not record expense')
            return
          }
          updateAccountBalance(accountId, -amount)
          setBudgets((current) => current.map((budget) => budget.category === category ? { ...budget, used: budget.used + amount } : budget))
          addTransaction({ id: transactionId, title: category, type: 'expense', amount, category, categoryId: expenseCategoryIdFor(category), account: account.name, accountId, date, notes })
          if (expenseDraft?.wishlistId) {
            setWishlistItems((current) => current.map((item) => {
              if (item.id !== expenseDraft.wishlistId) return item
              const next = { ...item, status: 'bought' as const, transactionId }
              void saveWishlistItem(next).catch((error) => showToast(error.message))
              return next
            }))
          }
          showToast('Expense recorded')
          setExpenseDraft(undefined)
        }}
      />}
      {activeModal === 'simulator' && <PurchaseSimulator open safeSpend={calculateSafeSpend({ accounts, budgets, categories, upcomingExpenses, settings: journeySettings })} categories={categories} onClose={() => setActiveModal(null)} onManageCategories={() => { setActiveModal(null); setActivePage('settings'); trackEvent('category_management_opened', { surface: 'home' }) }} onRecordExpense={(draft) => { setExpenseDraft(draft); setActiveModal('expense'); trackEvent('simulator_expense_handoff', { surface: 'home' }) }} />}
      {activeModal === 'transfer' && <MoveSheet
        open
        accounts={accountsWithSavings}
        safeSpend={calculateSafeSpend({ accounts: accountsWithSavings, budgets, categories, upcomingExpenses, settings: journeySettings })}
        onClose={() => setActiveModal(null)}
        onSubmit={async ({ amount, fromAccountId, toAccountId, date, notes }) => {
          const from = accountsWithSavings.find((item) => item.id === fromAccountId)
          const to = accountsWithSavings.find((item) => item.id === toAccountId)
          if (!from || !to) return
          const transactionId = makeId()
          try {
            await recordFinanceAction({ id: transactionId, title: 'Transfer', type: 'transfer', amount, category: 'Transfer', account: `${from.name} to ${to.name}`, fromAccountId, toAccountId, date, notes })
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not transfer money')
            return
          }
          updateAccountBalance(fromAccountId, -amount)
          updateAccountBalance(toAccountId, amount)
          addTransaction({ id: transactionId, title: 'Transfer', type: 'transfer', amount, category: 'Transfer', account: `${from.name} to ${to.name}`, fromAccountId, toAccountId, date, notes })
          showToast('Transfer completed')
        }}
      />}
      {activeModal === 'cooloff' && <CoolOffSheet
        open
        categories={categories}
        onClose={() => setActiveModal(null)}
        onSave={(item) => {
          void saveWishlistItem(item).catch((error) => showToast(error.message))
          setWishlistItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
          showToast('Parked in Cooling off')
        }}
      />}
      {activeModal === 'goal' && <AddGoalModal
        open={activeModal === 'goal'}
        onClose={() => setActiveModal(null)}
        onSubmit={({ name, target, dueDate, notes }) => {
          const goal: Goal = { id: makeId(), name, target, saved: 0, dueDate, notes, status: 'Active' }
          setGoals((current) => [goal, ...current])
          void saveGoal(goal).catch((error) => showToast(error.message))
          showToast('Goal created')
        }}
      />}
      {activeModal === 'debt' && <DebtPaymentModal
        key={activeDebtId ?? 'debt-payment'}
        open={activeModal === 'debt'}
        debts={debts}
        accounts={accountsWithSavings}
        initialDebtId={activeDebtId}
        onClose={() => { setActiveModal(null); setActiveDebtId(undefined) }}
        onSubmit={async ({ debtId, amount, accountId, date, notes }) => {
          const debt = debts.find((item) => item.id === debtId)
          const account = accountsWithSavings.find((item) => item.id === accountId)
          if (!debt || !account) return
          const transactionId = makeId()
          try {
            await recordFinanceAction({ id: transactionId, title: `Payment toward ${debtTitle(debt)}`, type: 'debt_payment', amount, category: debtTitle(debt), account: account.name, accountId, debtId, date, notes })
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not record debt payment')
            return
          }
          updateAccountBalance(accountId, -amount)
          setDebts((current) => current.map((item) => {
            if (item.id !== debtId) return item
            const totalAmount = debtTotal(item)
            const paidAmount = Math.min(totalAmount, debtPaid(item) + amount)
            return {
              ...item,
              title: debtTitle(item),
              name: debtTitle(item),
              totalAmount,
              total: totalAmount,
              paidAmount,
              paid: paidAmount,
              category: item.category ?? 'Debt',
              status: paidAmount >= totalAmount ? 'Paid' : item.status === 'Paid' ? 'Active' : item.status,
              createdAt: item.createdAt ?? new Date().toISOString(),
            }
          }))
          addTransaction({ id: transactionId, title: `Payment toward ${debtTitle(debt)}`, type: 'debt_payment', amount, category: debtTitle(debt), account: account.name, accountId, debtId, date, notes })
          showToast('Debt payment recorded')
        }}
      />}
      </Suspense>
    </AppShell>
  )

  if (!authReady && !designPreview) return <LoadingScreen message="Connecting securely…" />

  if (!financeUserId && !designPreview) {
    return <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  }

  if (!dataReady && !designPreview) return <LoadingScreen message="Loading your private ledger…" />

  if (!onboardingCompleted && !designPreview) {
    return <Routes>
      <Route path="/onboarding" element={<Suspense fallback={<LoadingScreen message="Preparing your journey…" />}><Onboarding email={authEmail} initialName={authDisplayName} initialSettings={journeySettings} onProgress={async (settings) => { await saveJourneySettings(settings, false); setJourneySettings(settings) }} onComplete={async (nextProfile, account, settings) => {
        if (account) await saveAccount(account, account.balance)
        await saveUserSettings(nextProfile, true)
        await saveJourneySettings(settings, true)
        if (account) setAccounts([account])
        setJourneySettings(settings)
        setProfile(nextProfile)
        setProfileState(nextProfile)
        setOnboardingCompleted(true)
        trackEvent('onboarding_completed', { surface: 'onboarding', action: 'complete' })
        navigate('/app', { replace: true })
      }} /></Suspense>} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="*" element={<Navigate replace to="/onboarding" />} />
    </Routes>
  }

  return <Routes>
    <Route path="/privacy" element={<LegalPage kind="privacy" />} />
    <Route path="/terms" element={<LegalPage kind="terms" />} />
    <Route path="/onboarding" element={<Suspense fallback={<LoadingScreen message="Preparing your journey…" />}><Onboarding email={authEmail} initialName={profile.name} initialSettings={{ ...journeySettings, onboardingStep: 0 }} existingAccount={accounts[0]} onCancel={() => navigate('/app')} onProgress={async (settings) => { await saveJourneySettings(settings, true); setJourneySettings(settings) }} onComplete={async (nextProfile, _account, settings) => { await saveUserSettings(nextProfile, true); await saveJourneySettings(settings, true); setProfile(nextProfile); setProfileState(nextProfile); setJourneySettings(settings); navigate('/app', { replace: true }) }} /></Suspense>} />
    <Route path="/app/*" element={ledger} />
    <Route path="*" element={<Navigate replace to="/app" />} />
  </Routes>
}

function LoadingScreen({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--accent)] font-black text-[var(--accent-ink)]">PL</div><p className="mt-4 text-sm font-semibold text-[var(--muted)]" role="status">{message}</p></div></main>
}

export default App

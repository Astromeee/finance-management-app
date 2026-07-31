import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LedgerLoader } from './components/SplashScreen'
import { accounts as initialAccounts, budgets as initialBudgets, debts as initialDebts, expenseCategories as initialExpenseCategories, goals as initialGoals, incomeSources as initialIncomeSources, transactions as initialTransactions, upcomingExpenses as initialUpcomingExpenses } from './data/mockData'
import * as vaultPreview from './data/vaultPreviewData'
import { adjustAccountBalance, archiveAccount, archiveCategory, deleteBudget, deleteDebt, deleteFinanceTransaction, deleteGoal, loadArchivedAccounts, loadFinanceData, markUpcomingExpensePaid, recordFinanceAction, restoreAccount, restoreBudget, saveAccount, saveBudget, saveCategory, saveDebt, saveGoal, saveJourneySettings, saveMoneyQuest, saveMoneyWin, saveUpcomingExpense, saveUserSettings, saveWishlistItem, updateFinanceTransaction } from './lib/financeRepository'
import { addRecurringDate, localDateKey, localMonthKey } from './lib/date'
import { applyAccountOrder } from './lib/accountOrder'
import { setAnalyticsConsent, trackEvent } from './lib/analytics'
import { getProfile, onProfileChange, setProfile, type Profile } from './lib/profile'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { AuthCallback, AuthPage } from './pages/Auth'
import { LegalPage } from './pages/Legal'
import type { Account, Budget, Category, Debt, DebtCategory, DebtStatus, Goal, JourneySettings, MoneyQuest, MoneyWin, RecurringFrequency, Transaction, UpcomingExpense, WishlistItem } from './types/finance'
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
const Categories = lazy(() => import('./pages/Categories').then((module) => ({ default: module.Categories })))
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))
const Transactions = lazy(() => import('./pages/Transactions').then((module) => ({ default: module.Transactions })))
const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })))

type ActionModal = 'income' | 'expense' | 'transfer' | 'cooloff' | 'goal' | 'debt' | 'simulator' | null
type ToastState = { message: string; actionLabel?: string; onAction?: () => void | Promise<void> }

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
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
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
  const [archivedAccounts, setArchivedAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState(designPreview ? vaultPreview.transactions : initialTransactions)
  const [goals, setGoals] = useState<Goal[]>(designPreview ? vaultPreview.goals : initialGoals)
  const [debts, setDebts] = useState<Debt[]>(designPreview ? vaultPreview.debts : initialDebts)
  const [budgets, setBudgets] = useState<Budget[]>(designPreview ? vaultPreview.budgets : initialBudgets)
  const [budgetHistory, setBudgetHistory] = useState<Budget[]>([])
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingExpense[]>(designPreview ? vaultPreview.upcomingExpenses : initialUpcomingExpenses)
  const [categories, setCategories] = useState<Category[]>(() => [...initialIncomeSources, ...initialExpenseCategories])
  const [moneyQuests, setMoneyQuests] = useState<MoneyQuest[]>(designPreview ? vaultPreview.moneyQuests : [])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(designPreview ? vaultPreview.wishlistItems : [])
  const [moneyWins, setMoneyWins] = useState<MoneyWin[]>(designPreview ? vaultPreview.moneyWins : [])
  const [profile, setProfileState] = useState<Profile>(getProfile)
  const expenseCategoryNames = categories.filter((category) => category.kind === 'expense').map((category) => category.name)
  const incomeCategoryNames = categories.filter((category) => category.kind === 'income').map((category) => category.name)
  const expenseCategoryIdFor = useCallback((name?: string) => categories.find((category) => category.kind === 'expense' && category.name === name)?.id, [categories])

  const showToast = useCallback((message: string, action?: { label: string; run: () => void | Promise<void> }) => {
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    setToast({ message, actionLabel: action?.label, onAction: action?.run })
    toastTimer.current = window.setTimeout(() => setToast(null), action ? 8_000 : 2_600)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
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
    const previewQuery = designPreview ? '?vault-preview' : ''
    navigate(`${page === 'dashboard' ? '/app' : `/app/${page}`}${previewQuery}`)
  }, [designPreview, navigate])

  useEffect(() => onProfileChange(setProfileState), [])

  const reconcileActiveQuest = useCallback((nextTransactions: Transaction[]) => {
    const settled = moneyQuests.flatMap((quest) => {
      if (quest.status !== 'active') return []
      const status = resolveQuestStatus(quest, nextTransactions, localDateKey())
      return status ? [{ previous: quest, next: { ...quest, status } }] : []
    })
    if (!settled.length) return
    const byId = new Map(settled.map(({ next }) => [next.id, next]))
    setMoneyQuests((current) => current.map((quest) => byId.get(quest.id) ?? quest))
    settled.forEach(({ previous, next }) => {
      void saveMoneyQuest(next).catch((error) => showToast(error instanceof Error ? error.message : 'Could not update your quest'))
      if (next.status === 'completed') {
        awardMoneyWin({ id: `quest-completed:${previous.id}`, type: 'quest_completed', title: 'Weekly quest completed', detail: previous.title, earnedAt: new Date().toISOString() })
        trackEvent('quest_completed', { surface: 'plan', action: 'complete' })
      } else trackEvent('quest_ended', { surface: 'plan', action: 'expire' })
    })
    showToast(settled.length === 1 ? 'Quest progress updated' : `${settled.length} quests updated`)
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
        const [remoteState, remoteArchivedAccounts] = await Promise.all([loadFinanceData(), loadArchivedAccounts()])
        if (cancelled) return
        setAccounts(applyAccountOrder(remoteState.accounts))
        setArchivedAccounts(remoteArchivedAccounts)
        setTransactions(remoteState.transactions)
        setGoals(remoteState.goals)
        setDebts(remoteState.debts)
        setBudgets(remoteState.budgets)
        setBudgetHistory(remoteState.budgetHistory)
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

  const restoreArchivedAccount = async (account: Account) => {
    if (!designPreview) await restoreAccount(account.id)
    setArchivedAccounts((current) => current.filter((item) => item.id !== account.id))
    setAccounts((current) => current.some((item) => item.id === account.id) ? current : [...current, account])
    showToast(`${account.name} restored`)
  }

  const handleRestoreAccount = async (accountId: string) => {
    const account = archivedAccounts.find((item) => item.id === accountId)
    if (!account) return
    await restoreArchivedAccount(account)
  }

  const handleArchiveAccount = async (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId)
    if (!account) return
    if (!designPreview) await archiveAccount(accountId)
    setAccounts((current) => current.filter((item) => item.id !== accountId))
    setArchivedAccounts((current) => [account, ...current.filter((item) => item.id !== accountId)])
    showToast(`${account.name} archived`, { label: 'Undo', run: () => restoreArchivedAccount(account) })
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
    const normalizedTransaction: Transaction = {
      ...nextTransaction,
      categoryId: nextTransaction.type === 'expense' ? expenseCategoryIdFor(nextTransaction.category) : undefined,
      accountId: nextTransaction.type === 'transfer' ? undefined : nextTransaction.accountId,
      fromAccountId: nextTransaction.type === 'transfer' ? nextTransaction.fromAccountId : undefined,
      toAccountId: nextTransaction.type === 'transfer' ? nextTransaction.toAccountId : undefined,
      goalId: nextTransaction.type === 'goal_saving' ? nextTransaction.goalId : undefined,
      debtId: nextTransaction.type === 'debt_payment' ? nextTransaction.debtId : undefined,
    }
    try {
      if (!designPreview) await updateFinanceTransaction(normalizedTransaction)
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
      if (!designPreview) await deleteFinanceTransaction(transactionId)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete transaction')
      return
    }
    applyTransactionEffect(transaction, -1)
    setTransactions((current) => current.filter((item) => item.id !== transactionId))
    showToast('Transaction deleted', {
      label: 'Undo',
      run: async () => {
        try {
          if (!designPreview) await recordFinanceAction(transaction)
          applyTransactionEffect(transaction, 1)
          setTransactions((current) => current.some((item) => item.id === transaction.id) ? current : [transaction, ...current])
          showToast('Transaction restored')
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Could not restore transaction')
        }
      },
    })
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
    const expense = upcomingExpenses.find((item) => item.id === expenseId)
    if (!expense) return
    const cancelled = { ...expense, status: 'cancelled' as const }
    if (!designPreview) void saveUpcomingExpense(cancelled).catch((error) => showToast(error.message))
    setUpcomingExpenses((current) => current.map((item) => item.id === expenseId ? cancelled : item))
    showToast('Bill moved to history', {
      label: 'Undo',
      run: async () => {
        try {
          if (!designPreview) await saveUpcomingExpense(expense)
          setUpcomingExpenses((current) => current.map((item) => item.id === expense.id ? expense : item))
          showToast('Upcoming bill restored')
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Could not restore the bill')
        }
      },
    })
  }

  const savePlanBudget = (budget: Budget) => {
    const next = { ...budget, archived: false, periodMonth: budget.periodMonth ?? `${localMonthKey()}-01` }
    setBudgets((current) => [next, ...current.filter((item) => item.id !== next.id)])
    setBudgetHistory((current) => current.filter((item) => item.id !== next.id))
    if (!designPreview) void saveBudget(next).catch((error) => showToast(error.message))
    showToast(`${next.category} limit saved`)
  }

  const restorePlanBudget = async (budget: Budget) => {
    const currentMonth = `${localMonthKey()}-01`
    const restoringPastMonth = budget.periodMonth?.slice(0, 7) !== localMonthKey()
    const restored: Budget = restoringPastMonth
      ? { ...budget, id: makeId(), used: 0, periodMonth: currentMonth, archived: false, createdAt: new Date().toISOString() }
      : { ...budget, archived: false }
    if (!designPreview) {
      if (restoringPastMonth) await saveBudget(restored)
      else await restoreBudget(restored.id)
    }
    setBudgetHistory((current) => restoringPastMonth ? current : current.filter((item) => item.id !== budget.id))
    setBudgets((current) => current.some((item) => item.categoryId === restored.categoryId || item.category === restored.category) ? current : [restored, ...current])
    showToast(`${restored.category} limit restored`)
  }

  const archivePlanBudget = (budget: Budget) => {
    const archived = { ...budget, archived: true, updatedAt: new Date().toISOString() }
    setBudgets((current) => current.filter((item) => item.id !== budget.id))
    setBudgetHistory((current) => [archived, ...current.filter((item) => item.id !== budget.id)])
    if (!designPreview) void deleteBudget(budget.id).catch((error) => showToast(error.message))
    showToast(`${budget.category} limit archived`, { label: 'Undo', run: () => restorePlanBudget(archived) })
  }

  const copyLastMonthBudgets = () => {
    const candidates = budgetHistory.filter((budget) => !budget.archived)
    const latestMonth = candidates.map((budget) => budget.periodMonth?.slice(0, 7) ?? '').sort().at(-1)
    const copies = candidates.filter((budget) => budget.periodMonth?.startsWith(latestMonth ?? '') && !budgets.some((current) => current.categoryId ? current.categoryId === budget.categoryId : current.category === budget.category)).map((budget) => ({ ...budget, id: makeId(), used: 0, archived: false, periodMonth: `${localMonthKey()}-01`, createdAt: new Date().toISOString(), updatedAt: undefined }))
    if (!copies.length) { showToast('No limits are available to copy'); return }
    setBudgets((current) => [...copies, ...current])
    if (!designPreview) copies.forEach((budget) => { void saveBudget(budget).catch((error) => showToast(error.message)) })
    showToast(`${copies.length} ${copies.length === 1 ? 'limit' : 'limits'} copied`)
  }

  const removeGoal = (goalId: string) => {
    const goal = goals.find((item) => item.id === goalId)
    if (!goal) return
    setGoals((current) => current.filter((item) => item.id !== goalId))
    if (!designPreview) void deleteGoal(goalId).catch((error) => showToast(error.message))
    showToast('Goal deleted', {
      label: 'Undo',
      run: async () => {
        try {
          if (!designPreview) await saveGoal(goal)
          setGoals((current) => current.some((item) => item.id === goal.id) ? current : [goal, ...current])
          showToast('Goal restored')
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Could not restore the goal')
        }
      },
    })
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
    dashboard: { title: 'Home', subtitle: 'Your payday journey', component: <Dashboard accounts={accountsWithSavings} transactions={transactions} goals={goals} debts={debts} budgets={budgets} upcomingExpenses={upcomingExpenses} categories={categories} journeySettings={journeySettings} wishlistItems={wishlistItems} onAction={setActiveModal} onNavigate={setActivePage} onPlanPurchase={() => { setActiveModal('simulator'); trackEvent('simulator_opened', { surface: 'home' }) }} onSetupJourney={() => navigate('/onboarding')} onTourComplete={() => { const next = { ...journeySettings, tourCompleted: true }; setJourneySettings(next); void saveJourneySettings(next, true) }} /> },
    transactions: { title: 'Transactions', subtitle: 'Track income, spending, and transfers', component: <Transactions transactions={transactions} accounts={accountsWithSavings} expenseCategories={expenseCategoryNames} incomeCategories={incomeCategoryNames} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} /> },
    accounts: {
      title: 'Accounts',
      subtitle: 'Manage cash, banks, and wallets',
      component: <Accounts accounts={accounts} archivedAccounts={archivedAccounts} transactions={transactions} setAccounts={setAccounts} setTransactions={setTransactions} onTransfer={() => setActiveModal('transfer')} onOpenTransactions={() => setActivePage('transactions')} onSaveAccount={designPreview ? undefined : saveAccount} onAdjustBalance={designPreview ? undefined : async (account, transaction) => { await adjustAccountBalance(account, transaction) }} onArchiveAccount={handleArchiveAccount} onRestoreAccount={handleRestoreAccount} />,
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
          onDeleteGoal={removeGoal}
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
            removeUpcoming(expenseId)
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
        budgetHistory={budgetHistory}
        upcomingExpenses={upcomingExpenses}
        accounts={accounts}
        categories={categories}
        goals={goals}
        transactions={transactions}
        wishlistItems={wishlistItems}
        moneyQuests={moneyQuests}
        onSaveBudget={savePlanBudget}
        onArchiveBudget={archivePlanBudget}
        onRestoreBudget={(budget) => { void restorePlanBudget(budget).catch((error) => showToast(error.message)) }}
        onCopyLastMonthBudgets={copyLastMonthBudgets}
        onAddUpcoming={addUpcoming}
        onUpdateUpcoming={updateUpcoming}
        onCancelUpcoming={(expense) => removeUpcoming(expense.id)}
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
        onRemoveWishlist={(item) => {
          const removed = { ...item, status: 'removed' as const }
          if (!designPreview) void saveWishlistItem(removed).catch((error) => showToast(error.message))
          setWishlistItems((current) => current.map((entry) => entry.id === item.id ? removed : entry))
          showToast('Item moved to history', { label: 'Undo', run: async () => {
            if (!designPreview) await saveWishlistItem(item)
            setWishlistItems((current) => current.map((entry) => entry.id === item.id ? item : entry))
            showToast('Cool-off item restored')
          } })
        }}
        onBuyWishlist={(item) => {
          setExpenseDraft({ amount: item.amount, category: categories.find((category) => category.id === item.categoryId)?.name ?? 'Miscellaneous', wishlistId: item.id })
          setActiveModal('expense')
          trackEvent('wishlist_decision', { surface: 'plan', action: 'buy' })
        }}
        onSaveQuest={(quest) => {
          if (quest.status === 'active' && moneyQuests.filter((item) => item.status === 'active' && item.id !== quest.id).length >= 3) { showToast('Finish a quest before starting another'); return }
          void saveMoneyQuest(quest).catch((error) => showToast(error.message))
          setMoneyQuests((current) => [quest, ...current.filter((item) => item.id !== quest.id)])
          showToast('Quest started')
        }}
        onEndQuest={(quest) => {
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
    categories: { title: 'Categories', subtitle: 'Manage your categories', component: <Categories categories={categories} transactions={transactions} onNavigate={setActivePage} onSaveCategory={async (category) => { if (!designPreview) await saveCategory(category); setCategories((current) => [...current.filter((item) => item.id !== category.id), category]) }} onArchiveCategory={async (id) => { if (!designPreview) await archiveCategory(id); setCategories((current) => current.filter((item) => item.id !== id)) }} /> },
    settings: { title: 'Settings', subtitle: 'Preferences and data tools', component: <Settings accounts={accounts} authEmail={authEmail} authProvider={authProvider} budgets={budgets} categories={categories} debts={debts} expenseCategories={expenseCategoryNames} goals={goals} incomeCategories={incomeCategoryNames} profile={profile} transactions={transactions} upcomingExpenses={upcomingExpenses} journeySettings={journeySettings} analyticsConsent={journeySettings.analyticsConsent} onAnalyticsConsentChange={(analyticsConsent) => { const next = { ...journeySettings, analyticsConsent }; setJourneySettings(next); void saveJourneySettings(next, true) }} onNavigate={setActivePage} onRestartTour={() => navigate('/onboarding')} onProfileChange={(next) => { setProfile(next); setProfileState(next); void saveUserSettings(next, true) }} onSaveCategory={async (category) => { if (!designPreview) await saveCategory(category); setCategories((current) => [...current.filter((item) => item.id !== category.id), category]) }} onArchiveCategory={async (id) => { if (!designPreview) await archiveCategory(id); setCategories((current) => current.filter((item) => item.id !== id)) }} onSaveBudget={async (budget) => { await saveBudget(budget); setBudgets((current) => [...current.filter((item) => item.id !== budget.id), budget]) }} onDeleteBudget={async (id) => { await deleteBudget(id); setBudgets((current) => current.filter((item) => item.id !== id)) }} onSignOut={() => supabase?.auth.signOut()} /> },
    profile: { title: 'Profile', subtitle: 'Your name and photo', component: <ProfilePage onBack={() => setActivePage('dashboard')} /> },
  }

  const ledger = (
    <AppShell
      activePage={activePage}
      setActivePage={setActivePage}
      onAdd={(action) => { setExpenseDraft(undefined); setActiveModal(action) }}
      onSignOut={() => { void supabase?.auth.signOut() }}
      onRecordEntry={({ direction, amount, category, accountId, date, notes }) => {
        const account = accountsWithSavings.find((item) => item.id === accountId)
        if (!account || amount <= 0) return
        const transaction: Transaction = {
          id: makeId(),
          title: category,
          type: direction,
          amount,
          category,
          categoryId: direction === 'expense' ? expenseCategoryIdFor(category) : undefined,
          source: direction === 'income' ? category : undefined,
          account: account.name,
          accountId,
          date,
          notes,
        }
        updateAccountBalance(accountId, direction === 'income' ? amount : -amount)
        if (direction === 'expense') setBudgets((current) => current.map((budget) => budget.category === category ? { ...budget, used: budget.used + amount } : budget))
        addTransaction(transaction)
        if (!designPreview) void recordFinanceAction(transaction).catch((error) => showToast(error.message))
        showToast(direction === 'income' ? 'Income added' : 'Expense recorded')
      }}
      onMoveMoney={({ amount, fromAccountId, toAccountId, date, notes }) => {
        const from = accountsWithSavings.find((item) => item.id === fromAccountId)
        const to = accountsWithSavings.find((item) => item.id === toAccountId)
        if (!from || !to || fromAccountId === toAccountId || amount <= 0 || from.balance < amount) return
        const transaction: Transaction = { id: makeId(), title: 'Transfer', type: 'transfer', amount, category: 'Transfer', account: `${from.name} to ${to.name}`, fromAccountId, toAccountId, date, notes }
        updateAccountBalance(fromAccountId, -amount)
        updateAccountBalance(toAccountId, amount)
        addTransaction(transaction)
        if (!designPreview) void recordFinanceAction(transaction).catch((error) => showToast(error.message))
        showToast('Transfer completed')
      }}
      onCreateGoal={({ name, target, dueDate, notes }) => {
        const goal: Goal = { id: makeId(), name, target, saved: 0, dueDate, notes, status: 'Active' }
        setGoals((current) => [goal, ...current])
        if (!designPreview) void saveGoal(goal).catch((error) => showToast(error.message))
        showToast('Goal created')
      }}
      onCreateWishlistItem={({ name, amount, categoryId }) => {
        const createdAt = new Date().toISOString()
        const item: WishlistItem = { id: makeId(), name, amount, categoryId, reconsiderAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), status: 'waiting', createdAt }
        setWishlistItems((current) => [item, ...current])
        if (!designPreview) void saveWishlistItem(item).catch((error) => showToast(error.message))
        showToast('Added to your 48-hour cool-off')
      }}
      onCreateAccount={({ name, type, balance }) => {
        const account: Account = {
          id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account'}-${Date.now().toString(36)}`,
          name,
          type,
          balance,
          color: type === 'wallet' ? '#E2703A' : type === 'cash' ? '#7C8A6B' : '#2B241D',
          activity: '',
          cardLabel: name.slice(0, 5).toUpperCase(),
          includeInSafeSpend: true,
        }
        setAccounts((current) => [account, ...current])
        if (!designPreview) void saveAccount(account, balance).catch((error) => showToast(error.message))
        showToast(`${name} added`)
      }}
      onAddFunds={({ goalId, accountId, amount }) => {
        const goal = goals.find((item) => item.id === goalId)
        const account = accountsWithSavings.find((item) => item.id === accountId)
        if (!goal || !account || amount <= 0) return
        if (account.balance < amount) { showToast(`${account.name} does not have enough money`); return }
        const transaction: Transaction = { id: makeId(), title: 'Goal Saving', type: 'goal_saving', amount, category: goal.name, account: account.name, accountId, goalId, date: localDateKey() }
        setAccounts((current) => current.map((item) => item.id === accountId ? { ...item, balance: item.balance - amount } : item))
        setGoals((current) => current.map((item) => item.id === goalId ? { ...item, saved: Math.min(item.target, item.saved + amount), status: item.saved + amount >= item.target ? 'Completed' : item.status } : item))
        setTransactions((current) => [transaction, ...current])
        if (!designPreview) void recordFinanceAction(transaction).catch((error) => showToast(error.message))
        showToast(`Rs ${amount.toLocaleString('en-PK')} added to ${goal.name}`)
      }}
      onCreateBudget={({ category, amount }) => {
        const existing = budgets.find((budget) => budget.category === category)
        const budget: Budget = existing ? { ...existing, amount } : { id: makeId(), category, amount, used: 0, categoryId: categories.find((item) => item.kind === 'expense' && item.name === category)?.id }
        savePlanBudget(budget)
      }}
      onSaveBudget={savePlanBudget}
      onArchiveBudget={archivePlanBudget}
      onRestoreBudget={(budget) => { void restorePlanBudget(budget).catch((error) => showToast(error.message)) }}
      onCopyLastMonthBudgets={copyLastMonthBudgets}
      onUpdateTransaction={(transaction) => { void updateTransaction(transaction) }}
      onDeleteTransaction={(transactionId) => { void deleteTransaction(transactionId) }}
      onUpdateAccount={(account) => {
        setAccounts((current) => current.map((item) => item.id === account.id ? account : item))
        if (!designPreview) void saveAccount(account).catch((error) => showToast(error.message))
        showToast('Account updated')
      }}
      onArchiveAccount={(accountId) => { void handleArchiveAccount(accountId).catch((error) => showToast(error.message)) }}
      onRestoreAccount={(accountId) => { void handleRestoreAccount(accountId).catch((error) => showToast(error.message)) }}
      onUpdateGoal={(goalId, payload) => {
        const goal = goals.find((item) => item.id === goalId)
        if (!goal) return
        const next = { ...goal, ...payload }
        setGoals((current) => current.map((item) => item.id === goalId ? next : item))
        if (!designPreview) void saveGoal(next).catch((error) => showToast(error.message))
        showToast('Goal updated')
      }}
      onDeleteGoal={removeGoal}
      onCreateDebt={(payload) => {
        const debt = createDebt(payload)
        setDebts((current) => [debt, ...current])
        if (!designPreview) void saveDebt(debt).catch((error) => showToast(error.message))
        showToast('Debt added')
      }}
      onUpdateDebt={(debtId, payload) => {
        const debt = debts.find((item) => item.id === debtId)
        if (!debt) return
        const next = updateDebtFromPayload(debt, payload)
        setDebts((current) => current.map((item) => item.id === debtId ? next : item))
        if (!designPreview) void saveDebt(next).catch((error) => showToast(error.message))
        showToast('Debt updated')
      }}
      onDeleteDebt={(debtId) => {
        setDebts((current) => current.filter((item) => item.id !== debtId))
        if (!designPreview) void deleteDebt(debtId).catch((error) => showToast(error.message))
        showToast('Debt deleted')
      }}
      onPayDebt={({ debtId, amount, accountId, date, notes }) => {
        const debt = debts.find((item) => item.id === debtId)
        const account = accountsWithSavings.find((item) => item.id === accountId)
        if (!debt || !account || amount <= 0 || amount > account.balance) return
        const transaction: Transaction = { id: makeId(), title: `Payment toward ${debtTitle(debt)}`, type: 'debt_payment', amount, category: debtTitle(debt), account: account.name, accountId, debtId, date, notes }
        updateAccountBalance(accountId, -amount)
        setDebts((current) => current.map((item) => {
          if (item.id !== debtId) return item
          const totalAmount = debtTotal(item)
          const nextPaid = Math.min(totalAmount, debtPaid(item) + amount)
          return { ...item, paidAmount: nextPaid, paid: nextPaid, status: nextPaid >= totalAmount ? 'Paid' : item.status === 'Paid' ? 'Active' : item.status }
        }))
        addTransaction(transaction)
        if (!designPreview) void recordFinanceAction(transaction).catch((error) => showToast(error.message))
        showToast('Debt payment recorded')
      }}
      onCreateUpcoming={addUpcoming}
      onUpdateUpcoming={updateUpcoming}
      onDeleteUpcoming={removeUpcoming}
      onPayUpcoming={(expense, payload) => { void payUpcoming(expense, payload) }}
      onUpdateWishlist={(item) => {
        setWishlistItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
        if (!designPreview) void saveWishlistItem(item).catch((error) => showToast(error.message))
        showToast(item.status === 'skipped' ? 'Item skipped' : 'Decision updated')
      }}
      onDeleteWishlist={(itemId) => {
        const item = wishlistItems.find((entry) => entry.id === itemId)
        if (!item) return
        const removed = { ...item, status: 'removed' as const }
        setWishlistItems((current) => current.map((entry) => entry.id === itemId ? removed : entry))
        if (!designPreview) void saveWishlistItem(removed).catch((error) => showToast(error.message))
        showToast('Item moved to history', { label: 'Undo', run: async () => {
          if (!designPreview) await saveWishlistItem(item)
          setWishlistItems((current) => current.map((entry) => entry.id === itemId ? item : entry))
        } })
      }}
      onBuyWishlist={(item) => {
        setExpenseDraft({ amount: item.amount, category: categories.find((category) => category.id === item.categoryId)?.name ?? 'Miscellaneous', wishlistId: item.id })
        setActiveModal('expense')
      }}
      onSaveQuest={(quest) => {
        if (quest.status === 'active' && moneyQuests.filter((item) => item.status === 'active' && item.id !== quest.id).length >= 3) { showToast('Finish a quest before starting another'); return }
        setMoneyQuests((current) => [quest, ...current.filter((item) => item.id !== quest.id)])
        if (!designPreview) void saveMoneyQuest(quest).catch((error) => showToast(error.message))
        showToast('Quest started')
      }}
      onCancelQuest={(quest) => {
        const next = { ...quest, status: 'cancelled' as const }
        setMoneyQuests((current) => current.map((item) => item.id === quest.id ? next : item))
        if (!designPreview) void saveMoneyQuest(next).catch((error) => showToast(error.message))
        showToast('Quest ended')
      }}
      onSaveCategory={(category) => {
        setCategories((current) => [...current.filter((item) => item.id !== category.id), category])
        if (!designPreview) void saveCategory(category).catch((error) => showToast(error.message))
        showToast('Category saved')
      }}
      onArchiveCategory={(categoryId) => {
        setCategories((current) => current.filter((item) => item.id !== categoryId))
        if (!designPreview) void archiveCategory(categoryId).catch((error) => showToast(error.message))
        showToast('Category archived')
      }}
      onRestartJourney={() => navigate('/onboarding')}
      onUpdateProfile={(nextProfile) => {
        setProfile(nextProfile)
        setProfileState(nextProfile)
        if (!designPreview) void saveUserSettings(nextProfile, true).catch((error) => showToast(error.message))
        showToast('Profile updated')
      }}
      onAnalyticsConsentChange={(analyticsConsent) => {
        const nextSettings = { ...journeySettings, analyticsConsent }
        setJourneySettings(nextSettings)
        if (!designPreview) void saveJourneySettings(nextSettings, true).catch((error) => showToast(error.message))
      }}
      desktopData={{
        accounts: accountsWithSavings,
        archivedAccounts,
        budgets,
        budgetHistory,
        categories,
        debts,
        goals,
        journeySettings,
        moneyQuests,
        profile,
        authEmail,
        transactions,
        upcomingExpenses,
        wishlistItems,
      }}
    >
      {toast && <div aria-live="polite" className="pl-action-toast fixed left-1/2 top-4 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[rgba(226,112,58,.32)] bg-[var(--espresso)] px-4 py-2.5 text-sm font-semibold text-[var(--bone-text)] shadow-2xl shadow-black/25" role="status"><span>{toast.message}</span>{toast.onAction && <button className="rounded-full bg-[var(--clay)] px-3 py-1.5 text-xs font-extrabold text-[var(--espresso)]" type="button" onClick={() => { const action = toast.onAction; setToast(null); if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current); void action?.() }}>{toast.actionLabel}</button>}</div>}
      <div className="mobile-page-content"><Suspense fallback={<LedgerLoader label="Loading screen" />}>{(pages[activePage] ?? pages.dashboard).component}</Suspense></div>
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
  return <LedgerLoader label={message} />
}

export default App

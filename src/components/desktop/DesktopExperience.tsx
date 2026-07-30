import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  House,
  Landmark,
  List,
  LockKeyhole,
  Pencil,
  PieChart,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Account, AccountType, Budget, Category, Debt, Goal, JourneySettings, MoneyQuest, Transaction, UpcomingExpense, WishlistItem } from '../../types/finance'
import type { Profile } from '../../lib/profile'
import { exportTransactionsCsv } from '../../lib/exports'
import { calculateSafeSpend, detectMoneyLeak } from '../../utils/journeyCalculations'

type DesktopPage = 'dashboard' | 'transactions' | 'accounts' | 'reports' | 'goals' | 'budgets' | 'settings' | 'categories'
type ModalKind = 'record' | 'entry' | 'move' | 'account' | 'accountManage' | 'category' | 'cooloff' | 'wishlist' | 'funds' | 'goal' | 'goalManage' | 'debt' | 'debtManage' | 'debtPayment' | 'plan' | 'billManage' | 'billPayment' | 'quest' | 'profile' | 'search' | 'notifications'
type OpenModal = (kind: ModalKind, targetId?: string) => void
type PeriodKey = 'cycle' | '30d' | 'all'
type LedgerFilter = 'all' | 'spent' | 'received' | 'moved'
type GoalPayload = { name: string; target: number; saved: number; dueDate?: string; linkedAccountId?: string; notes?: string; status: Goal['status'] }
type DebtPayload = Pick<Debt, 'title' | 'personOrCompany' | 'totalAmount' | 'paidAmount' | 'dueDate' | 'category' | 'status' | 'notes'>
type UpcomingPayload = Omit<UpcomingExpense, 'id' | 'status' | 'createdAt' | 'paidTransactionId'>

export interface DesktopExperienceProps {
  activePage: string
  setActivePage: (page: string) => void
  data: DesktopFinanceData
  onSignOut: () => void
  onRecordEntry: (payload: { direction: 'expense' | 'income'; amount: number; category: string; accountId: string; date: string; notes?: string }) => void
  onMoveMoney: (payload: { amount: number; fromAccountId: string; toAccountId: string; date: string; notes?: string }) => void
  onCreateGoal: (payload: { name: string; target: number; dueDate?: string; notes?: string }) => void
  onCreateWishlistItem: (payload: { name: string; amount: number; categoryId?: string }) => void
  onCreateAccount: (payload: { name: string; type: AccountType; balance: number }) => void
  onAddFunds: (payload: { goalId: string; accountId: string; amount: number }) => void
  onCreateBudget: (payload: { category: string; amount: number }) => void
  onUpdateTransaction: (transaction: Transaction) => void
  onDeleteTransaction: (transactionId: string) => void
  onUpdateAccount: (account: Account) => void
  onArchiveAccount: (accountId: string) => void
  onUpdateGoal: (goalId: string, payload: GoalPayload) => void
  onDeleteGoal: (goalId: string) => void
  onCreateDebt: (payload: DebtPayload) => void
  onUpdateDebt: (debtId: string, payload: DebtPayload) => void
  onDeleteDebt: (debtId: string) => void
  onPayDebt: (payload: { debtId: string; amount: number; accountId: string; date: string; notes?: string }) => void
  onCreateUpcoming: (payload: UpcomingPayload) => void
  onUpdateUpcoming: (expenseId: string, payload: UpcomingPayload) => void
  onDeleteUpcoming: (expenseId: string) => void
  onPayUpcoming: (expense: UpcomingExpense, payload: { accountId: string; paymentDate: string; notes?: string }) => void
  onUpdateWishlist: (item: WishlistItem) => void
  onDeleteWishlist: (itemId: string) => void
  onBuyWishlist: (item: WishlistItem) => void
  onSaveQuest: (quest: MoneyQuest) => void
  onCancelQuest: (quest: MoneyQuest) => void
  onSaveCategory: (category: Category) => void
  onArchiveCategory: (categoryId: string) => void
  onRestartJourney: () => void
  onUpdateProfile: (profile: Profile) => void
  onAnalyticsConsentChange: (granted: boolean) => void
}

export interface DesktopFinanceData {
  accounts: Account[]
  budgets: Budget[]
  categories: Category[]
  debts: Debt[]
  goals: Goal[]
  journeySettings: JourneySettings
  moneyQuest?: MoneyQuest
  profile: Profile
  authEmail?: string
  transactions: Transaction[]
  upcomingExpenses: UpcomingExpense[]
  wishlistItems: WishlistItem[]
}

const DesktopDataContext = createContext<DesktopFinanceData | null>(null)

function useDesktopData() {
  const data = useContext(DesktopDataContext)
  if (!data) throw new Error('Desktop finance data is unavailable')
  return data
}

const nf = (value: number) => Math.round(value).toLocaleString('en-PK')
const totalOf = (accounts: Account[]) => accounts.reduce((sum, account) => sum + account.balance, 0)
const transactionCategory = (transaction: Transaction) => transaction.category ?? transaction.source ?? transaction.title
const transactionSign = (transaction: Transaction) => transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '−'
const transactionTone = (transaction: Transaction) => transaction.type === 'income' ? 'income' : transaction.type === 'transfer' ? 'moved' : 'spent'
const debtTitle = (debt: Debt) => debt.title || debt.name || 'Debt'
const debtTotal = (debt: Debt) => debt.totalAmount ?? debt.total ?? 0
const debtPaid = (debt: Debt) => debt.paidAmount ?? debt.paid ?? 0

function categoryTotals(transactions: Transaction[]) {
  const totals = new Map<string, number>()
  for (const item of transactions.filter((transaction) => transaction.type === 'expense')) {
    const name = transactionCategory(item)
    totals.set(name, (totals.get(name) ?? 0) + item.amount)
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])
}

function sortedTransactions(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function periodTransactions(data: DesktopFinanceData, period: PeriodKey) {
  if (period === 'all') return data.transactions
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 29)
  if (period === 'cycle') {
    const safe = calculateSafeSpend({ accounts: data.accounts, budgets: data.budgets, categories: data.categories, upcomingExpenses: data.upcomingExpenses, settings: data.journeySettings })
    if (safe.cycle) return data.transactions.filter((item) => item.date >= safe.cycle!.startDate && item.date <= safe.cycle!.endDate)
  }
  return data.transactions.filter((item) => item.date >= localDateKey(start) && item.date <= localDateKey(today))
}

function dailyChartData(transactions: Transaction[]) {
  const totals = new Map<string, { spending: number; income: number }>()
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' && transaction.type !== 'income') continue
    const day = totals.get(transaction.date) ?? { spending: 0, income: 0 }
    if (transaction.type === 'expense') day.spending += transaction.amount
    else day.income += transaction.amount
    totals.set(transaction.date, day)
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, values]) => ({
    date: new Date(`${date}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
    ...values,
  }))
}

function monthlySpendingChartData(transactions: Transaction[]) {
  const latestExpense = sortedTransactions(transactions).find((transaction) => transaction.type === 'expense')
  const monthKey = latestExpense?.date.slice(0, 7) ?? localDateKey().slice(0, 7)
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const totals = new Map<number, number>()

  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !transaction.date.startsWith(monthKey)) continue
    const day = Number(transaction.date.slice(8, 10))
    totals.set(day, (totals.get(day) ?? 0) + transaction.amount)
  }

  return {
    label: new Date(year, month - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }),
    total: [...totals.values()].reduce((sum, amount) => sum + amount, 0),
    days: Array.from({ length: daysInMonth }, (_, index) => ({
      day: index + 1,
      spending: totals.get(index + 1) ?? 0,
    })),
  }
}

const nav = [
  { id: 'dashboard', label: 'Home', icon: House },
  { id: 'transactions', label: 'Ledger', icon: List },
  { id: 'accounts', label: 'Wallet', icon: CreditCard },
  { id: 'reports', label: 'Insights', icon: PieChart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'budgets', label: 'Plan', icon: Check },
] as const

const titles: Record<DesktopPage, { eyebrow: string; first: string; accent: string }> = {
  dashboard: { eyebrow: 'Wed · 23 July', first: 'Good evening,', accent: 'Moeed.' },
  transactions: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'ledger.' },
  accounts: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'wallet.' },
  reports: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'insights.' },
  goals: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'paths.' },
  budgets: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'plan.' },
  settings: { eyebrow: 'Account', first: 'Your', accent: 'settings.' },
  categories: { eyebrow: 'Settings · Categories', first: 'Your', accent: 'categories.' },
}

function Money({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <span className={accent ? 'd-money d-accent' : 'd-money'}>{children}</span>
}

function Button({ children, kind = 'primary', onClick, disabled = false }: { children: ReactNode; kind?: 'primary' | 'secondary' | 'quiet'; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" className={`d-button is-${kind}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`d-card ${className}`}>{children}</section>
}

function Label({ children }: { children: ReactNode }) {
  return <p className="d-label">{children}</p>
}

function CategoryBars({ includeBills = false }: { includeBills?: boolean }) {
  const { transactions } = useDesktopData()
  const totals = categoryTotals(transactions)
  const maximum = totals[0]?.[1] ?? 1
  const tones = ['clay', 'sage', 'blue', 'sand'] as const
  const limit = includeBills ? 4 : 3
  const items = totals.slice(0, limit)
  return <div className="d-bars">{items.map(([name, value], index) => (
    <div className="d-bar" key={name}>
      <div><strong>{name}</strong><Money>{nf(value)}</Money></div>
      <span><i className={`is-${tones[index]}`} style={{ width: `${Math.max(5, Math.round((value / maximum) * 100))}%` }} /></span>
    </div>
  ))}{items.length === 0 && <p className="d-empty">No spending recorded yet.</p>}</div>
}

function Rail({ activePage, setActivePage }: Pick<DesktopExperienceProps, 'activePage' | 'setActivePage'>) {
  const { accounts, budgets, profile, transactions } = useDesktopData()
  const isSettings = activePage === 'settings' || activePage === 'categories'
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.used, 0)
  const underBudget = Math.max(0, totalBudget - totalUsed)
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'P'
  return <aside className={`d-rail ${isSettings ? 'is-settings' : ''}`}>
    <div className="d-brand">
      <img className="d-brand-mark" src="/pocket-ledger-icon.png" alt="Pocket Ledger" />
      <div><p>Pocket Ledger</p><small>Personal</small></div>
    </div>
    <nav aria-label="Desktop primary navigation">
      {nav.map(({ id, label, icon: Icon }) => <button
        type="button"
        key={id}
        className={activePage === id ? 'is-active' : ''}
        onClick={() => setActivePage(id)}
      ><Icon size={18} /><span>{label}</span>{activePage === id && <i />}</button>)}
    </nav>
    <div className="d-context">
      <Label>{isSettings ? 'Version' : activePage === 'accounts' ? 'Linked' : activePage === 'transactions' ? 'This cycle' : 'Cycle 4 · July'}</Label>
      <p>{isSettings ? <>Pocket Ledger <strong>2.4.0</strong> · up to date.</> : activePage === 'accounts' ? <><strong>{accounts.length}</strong> accounts linked.</> : activePage === 'transactions' ? <><strong>{transactions.length}</strong> entries in your ledger.</> : <>You have <strong>Rs {nf(underBudget)}</strong> left in your current plan.</>}</p>
    </div>
    <button type="button" className={`d-profile ${isSettings ? 'is-active' : ''}`} onClick={() => setActivePage('settings')}>
      <span>{profile.avatar ? <img src={profile.avatar} alt="" /> : initial}</span><div><strong>{profile.name}</strong><small>{isSettings ? 'Settings open' : 'Settings'}</small></div>{isSettings ? <i /> : <ChevronRight size={16} />}
    </button>
  </aside>
}

const periodLabels: Record<PeriodKey, string> = { cycle: 'This cycle', '30d': 'Last 30 days', all: 'All time' }

function Topbar({ page, openModal, setActivePage, period, setPeriod, accountFilter, setAccountFilter }: { page: DesktopPage; openModal: OpenModal; setActivePage: (page: string) => void; period: PeriodKey; setPeriod: (period: PeriodKey) => void; accountFilter: string; setAccountFilter: (accountId: string) => void }) {
  const { accounts, profile } = useDesktopData()
  const [periodOpen, setPeriodOpen] = useState(false)
  const heading = titles[page]
  const isSettings = page === 'settings' || page === 'categories'
  const hasPeriod = page === 'transactions' || page === 'reports'
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there'
  return <header className="d-topbar">
    <div><Label>{heading.eyebrow}</Label><h1>{heading.first}{page === 'dashboard' && <br />} <em>{page === 'dashboard' ? `${firstName}.` : heading.accent}</em></h1></div>
    <div className="d-top-actions">
      {!isSettings && <button type="button" className="d-search" onClick={() => openModal('search')}><Search size={16} /><span>{page === 'dashboard' ? 'Search transactions' : 'Search entries'}</span></button>}
      {page === 'dashboard' && <button type="button" className="d-icon-button" aria-label="Notifications" onClick={() => openModal('notifications')}><Bell size={17} /></button>}
      {hasPeriod && <div className="d-filter-wrap"><button type="button" className="d-filter" aria-expanded={periodOpen} aria-haspopup="menu" onClick={() => setPeriodOpen((value) => !value)}>{page === 'transactions' && <CalendarDays size={16} />}{periodLabels[period]}<ChevronDown size={14} /></button>{periodOpen && <div className="d-filter-menu" role="menu">{(Object.keys(periodLabels) as PeriodKey[]).map((key) => <button type="button" role="menuitemradio" aria-checked={period === key} className={period === key ? 'is-active' : ''} key={key} onClick={() => { setPeriod(key); setPeriodOpen(false) }}>{periodLabels[key]}{period === key && <Check size={14}/>}</button>)}</div>}</div>}
      {page === 'accounts' && <div className="d-filter-wrap"><button type="button" className="d-filter" aria-expanded={periodOpen} aria-haspopup="menu" onClick={() => setPeriodOpen((value) => !value)}><SlidersHorizontal size={16}/>{accountFilter === 'all' ? 'All accounts' : accounts.find((account) => account.id === accountFilter)?.name ?? 'All accounts'}<ChevronDown size={14}/></button>{periodOpen && <div className="d-filter-menu" role="menu"><button type="button" role="menuitemradio" aria-checked={accountFilter === 'all'} className={accountFilter === 'all' ? 'is-active' : ''} onClick={() => { setAccountFilter('all'); setPeriodOpen(false) }}>All accounts{accountFilter === 'all' && <Check size={14}/>}</button>{accounts.map((account) => <button type="button" role="menuitemradio" aria-checked={accountFilter === account.id} className={accountFilter === account.id ? 'is-active' : ''} key={account.id} onClick={() => { setAccountFilter(account.id); setPeriodOpen(false) }}>{account.name}{accountFilter === account.id && <Check size={14}/>}</button>)}</div>}</div>}
      {page === 'goals' && <Button onClick={() => openModal('goal')}><Plus size={17} />New goal</Button>}
      {page === 'budgets' && <Button onClick={() => openModal('plan')}><Plus size={17} />Add to plan</Button>}
      {(page === 'dashboard' || page === 'transactions' || page === 'reports') && <Button onClick={() => openModal('record')}><Plus size={17} />Record</Button>}
      {isSettings && <Button kind="secondary" onClick={() => setActivePage(page === 'categories' ? 'settings' : 'dashboard')}><X size={16} />{page === 'categories' ? 'Back to settings' : 'Close'}</Button>}
    </div>
  </header>
}

function HomePage({ setActivePage }: { setActivePage: (page: string) => void }) {
  const { accounts, budgets, categories: financeCategories, journeySettings, moneyQuest, transactions, upcomingExpenses } = useDesktopData()
  const balance = totalOf(accounts)
  const safe = calculateSafeSpend({ accounts, budgets, categories: financeCategories, upcomingExpenses, settings: journeySettings })
  const accountTotal = Math.max(1, accounts.reduce((sum, account) => sum + Math.max(0, account.balance), 0))
  const leak = detectMoneyLeak(transactions)
  const accountTones = ['clay', 'gold', 'sage']
  const questTarget = moneyQuest?.targetCount ?? 3
  const questTitle = moneyQuest?.title ?? 'No active quest'
  return <div className="d-columns">
    <div className="d-work d-home-work">
      <section className="d-hero d-balance-hero">
        <div><Label>● &nbsp; Total balance</Label><p className="d-hero-number"><small>Rs</small> {nf(balance)}</p><span>Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} · synced</span></div>
        <div className="d-account-split">
          {accounts.slice(0, 3).map((account, index) => <p key={account.id}><i className={accountTones[index]} />{account.name} <Money>{nf(account.balance)}</Money></p>)}
          <span>{accounts.slice(0, 3).map((account, index) => <i key={account.id} style={{ width: `${Math.max(4, (Math.max(0, account.balance) / accountTotal) * 100)}%`, background: index === 0 ? '#E2703A' : index === 1 ? '#C79A3E' : '#7C8A6B' }} />)}</span>
        </div>
      </section>
      <div className="d-mini-grid">
        <button type="button" className="d-mini-card" onClick={() => setActivePage('budgets')}><Label>Safe today</Label><Money>Rs {nf(safe.safeToSpendToday)}</Money><span>Open plan <b>→</b></span></button>
        <div className="d-mini-card is-dashed"><Label>Cycle</Label><Money>{safe.cycle ? <>Day {safe.cycle.daysElapsed}<small>/{safe.cycle.totalDays}</small></> : 'Setup needed'}</Money><span>● {safe.state === 'comfortable' ? 'On track' : safe.state === 'needs_setup' ? 'Finish setup' : 'Keep watch'}</span></div>
        <button type="button" className="d-mini-card" onClick={() => setActivePage('accounts')}><Label>Next income</Label><Money>{safe.cycle ? safe.cycle.daysRemaining : '—'} <small>days</small></Money><span>Open wallet <b>→</b></span></button>
      </div>
      <Card className="d-ledger-card d-fill">
        <div className="d-card-heading"><h2>Today</h2><button type="button" onClick={() => setActivePage('transactions')}>Full ledger <ArrowRight size={13} /></button></div>
        <TransactionRows compact />
      </Card>
    </div>
    <aside className="d-attention">
      <section className="d-leak"><div><Label>{leak ? 'Money leak found' : 'Spending signal'}</Label><span>↗</span></div><h2>{leak?.title ?? 'Nothing unusual yet'}</h2><Money>{leak ? `Rs ${nf(leak.amount)}` : 'All clear'}</Money><p>{leak ? `${leak.transactionCount} purchases in 30 days — set a limit?` : 'Keep recording and your patterns will appear here.'}</p></section>
      <Card className="d-quest"><div><Label>This week's quest</Label><small>{moneyQuest?.status ?? 'not started'}</small></div><h2>{questTitle}</h2><div className="d-segments">{Array.from({ length: Math.min(3, questTarget) }, (_, index) => <i key={index} />)}</div><p><strong>{moneyQuest ? 'In progress' : 'Choose a quest'}</strong> — small steps count.</p></Card>
      <Card className="d-fill"><Label>Top categories · July</Label><CategoryBars /></Card>
    </aside>
  </div>
}

function TransactionRows({ compact = false, transactions: suppliedTransactions, openModal }: { compact?: boolean; transactions?: Transaction[]; openModal?: OpenModal }) {
  const { transactions } = useDesktopData()
  const rows = sortedTransactions(suppliedTransactions ?? transactions).slice(0, compact ? 3 : 8)
  return <div className={`d-transactions ${compact ? 'is-compact' : ''}`}>{rows.map((row) => <div className="d-transaction" key={row.id}>
    <i className={`is-${transactionTone(row)}`} /><div className="d-entry"><strong>{row.title}</strong><small>{new Date(`${row.date}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</small></div>
    {!compact && <><span className="d-category">■ &nbsp; {transactionCategory(row)}</span><span>{row.account}</span></>}
    <Money accent={row.type === 'income'}>{transactionSign(row)}{nf(row.amount)}</Money>
    {!compact && openModal && <button type="button" className="d-row-action" aria-label={`Manage ${row.title}`} onClick={() => openModal('entry', row.id)}><ChevronRight size={15}/></button>}
  </div>)}{rows.length === 0 && <p className="d-empty">No ledger entries yet.</p>}</div>
}

function LedgerPage({ period, setPeriod, openModal }: { period: PeriodKey; setPeriod: (period: PeriodKey) => void; openModal: OpenModal }) {
  const data = useDesktopData()
  const [filter, setFilter] = useState<LedgerFilter>('all')
  const transactions = useMemo(() => periodTransactions(data, period), [data, period])
  const filtered = useMemo(() => transactions.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'received') return item.type === 'income'
    if (filter === 'moved') return item.type === 'transfer'
    return item.type === 'expense' || item.type === 'debt_payment' || item.type === 'goal_saving'
  }), [filter, transactions])
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const out = transactions.filter((item) => item.type === 'expense' || item.type === 'debt_payment').reduce((sum, item) => sum + item.amount, 0)
  const net = income - out
  return <div className="d-columns">
    <Card className="d-work d-table-card">
      <div className="d-tabs" aria-label="Ledger entry type">{(['all', 'spent', 'received', 'moved'] as LedgerFilter[]).map((key) => <button type="button" aria-pressed={filter === key} className={filter === key ? 'is-active' : ''} key={key} onClick={() => setFilter(key)}>{key.charAt(0).toUpperCase() + key.slice(1)}</button>)}</div>
      <div className="d-table-head"><span>Entry</span><span>Category</span><span>Account</span><span>Amount</span></div>
      <div className="d-date-row"><h2>Your entries <small>· {filtered.length} shown</small></h2><Money>{net >= 0 ? '+' : '−'}{nf(Math.abs(net))}</Money></div>
      <TransactionRows transactions={filtered} openModal={openModal} />
      {filtered.length === 0 && data.transactions.length > 0 && period !== 'all' && <div className="d-inline-empty"><p>Your ledger has entries, but none match this period.</p><Button kind="secondary" onClick={() => setPeriod('all')}>Show all entries</Button></div>}
    </Card>
    <aside className="d-attention">
      <Card className="d-flow"><Label>Ledger flow</Label><p><span>● &nbsp; In</span><Money>{nf(income)}</Money></p><p><span>● &nbsp; Out</span><Money>{nf(out)}</Money></p><hr /><p><strong>Net</strong><Money accent={net >= 0}>{net >= 0 ? '+' : '−'}{nf(Math.abs(net))}</Money></p><div><i style={{ width: `${income + out > 0 ? (income / (income + out)) * 100 : 50}%` }} /><i /></div></Card>
      <Card className="d-fill"><Label>Where it went · July</Label><CategoryBars includeBills /><div className="d-legend">● Spent &nbsp;&nbsp; <b>● Received</b> &nbsp;&nbsp; ● Moved</div></Card>
    </aside>
  </div>
}

function WalletPage({ openModal, accountFilter }: { openModal: OpenModal; accountFilter: string }) {
  const { accounts, transactions, upcomingExpenses } = useDesktopData()
  const visibleAccounts = accountFilter === 'all' ? accounts : accounts.filter((account) => account.id === accountFilter)
  const visibleIds = new Set(visibleAccounts.map((account) => account.id))
  const visibleTransactions = accountFilter === 'all' ? transactions : transactions.filter((item) => visibleIds.has(item.accountId ?? '') || visibleIds.has(item.fromAccountId ?? '') || visibleIds.has(item.toAccountId ?? ''))
  const total = totalOf(visibleAccounts)
  const income = visibleTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const spent = visibleTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const tones = ['clay', 'blue', 'sage', 'sand'] as const
  const icons = { bank: Landmark, wallet: WalletCards, cash: CircleDollarSign } as const
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-wallet-hero"><div><Label>On hand · {accountFilter === 'all' ? 'all accounts' : visibleAccounts[0]?.name ?? 'account'}</Label><p className="d-hero-number">Rs {nf(total)}</p><span><b>{income - spent >= 0 ? '+' : '−'}{nf(Math.abs(income - spent))}</b> net · after Rs {nf(spent)} spent</span></div><div><Button onClick={() => openModal('move')}><ArrowRight size={17} />Move money</Button><Button kind="quiet" onClick={() => openModal('account')}><Plus size={17} />Add account</Button></div></section>
      <Card className="d-accounts d-fill"><div className="d-card-heading"><h2>Accounts</h2><Label>{visibleAccounts.length} shown</Label></div>{visibleAccounts.map((account, index) => { const Icon = icons[account.type]; const amount = total > 0 ? Math.round((account.balance / total) * 100) : 0; const tone = tones[index % tones.length]; return <button type="button" key={account.id} onClick={() => openModal('accountManage', account.id)}>
        <span className={`d-account-icon is-${tone}`}><Icon size={19} /></span><span><strong>{account.name}</strong><small>{account.type === 'wallet' ? 'Mobile wallet' : account.type === 'bank' ? 'Bank account' : 'Cash on hand'}</small></span><span className="d-account-share"><i><b className={`is-${tone}`} style={{ width: `${Math.max(0, amount)}%` }} /></i><small>{amount}% of on hand</small></span><Money>{nf(account.balance)}</Money><ChevronRight size={16} />
      </button>})}</Card>
    </div>
    <aside className="d-attention">
      <Card className="d-chart-card"><div><Label>Balance · this cycle</Label><b>{income - spent >= 0 ? '+' : '−'}{nf(Math.abs(income - spent))}</b></div><svg viewBox="0 0 400 120" role="img" aria-label="Account balance trend"><defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E2703A" stopOpacity=".24"/><stop offset="1" stopColor="#E2703A" stopOpacity="0"/></linearGradient></defs><path d="M0 88 L52 78 L104 84 L156 58 L208 68 L260 42 L312 50 L356 24 L400 18 L400 120 L0 120Z" fill="url(#balanceFill)"/><path d="M0 88 L52 78 L104 84 L156 58 L208 68 L260 42 L312 50 L356 24 L400 18" fill="none" stroke="#E2703A" strokeWidth="3"/></svg><footer><span>Start</span><span>Rs {nf(total)}</span><span>today</span></footer></Card>
      <Card className="d-quick"><Label>Quick move</Label><div><span><small>From</small><strong>{accounts[0]?.name ?? 'Add account'}</strong></span><b>→</b><span><small>To</small><strong>{accounts[1]?.name ?? 'Add account'}</strong></span></div><footer><Money><small>Rs</small> —</Money><Button onClick={() => openModal('move')}>Move</Button></footer></Card>
      <Card className="d-fill d-scheduled"><Label>Scheduled next</Label>{upcomingExpenses.filter((item) => item.status !== 'paid').slice(0, 3).map((item) => <p key={item.id}><span>↓</span><strong>{item.title}<small>{item.dueDate} · {item.category}</small></strong><Money>−{nf(item.amount)}</Money></p>)}{upcomingExpenses.filter((item) => item.status !== 'paid').length === 0 && <p className="d-empty">Nothing scheduled.</p>}<footer>Current balance <Money>Rs {nf(total)}</Money></footer></Card>
    </aside>
  </div>
}

const chartTooltipStyle = { background: '#2B241D', border: '0', borderRadius: 14, color: '#F3EEE4', fontSize: 12, boxShadow: '0 16px 40px rgba(43,36,29,.22)' }

function InsightsPage({ openModal, period, setPeriod }: { openModal: OpenModal; period: PeriodKey; setPeriod: (period: PeriodKey) => void }) {
  const data = useDesktopData()
  const { budgets, categories: financeCategories, journeySettings, upcomingExpenses, accounts } = data
  const transactions = useMemo(() => periodTransactions(data, period), [data, period])
  const expenses = transactions.filter((item) => item.type === 'expense')
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
  const totalIncome = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const totals = categoryTotals(transactions)
  const top = totals[0]
  const trend = dailyChartData(transactions)
  const monthlySpending = monthlySpendingChartData(data.transactions)
  const categoryData = totals.slice(0, 6).map(([name, value], index) => ({ name, value, fill: ['#E2703A', '#7C8A6B', '#6B7A85', '#C79A3E', '#B9906B', '#9A8F7D'][index] }))
  const safe = calculateSafeSpend({ accounts, budgets, categories: financeCategories, upcomingExpenses, settings: journeySettings })
  return <div className="d-columns">
    <div className="d-work">
      <Card className="d-spend-chart"><div className="d-card-heading"><div><Label>Money flow · {periodLabels[period]}</Label><h2>Rs {nf(totalExpenses)} spent</h2></div><span><b>Rs {nf(totalIncome)}</b> received · {transactions.length} entries</span></div>{trend.length ? <div className="d-chart-visual" role="img" aria-label="Daily income and spending chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}><AreaChart data={trend} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}><defs><linearGradient id="desktopSpendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E2703A" stopOpacity=".28"/><stop offset="100%" stopColor="#E2703A" stopOpacity="0"/></linearGradient><linearGradient id="desktopIncomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C8A6B" stopOpacity=".22"/><stop offset="100%" stopColor="#7C8A6B" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#EDE5D5" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#9A8F7D', fontSize: 10 }}/><YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tick={{ fill: '#9A8F7D', fontSize: 10 }}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [`Rs ${nf(Number(value))}`, name === 'income' ? 'Received' : 'Spent']}/><Area type="monotone" dataKey="income" stroke="#7C8A6B" strokeWidth={2.5} fill="url(#desktopIncomeFill)" dot={false}/><Area type="monotone" dataKey="spending" stroke="#E2703A" strokeWidth={3} fill="url(#desktopSpendFill)" dot={false}/></AreaChart></ResponsiveContainer></div> : <div className="d-inline-empty"><p>{data.transactions.length ? `No entries match ${periodLabels[period].toLowerCase()}.` : 'Record income or spending to see your money flow.'}</p>{data.transactions.length > 0 && period !== 'all' && <Button kind="secondary" onClick={() => setPeriod('all')}>Show all-time graphs</Button>}</div>}</Card>
      <Card className="d-monthly-spending-card"><div className="d-card-heading"><div><Label>Every day · {monthlySpending.label}</Label><h2>Daily spending</h2></div><span><b>Rs {nf(monthlySpending.total)}</b> this month</span></div><div className="d-monthly-spending-chart" role="img" aria-label={`Spending for each day of ${monthlySpending.label}`}><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}><BarChart data={monthlySpending.days} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}><CartesianGrid stroke="#EDE5D5" vertical={false}/><XAxis dataKey="day" ticks={[1, 5, 10, 15, 20, 25, monthlySpending.days.length]} tickLine={false} axisLine={false} tick={{ fill: '#9A8F7D', fontSize: 10 }}/><YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tick={{ fill: '#9A8F7D', fontSize: 10 }}/><Tooltip contentStyle={chartTooltipStyle} labelFormatter={(day) => `${monthlySpending.label} ${day}`} formatter={(value) => [`Rs ${nf(Number(value))}`, 'Spent']}/><Bar dataKey="spending" fill="#E2703A" radius={[5, 5, 0, 0]} maxBarSize={16}/></BarChart></ResponsiveContainer></div></Card>
      <Card className="d-fill d-category-chart-card"><div className="d-card-heading"><h2>Category story</h2><Label>Live ledger</Label></div>{categoryData.length ? <div className="d-category-chart" role="img" aria-label="Spending by category chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}><BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 28, left: 12, bottom: 0 }}><CartesianGrid stroke="#EDE5D5" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={105} tickLine={false} axisLine={false} tick={{ fill: '#5C544A', fontSize: 11, fontWeight: 600 }}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`Rs ${nf(Number(value))}`, 'Spent']}/><Bar dataKey="value" radius={[0, 8, 8, 0]}>{categoryData.map((item) => <Cell key={item.name} fill={item.fill}/>)}</Bar></BarChart></ResponsiveContainer></div> : <p className="d-empty">No category data in this period.</p>}<div className="d-insight-note"><Utensils size={19}/><p><strong>{top ? `${top[0]} is your largest recorded category.` : 'No category pattern yet.'}</strong><br/>{top ? `Rs ${nf(top[1])} in ${periodLabels[period].toLowerCase()}.` : 'Record spending to build your story.'}</p><Button kind="secondary" onClick={() => openModal('plan')}>Set a limit</Button></div></Card>
    </div>
    <aside className="d-attention">
      <section className="d-hero d-pace"><Label>Safe today</Label><Money>Rs {nf(safe.safeToSpendToday)}</Money><p>{safe.explanation}</p><div><span style={{ width: `${Math.min(100, Math.max(8, safe.safeToSpendToday > 0 ? 62 : 8))}%` }} /></div><small>Flexible money remaining <b>Rs {nf(safe.flexibleMoneyRemaining)}</b>.</small></section>
      <Card><Label>Biggest category</Label><h2>{top?.[0] ?? 'No data yet'} {top && <Money accent>Rs {nf(top[1])}</Money>}</h2><p className="d-muted">Based on your actual recorded transactions.</p></Card>
      <section className="d-leak d-nudge"><Label>Worth a pause?</Label><h2>A new pair of headphones</h2><p>Save it for 48 hours. If it still feels right, it stays.</p><Button kind="secondary" onClick={() => openModal('cooloff')}>Cool it off <ArrowRight size={15}/></Button></section>
      <Card className="d-fill d-quote"><Sparkles size={22}/><h2>“Awareness beats restriction.”</h2><p>Your spending is already trending down.</p></Card>
    </aside>
  </div>
}

function GoalsPage({ openModal }: { openModal: OpenModal }) {
  const { goals, debts } = useDesktopData()
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const featured = [...goals].filter((goal) => goal.status !== 'Completed').sort((a, b) => (b.saved / Math.max(1, b.target)) - (a.saved / Math.max(1, a.target)))[0] ?? goals[0]
  const featuredProgress = featured ? Math.round((featured.saved / Math.max(1, featured.target)) * 100) : 0
  const tones = ['sage', 'blue', 'sand'] as const
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-goal-hero"><div><Label>Closest path</Label><h2>{featured?.name ?? 'Create your first goal'}</h2><p><Money>Rs {nf(featured?.saved ?? 0)}</Money> of Rs {nf(featured?.target ?? 0)}</p><div><span style={{ width: `${featuredProgress}%` }}/></div><small>Rs {nf(Math.max(0, (featured?.target ?? 0) - (featured?.saved ?? 0)))} to go</small></div><div className="d-goal-ring" style={{ background: `conic-gradient(#E2703A ${featuredProgress}%,#4A4035 0)` }}><span>{featuredProgress}<small>%</small></span></div></section>
      <div className="d-goal-grid">{goals.slice(0, 3).map((goal, index) => { const progress = Math.round((goal.saved / Math.max(1, goal.target)) * 100); const tone = tones[index % tones.length]; return <Card key={goal.id}><span className={`d-account-icon is-${tone}`}><Target size={18}/></span><h2>{goal.name}</h2><p><Money>Rs {nf(goal.saved)}</Money><small>of Rs {nf(goal.target)}</small></p><div><span className={`is-${tone}`} style={{ width: `${progress}%` }}/></div><footer><button type="button" onClick={() => openModal('funds', goal.id)}>Add payment</button><button type="button" onClick={() => openModal('goalManage', goal.id)}>Manage</button></footer></Card>})}{goals.length === 0 && <Card><h2>No goals yet</h2><p className="d-muted">Create a path to start saving.</p></Card>}</div>
      <Card className="d-fill d-contribution"><div><Label>Across your goals</Label><h2>You have saved <Money accent>Rs {nf(totalSaved)}</Money> toward your future.</h2></div><Button onClick={() => openModal('funds')} disabled={!featured}><Plus size={16}/>Add funds</Button></Card>
      <Card className="d-path-list"><div className="d-card-heading"><h2>Debts & repayments</h2><Button kind="secondary" onClick={() => openModal('debt')}><Plus size={15}/>Add debt</Button></div>{debts.map((debt) => { const total = debtTotal(debt); const paid = debtPaid(debt); const remaining = Math.max(0, total - paid); return <div className="d-path-row" key={debt.id}><span className="d-account-icon is-sand"><CircleDollarSign size={18}/></span><p><strong>{debtTitle(debt)}</strong><small>{debt.personOrCompany || debt.category} · Rs {nf(remaining)} remaining</small></p><Money>Rs {nf(paid)} / {nf(total)}</Money><Button kind="secondary" onClick={() => openModal('debtPayment', debt.id)} disabled={remaining <= 0}>Pay</Button><button type="button" className="d-row-action" aria-label={`Manage ${debtTitle(debt)}`} onClick={() => openModal('debtManage', debt.id)}><ChevronRight size={15}/></button></div>})}{debts.length === 0 && <p className="d-empty">No debts recorded. Add one to track repayments alongside your goals.</p>}</Card>
    </div>
    <aside className="d-attention">
      <Card><Label>All paths</Label><h2><Money>Rs {nf(totalSaved)}</Money></h2><p className="d-muted">saved toward Rs {nf(totalTarget)} across {goals.length} goals</p></Card>
      <Card className="d-timeline"><Label>Coming into view</Label>{goals.slice(0, 3).map((goal) => <p key={goal.id}><i/>{goal.name}<strong>{goal.dueDate ?? 'No date'}</strong></p>)}</Card>
      <section className="d-leak d-goal-nudge"><Label>A gentle nudge</Label><h2>{featured ? `A contribution puts ${featured.name} closer.` : 'Create a goal to begin your next path.'}</h2><Button kind="secondary" onClick={() => openModal('funds')} disabled={!featured}>Add funds</Button></section>
      <Card className="d-fill d-quote"><Target size={22}/><h2>Three paths. One steady pace.</h2><p>You're ahead of where you started.</p></Card>
    </aside>
  </div>
}

function PlanPage({ openModal }: { openModal: OpenModal }) {
  const { budgets, upcomingExpenses, wishlistItems, moneyQuest } = useDesktopData()
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.used, 0)
  const left = Math.max(0, totalBudget - totalUsed)
  const remaining = totalBudget > 0 ? Math.round((left / totalBudget) * 100) : 0
  const tones = ['clay', 'sage', 'blue', 'sand'] as const
  const activeWishlist = wishlistItems.filter((item) => item.status === 'waiting' || item.status === 'ready')
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-plan-hero"><div><Label>Current plan</Label><p className="d-hero-number"><small>Rs</small> {nf(left)} <small>left</small></p><span>of Rs {nf(totalBudget)} · <b>{100 - remaining}% used</b></span></div><div className="d-plan-ring" style={{ background: `conic-gradient(#E2703A ${remaining}%,#4A4035 0)` }}><span>{remaining}<small>%</small><em>remaining</em></span></div></section>
      <Card className="d-fill d-limits"><div className="d-card-heading"><h2>Spending limits</h2><Label>{budgets.length} active</Label></div>{budgets.slice(0, 5).map((budget, index) => { const progress = budget.amount > 0 ? Math.min(100, Math.round((budget.used / budget.amount) * 100)) : 0; const tone = tones[index % tones.length]; return <div key={budget.id}><span className={`d-account-icon is-${tone}`}>●</span><strong>{budget.category}</strong><span className="d-limit-bar"><i><b className={`is-${tone}`} style={{width:`${progress}%`}}/></i><small>{progress}% used</small></span><Money>{nf(budget.used)}<small> / {nf(budget.amount)}</small></Money><ChevronRight size={15}/></div>})}{budgets.length === 0 && <p className="d-empty">No spending limits yet.</p>}</Card>
    </div>
    <aside className="d-attention">
      <Card className="d-scheduled d-plan-actions"><div className="d-card-heading"><Label>Scheduled bills</Label><button type="button" onClick={() => openModal('billManage')}>Add bill <Plus size={13}/></button></div>{upcomingExpenses.filter((item) => item.status !== 'paid').slice(0, 3).map((item) => <div className="d-plan-action-row" key={item.id}><span>↑</span><p><strong>{item.title}</strong><small>{item.dueDate} · Rs {nf(item.amount)}</small></p><button type="button" onClick={() => openModal('billPayment', item.id)}>Pay</button><button type="button" aria-label={`Manage ${item.title}`} onClick={() => openModal('billManage', item.id)}><ChevronRight size={15}/></button></div>)}{upcomingExpenses.filter((item) => item.status !== 'paid').length === 0 && <p className="d-empty">Nothing scheduled.</p>}</Card>
      <section className="d-leak d-nudge"><Label>Cool-off list</Label><h2>{activeWishlist.length} {activeWishlist.length === 1 ? 'decision is' : 'decisions are'} waiting</h2><p>{activeWishlist[0]?.name ?? 'Nothing waiting right now'}</p><Button kind="secondary" onClick={() => openModal(activeWishlist.length ? 'wishlist' : 'cooloff')}>{activeWishlist.length ? 'Review decisions' : 'Add an item'} <ArrowRight size={15}/></Button></section>
      <Card className="d-quest"><div><Label>This week's quest</Label><small>{moneyQuest?.status ?? 'not started'}</small></div><h2>{moneyQuest?.title ?? 'Choose a small money quest'}</h2><div className="d-segments"><i/><i/><i/></div><p><strong>{moneyQuest ? 'In progress' : 'Ready when you are'}</strong></p><Button kind="secondary" onClick={() => openModal('quest', moneyQuest?.id)}>{moneyQuest ? 'Manage quest' : 'Start quest'}</Button></Card>
      <Card className="d-fill d-plan-note"><Label>Plan balance</Label><h2>You have <Money accent>Rs {nf(left)}</Money> left across your limits.</h2><p>Based on your current budgets.</p></Card>
    </aside>
  </div>
}

function Toggle({ on = true, onClick }: { on?: boolean; onClick?: () => void }) { return <button type="button" aria-label="Toggle setting" aria-pressed={on} className={`d-toggle ${on ? 'is-on' : ''}`} onClick={onClick}><i/></button> }

function SettingsPage({ setActivePage, onSignOut, openModal, onAnalyticsConsentChange, onRestartJourney }: { setActivePage: (page: string) => void; onSignOut: () => void; openModal: OpenModal; onAnalyticsConsentChange: (granted: boolean) => void; onRestartJourney: () => void }) {
  const { accounts, authEmail, journeySettings, profile, transactions } = useDesktopData()
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('pocket-ledger-notifications') !== 'off')
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'P'
  return <div className="d-columns d-settings-grid">
    <div className="d-work">
      <Card className="d-profile-card"><span>{profile.avatar ? <img src={profile.avatar} alt="" /> : initial}</span><div><h2>{profile.name}</h2><p>{authEmail ?? 'Signed-in Pocket Ledger account'}</p></div><Button kind="secondary" onClick={() => openModal('profile')}><Pencil size={16}/>Edit profile</Button></Card>
      <Card className="d-settings-card"><Label>Cycle & money</Label><div><span className="d-account-icon is-clay"><CalendarDays size={18}/></span><p><strong>Income cycle</strong><small>{journeySettings.nextIncomeDate ? `Next income ${journeySettings.nextIncomeDate}` : 'Add your next income date in journey setup'}</small></p><strong>{journeySettings.incomeCadence ? journeySettings.incomeCadence.replace('_', ' ') : 'Not set'}</strong></div><div><span className="d-account-icon is-sage"><CircleDollarSign size={18}/></span><p><strong>Currency</strong><small>Shown across the app</small></p><strong>PKR · Rs</strong></div><div><span className="d-account-icon is-blue"><Sparkles size={18}/></span><p><strong>Accounts included</strong><small>Balances used across your plan</small></p><strong>{accounts.length}</strong></div></Card>
      <Card className="d-settings-card d-fill"><Label>Preferences</Label><div><p><strong>Notifications</strong><small>Bill reminders and money signals</small></p><Toggle on={notificationsEnabled} onClick={() => setNotificationsEnabled((value) => { const next = !value; localStorage.setItem('pocket-ledger-notifications', next ? 'on' : 'off'); return next })}/></div><div><p><strong>Analytics consent</strong><small>Help improve Pocket Ledger</small></p><Toggle on={journeySettings.analyticsConsent} onClick={() => onAnalyticsConsentChange(!journeySettings.analyticsConsent)}/></div><div><p><strong>Journey setup</strong><small>{journeySettings.nextIncomeDate ? `Next income ${journeySettings.nextIncomeDate}` : 'Income cycle not configured'}</small></p><button type="button" onClick={onRestartJourney}>Update cycle</button></div><div><p><strong>Safety reserve</strong><small>Protected from safe-to-spend</small></p><Money>Rs {nf(journeySettings.safetyReserve)}</Money></div></Card>
    </div>
    <aside className="d-attention">
      <Card className="d-settings-card d-fill"><Label>Data & security</Label><button className="d-setting-link" onClick={() => setActivePage('categories')}><span className="d-account-icon is-sage"><WalletCards size={18}/></span><strong>Manage categories</strong><ChevronRight size={15}/></button><button className="d-setting-link" onClick={() => setActivePage('accounts')}><span className="d-account-icon is-blue"><CreditCard size={18}/></span><strong>Linked accounts</strong><small>{accounts.length}</small><ChevronRight size={15}/></button><button className="d-setting-link" onClick={() => exportTransactionsCsv(transactions)}><span className="d-account-icon is-sand"><Download size={18}/></span><strong>Export data</strong><small>CSV</small><ChevronRight size={15}/></button></Card>
      <Button kind="secondary" onClick={onSignOut}><LockKeyhole size={16}/>Sign out</Button>
    </aside>
  </div>
}

function CategoriesPage({ openModal, onArchiveCategory }: { openModal: OpenModal; onArchiveCategory: DesktopExperienceProps['onArchiveCategory'] }) {
  const { categories, transactions } = useDesktopData()
  return <div className="d-columns d-settings-grid">
    <div className="d-work">
      <Card className="d-category-manager d-fill"><div className="d-card-heading"><div><h2>Categories</h2><p className="d-muted">Keep reports and spending limits consistent across devices.</p></div><Button onClick={() => openModal('category')}><Plus size={16}/>New category</Button></div>{categories.map((category) => { const inUse = transactions.some((transaction) => transaction.categoryId === category.id || transactionCategory(transaction) === category.name); return <div className="d-path-row" key={category.id}><span className="d-category-swatch" style={{ background: category.color }}/><p><strong>{category.name}</strong><small>{category.kind} · {category.spendingNature}</small></p><Button kind="secondary" onClick={() => openModal('category', category.id)}>Edit</Button><button type="button" className="d-row-action is-danger" aria-label={`Archive ${category.name}`} disabled={inUse} title={inUse ? 'Categories used by transactions cannot be archived' : 'Archive category'} onClick={() => onArchiveCategory(category.id)}><Trash2 size={15}/></button></div>})}</Card>
    </div>
    <aside className="d-attention"><Card><Label>Good category hygiene</Label><h2>Fewer, clearer labels make insights easier to trust.</h2><p className="d-muted">Archive unused categories and avoid creating near-duplicates.</p></Card></aside>
  </div>
}

const modalCopy: Record<ModalKind, { badge: string; title: string; subtitle: string; save: string }> = {
  record: { badge: 'New entry', title: 'Record a spend', subtitle: 'Log it before you forget.', save: 'Save entry' },
  entry: { badge: 'Ledger entry', title: 'Manage entry', subtitle: 'Correct or remove this ledger record.', save: 'Save changes' },
  move: { badge: 'Transfer', title: 'Move money', subtitle: 'Shift money between your accounts.', save: 'Move Rs 2,000' },
  account: { badge: 'Wallet', title: 'Add an account', subtitle: 'Bring another balance into view.', save: 'Add account' },
  accountManage: { badge: 'Wallet', title: 'Manage account', subtitle: 'Update how this account appears and counts.', save: 'Save account' },
  category: { badge: 'Categories', title: 'Manage category', subtitle: 'Use a clear label for cleaner insights.', save: 'Save category' },
  cooloff: { badge: '48 hour pause', title: 'Cool off a buy', subtitle: 'Give the decision some breathing room.', save: 'Start cool-off' },
  wishlist: { badge: 'Cooling off', title: 'Review decisions', subtitle: 'Buy, wait, skip, or remove each item.', save: 'Done' },
  funds: { badge: 'Goal deposit', title: 'Add funds', subtitle: 'Move one of your paths closer.', save: 'Add Rs 2,000' },
  goal: { badge: 'New path', title: 'Create a goal', subtitle: 'Name what you are moving toward.', save: 'Create goal' },
  goalManage: { badge: 'Goal', title: 'Manage goal', subtitle: 'Update the target, date, and status.', save: 'Save goal' },
  debt: { badge: 'New path', title: 'Add a debt', subtitle: 'Track what is owed and each repayment.', save: 'Add debt' },
  debtManage: { badge: 'Debt', title: 'Manage debt', subtitle: 'Update the balance, due date, and status.', save: 'Save debt' },
  debtPayment: { badge: 'Repayment', title: 'Record a debt payment', subtitle: 'Reduce the balance and your account together.', save: 'Record payment' },
  plan: { badge: 'Plan options', title: 'Add to your plan', subtitle: 'Choose what you want to plan next.', save: 'Save to plan' },
  billManage: { badge: 'Scheduled bill', title: 'Manage bill', subtitle: 'Add or update an upcoming payment.', save: 'Save bill' },
  billPayment: { badge: 'Pay bill', title: 'Record bill payment', subtitle: 'Mark it paid and add it to the ledger.', save: 'Record payment' },
  quest: { badge: 'Weekly quest', title: 'Manage quest', subtitle: 'Choose a small, useful money challenge.', save: 'Start quest' },
  profile: { badge: 'Your profile', title: 'Edit profile', subtitle: 'Use the name shown across Pocket Ledger.', save: 'Save profile' },
  search: { badge: 'Find entries', title: 'Search your ledger', subtitle: 'Search by title, category, account, or note.', save: 'Done' },
  notifications: { badge: 'Activity', title: 'Notifications', subtitle: 'Upcoming payments and money signals.', save: 'Done' },
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="d-field"><span>{label}</span><div>{children}</div></label> }

function SlideOver({ kind, targetId, close, onRecordEntry, onMoveMoney, onCreateGoal, onCreateWishlistItem, onCreateAccount, onAddFunds, onCreateBudget, onUpdateTransaction, onDeleteTransaction, onUpdateAccount, onArchiveAccount, onUpdateGoal, onDeleteGoal, onCreateDebt, onUpdateDebt, onDeleteDebt, onPayDebt, onCreateUpcoming, onUpdateUpcoming, onDeleteUpcoming, onPayUpcoming, onUpdateWishlist, onDeleteWishlist, onBuyWishlist, onSaveQuest, onCancelQuest, onSaveCategory, onUpdateProfile }: {
  kind: ModalKind
  targetId?: string
  close: () => void
  onRecordEntry: DesktopExperienceProps['onRecordEntry']
  onMoveMoney: DesktopExperienceProps['onMoveMoney']
  onCreateGoal: DesktopExperienceProps['onCreateGoal']
  onCreateWishlistItem: DesktopExperienceProps['onCreateWishlistItem']
  onCreateAccount: DesktopExperienceProps['onCreateAccount']
  onAddFunds: DesktopExperienceProps['onAddFunds']
  onCreateBudget: DesktopExperienceProps['onCreateBudget']
  onUpdateTransaction: DesktopExperienceProps['onUpdateTransaction']
  onDeleteTransaction: DesktopExperienceProps['onDeleteTransaction']
  onUpdateAccount: DesktopExperienceProps['onUpdateAccount']
  onArchiveAccount: DesktopExperienceProps['onArchiveAccount']
  onUpdateGoal: DesktopExperienceProps['onUpdateGoal']
  onDeleteGoal: DesktopExperienceProps['onDeleteGoal']
  onCreateDebt: DesktopExperienceProps['onCreateDebt']
  onUpdateDebt: DesktopExperienceProps['onUpdateDebt']
  onDeleteDebt: DesktopExperienceProps['onDeleteDebt']
  onPayDebt: DesktopExperienceProps['onPayDebt']
  onCreateUpcoming: DesktopExperienceProps['onCreateUpcoming']
  onUpdateUpcoming: DesktopExperienceProps['onUpdateUpcoming']
  onDeleteUpcoming: DesktopExperienceProps['onDeleteUpcoming']
  onPayUpcoming: DesktopExperienceProps['onPayUpcoming']
  onUpdateWishlist: DesktopExperienceProps['onUpdateWishlist']
  onDeleteWishlist: DesktopExperienceProps['onDeleteWishlist']
  onBuyWishlist: DesktopExperienceProps['onBuyWishlist']
  onSaveQuest: DesktopExperienceProps['onSaveQuest']
  onCancelQuest: DesktopExperienceProps['onCancelQuest']
  onSaveCategory: DesktopExperienceProps['onSaveCategory']
  onUpdateProfile: DesktopExperienceProps['onUpdateProfile']
}) {
  const copy = modalCopy[kind]
  const { accounts, budgets, categories, debts, goals, moneyQuest, profile, transactions, upcomingExpenses, wishlistItems } = useDesktopData()
  const selectedTransaction = transactions.find((item) => item.id === targetId)
  const selectedAccount = accounts.find((item) => item.id === targetId)
  const selectedGoal = goals.find((item) => item.id === targetId)
  const selectedDebt = debts.find((item) => item.id === targetId)
  const selectedBill = upcomingExpenses.find((item) => item.id === targetId)
  const selectedCategory = categories.find((item) => item.id === targetId)
  const [amount, setAmount] = useState(selectedTransaction?.amount ?? selectedBill?.amount ?? selectedGoal?.target ?? (selectedDebt ? (kind === 'debtPayment' ? Math.max(0, debtTotal(selectedDebt) - debtPaid(selectedDebt)) : debtTotal(selectedDebt)) : undefined) ?? (kind === 'funds' ? 2000 : kind === 'plan' ? 10000 : 0))
  const [direction, setDirection] = useState<'expense' | 'income'>(selectedTransaction?.type === 'income' ? 'income' : 'expense')
  const [entryTitle, setEntryTitle] = useState(selectedTransaction?.title ?? '')
  const [entryCategory, setEntryCategory] = useState(selectedTransaction ? transactionCategory(selectedTransaction) : categories.find((item) => item.kind === 'expense')?.name ?? '')
  const [accountName, setAccountName] = useState(selectedAccount?.name ?? '')
  const [accountType, setAccountType] = useState<AccountType>(selectedAccount?.type ?? 'bank')
  const [accountId, setAccountId] = useState(selectedTransaction?.accountId ?? selectedBill?.linkedAccountId ?? selectedGoal?.linkedAccountId ?? accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '')
  const [goalId, setGoalId] = useState(selectedGoal?.id ?? goals[0]?.id ?? '')
  const [goalName, setGoalName] = useState(selectedGoal?.name ?? '')
  const [goalSaved, setGoalSaved] = useState(selectedGoal?.saved ?? 0)
  const [itemName, setItemName] = useState('')
  const [date, setDate] = useState(selectedTransaction?.date ?? localDateKey())
  const [dueDate, setDueDate] = useState(selectedGoal?.dueDate ?? selectedDebt?.dueDate ?? selectedBill?.dueDate ?? '')
  const [notes, setNotes] = useState(selectedTransaction?.notes ?? selectedGoal?.notes ?? selectedDebt?.notes ?? selectedBill?.notes ?? '')
  const [budgetCategory, setBudgetCategory] = useState(selectedBill?.category ?? categories.find((item) => item.kind === 'expense')?.name ?? '')
  const [planMode, setPlanMode] = useState<'choose' | 'limit' | 'bill' | 'cooloff' | 'quest'>(kind === 'plan' ? 'choose' : 'limit')
  const [debtName, setDebtName] = useState(selectedDebt ? debtTitle(selectedDebt) : '')
  const [debtPerson, setDebtPerson] = useState(selectedDebt?.personOrCompany ?? '')
  const [debtStatus, setDebtStatus] = useState<Debt['status']>(selectedDebt?.status ?? 'Active')
  const [debtCategory, setDebtCategory] = useState<Debt['category']>(selectedDebt?.category ?? 'Debt')
  const [paidAmount, setPaidAmount] = useState(selectedDebt ? debtPaid(selectedDebt) : 0)
  const [billTitle, setBillTitle] = useState(selectedBill?.title ?? '')
  const [recurring, setRecurring] = useState(selectedBill?.isRecurring ?? false)
  const [questType, setQuestType] = useState<MoneyQuest['type']>('no_spend_days')
  const [categoryName, setCategoryName] = useState(selectedCategory?.name ?? '')
  const [categoryKind, setCategoryKind] = useState<Category['kind']>(selectedCategory?.kind ?? 'expense')
  const [categoryNature, setCategoryNature] = useState<Category['spendingNature']>(selectedCategory?.spendingNature ?? 'flexible')
  const [profileName, setProfileName] = useState(profile.name)
  const [searchQuery, setSearchQuery] = useState('')
  const entryCategories = categories.filter((item) => item.kind === direction)
  const fromAccount = accounts.find((item) => item.id === accountId)
  const toAccount = accounts.find((item) => item.id === toAccountId)
  const searchResults = searchQuery.trim() ? sortedTransactions(transactions).filter((transaction) => [transaction.title, transactionCategory(transaction), transaction.account, transaction.notes].some((value) => value?.toLowerCase().includes(searchQuery.trim().toLowerCase()))).slice(0, 12) : sortedTransactions(transactions).slice(0, 6)
  const notifications = [
    ...upcomingExpenses.filter((item) => item.status !== 'paid').map((item) => ({ id: `upcoming-${item.id}`, title: item.title, detail: `${item.status === 'overdue' ? 'Overdue' : 'Due'} ${item.dueDate} · Rs ${nf(item.amount)}`, tone: item.status === 'overdue' ? 'clay' : 'sage' })),
    ...budgets.filter((budget) => budget.used >= budget.amount).map((budget) => ({ id: `budget-${budget.id}`, title: `${budget.category} limit reached`, detail: `Rs ${nf(budget.used)} of Rs ${nf(budget.amount)} used`, tone: 'clay' })),
    ...wishlistItems.filter((item) => item.status === 'ready').map((item) => ({ id: `wishlist-${item.id}`, title: `${item.name} is ready to review`, detail: `Your 48-hour pause has finished · Rs ${nf(item.amount)}`, tone: 'blue' })),
  ].slice(0, 10)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])
  return <div className="d-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <aside className="d-slide-over" role="dialog" aria-modal="true" aria-labelledby="desktop-modal-title">
      <header><div><span>{kind === 'search' ? <Search size={14}/> : kind === 'notifications' ? <Bell size={14}/> : <Plus size={14}/>}</span>{copy.badge}</div><button type="button" onClick={close} aria-label="Close"><X size={17}/></button><h2 id="desktop-modal-title">{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="d-modal-body">
        {kind === 'record' && <><div className="d-tabs d-modal-tabs"><button type="button" className={direction === 'expense' ? 'is-active' : ''} onClick={() => { setDirection('expense'); setEntryCategory(categories.find((item) => item.kind === 'expense')?.name ?? '') }}>Spent</button><button type="button" className={direction === 'income' ? 'is-active' : ''} onClick={() => { setDirection('income'); setEntryCategory(categories.find((item) => item.kind === 'income')?.name ?? '') }}>Received</button></div><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} autoFocus placeholder="0"/></Field><div className="d-chips">{[200, 500, 1000, 2000].map((value) => <button type="button" className={amount === value ? 'is-active' : ''} key={value} onClick={() => setAmount(value)}>{nf(value)}</button>)}</div><Field label="Category"><select value={entryCategory} onChange={(event) => setEntryCategory(event.target.value)}>{entryCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><div className="d-field-row"><Field label="Account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · Rs {nf(account.balance)}</option>)}</select></Field><Field label="When"><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></Field></div><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note"/></Field></>}
        {kind === 'entry' && selectedTransaction && <><Field label="Title"><input value={entryTitle} onChange={(event) => setEntryTitle(event.target.value)} autoFocus/></Field><div className="d-field-row"><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field><Field label="When"><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></Field></div>{(selectedTransaction.type === 'expense' || selectedTransaction.type === 'income') && <><Field label="Category"><select value={entryCategory} onChange={(event) => setEntryCategory(event.target.value)}>{!entryCategories.some((category) => category.name === entryCategory) && <option value={entryCategory}>{entryCategory}</option>}{entryCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><Field label="Account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field></>}<Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note"/></Field><button type="button" className="d-destructive" onClick={() => { onDeleteTransaction(selectedTransaction.id); close() }}><Trash2 size={16}/>Delete entry</button></>}
        {kind === 'move' && <><div className="d-transfer-choice"><Field label="From"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field><ArrowRight/><Field label="To"><select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field></div><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} autoFocus placeholder="0"/></Field><Card className="d-modal-summary"><Label>After this move</Label><p>{fromAccount?.name ?? 'From'} <Money>Rs {nf((fromAccount?.balance ?? 0) - amount)}</Money></p><p>{toAccount?.name ?? 'To'} <Money>Rs {nf((toAccount?.balance ?? 0) + amount)}</Money></p></Card><Field label="When"><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></Field><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional"/></Field></>}
        {kind === 'account' && <><Field label="Account name"><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="e.g. Meezan Savings" /></Field><Field label="Opening balance"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} placeholder="0" /></Field><div className="d-account-types"><button type="button" className={accountType === 'bank' ? 'is-active' : ''} onClick={() => setAccountType('bank')}><Landmark/>Bank</button><button type="button" className={accountType === 'wallet' ? 'is-active' : ''} onClick={() => setAccountType('wallet')}><WalletCards/>Wallet</button><button type="button" className={accountType === 'cash' ? 'is-active' : ''} onClick={() => setAccountType('cash')}><CircleDollarSign/>Cash</button></div></>}
        {kind === 'accountManage' && selectedAccount && <><Field label="Account name"><input value={accountName} onChange={(event) => setAccountName(event.target.value)} autoFocus/></Field><div className="d-account-types"><button type="button" className={accountType === 'bank' ? 'is-active' : ''} onClick={() => setAccountType('bank')}><Landmark/>Bank</button><button type="button" className={accountType === 'wallet' ? 'is-active' : ''} onClick={() => setAccountType('wallet')}><WalletCards/>Wallet</button><button type="button" className={accountType === 'cash' ? 'is-active' : ''} onClick={() => setAccountType('cash')}><CircleDollarSign/>Cash</button></div><Card className="d-modal-summary"><Label>Current balance</Label><p>{selectedAccount.name}<Money>Rs {nf(selectedAccount.balance)}</Money></p></Card><button type="button" className="d-destructive" onClick={() => { onArchiveAccount(selectedAccount.id); close() }}><Trash2 size={16}/>Archive account</button></>}
        {kind === 'category' && <><Field label="Category name"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} autoFocus placeholder="e.g. Health"/></Field><div className="d-tabs d-modal-tabs"><button type="button" className={categoryKind === 'expense' ? 'is-active' : ''} onClick={() => setCategoryKind('expense')}>Expense</button><button type="button" className={categoryKind === 'income' ? 'is-active' : ''} onClick={() => setCategoryKind('income')}>Income</button></div>{categoryKind === 'expense' && <div className="d-tabs d-modal-tabs"><button type="button" className={categoryNature === 'essential' ? 'is-active' : ''} onClick={() => setCategoryNature('essential')}>Essential</button><button type="button" className={categoryNature === 'flexible' ? 'is-active' : ''} onClick={() => setCategoryNature('flexible')}>Flexible</button></div>}</>}
        {kind === 'cooloff' && <><Field label="What are you considering?"><input value={itemName} onChange={(event) => setItemName(event.target.value)} autoFocus placeholder="e.g. New headphones"/></Field><Field label="Expected price"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} placeholder="0"/></Field><Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><div className="d-pause-card"><Sparkles/><h3>A little space, not a “no”.</h3><p>We’ll bring this back in 48 hours so you can decide with a clear head.</p></div></>}
        {kind === 'wishlist' && <div className="d-decision-list">{wishlistItems.filter((item) => item.status === 'waiting' || item.status === 'ready').map((item) => <Card key={item.id}><div><p><strong>{item.name}</strong><small>{item.status === 'ready' ? 'Ready to decide' : 'Cooling off'} · Rs {nf(item.amount)}</small></p><Money>Rs {nf(item.amount)}</Money></div><div className="d-decision-actions"><Button onClick={() => { onBuyWishlist(item); close() }}>Buy & record</Button><Button kind="secondary" onClick={() => onUpdateWishlist({ ...item, reconsiderAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), status: 'waiting' })}>Wait 3 days</Button><Button kind="secondary" onClick={() => onUpdateWishlist({ ...item, status: 'skipped' })}>Skip</Button><button type="button" className="d-row-action is-danger" aria-label={`Remove ${item.name}`} onClick={() => onDeleteWishlist(item.id)}><Trash2 size={15}/></button></div></Card>)}{wishlistItems.filter((item) => item.status === 'waiting' || item.status === 'ready').length === 0 && <p className="d-empty">No decisions are waiting.</p>}<Button kind="secondary" onClick={() => { close() }}>Done</Button></div>}
        {kind === 'funds' && <><Field label="Goal"><select value={goalId} onChange={(event) => setGoalId(event.target.value)}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></Field><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} /></Field><div className="d-chips"><button type="button" onClick={() => setAmount(1000)}>1,000</button><button type="button" className={amount === 2000 ? 'is-active' : ''} onClick={() => setAmount(2000)}>2,000</button><button type="button" onClick={() => setAmount(5000)}>5,000</button></div><Field label="From"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · Rs {nf(account.balance)}</option>)}</select></Field></>}
        {kind === 'goal' && <><Field label="Goal name"><input value={goalName} onChange={(event) => setGoalName(event.target.value)} autoFocus placeholder="e.g. Rainy day fund"/></Field><Field label="Target amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} placeholder="0"/></Field><Field label="Target date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></Field><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional"/></Field></>}
        {kind === 'goalManage' && selectedGoal && <><Field label="Goal name"><input value={goalName} onChange={(event) => setGoalName(event.target.value)} autoFocus/></Field><div className="d-field-row"><Field label="Target amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field><Field label="Saved so far"><span>Rs</span><input inputMode="decimal" value={goalSaved || ''} onChange={(event) => setGoalSaved(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field></div><Field label="Target date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></Field><Field label="Linked account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">No linked account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)}/></Field><button type="button" className="d-destructive" onClick={() => { onDeleteGoal(selectedGoal.id); close() }}><Trash2 size={16}/>Delete goal</button></>}
        {(kind === 'debt' || kind === 'debtManage') && <><Field label="Debt name"><input value={debtName} onChange={(event) => setDebtName(event.target.value)} autoFocus placeholder="e.g. Credit card"/></Field><Field label="Person or company"><input value={debtPerson} onChange={(event) => setDebtPerson(event.target.value)} placeholder="Optional"/></Field><div className="d-field-row"><Field label="Total owed"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field><Field label="Already paid"><span>Rs</span><input inputMode="decimal" value={paidAmount || ''} onChange={(event) => setPaidAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field></div><Field label="Category"><select value={debtCategory} onChange={(event) => setDebtCategory(event.target.value as Debt['category'])}>{['Debt','Overdue Payment','Money I Owe','Installment','Other'].map((value) => <option key={value}>{value}</option>)}</select></Field><div className="d-field-row"><Field label="Status"><select value={debtStatus} onChange={(event) => setDebtStatus(event.target.value as Debt['status'])}>{['Active','Due Soon','Overdue','Paid'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Due date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></Field></div><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)}/></Field>{kind === 'debtManage' && selectedDebt && <button type="button" className="d-destructive" onClick={() => { onDeleteDebt(selectedDebt.id); close() }}><Trash2 size={16}/>Delete debt</button>}</>}
        {kind === 'debtPayment' && selectedDebt && <><Card className="d-modal-summary"><Label>{debtTitle(selectedDebt)}</Label><p>Remaining<Money>Rs {nf(Math.max(0, debtTotal(selectedDebt) - debtPaid(selectedDebt)))}</Money></p></Card><Field label="Payment amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} autoFocus/></Field><Field label="From account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · Rs {nf(account.balance)}</option>)}</select></Field><Field label="Payment date"><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></Field><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional"/></Field></>}
        {kind === 'plan' && <>{planMode === 'choose' && <div className="d-option-list"><button type="button" onClick={() => setPlanMode('limit')}><PieChart/><span><strong>Spending limit</strong><small>Set or update a category cap</small></span><ChevronRight/></button><button type="button" onClick={() => setPlanMode('bill')}><CalendarDays/><span><strong>Upcoming bill</strong><small>Schedule a payment or subscription</small></span><ChevronRight/></button><button type="button" onClick={() => setPlanMode('cooloff')}><Clock3/><span><strong>Cool off a buy</strong><small>Pause a purchase before deciding</small></span><ChevronRight/></button><button type="button" onClick={() => setPlanMode('quest')}><Target/><span><strong>Start a quest</strong><small>Pick a small weekly challenge</small></span><ChevronRight/></button></div>}{planMode === 'limit' && <><Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><Field label="Monthly limit"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field></>}{planMode === 'bill' && <><Field label="Bill name"><input value={billTitle} onChange={(event) => setBillTitle(event.target.value)} placeholder="e.g. Internet"/></Field><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field><Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id}>{category.name}</option>)}</select></Field><Field label="Due date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></Field></>}{planMode === 'cooloff' && <><Field label="What are you considering?"><input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="e.g. New headphones"/></Field><Field label="Expected price"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field></>}{planMode === 'quest' && <><Field label="Quest type"><select value={questType} onChange={(event) => setQuestType(event.target.value as MoneyQuest['type'])}><option value="no_spend_days">No-spend days</option><option value="category_limit">Category limit</option><option value="tracking_days">Tracking streak</option></select></Field>{questType === 'category_limit' && <Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id}>{category.name}</option>)}</select></Field>}<Field label={questType === 'category_limit' ? 'Maximum spend' : 'Target days'}>{questType === 'category_limit' && <span>Rs</span>}<input inputMode="numeric" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="3"/></Field></>}</>}
        {kind === 'billManage' && <><Field label="Bill name"><input value={billTitle} onChange={(event) => setBillTitle(event.target.value)} autoFocus placeholder="e.g. Internet"/></Field><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)}/></Field><Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id}>{category.name}</option>)}</select></Field><div className="d-field-row"><Field label="Due date"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></Field><Field label="Account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Choose later</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field></div><label className="d-check-row"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)}/><span><strong>Recurring monthly</strong><small>Create the next bill after payment</small></span></label><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional"/></Field>{selectedBill && <button type="button" className="d-destructive" onClick={() => { onDeleteUpcoming(selectedBill.id); close() }}><Trash2 size={16}/>Delete bill</button>}</>}
        {kind === 'billPayment' && selectedBill && <><Card className="d-modal-summary"><Label>{selectedBill.title}</Label><p>Amount due<Money>Rs {nf(selectedBill.amount)}</Money></p></Card><Field label="From account"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · Rs {nf(account.balance)}</option>)}</select></Field><Field label="Payment date"><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></Field><Field label="Note"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional"/></Field></>}
        {kind === 'quest' && <>{moneyQuest && <Card className="d-modal-summary"><Label>Active quest</Label><p>{moneyQuest.title}<strong>{moneyQuest.status}</strong></p></Card>}<Field label="Quest type"><select value={questType} onChange={(event) => setQuestType(event.target.value as MoneyQuest['type'])}><option value="no_spend_days">No-spend days</option><option value="category_limit">Stay under a category limit</option><option value="tracking_days">Track every day</option></select></Field>{questType === 'category_limit' && <Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id}>{category.name}</option>)}</select></Field>}<Field label={questType === 'category_limit' ? 'Maximum spend' : 'Target days'}>{questType === 'category_limit' && <span>Rs</span>}<input inputMode="numeric" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="3"/></Field>{moneyQuest && <button type="button" className="d-destructive" onClick={() => { onCancelQuest(moneyQuest); close() }}><X size={16}/>End current quest</button>}</>}
        {kind === 'profile' && <><Field label="Display name"><input value={profileName} onChange={(event) => setProfileName(event.target.value)} autoFocus /></Field><Card className="d-modal-summary"><Label>Profile photo</Label><p>Your current photo is preserved. You can change it from the full mobile profile editor.</p></Card></>}
        {kind === 'search' && <><div className="d-search-input"><Search size={17}/><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} autoFocus placeholder="Search entries"/></div><div className="d-search-results"><Label>{searchQuery.trim() ? `${searchResults.length} matches` : 'Recent entries'}</Label>{searchResults.map((transaction) => <div key={transaction.id}><i className={`is-${transactionTone(transaction)}`}/><p><strong>{transaction.title}</strong><small>{transactionCategory(transaction)} · {transaction.account}</small></p><Money accent={transaction.type === 'income'}>{transactionSign(transaction)}{nf(transaction.amount)}</Money></div>)}{searchResults.length === 0 && <p className="d-empty">No entries match “{searchQuery}”.</p>}</div></>}
        {kind === 'notifications' && <div className="d-notification-list">{notifications.map((notification) => <div key={notification.id}><span className={`d-account-icon is-${notification.tone}`}><Bell size={17}/></span><p><strong>{notification.title}</strong><small>{notification.detail}</small></p></div>)}{notifications.length === 0 && <div className="d-empty-state"><Check size={20}/><h3>You’re all caught up.</h3><p>No upcoming alerts or plan limits need your attention.</p></div>}</div>}
      </div>
      {kind !== 'search' && kind !== 'notifications' && kind !== 'wishlist' && !(kind === 'plan' && planMode === 'choose') && <footer><Button disabled={(kind === 'record' && (!amount || !entryCategory || !accountId || !date)) || (kind === 'entry' && (!selectedTransaction || !entryTitle.trim() || amount <= 0 || !date)) || (kind === 'move' && (!amount || !accountId || !toAccountId || accountId === toAccountId || amount > (fromAccount?.balance ?? 0))) || (kind === 'cooloff' && (!itemName.trim() || amount <= 0)) || (kind === 'goal' && (!goalName.trim() || amount <= 0)) || (kind === 'goalManage' && (!selectedGoal || !goalName.trim() || amount <= 0)) || ((kind === 'debt' || kind === 'debtManage') && (!debtName.trim() || amount <= 0)) || (kind === 'debtPayment' && (!selectedDebt || !accountId || amount <= 0 || amount > Math.max(0, debtTotal(selectedDebt) - debtPaid(selectedDebt)) || amount > (fromAccount?.balance ?? 0))) || (kind === 'account' && !accountName.trim()) || (kind === 'accountManage' && (!selectedAccount || !accountName.trim())) || (kind === 'category' && !categoryName.trim()) || (kind === 'funds' && (!goalId || !accountId || amount <= 0)) || (kind === 'plan' && planMode === 'limit' && (!budgetCategory || amount <= 0)) || (kind === 'plan' && planMode === 'bill' && (!billTitle.trim() || !budgetCategory || !dueDate || amount <= 0)) || (kind === 'plan' && planMode === 'cooloff' && (!itemName.trim() || amount <= 0)) || (kind === 'plan' && planMode === 'quest' && amount <= 0) || (kind === 'billManage' && (!billTitle.trim() || !budgetCategory || !dueDate || amount <= 0)) || (kind === 'billPayment' && (!selectedBill || !accountId || !date || (fromAccount?.balance ?? 0) < (selectedBill?.amount ?? 0))) || (kind === 'quest' && amount <= 0) || (kind === 'profile' && !profileName.trim())} onClick={() => {
        if (kind === 'record') onRecordEntry({ direction, amount, category: entryCategory, accountId, date, notes: notes.trim() || undefined })
        else if (kind === 'entry' && selectedTransaction) {
          const account = accounts.find((item) => item.id === accountId)
          onUpdateTransaction({ ...selectedTransaction, title: entryTitle.trim(), amount, date, notes: notes.trim() || undefined, ...(selectedTransaction.type === 'expense' || selectedTransaction.type === 'income' ? { category: entryCategory, source: selectedTransaction.type === 'income' ? entryCategory : selectedTransaction.source, accountId, account: account?.name ?? selectedTransaction.account } : {}) })
        }
        else if (kind === 'move') onMoveMoney({ amount, fromAccountId: accountId, toAccountId, date, notes: notes.trim() || undefined })
        else if (kind === 'cooloff') onCreateWishlistItem({ name: itemName.trim(), amount, categoryId: categories.find((item) => item.name === budgetCategory)?.id })
        else if (kind === 'goal') onCreateGoal({ name: goalName.trim(), target: amount, dueDate: dueDate || undefined, notes: notes.trim() || undefined })
        else if (kind === 'goalManage' && selectedGoal) onUpdateGoal(selectedGoal.id, { name: goalName.trim(), target: amount, saved: Math.min(amount, goalSaved), dueDate: dueDate || undefined, linkedAccountId: accountId || undefined, notes: notes.trim() || undefined, status: goalSaved >= amount ? 'Completed' : 'Active' })
        else if (kind === 'debt' || kind === 'debtManage') {
          const payload: DebtPayload = { title: debtName.trim(), personOrCompany: debtPerson.trim() || undefined, totalAmount: amount, paidAmount: Math.min(amount, paidAmount), dueDate: dueDate || undefined, category: debtCategory, status: paidAmount >= amount ? 'Paid' : debtStatus, notes: notes.trim() || undefined }
          if (kind === 'debtManage' && selectedDebt) onUpdateDebt(selectedDebt.id, payload)
          else onCreateDebt(payload)
        }
        else if (kind === 'debtPayment' && selectedDebt) onPayDebt({ debtId: selectedDebt.id, amount, accountId, date, notes: notes.trim() || undefined })
        else if (kind === 'account') onCreateAccount({ name: accountName.trim(), type: accountType, balance: amount })
        else if (kind === 'accountManage' && selectedAccount) onUpdateAccount({ ...selectedAccount, name: accountName.trim(), type: accountType, cardLabel: accountName.trim().slice(0, 5).toUpperCase() })
        else if (kind === 'category') onSaveCategory({ id: selectedCategory?.id ?? `category-${Date.now().toString(36)}`, name: categoryName.trim(), kind: categoryKind, color: selectedCategory?.color ?? (categoryKind === 'income' ? '#7C8A6B' : '#E2703A'), spendingNature: categoryKind === 'income' ? 'essential' : categoryNature })
        else if (kind === 'funds') onAddFunds({ goalId, accountId, amount })
        else if (kind === 'plan' && planMode === 'limit') onCreateBudget({ category: budgetCategory, amount })
        else if (kind === 'plan' && planMode === 'bill') onCreateUpcoming({ title: billTitle.trim(), amount, category: budgetCategory, dueDate, linkedAccountId: accountId || undefined, notes: notes.trim() || undefined, isRecurring: recurring, recurringFrequency: recurring ? 'monthly' : undefined })
        else if (kind === 'plan' && planMode === 'cooloff') onCreateWishlistItem({ name: itemName.trim(), amount, categoryId: categories.find((item) => item.name === budgetCategory)?.id })
        else if (kind === 'plan' && planMode === 'quest') {
          const startsOn = localDateKey()
          const ends = new Date(); ends.setDate(ends.getDate() + 6)
          onSaveQuest({ id: `quest-${Date.now().toString(36)}`, type: questType, title: questType === 'no_spend_days' ? `${amount} no-spend days` : questType === 'tracking_days' ? `Track every spend for ${amount} days` : `Keep ${budgetCategory} under Rs ${nf(amount)}`, categoryId: questType === 'category_limit' ? categories.find((item) => item.name === budgetCategory)?.id : undefined, targetAmount: questType === 'category_limit' ? amount : undefined, targetCount: questType === 'category_limit' ? undefined : amount, startsOn, endsOn: localDateKey(ends), status: 'active' })
        }
        else if (kind === 'billManage') {
          const payload: UpcomingPayload = { title: billTitle.trim(), amount, category: budgetCategory, dueDate, linkedAccountId: accountId || undefined, notes: notes.trim() || undefined, isRecurring: recurring, recurringFrequency: recurring ? 'monthly' : undefined }
          if (selectedBill) onUpdateUpcoming(selectedBill.id, payload)
          else onCreateUpcoming(payload)
        }
        else if (kind === 'billPayment' && selectedBill) onPayUpcoming(selectedBill, { accountId, paymentDate: date, notes: notes.trim() || undefined })
        else if (kind === 'quest') {
          const startsOn = localDateKey()
          const ends = new Date(); ends.setDate(ends.getDate() + 6)
          onSaveQuest({ id: `quest-${Date.now().toString(36)}`, type: questType, title: questType === 'no_spend_days' ? `${amount} no-spend days` : questType === 'tracking_days' ? `Track every spend for ${amount} days` : `Keep ${budgetCategory} under Rs ${nf(amount)}`, categoryId: questType === 'category_limit' ? categories.find((item) => item.name === budgetCategory)?.id : undefined, targetAmount: questType === 'category_limit' ? amount : undefined, targetCount: questType === 'category_limit' ? undefined : amount, startsOn, endsOn: localDateKey(ends), status: 'active' })
        }
        else if (kind === 'profile') onUpdateProfile({ ...profile, name: profileName.trim() })
        close()
      }}><Check size={18}/>{copy.save}</Button></footer>}
    </aside>
  </div>
}

export function DesktopExperience({ activePage, setActivePage, data, onSignOut, onRecordEntry, onMoveMoney, onCreateGoal, onCreateWishlistItem, onCreateAccount, onAddFunds, onCreateBudget, onUpdateTransaction, onDeleteTransaction, onUpdateAccount, onArchiveAccount, onUpdateGoal, onDeleteGoal, onCreateDebt, onUpdateDebt, onDeleteDebt, onPayDebt, onCreateUpcoming, onUpdateUpcoming, onDeleteUpcoming, onPayUpcoming, onUpdateWishlist, onDeleteWishlist, onBuyWishlist, onSaveQuest, onCancelQuest, onSaveCategory, onArchiveCategory, onRestartJourney, onUpdateProfile, onAnalyticsConsentChange }: DesktopExperienceProps) {
  const [modal, setModal] = useState<ModalKind | null>(null)
  const [modalTargetId, setModalTargetId] = useState<string>()
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const page = (Object.hasOwn(titles, activePage) ? activePage : 'dashboard') as DesktopPage
  const openModal: OpenModal = (kind, targetId) => { setModalTargetId(targetId); setModal(kind) }
  const closeModal = () => { setModal(null); setModalTargetId(undefined) }
  return <DesktopDataContext.Provider value={data}><div className="desktop-experience">
      <Rail activePage={page} setActivePage={setActivePage} />
      <main className="d-main">
        <Topbar page={page} openModal={openModal} setActivePage={setActivePage} period={period} setPeriod={setPeriod} accountFilter={accountFilter} setAccountFilter={setAccountFilter}/>
        {page === 'dashboard' && <HomePage setActivePage={setActivePage}/>}
        {page === 'transactions' && <LedgerPage period={period} setPeriod={setPeriod} openModal={openModal}/>}
        {page === 'accounts' && <WalletPage openModal={openModal} accountFilter={accountFilter}/>}
        {page === 'reports' && <InsightsPage openModal={openModal} period={period} setPeriod={setPeriod}/>}
        {page === 'goals' && <GoalsPage openModal={openModal}/>}
        {page === 'budgets' && <PlanPage openModal={openModal}/>}
        {page === 'settings' && <SettingsPage setActivePage={setActivePage} onSignOut={onSignOut} openModal={openModal} onAnalyticsConsentChange={onAnalyticsConsentChange} onRestartJourney={onRestartJourney}/>}
        {page === 'categories' && <CategoriesPage openModal={openModal} onArchiveCategory={onArchiveCategory}/>}
      </main>
      {modal && <SlideOver kind={modal} targetId={modalTargetId} close={closeModal} onRecordEntry={onRecordEntry} onMoveMoney={onMoveMoney} onCreateGoal={onCreateGoal} onCreateWishlistItem={onCreateWishlistItem} onCreateAccount={onCreateAccount} onAddFunds={onAddFunds} onCreateBudget={onCreateBudget} onUpdateTransaction={onUpdateTransaction} onDeleteTransaction={onDeleteTransaction} onUpdateAccount={onUpdateAccount} onArchiveAccount={onArchiveAccount} onUpdateGoal={onUpdateGoal} onDeleteGoal={onDeleteGoal} onCreateDebt={onCreateDebt} onUpdateDebt={onUpdateDebt} onDeleteDebt={onDeleteDebt} onPayDebt={onPayDebt} onCreateUpcoming={onCreateUpcoming} onUpdateUpcoming={onUpdateUpcoming} onDeleteUpcoming={onDeleteUpcoming} onPayUpcoming={onPayUpcoming} onUpdateWishlist={onUpdateWishlist} onDeleteWishlist={onDeleteWishlist} onBuyWishlist={onBuyWishlist} onSaveQuest={onSaveQuest} onCancelQuest={onCancelQuest} onSaveCategory={onSaveCategory} onUpdateProfile={onUpdateProfile}/>}
    </div></DesktopDataContext.Provider>
}

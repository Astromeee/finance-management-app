import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
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
  Utensils,
  WalletCards,
  X,
} from 'lucide-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Account, AccountType, Budget, Category, Debt, Goal, JourneySettings, MoneyQuest, Transaction, UpcomingExpense, WishlistItem } from '../../types/finance'
import type { Profile } from '../../lib/profile'
import { exportTransactionsCsv } from '../../lib/exports'
import { calculateSafeSpend, detectMoneyLeak } from '../../utils/journeyCalculations'

type DesktopPage = 'dashboard' | 'transactions' | 'accounts' | 'reports' | 'goals' | 'budgets' | 'settings'
type ModalKind = 'record' | 'move' | 'account' | 'cooloff' | 'funds' | 'goal' | 'plan' | 'profile'

export interface DesktopExperienceProps {
  activePage: string
  setActivePage: (page: string) => void
  data: DesktopFinanceData
  onRecord: () => void
  onMove: () => void
  onCoolOff: () => void
  onNewGoal: () => void
  onSignOut: () => void
  onCreateAccount: (payload: { name: string; type: AccountType; balance: number }) => void
  onAddFunds: (payload: { goalId: string; accountId: string; amount: number }) => void
  onCreateBudget: (payload: { category: string; amount: number }) => void
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
  reports: { eyebrow: 'July · Cycle 4', first: 'Your money,', accent: 'decoded.' },
  goals: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'paths.' },
  budgets: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'plan.' },
  settings: { eyebrow: 'Account', first: 'Your', accent: 'settings.' },
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
  const isSettings = activePage === 'settings'
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

function Topbar({ page, openModal, setActivePage, onRecord, onNewGoal }: { page: DesktopPage; openModal: (kind: ModalKind) => void; setActivePage: (page: string) => void; onRecord: () => void; onNewGoal: () => void }) {
  const { profile } = useDesktopData()
  const heading = titles[page]
  const isSettings = page === 'settings'
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there'
  return <header className="d-topbar">
    <div><Label>{heading.eyebrow}</Label><h1>{heading.first}{page === 'dashboard' && <br />} <em>{page === 'dashboard' ? `${firstName}.` : heading.accent}</em></h1></div>
    <div className="d-top-actions">
      {!isSettings && <button type="button" className="d-search"><Search size={16} /><span>{page === 'dashboard' ? 'Search transactions' : 'Search entries'}</span></button>}
      {page === 'dashboard' && <button type="button" className="d-icon-button" aria-label="Notifications"><Bell size={17} /></button>}
      {page === 'transactions' && <button type="button" className="d-filter"><CalendarDays size={16} />This cycle<ChevronDown size={14} /></button>}
      {page === 'accounts' && <button type="button" className="d-filter"><SlidersHorizontal size={16} />All accounts<ChevronDown size={14} /></button>}
      {page === 'reports' && <button type="button" className="d-filter">This cycle<ChevronDown size={14} /></button>}
      {page === 'goals' && <Button onClick={onNewGoal}><Plus size={17} />New goal</Button>}
      {page === 'budgets' && <Button onClick={() => openModal('plan')}><Plus size={17} />Add to plan</Button>}
      {(page === 'dashboard' || page === 'transactions') && <Button onClick={onRecord}><Plus size={17} />Record</Button>}
      {isSettings && <Button kind="secondary" onClick={() => setActivePage('dashboard')}><X size={16} />Close</Button>}
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

function TransactionRows({ compact = false }: { compact?: boolean }) {
  const { transactions } = useDesktopData()
  const rows = sortedTransactions(transactions).slice(0, compact ? 3 : 8)
  return <div className={`d-transactions ${compact ? 'is-compact' : ''}`}>{rows.map((row) => <div className="d-transaction" key={row.id}>
    <i className={`is-${transactionTone(row)}`} /><div className="d-entry"><strong>{row.title}</strong><small>{new Date(`${row.date}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</small></div>
    {!compact && <><span className="d-category">■ &nbsp; {transactionCategory(row)}</span><span>{row.account}</span></>}
    <Money accent={row.type === 'income'}>{transactionSign(row)}{nf(row.amount)}</Money>
  </div>)}{rows.length === 0 && <p className="d-empty">No ledger entries yet.</p>}</div>
}

function LedgerPage() {
  const { transactions } = useDesktopData()
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const out = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const net = income - out
  return <div className="d-columns">
    <Card className="d-work d-table-card">
      <div className="d-tabs"><button className="is-active">All</button><button>Spent</button><button>Received</button><button>Moved</button></div>
      <div className="d-table-head"><span>Entry</span><span>Category</span><span>Account</span><span>Amount</span></div>
      <div className="d-date-row"><h2>Your entries <small>· {transactions.length} total</small></h2><Money>{net >= 0 ? '+' : '−'}{nf(Math.abs(net))}</Money></div>
      <TransactionRows />
    </Card>
    <aside className="d-attention">
      <Card className="d-flow"><Label>Ledger flow</Label><p><span>● &nbsp; In</span><Money>{nf(income)}</Money></p><p><span>● &nbsp; Out</span><Money>{nf(out)}</Money></p><hr /><p><strong>Net</strong><Money accent={net >= 0}>{net >= 0 ? '+' : '−'}{nf(Math.abs(net))}</Money></p><div><i style={{ width: `${income + out > 0 ? (income / (income + out)) * 100 : 50}%` }} /><i /></div></Card>
      <Card className="d-fill"><Label>Where it went · July</Label><CategoryBars includeBills /><div className="d-legend">● Spent &nbsp;&nbsp; <b>● Received</b> &nbsp;&nbsp; ● Moved</div></Card>
    </aside>
  </div>
}

function WalletPage({ openModal, onMove }: { openModal: (kind: ModalKind) => void; onMove: () => void }) {
  const { accounts, transactions, upcomingExpenses } = useDesktopData()
  const total = totalOf(accounts)
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const spent = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const tones = ['clay', 'blue', 'sage', 'sand'] as const
  const icons = { bank: Landmark, wallet: WalletCards, cash: CircleDollarSign } as const
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-wallet-hero"><div><Label>On hand · all accounts</Label><p className="d-hero-number">Rs {nf(total)}</p><span><b>{income - spent >= 0 ? '+' : '−'}{nf(Math.abs(income - spent))}</b> net · after Rs {nf(spent)} spent</span></div><div><Button onClick={onMove}><ArrowRight size={17} />Move money</Button><Button kind="quiet" onClick={() => openModal('account')}><Plus size={17} />Add account</Button></div></section>
      <Card className="d-accounts d-fill"><div className="d-card-heading"><h2>Accounts</h2><Label>{accounts.length} linked</Label></div>{accounts.map((account, index) => { const Icon = icons[account.type]; const amount = total > 0 ? Math.round((account.balance / total) * 100) : 0; const tone = tones[index % tones.length]; return <button type="button" key={account.id}>
        <span className={`d-account-icon is-${tone}`}><Icon size={19} /></span><span><strong>{account.name}</strong><small>{account.type === 'wallet' ? 'Mobile wallet' : account.type === 'bank' ? 'Bank account' : 'Cash on hand'}</small></span><span className="d-account-share"><i><b className={`is-${tone}`} style={{ width: `${Math.max(0, amount)}%` }} /></i><small>{amount}% of on hand</small></span><Money>{nf(account.balance)}</Money><ChevronRight size={16} />
      </button>})}</Card>
    </div>
    <aside className="d-attention">
      <Card className="d-chart-card"><div><Label>Balance · this cycle</Label><b>{income - spent >= 0 ? '+' : '−'}{nf(Math.abs(income - spent))}</b></div><svg viewBox="0 0 400 120" role="img" aria-label="Account balance trend"><defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E2703A" stopOpacity=".24"/><stop offset="1" stopColor="#E2703A" stopOpacity="0"/></linearGradient></defs><path d="M0 88 L52 78 L104 84 L156 58 L208 68 L260 42 L312 50 L356 24 L400 18 L400 120 L0 120Z" fill="url(#balanceFill)"/><path d="M0 88 L52 78 L104 84 L156 58 L208 68 L260 42 L312 50 L356 24 L400 18" fill="none" stroke="#E2703A" strokeWidth="3"/></svg><footer><span>Start</span><span>Rs {nf(total)}</span><span>today</span></footer></Card>
      <Card className="d-quick"><Label>Quick move</Label><div><span><small>From</small><strong>{accounts[0]?.name ?? 'Add account'}</strong></span><b>→</b><span><small>To</small><strong>{accounts[1]?.name ?? 'Add account'}</strong></span></div><footer><Money><small>Rs</small> —</Money><Button onClick={onMove}>Move</Button></footer></Card>
      <Card className="d-fill d-scheduled"><Label>Scheduled next</Label>{upcomingExpenses.filter((item) => item.status !== 'paid').slice(0, 3).map((item) => <p key={item.id}><span>↓</span><strong>{item.title}<small>{item.dueDate} · {item.category}</small></strong><Money>−{nf(item.amount)}</Money></p>)}{upcomingExpenses.filter((item) => item.status !== 'paid').length === 0 && <p className="d-empty">Nothing scheduled.</p>}<footer>Current balance <Money>Rs {nf(total)}</Money></footer></Card>
    </aside>
  </div>
}

function InsightsPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
  const { budgets, categories: financeCategories, journeySettings, transactions, upcomingExpenses, accounts } = useDesktopData()
  const expenses = transactions.filter((item) => item.type === 'expense')
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
  const totals = categoryTotals(transactions)
  const top = totals[0]
  const safe = calculateSafeSpend({ accounts, budgets, categories: financeCategories, upcomingExpenses, settings: journeySettings })
  return <div className="d-columns">
    <div className="d-work">
      <Card className="d-spend-chart"><div className="d-card-heading"><div><Label>Spending recorded</Label><h2>Rs {nf(totalExpenses)}</h2></div><span>{expenses.length} entries</span></div><svg viewBox="0 0 760 240" role="img" aria-label="Daily spending chart"><path d="M0 210 H760 M0 150 H760 M0 90 H760 M0 30 H760" stroke="#EDE5D5"/><path d="M0 188 C65 174 80 192 145 152 S235 174 300 116 S390 140 455 82 S545 105 610 58 S700 72 760 30" fill="none" stroke="#E2703A" strokeWidth="5"/><path d="M0 188 C65 174 80 192 145 152 S235 174 300 116 S390 140 455 82 S545 105 610 58 S700 72 760 30 L760 240 L0 240Z" fill="#E2703A" opacity=".09"/></svg></Card>
      <Card className="d-fill"><div className="d-card-heading"><h2>Category story</h2><Label>Live ledger</Label></div><CategoryBars includeBills /><div className="d-insight-note"><Utensils size={19}/><p><strong>{top ? `${top[0]} is your largest recorded category.` : 'No category pattern yet.'}</strong><br/>{top ? `Rs ${nf(top[1])} across your ledger.` : 'Record spending to build your story.'}</p><Button kind="secondary">Set a limit</Button></div></Card>
    </div>
    <aside className="d-attention">
      <section className="d-hero d-pace"><Label>Safe today</Label><Money>Rs {nf(safe.safeToSpendToday)}</Money><p>{safe.explanation}</p><div><span style={{ width: `${Math.min(100, Math.max(8, safe.safeToSpendToday > 0 ? 62 : 8))}%` }} /></div><small>Flexible money remaining <b>Rs {nf(safe.flexibleMoneyRemaining)}</b>.</small></section>
      <Card><Label>Biggest category</Label><h2>{top?.[0] ?? 'No data yet'} {top && <Money accent>Rs {nf(top[1])}</Money>}</h2><p className="d-muted">Based on your actual recorded transactions.</p></Card>
      <section className="d-leak d-nudge"><Label>Worth a pause?</Label><h2>A new pair of headphones</h2><p>Save it for 48 hours. If it still feels right, it stays.</p><Button kind="secondary" onClick={() => openModal('cooloff')}>Cool it off <ArrowRight size={15}/></Button></section>
      <Card className="d-fill d-quote"><Sparkles size={22}/><h2>“Awareness beats restriction.”</h2><p>Your spending is already trending down.</p></Card>
    </aside>
  </div>
}

function GoalsPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
  const { goals } = useDesktopData()
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0)
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const featured = [...goals].filter((goal) => goal.status !== 'Completed').sort((a, b) => (b.saved / Math.max(1, b.target)) - (a.saved / Math.max(1, a.target)))[0] ?? goals[0]
  const featuredProgress = featured ? Math.round((featured.saved / Math.max(1, featured.target)) * 100) : 0
  const tones = ['sage', 'blue', 'sand'] as const
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-goal-hero"><div><Label>Closest path</Label><h2>{featured?.name ?? 'Create your first goal'}</h2><p><Money>Rs {nf(featured?.saved ?? 0)}</Money> of Rs {nf(featured?.target ?? 0)}</p><div><span style={{ width: `${featuredProgress}%` }}/></div><small>Rs {nf(Math.max(0, (featured?.target ?? 0) - (featured?.saved ?? 0)))} to go</small></div><div className="d-goal-ring" style={{ background: `conic-gradient(#E2703A ${featuredProgress}%,#4A4035 0)` }}><span>{featuredProgress}<small>%</small></span></div></section>
      <div className="d-goal-grid">{goals.slice(0, 3).map((goal, index) => { const progress = Math.round((goal.saved / Math.max(1, goal.target)) * 100); const tone = tones[index % tones.length]; return <Card key={goal.id}><span className={`d-account-icon is-${tone}`}><Target size={18}/></span><h2>{goal.name}</h2><p><Money>Rs {nf(goal.saved)}</Money><small>of Rs {nf(goal.target)}</small></p><div><span className={`is-${tone}`} style={{ width: `${progress}%` }}/></div><footer><small>{progress}% funded</small><ChevronRight size={15}/></footer></Card>})}{goals.length === 0 && <Card><h2>No goals yet</h2><p className="d-muted">Create a path to start saving.</p></Card>}</div>
      <Card className="d-fill d-contribution"><div><Label>Across your goals</Label><h2>You have saved <Money accent>Rs {nf(totalSaved)}</Money> toward your future.</h2></div><Button onClick={() => openModal('funds')} disabled={!featured}><Plus size={16}/>Add funds</Button></Card>
    </div>
    <aside className="d-attention">
      <Card><Label>All paths</Label><h2><Money>Rs {nf(totalSaved)}</Money></h2><p className="d-muted">saved toward Rs {nf(totalTarget)} across {goals.length} goals</p></Card>
      <Card className="d-timeline"><Label>Coming into view</Label>{goals.slice(0, 3).map((goal) => <p key={goal.id}><i/>{goal.name}<strong>{goal.dueDate ?? 'No date'}</strong></p>)}</Card>
      <section className="d-leak d-goal-nudge"><Label>A gentle nudge</Label><h2>{featured ? `A contribution puts ${featured.name} closer.` : 'Create a goal to begin your next path.'}</h2><Button kind="secondary" onClick={() => openModal('funds')} disabled={!featured}>Add funds</Button></section>
      <Card className="d-fill d-quote"><Target size={22}/><h2>Three paths. One steady pace.</h2><p>You're ahead of where you started.</p></Card>
    </aside>
  </div>
}

function PlanPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
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
      <Card className="d-scheduled"><Label>Scheduled</Label><p><span>↑</span><strong>{upcomingExpenses.filter((item) => item.status !== 'paid').length} payments<small>still upcoming</small></strong><Money>Rs {nf(upcomingExpenses.filter((item) => item.status !== 'paid').reduce((sum, item) => sum + item.amount, 0))}</Money></p><footer>Included in your live plan</footer></Card>
      <section className="d-leak d-nudge"><Label>Cool-off list</Label><h2>{activeWishlist.length} {activeWishlist.length === 1 ? 'decision is' : 'decisions are'} waiting</h2><p>{activeWishlist[0]?.name ?? 'Nothing waiting right now'}</p><Button kind="secondary" onClick={() => openModal('cooloff')}>Review <ArrowRight size={15}/></Button></section>
      <Card className="d-quest"><div><Label>This week's quest</Label><small>{moneyQuest?.status ?? 'not started'}</small></div><h2>{moneyQuest?.title ?? 'Choose a small money quest'}</h2><div className="d-segments"><i/><i/><i/></div><p><strong>{moneyQuest ? 'In progress' : 'Ready when you are'}</strong></p></Card>
      <Card className="d-fill d-plan-note"><Label>Plan balance</Label><h2>You have <Money accent>Rs {nf(left)}</Money> left across your limits.</h2><p>Based on your current budgets.</p></Card>
    </aside>
  </div>
}

function Toggle({ on = true, onClick }: { on?: boolean; onClick?: () => void }) { return <button type="button" aria-label="Toggle setting" aria-pressed={on} className={`d-toggle ${on ? 'is-on' : ''}`} onClick={onClick}><i/></button> }

function SettingsPage({ setActivePage, onSignOut, openModal, onAnalyticsConsentChange }: { setActivePage: (page: string) => void; onSignOut: () => void; openModal: (kind: ModalKind) => void; onAnalyticsConsentChange: (granted: boolean) => void }) {
  const { accounts, authEmail, journeySettings, profile, transactions } = useDesktopData()
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'P'
  return <div className="d-columns d-settings-grid">
    <div className="d-work">
      <Card className="d-profile-card"><span>{profile.avatar ? <img src={profile.avatar} alt="" /> : initial}</span><div><h2>{profile.name}</h2><p>{authEmail ?? 'Signed-in Pocket Ledger account'}</p></div><Button kind="secondary" onClick={() => openModal('profile')}><Pencil size={16}/>Edit profile</Button></Card>
      <Card className="d-settings-card"><Label>Cycle & money</Label><div><span className="d-account-icon is-clay"><CalendarDays size={18}/></span><p><strong>Income cycle</strong><small>{journeySettings.nextIncomeDate ? `Next income ${journeySettings.nextIncomeDate}` : 'Add your next income date in journey setup'}</small></p><strong>{journeySettings.incomeCadence ? journeySettings.incomeCadence.replace('_', ' ') : 'Not set'}</strong></div><div><span className="d-account-icon is-sage"><CircleDollarSign size={18}/></span><p><strong>Currency</strong><small>Shown across the app</small></p><strong>PKR · Rs</strong></div><div><span className="d-account-icon is-blue"><Sparkles size={18}/></span><p><strong>Accounts included</strong><small>Balances used across your plan</small></p><strong>{accounts.length}</strong></div></Card>
      <Card className="d-settings-card d-fill"><Label>Preferences</Label><div><p><strong>Analytics consent</strong><small>Help improve Pocket Ledger</small></p><Toggle on={journeySettings.analyticsConsent} onClick={() => onAnalyticsConsentChange(!journeySettings.analyticsConsent)}/></div><div><p><strong>Journey setup</strong><small>{journeySettings.nextIncomeDate ? `Next income ${journeySettings.nextIncomeDate}` : 'Income cycle not configured'}</small></p></div><div><p><strong>Safety reserve</strong><small>Protected from safe-to-spend</small></p><Money>Rs {nf(journeySettings.safetyReserve)}</Money></div></Card>
    </div>
    <aside className="d-attention">
      <Card className="d-settings-card d-fill"><Label>Data & security</Label><button className="d-setting-link" onClick={() => setActivePage('categories')}><span className="d-account-icon is-sage"><WalletCards size={18}/></span><strong>Manage categories</strong><ChevronRight size={15}/></button><button className="d-setting-link" onClick={() => setActivePage('accounts')}><span className="d-account-icon is-blue"><CreditCard size={18}/></span><strong>Linked accounts</strong><small>{accounts.length}</small><ChevronRight size={15}/></button><button className="d-setting-link" onClick={() => exportTransactionsCsv(transactions)}><span className="d-account-icon is-sand"><Download size={18}/></span><strong>Export data</strong><small>CSV</small><ChevronRight size={15}/></button></Card>
      <Button kind="secondary" onClick={onSignOut}><LockKeyhole size={16}/>Sign out</Button>
    </aside>
  </div>
}

const modalCopy: Record<ModalKind, { badge: string; title: string; subtitle: string; save: string }> = {
  record: { badge: 'New entry', title: 'Record a spend', subtitle: 'Log it before you forget.', save: 'Save entry' },
  move: { badge: 'Transfer', title: 'Move money', subtitle: 'Shift money between your accounts.', save: 'Move Rs 2,000' },
  account: { badge: 'Wallet', title: 'Add an account', subtitle: 'Bring another balance into view.', save: 'Add account' },
  cooloff: { badge: '48 hour pause', title: 'Cool off a buy', subtitle: 'Give the decision some breathing room.', save: 'Start cool-off' },
  funds: { badge: 'Goal deposit', title: 'Add funds', subtitle: 'Move one of your paths closer.', save: 'Add Rs 2,000' },
  goal: { badge: 'New path', title: 'Create a goal', subtitle: 'Name what you are moving toward.', save: 'Create goal' },
  plan: { badge: 'New limit', title: 'Add to your plan', subtitle: 'Give this category a comfortable edge.', save: 'Add to plan' },
  profile: { badge: 'Your profile', title: 'Edit profile', subtitle: 'Use the name shown across Pocket Ledger.', save: 'Save profile' },
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="d-field"><span>{label}</span><div>{children}</div></label> }

function SlideOver({ kind, close, onCreateAccount, onAddFunds, onCreateBudget, onUpdateProfile }: { kind: ModalKind; close: () => void; onCreateAccount: DesktopExperienceProps['onCreateAccount']; onAddFunds: DesktopExperienceProps['onAddFunds']; onCreateBudget: DesktopExperienceProps['onCreateBudget']; onUpdateProfile: DesktopExperienceProps['onUpdateProfile'] }) {
  const copy = modalCopy[kind]
  const { accounts, categories, goals, profile } = useDesktopData()
  const [amount, setAmount] = useState(kind === 'funds' ? 2000 : kind === 'plan' ? 10000 : 0)
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('bank')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [goalId, setGoalId] = useState(goals[0]?.id ?? '')
  const [budgetCategory, setBudgetCategory] = useState(categories.find((item) => item.kind === 'expense')?.name ?? '')
  const [profileName, setProfileName] = useState(profile.name)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])
  return <div className="d-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <aside className="d-slide-over" role="dialog" aria-modal="true" aria-labelledby="desktop-modal-title">
      <header><div><span><Plus size={14}/></span>{copy.badge}</div><button type="button" onClick={close} aria-label="Close"><X size={17}/></button><h2 id="desktop-modal-title">{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="d-modal-body">
        {kind === 'record' && <><div className="d-tabs d-modal-tabs"><button className="is-active">Spent</button><button>Received</button></div><Field label="Amount"><Money><small>Rs</small> 850</Money></Field><div className="d-chips"><button>200</button><button>500</button><button>1,000</button><button>2,000</button></div><Field label="Category"><div className="d-chips"><button className="is-active">Dining Out</button><button>Groceries</button><button>Transport</button><button>Bills</button></div></Field><div className="d-field-row"><Field label="Account">JazzCash ••42 <ChevronDown size={14}/></Field><Field label="When">Today <ChevronDown size={14}/></Field></div><Field label="Note"><span className="d-placeholder">Lunch with the team</span></Field></>}
        {kind === 'move' && <><div className="d-transfer-choice"><Field label="From">HBL Bank <ChevronDown size={14}/></Field><ArrowRight/><Field label="To">JazzCash <ChevronDown size={14}/></Field></div><Field label="Amount"><Money><small>Rs</small> 2,000</Money></Field><Card className="d-modal-summary"><Label>After this move</Label><p>HBL Bank <Money>Rs 32,120</Money></p><p>JazzCash <Money>Rs 31,800</Money></p></Card><Field label="Note"><span className="d-placeholder">Optional</span></Field></>}
        {kind === 'account' && <><Field label="Account name"><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="e.g. Meezan Savings" /></Field><Field label="Opening balance"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} placeholder="0" /></Field><div className="d-account-types"><button type="button" className={accountType === 'bank' ? 'is-active' : ''} onClick={() => setAccountType('bank')}><Landmark/>Bank</button><button type="button" className={accountType === 'wallet' ? 'is-active' : ''} onClick={() => setAccountType('wallet')}><WalletCards/>Wallet</button><button type="button" className={accountType === 'cash' ? 'is-active' : ''} onClick={() => setAccountType('cash')}><CircleDollarSign/>Cash</button></div></>}
        {kind === 'cooloff' && <><Field label="What are you considering?"><span>New headphones</span></Field><Field label="Expected price"><Money><small>Rs</small> 18,500</Money></Field><div className="d-pause-card"><Sparkles/><h3>A little space, not a “no”.</h3><p>We’ll bring this back in 48 hours so you can decide with a clear head.</p></div></>}
        {kind === 'funds' && <><Field label="Goal"><select value={goalId} onChange={(event) => setGoalId(event.target.value)}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></Field><Field label="Amount"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} /></Field><div className="d-chips"><button type="button" onClick={() => setAmount(1000)}>1,000</button><button type="button" className={amount === 2000 ? 'is-active' : ''} onClick={() => setAmount(2000)}>2,000</button><button type="button" onClick={() => setAmount(5000)}>5,000</button></div><Field label="From"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · Rs {nf(account.balance)}</option>)}</select></Field></>}
        {kind === 'goal' && <><Field label="Goal name"><span className="d-placeholder">e.g. Rainy day fund</span></Field><Field label="Target amount"><Money><small>Rs</small> 100,000</Money></Field><Field label="Target date">December 2026 <CalendarDays size={15}/></Field><div className="d-account-types"><button className="is-active"><Target/>Safety</button><button><Sparkles/>Dream</button><button><Landmark/>Milestone</button></div></>}
        {kind === 'plan' && <><Field label="Category"><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{categories.filter((item) => item.kind === 'expense').map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><Field label="Monthly limit"><span>Rs</span><input inputMode="decimal" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^0-9.]/g, '')) || 0)} /></Field><Card className="d-modal-summary"><Label>Live plan</Label><p>This limit will be added to your current budget.</p></Card></>}
        {kind === 'profile' && <><Field label="Display name"><input value={profileName} onChange={(event) => setProfileName(event.target.value)} autoFocus /></Field><Card className="d-modal-summary"><Label>Profile photo</Label><p>Your current photo is preserved. You can change it from the full mobile profile editor.</p></Card></>}
      </div>
      <footer><Button disabled={(kind === 'account' && !accountName.trim()) || (kind === 'funds' && (!goalId || !accountId || amount <= 0)) || (kind === 'plan' && (!budgetCategory || amount <= 0)) || (kind === 'profile' && !profileName.trim())} onClick={() => { if (kind === 'account') onCreateAccount({ name: accountName.trim(), type: accountType, balance: amount }); else if (kind === 'funds') onAddFunds({ goalId, accountId, amount }); else if (kind === 'plan') onCreateBudget({ category: budgetCategory, amount }); else if (kind === 'profile') onUpdateProfile({ ...profile, name: profileName.trim() }); close() }}><Check size={18}/>{copy.save}</Button></footer>
    </aside>
  </div>
}

export function DesktopExperience({ activePage, setActivePage, data, onRecord, onMove, onCoolOff, onNewGoal, onSignOut, onCreateAccount, onAddFunds, onCreateBudget, onUpdateProfile, onAnalyticsConsentChange }: DesktopExperienceProps) {
  const [modal, setModal] = useState<ModalKind | null>(null)
  const page = (Object.hasOwn(titles, activePage) ? activePage : 'dashboard') as DesktopPage
  const openModal = (kind: ModalKind) => {
    if (kind === 'record') return onRecord()
    if (kind === 'move') return onMove()
    if (kind === 'cooloff') return onCoolOff()
    if (kind === 'goal') return onNewGoal()
    setModal(kind)
  }
  return <DesktopDataContext.Provider value={data}><div className="desktop-experience">
      <Rail activePage={page} setActivePage={setActivePage} />
      <main className="d-main">
        <Topbar page={page} openModal={openModal} setActivePage={setActivePage} onRecord={onRecord} onNewGoal={onNewGoal}/>
        {page === 'dashboard' && <HomePage setActivePage={setActivePage}/>}
        {page === 'transactions' && <LedgerPage/>}
        {page === 'accounts' && <WalletPage openModal={openModal} onMove={onMove}/>}
        {page === 'reports' && <InsightsPage openModal={openModal}/>}
        {page === 'goals' && <GoalsPage openModal={openModal}/>}
        {page === 'budgets' && <PlanPage openModal={openModal}/>}
        {page === 'settings' && <SettingsPage setActivePage={setActivePage} onSignOut={onSignOut} openModal={openModal} onAnalyticsConsentChange={onAnalyticsConsentChange}/>}
      </main>
      {modal && <SlideOver kind={modal} close={() => setModal(null)} onCreateAccount={onCreateAccount} onAddFunds={onAddFunds} onCreateBudget={onCreateBudget} onUpdateProfile={onUpdateProfile}/>}
    </div></DesktopDataContext.Provider>
}

import { ArrowDown, ArrowUpRight, Bell, CalendarClock, ChevronRight, Clock, Eye, EyeOff, Landmark, WalletCards, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { InstallAppButton } from '../components/pwa/InstallAppButton'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import type { Account, Budget, Debt, DebtStatus, Goal, Transaction, UpcomingExpense } from '../types/finance'

type DashboardAction = 'income' | 'expense' | 'transfer' | 'goal' | 'debt' | null

interface AccountMeta {
  key: string
  accent: string
  logo: ReactNode
  typeLabel: string
  mask: string
}

export function Dashboard({
  accounts,
  transactions,
  goals,
  debts,
  budgets,
  upcomingExpenses,
  onAction,
  onNavigate,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  upcomingExpenses: UpcomingExpense[]
  onAction: (action: DashboardAction) => void
  onNavigate: (page: string) => void
}) {
  void transactions
  void goals
  void budgets
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBalance, setShowBalance] = useState(false)

  const notifications = useMemo(() => dashboardNotifications(upcomingExpenses, debts), [debts, upcomingExpenses])
  const timeText = useMemo(() => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const hour12 = ((hours + 11) % 12) + 1
    return `${hour12}:${minutes}${hours >= 12 ? 'PM' : 'AM'}`
  }, [])
  const total = totalBalance(accounts)
  const savingsBalance = accounts.find((account) => account.id === 'savings')?.balance ?? 0
  const availableToUse = Math.max(0, total - savingsBalance)

  return (
    <div className="home-screen pb-6">
      <motion.section
        className="home-ledger-hero"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: 'easeOut' }}
      >
        <div className="home-ledger-glow" />
        <div className="home-ledger-status-strip">
          <Zap size={16} />
          <span>Money view is ready</span>
        </div>

        <div className="home-ledger-card">
          <div className="home-ledger-topbar">
            <div className="home-ledger-status">
              <span />
              <strong>Synced ledger</strong>
            </div>
            <div className="flex items-center gap-2">
              <div className="home-ledger-time">
                <Clock size={16} />
                <span>{timeText}</span>
              </div>
              <InstallAppButton />
              <div className="relative">
                <button className="home-glass-icon relative" aria-label="Notifications" onClick={() => setShowNotifications((current) => !current)}>
                  <Bell size={20} />
                  {notifications.length > 0 && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(221,255,69,.7)]" />}
                </button>
                {showNotifications && (
                  <div className="home-notification-panel">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Notifications</p>
                        <h3 className="text-lg font-semibold text-white">Payments to watch</h3>
                      </div>
                      <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-black text-[#101214]">{notifications.length}</span>
                    </div>
                    <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="rounded-2xl bg-white/[.035] p-3 text-sm text-[var(--muted)]">No upcoming future payments or overdue debts right now.</p>
                      ) : notifications.map((item) => {
                        const Icon = item.kind === 'upcoming' ? CalendarClock : Landmark
                        return (
                          <button key={item.id} className="home-notification-item" onClick={() => { setShowNotifications(false); onNavigate('goals') }}>
                            <span className={`home-notification-icon home-notification-${item.tone}`}><Icon size={16} /></span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                              <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.meta}</span>
                            </span>
                            <strong className="text-sm text-white">{formatPKR(item.amount)}</strong>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="home-ledger-identity">
            <div className="home-avatar">M</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--muted)]">Good Morning, Moeed</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-white">Pocket Ledger</h1>
            </div>
          </div>

          <div className="home-ledger-balance">
            <div className="flex items-center gap-3">
              <p>Total Balance</p>
              <button onClick={() => setShowBalance((current) => !current)} aria-label={showBalance ? 'Hide balance' : 'Show balance'}>
                {showBalance ? <EyeOff size={21} /> : <Eye size={21} />}
              </button>
            </div>
            <h2>{showBalance ? formatPKR(total) : 'Rs •••••'}</h2>
            <span>Available to use: <strong>{showBalance ? formatPKR(availableToUse) : 'Rs •••••'}</strong></span>
          </div>

          <div className="home-ledger-actions" aria-label="Quick money actions">
            <button onClick={() => onAction('income')}>
              <ArrowDown size={18} />
              <span>Add Income</span>
            </button>
            <button onClick={() => onAction('expense')}>
              <ArrowUpRight size={18} />
              <span>Add Expense</span>
            </button>
          </div>

          <button className="home-ledger-overview" onClick={() => onNavigate('reports')}>
            <span>Open analytics</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </motion.section>

      <section className="home-accounts-section">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">My Accounts</h2>
          <span className="font-semibold text-[var(--accent)]">{accounts.length} accounts</span>
        </div>
        <div className="home-account-list">
          {accounts.map((account) => {
            const meta = accountMeta(account)
            return (
              <article key={account.id} className={`home-account-card home-account-${meta.key}`}>
                <div className="home-card-pattern" />
                <span className="home-card-line" />
                <div className="home-logo-box">{meta.logo}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl font-semibold text-white">{account.name}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">{meta.typeLabel}</p>
                  <span className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[var(--muted)]" style={{ borderColor: `${meta.accent}55`, backgroundColor: `${meta.accent}12` }}>
                    **** {account.cardLabel || meta.mask}
                  </span>
                </div>
                <strong className="ml-auto shrink-0 text-2xl font-semibold text-white sm:text-3xl">{formatPKR(account.balance)}</strong>
                <ChevronRight className="shrink-0 text-white/55" size={24} />
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function accountMeta(account: Account): AccountMeta {
  switch (account.id) {
    case 'cash':
      return { key: 'cash', accent: '#ddff45', logo: <WalletCards size={30} />, typeLabel: 'Wallet', mask: 'CASH' }
    case 'hbl':
      return { key: 'hbl', accent: '#35e7cc', logo: 'HBL', typeLabel: 'Bank Account', mask: 'HBL' }
    case 'meezan':
      return { key: 'meezan', accent: '#b46cff', logo: 'MB', typeLabel: 'Bank Account', mask: 'MEEZ' }
    case 'jazzcash':
      return { key: 'jazzcash', accent: '#ff9f2f', logo: 'Jazz', typeLabel: 'Mobile Wallet', mask: 'JAZZ' }
    case 'easypaisa':
      return { key: 'easypaisa', accent: '#39dced', logo: 'e', typeLabel: 'Mobile Wallet', mask: 'EASYP' }
    default:
      return { key: 'default', accent: account.color || '#ddff45', logo: account.name.slice(0, 2).toUpperCase(), typeLabel: account.type, mask: account.id.slice(0, 4).toUpperCase() }
  }
}

type DashboardNotification = {
  id: string
  kind: 'upcoming' | 'debt'
  title: string
  meta: string
  amount: number
  tone: 'lime' | 'orange' | 'red'
}

function dashboardNotifications(upcomingExpenses: UpcomingExpense[], debts: Debt[]): DashboardNotification[] {
  const upcoming = upcomingExpenses
    .filter((expense) => expense.status !== 'paid')
    .map((expense) => {
      const status = upcomingStatus(expense.dueDate)
      return {
        id: `upcoming-${expense.id}`,
        kind: 'upcoming' as const,
        title: expense.title,
        meta: `${status.label} · Due ${formatDashboardDate(expense.dueDate)}`,
        amount: expense.amount,
        tone: status.tone,
      }
    })

  const debtAlerts = debts
    .map((debt) => ({ debt, status: debtDisplayStatus(debt), remaining: debtRemaining(debt) }))
    .filter(({ status, remaining }) => remaining > 0 && (status === 'Overdue' || status === 'Due Soon'))
    .map(({ debt, status, remaining }) => ({
      id: `debt-${debt.id}`,
      kind: 'debt' as const,
      title: debt.title || debt.name || 'Debt',
      meta: `${status} · ${debt.category ?? 'Debt'}${debt.dueDate ? ` · Due ${formatDashboardDate(debt.dueDate)}` : ''}`,
      amount: remaining,
      tone: status === 'Overdue' ? 'red' as const : 'orange' as const,
    }))

  return [...upcoming, ...debtAlerts].slice(0, 12)
}

function upcomingStatus(dueDate: string) {
  const due = startOfDay(dueDate).getTime()
  const now = startOfDay(today()).getTime()
  const daysUntilDue = Math.ceil((due - now) / 86400000)
  if (daysUntilDue < 0) return { label: 'Overdue future payment', tone: 'red' as const }
  if (daysUntilDue <= 7) return { label: 'Due soon future payment', tone: 'orange' as const }
  return { label: 'Upcoming future payment', tone: 'lime' as const }
}

function debtDisplayStatus(debt: Debt): DebtStatus {
  if (debtRemaining(debt) <= 0) return 'Paid'
  if (debt.dueDate) {
    const due = startOfDay(debt.dueDate).getTime()
    const now = startOfDay(today()).getTime()
    const daysUntilDue = Math.ceil((due - now) / 86400000)
    if (daysUntilDue < 0) return 'Overdue'
    if (daysUntilDue <= 7) return 'Due Soon'
  }
  return debt.status === 'Overdue' || debt.status === 'Due Soon' ? debt.status : 'Active'
}

function debtRemaining(debt: Debt) {
  return Math.max(0, (debt.totalAmount ?? debt.total ?? 0) - (debt.paidAmount ?? debt.paid ?? 0))
}

function formatDashboardDate(date: string) {
  return new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function startOfDay(date: string) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

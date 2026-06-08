import { ArrowDown, ArrowRightLeft, ArrowUpRight, Bell, ChevronRight, Eye, Menu, Target, TrendingUp, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import type { Account, Budget, Debt, Goal, Transaction } from '../types/finance'

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
  onAction,
}: {
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  debts: Debt[]
  budgets: Budget[]
  onAction: (action: DashboardAction) => void
}) {
  void transactions
  void goals
  void debts
  void budgets

  const quickActions = [
    { label: 'Income', icon: ArrowDown, action: 'income' as const },
    { label: 'Expense', icon: ArrowUpRight, action: 'expense' as const },
    { label: 'Transfer', icon: ArrowRightLeft, action: 'transfer' as const },
    { label: 'Goal', icon: Target, action: 'goal' as const },
  ]

  return (
    <div className="home-screen pb-6">
      <section className="home-profile-row">
        <div className="flex min-w-0 items-center gap-4">
          <div className="home-avatar">M</div>
          <div className="min-w-0">
            <p className="text-lg leading-tight text-[var(--muted)]">Good Morning,</p>
            <h1 className="text-2xl font-semibold leading-tight text-white">Moeed</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="home-glass-icon relative" aria-label="Notifications">
            <Bell size={20} />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(221,255,69,.7)]" />
          </button>
          <button className="home-glass-icon" aria-label="Menu">
            <Menu size={22} />
          </button>
        </div>
      </section>

      <section className="home-balance-card">
        <div className="home-wire-globe" />
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">Total Balance</p>
            <Eye className="text-[var(--accent)]" size={22} />
          </div>
          <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">{formatPKR(totalBalance(accounts))}</h2>
          <div className="mt-6 flex items-center justify-between gap-4">
            <button className="home-overview-pill">
              <span>Overview</span>
              <ChevronRight size={20} />
            </button>
            <button className="home-trend-button" aria-label="Balance trend">
              <TrendingUp size={25} />
            </button>
          </div>
        </div>
      </section>

      <section className="home-action-pill" aria-label="Quick actions">
        {quickActions.map(({ label, icon: Icon, action }, index) => (
          <button key={label} className="home-action-button" onClick={() => onAction(action)}>
            <span className="home-action-icon"><Icon size={22} /></span>
            <span>{label}</span>
            {index < quickActions.length - 1 && <i />}
          </button>
        ))}
      </section>

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
                  <h3 className="truncate text-xl font-semibold" style={{ color: meta.accent }}>{account.name}</h3>
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

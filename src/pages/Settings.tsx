import { BarChart3, Bell, Calendar, ChevronLeft, ChevronRight, CreditCard, DollarSign, Download, HelpCircle, LayoutGrid, LogOut, Lock, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { exportTransactionsCsv } from '../lib/exports'
import { supabase } from '../lib/supabase'
import { initialsOf } from '../lib/profile'
import type { Profile } from '../lib/profile'
import type { Account, Budget, Category, Debt, Goal, JourneySettings, Transaction, UpcomingExpense } from '../types/finance'

type Props = {
  authEmail?: string; authProvider?: string
  accounts: Account[]; budgets: Budget[]; categories: Category[]; debts: Debt[]; goals: Goal[]
  transactions: Transaction[]; upcomingExpenses: UpcomingExpense[]
  expenseCategories: string[]; incomeCategories: string[]; profile: Profile
  journeySettings: JourneySettings
  onNavigate: (page: string) => void
  analyticsConsent: boolean
  onAnalyticsConsentChange: (granted: boolean) => void
  onRestartTour: () => void
  onProfileChange: (profile: Profile) => void
  onSaveCategory: (category: Category) => Promise<void>
  onArchiveCategory: (id: string) => Promise<void>
  onSaveBudget: (budget: Budget) => Promise<void>
  onDeleteBudget: (id: string) => Promise<void>
  onSignOut: () => void
}

function ordinal(day: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = day % 100
  return `${day}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function incomeCycleLabel(settings: JourneySettings) {
  const cadence = settings.incomeCadence ?? 'monthly'
  const label = cadence.charAt(0).toUpperCase() + cadence.slice(1)
  if (settings.nextIncomeDate) {
    const day = new Date(`${settings.nextIncomeDate}T12:00:00`).getDate()
    if (Number.isFinite(day)) return `${label} · ${ordinal(day)}`
  }
  return label
}

export function Settings(props: Props) {
  const [notify, setNotify] = useState(() => localStorage.getItem('pl-notifications') !== 'off')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const expenseCount = props.categories.filter((category) => category.kind === 'expense').length
  const incomeCount = props.categories.filter((category) => category.kind === 'income').length
  const email = props.authEmail ?? 'you@pocketledger.app'

  const toggleNotifications = () => {
    setNotify((current) => {
      const next = !current
      localStorage.setItem('pl-notifications', next ? 'on' : 'off')
      return next
    })
  }

  return (
    <div className="vault-screen">
      <header className="vault-detail-header relative flex items-center justify-center">
        <button aria-label="Back" className="vault-iconbtn absolute left-0" type="button" onClick={() => props.onNavigate('dashboard')}><ChevronLeft size={18} strokeWidth={2} /></button>
        <p className="vault-eyebrow">Account</p>
      </header>

      <h1 className="vault-title">Settings</h1>

      {/* Profile card */}
      <button className="vault-profile-card" type="button" onClick={() => props.onNavigate('profile')}>
        <span className="vault-profile-mono">{props.profile.avatar ? <img alt="" src={props.profile.avatar} /> : initialsOf(props.profile.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="vault-profile-name block truncate">{props.profile.name || 'Your name'}</span>
          <span className="vault-profile-email block truncate">{email}</span>
        </span>
        <span className="vault-profile-edit">Edit</span>
      </button>

      {/* Money */}
      <section className="mt-7">
        <p className="vault-settings-group-label">Money</p>
        <div className="vault-settings-group">
          <Row icon={<DollarSign size={18} strokeWidth={1.9} />} title="Currency" value="Rs · PKR" />
          <Row icon={<Calendar size={18} strokeWidth={1.9} />} title="Income cycle" value={incomeCycleLabel(props.journeySettings)} onPress={props.onRestartTour} />
          <Row highlight icon={<LayoutGrid size={18} strokeWidth={2} />} title="Categories" subtitle={`${expenseCount} expense · ${incomeCount} income`} onPress={() => props.onNavigate('categories')} />
          {/* Wallet lost its dock slot to Paths, so this row is now its main
              route in from Settings. Worded as an invitation to add, since
              that is what most people come here to do. */}
          <Row icon={<CreditCard size={18} strokeWidth={1.9} />} title="Cards & accounts" subtitle={`Add a card or cash account · ${props.accounts.length} linked`} onPress={() => props.onNavigate('accounts')} />
        </div>
      </section>

      {/* Preferences */}
      <section className="mt-6">
        <p className="vault-settings-group-label">Preferences</p>
        <div className="vault-settings-group">
          <Row icon={<Bell size={18} strokeWidth={1.9} />} title="Notifications" trailing={<button aria-checked={notify} aria-label="Notifications" className={`vault-toggle${notify ? ' is-on' : ''}`} role="switch" type="button" onClick={toggleNotifications} />} />
          <Row icon={<Lock size={18} strokeWidth={1.9} />} title="App lock" value="Face ID" />
          <Row icon={<Sun size={18} strokeWidth={1.9} />} title="Appearance" value="Warm" />
        </div>
      </section>

      {/* Data & support */}
      <section className="mt-6">
        <p className="vault-settings-group-label">Data &amp; support</p>
        <div className="vault-settings-group">
          <Row icon={<Download size={18} strokeWidth={1.9} />} title="Export data" value="CSV · PDF" onPress={() => exportTransactionsCsv(props.transactions)} />
          <Row icon={<BarChart3 size={18} strokeWidth={1.9} />} title="Private usage analytics" subtitle="No email or financial content" value={props.analyticsConsent ? 'On' : 'Off'} />
          <Row icon={<HelpCircle size={18} strokeWidth={1.9} />} title="Help &amp; feedback" onPress={() => props.onNavigate('profile')} />
        </div>
      </section>

      <button className="vault-signout mt-8" type="button" onClick={props.onSignOut}><LogOut size={17} strokeWidth={2} /> Sign out</button>
      <p className="vault-version mt-4">Pocket Ledger · v0.1.0-beta.1</p>

      {supabase && (
        <div className="mt-3 text-center">
          <button className="text-[12.5px] font-semibold text-[var(--taupe)] underline-offset-2 hover:underline" type="button" onClick={() => setDeleteOpen((open) => !open)}>Delete account</button>
          {deleteOpen && <DeleteAccount authEmail={props.authEmail} authProvider={props.authProvider} />}
        </div>
      )}
    </div>
  )
}

function Row({ icon, title, subtitle, value, trailing, highlight, onPress }: { icon: ReactNode; title: string; subtitle?: string; value?: string; trailing?: ReactNode; highlight?: boolean; onPress?: () => void }) {
  const content = (
    <>
      <span className="vault-settings-chip">{icon}</span>
      <span className="vault-settings-row-title">
        {title}
        {subtitle && <span className="sub">{subtitle}</span>}
      </span>
      {value && <span className={`vault-settings-value${/\d/.test(value) ? ' is-digit' : ''}`}>{value}</span>}
      {trailing}
      {(onPress || highlight) && <ChevronRight className="vault-settings-chev" size={18} strokeWidth={2} />}
    </>
  )
  if (onPress) return <button className={`vault-settings-row${highlight ? ' is-highlight' : ''}`} type="button" onClick={onPress}>{content}</button>
  return <div className={`vault-settings-row${highlight ? ' is-highlight' : ''}`}>{content}</div>
}

/* Account deletion kept behind the muted "Delete account" link. */
function DeleteAccount({ authEmail, authProvider }: { authEmail?: string; authProvider?: string }) {
  const [text, setText] = useState('')
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!supabase || text !== 'DELETE') return
    setDeleting(true)
    setError('')
    if (authProvider === 'email') {
      if (!authEmail || !password) { setDeleting(false); return setError('Enter your password to confirm.') }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password })
      if (signInError) { setDeleting(false); return setError('Password confirmation failed.') }
    }
    const { error: fnError } = await supabase.functions.invoke('delete-account')
    if (fnError) { setDeleting(false); return setError(fnError.message) }
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  return (
    <div className="vault-outline mt-3 p-4 text-left">
      <p className="text-sm leading-6 text-[var(--ink-soft)]">This permanently removes your ledger and sign-in. Export a backup first. Type DELETE to confirm.</p>
      {authProvider === 'email' && <input aria-label="Confirm your password" autoComplete="current-password" className="form-input mt-3" type="password" value={password} placeholder="Confirm your password" onChange={(event) => setPassword(event.target.value)} />}
      <div className="mt-3 flex gap-2">
        <input aria-label="Type DELETE" className="form-input" value={text} placeholder="DELETE" onChange={(event) => setText(event.target.value)} />
        <button className="flex-none rounded-2xl bg-[var(--clay)] px-4 text-sm font-bold text-white disabled:opacity-40" disabled={text !== 'DELETE' || deleting || (authProvider === 'email' && !password)} type="button" onClick={run}>{deleting ? 'Deleting…' : 'Delete'}</button>
      </div>
      {error && <p className="mt-2 text-xs text-[var(--clay)]">{error}</p>}
    </div>
  )
}

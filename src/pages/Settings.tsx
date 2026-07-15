import { BookOpen, Download, ExternalLink, LogOut, Moon, PencilLine, Plus, ShieldCheck, Sun, Trash2, Wallet } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { exportLedgerJson, exportTransactionsCsv } from '../lib/exports'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/profile'
import type { Account, Budget, Category, Debt, Goal, Transaction, UpcomingExpense } from '../types/finance'

type Props = {
  authEmail?: string; authProvider?: string
  accounts: Account[]; budgets: Budget[]; categories: Category[]; debts: Debt[]; goals: Goal[]
  transactions: Transaction[]; upcomingExpenses: UpcomingExpense[]
  expenseCategories: string[]; incomeCategories: string[]; profile: Profile
  onNavigate: (page: string) => void
  onProfileChange: (profile: Profile) => void
  onSaveCategory: (category: Category) => Promise<void>
  onArchiveCategory: (id: string) => Promise<void>
  onSaveBudget: (budget: Budget) => Promise<void>
  onDeleteBudget: (id: string) => Promise<void>
  onSignOut: () => void
}

export function Settings(props: Props) {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())
  const [categoryName, setCategoryName] = useState('')
  const [categoryKind, setCategoryKind] = useState<Category['kind']>('expense')
  const [budgetCategoryId, setBudgetCategoryId] = useState(() => props.categories.find((item) => item.kind === 'expense')?.id ?? '')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [notice, setNotice] = useState('')
  const [deleteText, setDeleteText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? 'support@pocketledger.app'

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const addCategory = async (event: FormEvent) => {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name) return
    if (props.categories.some((item) => item.kind === categoryKind && item.name.toLowerCase() === name.toLowerCase())) return notify('That category already exists.')
    await props.onSaveCategory({ id: crypto.randomUUID(), name, kind: categoryKind, color: categoryKind === 'income' ? '#77D6A3' : '#FF6B3D', spendingNature: 'flexible' })
    setCategoryName('')
    notify('Category added.')
  }

  const addBudget = async (event: FormEvent) => {
    event.preventDefault()
    const category = props.categories.find((item) => item.id === budgetCategoryId)
    const amount = Number(budgetAmount)
    if (!category || !Number.isSafeInteger(amount) || amount <= 0) return notify('Enter a positive whole-PKR budget.')
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    const existing = props.budgets.find((item) => item.categoryId === category.id && item.periodMonth?.startsWith(month.slice(0, 7)))
    await props.onSaveBudget({ id: existing?.id ?? crypto.randomUUID(), category: category.name, categoryId: category.id, amount, used: existing?.used ?? 0, periodMonth: month })
    setBudgetAmount('')
    notify(existing ? 'Budget updated.' : 'Budget added.')
  }

  const editCategory = async (category: Category) => {
    const name = window.prompt('Category name', category.name)?.trim()
    if (!name || name === category.name) return
    if (props.categories.some((item) => item.id !== category.id && item.kind === category.kind && item.name.toLowerCase() === name.toLowerCase())) return notify('That category already exists.')
    try {
      await props.onSaveCategory({ ...category, name })
      notify('Category updated.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update category.')
    }
  }

  const deleteAccount = async () => {
    if (!supabase || deleteText !== 'DELETE') return
    setDeleting(true)
    setNotice('')
    if (props.authProvider === 'email') {
      if (!props.authEmail || !deletePassword) {
        setDeleting(false)
        return setNotice('Enter your password to confirm your identity.')
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: props.authEmail, password: deletePassword })
      if (signInError) {
        setDeleting(false)
        return setNotice('Password confirmation failed.')
      }
    }
    const { error } = await supabase.functions.invoke('delete-account')
    if (error) {
      setDeleting(false)
      return setNotice(error.message)
    }
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      {notice && <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--accent)]" role="status">{notice}</div>}

      <SettingsGroup heading="Preferences">
        <SettingsRow detail="PKR / Rs. · Asia/Karachi" icon={Wallet} title="Currency and timezone" />
        <SettingsRow detail={theme === 'dark' ? 'Dark — orange on black' : 'Light — orange on white'} icon={theme === 'dark' ? Moon : Sun} title="Theme" trailing={<button aria-checked={theme === 'light'} aria-label="Toggle light theme" className="relative h-8 w-14 flex-none rounded-full transition-colors" onClick={() => setThemeState(toggleTheme())} role="switch" style={{ background: theme === 'light' ? '#FF5C00' : 'var(--surface-3)' }}><span className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all" style={{ left: theme === 'light' ? 'calc(100% - 1.75rem)' : '0.25rem' }} /></button>} />
        <SettingsRow detail={`${props.accounts.length} active account${props.accounts.length === 1 ? '' : 's'}`} icon={Wallet} title="Manage accounts" trailing={<button className="text-sm font-semibold text-[var(--accent)]" onClick={() => props.onNavigate('accounts')}>Open</button>} />
      </SettingsGroup>

      <section>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-2)]">Categories</p>
        <div className="card p-4">
          <form className="grid gap-3 sm:grid-cols-[130px_1fr_auto]" onSubmit={addCategory}>
            <select className="form-input" value={categoryKind} onChange={(event) => setCategoryKind(event.target.value as Category['kind'])}><option value="expense">Expense</option><option value="income">Income</option></select>
            <input className="form-input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" />
            <button className="btn-primary justify-center"><Plus size={16} /> Add</button>
          </form>
          <div className="mt-4 grid gap-2">
            {props.categories.map((category) => <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] px-3 py-2.5" key={category.id}><span className="h-3 w-3 rounded-full" style={{ background: category.color }} /><span className="min-w-0 flex-1 text-sm font-medium text-white">{category.name}</span><span className="text-xs capitalize text-[var(--muted-2)]">{category.kind}</span><button aria-label={`Edit ${category.name}`} className="grid h-9 w-9 place-items-center text-[var(--muted)]" onClick={() => void editCategory(category)}><PencilLine size={15} /></button><button aria-label={`Archive ${category.name}`} className="grid h-9 w-9 place-items-center text-[var(--negative)]" onClick={() => void props.onArchiveCategory(category.id)}><Trash2 size={15} /></button></div>)}
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-2)]">Monthly budgets</p>
        <div className="card p-4">
          <form className="grid gap-3 sm:grid-cols-[1fr_140px_auto]" onSubmit={addBudget}>
            <select className="form-input" value={budgetCategoryId} onChange={(event) => setBudgetCategoryId(event.target.value)}>{props.categories.filter((item) => item.kind === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input className="form-input" inputMode="numeric" min="1" step="1" type="number" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="PKR limit" />
            <button className="btn-primary justify-center">Save</button>
          </form>
          <div className="mt-4 grid gap-2">{props.budgets.map((budget) => <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] px-3 py-2.5" key={budget.id}><span className="min-w-0 flex-1 text-sm font-medium text-white">{budget.category}</span><span className="text-sm text-[var(--muted)]">Rs. {budget.amount.toLocaleString('en-PK')}</span><button aria-label={`Archive ${budget.category} budget`} className="grid h-9 w-9 place-items-center text-[var(--negative)]" onClick={() => void props.onDeleteBudget(budget.id)}><Trash2 size={15} /></button></div>)}</div>
        </div>
      </section>

      <SettingsGroup heading="Your data">
        <SettingsRow detail="Download transactions as a spreadsheet-friendly file" icon={Download} title="Export transactions CSV" trailing={<button className="text-sm font-semibold text-[var(--accent)]" onClick={() => exportTransactionsCsv(props.transactions)}>Export</button>} />
        <SettingsRow detail="Complete portable copy of this ledger" icon={BookOpen} title="Export JSON backup" trailing={<button className="text-sm font-semibold text-[var(--accent)]" onClick={() => exportLedgerJson({ accounts: props.accounts, transactions: props.transactions, budgets: props.budgets, goals: props.goals, debts: props.debts, upcomingExpenses: props.upcomingExpenses, expenseCategories: props.expenseCategories, incomeCategories: props.incomeCategories })}>Export</button>} />
        <SettingsRow detail="Connected · encrypted in transit · owner-only database policies" icon={ShieldCheck} title="Cloud sync" />
      </SettingsGroup>

      <SettingsGroup heading="About and account">
        <SettingsRow detail="How Pocket Ledger stores and handles data" icon={ShieldCheck} title="Privacy Policy" trailing={<Link aria-label="Open Privacy Policy" className="text-[var(--accent)]" to="/privacy"><ExternalLink size={17} /></Link>} />
        <SettingsRow detail="Public beta conditions and limitations" icon={BookOpen} title="Terms of Use" trailing={<Link aria-label="Open Terms of Use" className="text-[var(--accent)]" to="/terms"><ExternalLink size={17} /></Link>} />
        <SettingsRow detail={supportEmail} icon={BookOpen} title="Support" trailing={<a aria-label="Email Pocket Ledger support" className="text-[var(--accent)]" href={`mailto:${supportEmail}`}><ExternalLink size={17} /></a>} />
        <SettingsRow detail="0.1.0-beta.1 · Public Beta" icon={BookOpen} title="App version" />
        <SettingsRow detail="End this session on this device" icon={LogOut} title="Log out" trailing={<button className="text-sm font-semibold text-[var(--accent)]" onClick={props.onSignOut}>Log out</button>} />
      </SettingsGroup>

      <section className="rounded-[24px] border border-[rgba(232,105,74,.25)] bg-[rgba(232,105,74,.06)] p-5">
        <h2 className="text-lg font-semibold text-white">Delete account</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">This permanently removes the active ledger and sign-in account. Export a backup first. Type DELETE to continue.</p>
        {props.authProvider === 'email' ? <input aria-label="Confirm your password" autoComplete="current-password" className="form-input mt-4" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Confirm your password" /> : <p className="mt-3 text-xs leading-5 text-[var(--muted-2)]">Google accounts must have signed in within the last 10 minutes. If needed, log out and back in first.</p>}
        <div className="mt-4 flex gap-3"><input aria-label="Type DELETE to confirm" className="form-input" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="DELETE" /><button className="rounded-2xl bg-[var(--negative)] px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={deleteText !== 'DELETE' || deleting || (props.authProvider === 'email' && !deletePassword)} onClick={deleteAccount}>{deleting ? 'Deleting…' : 'Delete'}</button></div>
      </section>
    </div>
  )
}

function SettingsGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return <section><p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[.16em] text-[var(--muted-2)]">{heading}</p><div className="overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">{children}</div></section>
}

function SettingsRow({ title, detail, icon: Icon, trailing }: { title: string; detail: string; icon: typeof Moon; trailing?: ReactNode }) {
  return <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3.5 last:border-b-0"><span className="grid h-10 w-10 flex-none place-items-center rounded-[14px] border border-[rgba(255,92,0,.22)] bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={18} /></span><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold text-white">{title}</h3><p className="mt-0.5 text-[13px] text-[var(--muted)]">{detail}</p></div>{trailing}</div>
}

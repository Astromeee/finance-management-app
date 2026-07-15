import { ArrowLeft, ArrowRight, CalendarDays, Check, GraduationCap, Landmark, PencilLine, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { localDateKey } from '../lib/date'
import { trackEvent } from '../lib/analytics'
import { parseWholePkr } from '../lib/money'
import type { Account, AccountType, IncomeCadence, IncomeSourceType, JourneySettings, MoneyPriority } from '../types/finance'
import { cn } from '../utils/ui'

type Draft = {
  accountId: string
  accountName: string
  accountType: AccountType
  balance: string
}

type Props = {
  email?: string
  initialName?: string
  initialSettings: JourneySettings
  existingAccount?: Account
  onProgress: (settings: JourneySettings) => Promise<void>
  onComplete: (profile: { name: string }, account: Account | undefined, settings: JourneySettings) => Promise<void>
  onCancel?: () => void
}

const STORAGE_KEY = 'pocket-ledger-onboarding-draft-v2'

const sourceOptions: Array<{ id: IncomeSourceType; title: string; detail: string; icon: typeof Landmark }> = [
  { id: 'allowance', title: 'Pocket money', detail: 'Allowance or family support', icon: GraduationCap },
  { id: 'salary', title: 'Salary', detail: 'A regular payday', icon: Landmark },
  { id: 'irregular', title: 'Irregular income', detail: 'Freelance, shifts, or business', icon: Sparkles },
  { id: 'mixed', title: 'A mix', detail: 'More than one kind of income', icon: WalletCards },
]

const priorityOptions: Array<{ id: MoneyPriority; title: string; detail: string }> = [
  { id: 'stretch', title: 'Make my money last', detail: 'Stay steady until the next income date' },
  { id: 'save', title: 'Save for something', detail: 'Protect progress toward a personal goal' },
  { id: 'control_spending', title: 'Control flexible spending', detail: 'Spot small purchases that add up' },
  { id: 'bills_debt', title: 'Stay ahead of bills or debt', detail: 'Reserve important payments first' },
  { id: 'understand', title: 'Understand where it goes', detail: 'Build a clearer picture over time' },
]

function futureDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function loadDraft(existingAccount?: Account): Draft {
  if (existingAccount) return { accountId: existingAccount.id, accountName: existingAccount.name, accountType: existingAccount.type, balance: String(existingAccount.balance) }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Draft
    if (saved.accountId) return saved
  } catch { /* A missing or old draft simply starts fresh. */ }
  return { accountId: crypto.randomUUID(), accountName: 'Cash', accountType: 'cash', balance: '0' }
}

export function Onboarding({ email, initialName, initialSettings, existingAccount, onProgress, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(Math.min(initialSettings.onboardingStep, 5))
  const [name, setName] = useState(initialName ?? '')
  const [settings, setSettings] = useState<JourneySettings>(() => ({
    ...initialSettings,
    nextIncomeDate: initialSettings.nextIncomeDate ?? futureDate(14),
    onboardingVersion: 2,
  }))
  const [draft, setDraft] = useState(() => loadDraft(existingAccount))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const totalSteps = 6

  useEffect(() => {
    if (!existingAccount) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft, existingAccount])
  useEffect(() => { trackEvent('onboarding_started', { surface: 'onboarding', action: 'open' }) }, [])

  const parsedBalance = useMemo(() => draft.balance === '0' ? 0 : parseWholePkr(draft.balance), [draft.balance])
  const parsedIncome = Number.isSafeInteger(settings.typicalIncome) ? settings.typicalIncome : 0
  const parsedReserve = Number.isSafeInteger(settings.safetyReserve) ? settings.safetyReserve : 0

  const canContinue = step === 0
    || (step === 1 && Boolean(settings.incomeSourceType))
    || (step === 2 && Boolean(settings.incomeCadence && settings.nextIncomeDate && parsedIncome > 0))
    || (step === 3 && Boolean(draft.accountName.trim()) && parsedBalance !== null)
    || (step === 4 && Boolean(settings.primaryPriority))
    || (step === 5 && parsedReserve >= 0)

  const updateNumber = (field: 'typicalIncome' | 'safetyReserve', value: string) => {
    const amount = value === '' ? 0 : Number(value)
    setSettings((current) => ({ ...current, [field]: Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0 }))
  }

  const next = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!canContinue) return
    setLoading(true)
    setError('')
    const nextStep = Math.min(6, step + 1)
    const nextSettings = { ...settings, onboardingStep: nextStep }
    try {
      if (nextStep < 6) {
        await onProgress(nextSettings)
        setSettings(nextSettings)
        setStep(nextStep)
      } else {
        const account = existingAccount ? undefined : {
          id: draft.accountId,
          name: draft.accountName.trim(),
          type: draft.accountType,
          balance: parsedBalance ?? 0,
          color: '#FF6B3D',
          activity: 'Opening balance',
          cardLabel: draft.accountType.toUpperCase(),
          includeInSafeSpend: true,
        }
        await onComplete(
          { name: name.trim() || email?.split('@')[0] || 'Pocket Ledger user' },
          account,
          { ...nextSettings, onboardingStep: 6 },
        )
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this step. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-deep)] px-4 py-5 text-[var(--text)] sm:grid sm:place-items-center sm:p-8">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/25 sm:min-h-[720px]">
        <header className="flex items-center justify-between px-5 py-5 sm:px-7">
          <button aria-label={step === 0 ? 'Cancel onboarding' : 'Previous step'} className={cn('icon-button', !onCancel && step === 0 && 'invisible')} onClick={() => step > 0 ? setStep((current) => current - 1) : onCancel?.()}><ArrowLeft size={19} /></button>
          <div className="text-center">
            <p className="text-sm font-semibold">Pocket Ledger</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Your payday journey</p>
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-[var(--muted)]">{Math.min(step + 1, totalSteps)}/{totalSteps}</span>
        </header>
        <div aria-label="Onboarding progress" className="mx-5 h-1 overflow-hidden rounded-full bg-[var(--surface-3)] sm:mx-7" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={Math.min(step + 1, totalSteps)}>
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((Math.min(step + 1, totalSteps)) / totalSteps) * 100}%` }} />
        </div>

        <form className="flex flex-1 flex-col px-5 pb-5 pt-8 sm:px-8 sm:pb-8" onSubmit={next}>
          <div className="flex-1">
            {step === 0 && <WelcomeStep name={name} setName={setName} />}
            {step === 1 && <ChoiceStep eyebrow="Make it yours" title="How does money usually reach you?" detail="This changes the language and rhythm of your journey." options={sourceOptions} value={settings.incomeSourceType} onChange={(incomeSourceType) => setSettings((current) => ({ ...current, incomeSourceType }))} />}
            {step === 2 && <CycleStep settings={settings} setSettings={setSettings} updateNumber={updateNumber} />}
            {step === 3 && <AccountStep draft={draft} setDraft={setDraft} existing={Boolean(existingAccount)} />}
            {step === 4 && <PriorityStep value={settings.primaryPriority} onChange={(primaryPriority) => setSettings((current) => ({ ...current, primaryPriority }))} />}
            {step === 5 && <PlanStep settings={settings} updateNumber={updateNumber} />}
          </div>
          {error && <p className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--negative)_35%,transparent)] bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] px-3 py-2 text-sm text-[var(--negative)]" role="alert">{error}</p>}
          <button className="btn-primary w-full justify-center py-3.5 disabled:cursor-not-allowed disabled:opacity-45" disabled={!canContinue || loading}>
            {loading ? 'Saving…' : step === 5 ? 'Start my journey' : step === 0 ? 'Set up my journey' : 'Continue'}
            {!loading && (step === 5 ? <Check size={18} /> : <ArrowRight size={18} />)}
          </button>
          <p className="mt-3 text-center text-xs text-[var(--muted-2)]">Your entries stay private to your account. Pocket Ledger never moves money.</p>
        </form>
      </section>
    </main>
  )
}

function WelcomeStep({ name, setName }: { name: string; setName: (value: string) => void }) {
  return <div>
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)]"><WalletCards size={27} /></div>
    <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Less accounting. More clarity.</p>
    <h1 className="mt-3 max-w-md font-display text-4xl font-bold leading-[1.08]">Know what today can afford.</h1>
    <p className="mt-4 max-w-md text-base leading-7 text-[var(--muted)]">Pocket Ledger turns the money you enter into a simple journey to your next income date—what is protected, what is flexible, and one useful move at a time.</p>
    <label className="mt-8 block"><span className="form-label">What should we call you?</span><input autoComplete="name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your first name" /></label>
  </div>
}

function ChoiceStep({ eyebrow, title, detail, options, value, onChange }: { eyebrow: string; title: string; detail: string; options: typeof sourceOptions; value?: IncomeSourceType; onChange: (value: IncomeSourceType) => void }) {
  return <div><StepHeading eyebrow={eyebrow} title={title} detail={detail} /><div className="mt-7 grid gap-3 sm:grid-cols-2">{options.map(({ id, title: label, detail: optionDetail, icon: Icon }) => <button aria-pressed={value === id} className={cn('rounded-2xl border p-4 text-left transition-colors', value === id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]')} key={id} onClick={() => onChange(id)} type="button"><Icon className={value === id ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} size={21} /><span className="mt-4 block font-semibold">{label}</span><span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{optionDetail}</span></button>)}</div></div>
}

function CycleStep({ settings, setSettings, updateNumber }: { settings: JourneySettings; setSettings: (updater: (value: JourneySettings) => JourneySettings) => void; updateNumber: (field: 'typicalIncome' | 'safetyReserve', value: string) => void }) {
  const cadences: Array<{ id: IncomeCadence; label: string }> = [{ id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }, { id: 'custom', label: 'Custom' }]
  return <div><StepHeading eyebrow="Set the rhythm" title="When is money coming next?" detail="This date is the finish line for your current journey." />
    <div className="mt-7 grid grid-cols-3 gap-2">{cadences.map(({ id, label }) => <button aria-pressed={settings.incomeCadence === id} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold', settings.incomeCadence === id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]')} key={id} onClick={() => setSettings((current) => ({ ...current, incomeCadence: id }))} type="button">{label}</button>)}</div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="form-label">Typical amount (PKR)</span><input className="form-input tabular-nums" inputMode="numeric" min="1" step="1" type="number" value={settings.typicalIncome || ''} onChange={(event) => updateNumber('typicalIncome', event.target.value)} placeholder="30,000" /></label><label><span className="form-label">Next income date</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} /><input className="form-input pl-10" min={futureDate(1)} type="date" value={settings.nextIncomeDate ?? ''} onChange={(event) => setSettings((current) => ({ ...current, nextIncomeDate: event.target.value }))} /></div></label></div>
  </div>
}

function AccountStep({ draft, setDraft, existing }: { draft: Draft; setDraft: (value: Draft) => void; existing: boolean }) {
  return <div><StepHeading eyebrow="Starting point" title={existing ? 'Your current balance' : 'Add your first money place'} detail="Include only money you can actually use. You can add more accounts later." />
    <div className="mt-7 grid gap-4"><label><span className="form-label">Account name</span><input className="form-input" disabled={existing} value={draft.accountName} onChange={(event) => setDraft({ ...draft, accountName: event.target.value })} /></label><label><span className="form-label">Account type</span><select className="form-input" disabled={existing} value={draft.accountType} onChange={(event) => setDraft({ ...draft, accountType: event.target.value as AccountType })}><option value="cash">Cash</option><option value="bank">Bank</option><option value="wallet">Wallet</option></select></label><label><span className="form-label">Current balance (PKR)</span><input className="form-input font-display text-2xl font-semibold tabular-nums" disabled={existing} inputMode="numeric" min="0" step="1" type="number" value={draft.balance} onChange={(event) => setDraft({ ...draft, balance: event.target.value })} /></label></div>
    <div className="mt-5 flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--positive)]" size={20} /><p className="text-sm leading-6 text-[var(--muted)]">This balance is included in safe-to-spend. You can exclude savings-only accounts later.</p></div>
  </div>
}

function PriorityStep({ value, onChange }: { value?: MoneyPriority; onChange: (value: MoneyPriority) => void }) {
  return <div><StepHeading eyebrow="Choose your focus" title="What would feel like a win?" detail="We will keep this priority visible without turning Home into a wall of statistics." /><div className="mt-7 grid gap-2">{priorityOptions.map((option) => <button aria-pressed={value === option.id} className={cn('flex items-center gap-3 rounded-2xl border p-4 text-left', value === option.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)]')} key={option.id} onClick={() => onChange(option.id)} type="button"><span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border', value === option.id ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]' : 'border-[var(--border-strong)]')}>{value === option.id && <Check size={14} />}</span><span><span className="block font-semibold">{option.title}</span><span className="mt-0.5 block text-sm text-[var(--muted)]">{option.detail}</span></span></button>)}</div></div>
}

function PlanStep({ settings, updateNumber }: { settings: JourneySettings; updateNumber: (field: 'typicalIncome' | 'safetyReserve', value: string) => void }) {
  return <div><StepHeading eyebrow="Your starter plan" title="Protect a small safety reserve." detail="Safe-to-spend will subtract this amount and upcoming bills before dividing what remains across the days to payday." />
    <label className="mt-7 block"><span className="form-label">Safety reserve (PKR)</span><input className="form-input font-display text-2xl font-semibold tabular-nums" inputMode="numeric" min="0" step="1" type="number" value={settings.safetyReserve || ''} onChange={(event) => updateNumber('safetyReserve', event.target.value)} placeholder="5,000" /></label>
    <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><PencilLine size={18} /></span><div><p className="font-semibold">Your categories stay editable</p><p className="text-sm text-[var(--muted)]">Settings → Categories</p></div></div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">Mark expense categories as essential or flexible there. Every expense form also includes a direct “Manage categories in Settings” link.</p></div>
    <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--positive)_30%,transparent)] bg-[color-mix(in_srgb,var(--positive)_8%,transparent)] p-4 text-sm leading-6 text-[var(--muted)]"><strong className="text-[var(--text)]">Ready:</strong> your Home will show one journey, quick actions, one useful move, and only three recent entries.</div>
  </div>
}

function StepHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">{eyebrow}</p><h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-md text-base leading-7 text-[var(--muted)]">{detail}</p></>
}

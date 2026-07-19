import { ArrowLeft, ArrowRight, CalendarDays, Check, GraduationCap, Landmark, Sparkles, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { localDateKey } from '../lib/date'
import { trackEvent } from '../lib/analytics'
import { parseWholePkr } from '../lib/money'
import type { Account, AccountType, IncomeSourceType, JourneySettings, MoneyPriority } from '../types/finance'
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

const STORAGE_KEY = 'pocket-ledger-onboarding-draft-v3'
const TOTAL_STEPS = 5

const sourceOptions: Array<{ id: IncomeSourceType; title: string; detail: string; icon: typeof Landmark }> = [
  { id: 'salary', title: 'Salary', detail: 'A regular payday', icon: Landmark },
  { id: 'allowance', title: 'Pocket money', detail: 'Allowance or family support', icon: GraduationCap },
  { id: 'irregular', title: 'Irregular', detail: 'Freelance, shifts, or business', icon: Sparkles },
  { id: 'mixed', title: 'A mix', detail: 'More than one of these', icon: WalletCards },
]

const priorityOptions: Array<{ id: MoneyPriority; title: string; detail: string }> = [
  { id: 'stretch', title: 'Make my money last', detail: 'Stay steady until the next income date' },
  { id: 'save', title: 'Save for something', detail: 'Protect progress toward a goal' },
  { id: 'control_spending', title: 'Control small spending', detail: 'Spot little purchases that add up' },
  { id: 'bills_debt', title: 'Stay ahead of bills or debt', detail: 'Reserve important payments first' },
  { id: 'understand', title: 'Understand where it goes', detail: 'Build a clearer picture over time' },
]

const accountTypes: Array<{ id: AccountType; label: string }> = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank' },
  { id: 'wallet', label: 'Wallet' },
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
  const [step, setStep] = useState(Math.min(initialSettings.onboardingStep, TOTAL_STEPS - 1))
  const [name, setName] = useState(initialName ?? '')
  const [settings, setSettings] = useState<JourneySettings>(() => ({
    ...initialSettings,
    incomeSourceTypes: initialSettings.incomeSourceTypes ?? (initialSettings.incomeSourceType ? [initialSettings.incomeSourceType] : []),
    moneyPriorities: initialSettings.moneyPriorities ?? (initialSettings.primaryPriority ? [initialSettings.primaryPriority] : []),
    incomeCadence: initialSettings.incomeCadence ?? 'monthly',
    nextIncomeDate: initialSettings.nextIncomeDate ?? futureDate(14),
    onboardingVersion: 3,
  }))
  const [draft, setDraft] = useState(() => loadDraft(existingAccount))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existingAccount) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft, existingAccount])
  useEffect(() => { trackEvent('onboarding_started', { surface: 'onboarding', action: 'open' }) }, [])

  const parsedBalance = useMemo(() => draft.balance === '' || draft.balance === '0' ? 0 : parseWholePkr(draft.balance), [draft.balance])
  const parsedIncome = Number.isSafeInteger(settings.typicalIncome) ? settings.typicalIncome : 0
  const sources = settings.incomeSourceTypes ?? []
  const priorities = settings.moneyPriorities ?? []

  const canContinue = step === 0
    || (step === 1 && sources.length > 0)
    || (step === 2 && Boolean(settings.nextIncomeDate) && parsedIncome > 0)
    || (step === 3 && parsedBalance !== null)
    || (step === 4 && priorities.length > 0)

  const toggleSource = (id: IncomeSourceType) => setSettings((current) => {
    const list = current.incomeSourceTypes ?? []
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
    return { ...current, incomeSourceTypes: next, incomeSourceType: next[0] }
  })

  const togglePriority = (id: MoneyPriority) => setSettings((current) => {
    const list = current.moneyPriorities ?? []
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
    return { ...current, moneyPriorities: next, primaryPriority: next[0] }
  })

  const setIncome = (value: string) => {
    const amount = value === '' ? 0 : Number(value)
    setSettings((current) => ({ ...current, typicalIncome: Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0 }))
  }

  const next = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!canContinue) return
    setLoading(true)
    setError('')
    const nextStep = Math.min(TOTAL_STEPS, step + 1)
    const nextSettings: JourneySettings = { ...settings, onboardingStep: nextStep }
    try {
      if (nextStep < TOTAL_STEPS) {
        await onProgress(nextSettings)
        setSettings(nextSettings)
        setStep(nextStep)
      } else {
        const account = existingAccount ? undefined : {
          id: draft.accountId,
          name: draft.accountName.trim() || 'Cash',
          type: draft.accountType,
          balance: parsedBalance ?? 0,
          color: '#FF5C00',
          activity: 'Opening balance',
          cardLabel: draft.accountType.toUpperCase(),
          includeInSafeSpend: true,
        }
        await onComplete(
          { name: name.trim() || email?.split('@')[0] || 'Pocket Ledger user' },
          account,
          { ...nextSettings, onboardingStep: TOTAL_STEPS },
        )
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this step. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const progressValue = Math.min(step + 1, TOTAL_STEPS)

  return (
    <main className="auth-shell min-h-screen px-4 py-5 text-[var(--text)] sm:grid sm:place-items-center sm:p-8">
      <section className="auth-card relative z-[1] mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[26px] sm:min-h-[680px]">
        <header className="flex items-center justify-between px-5 py-5 sm:px-7">
          <button aria-label={step === 0 ? 'Cancel onboarding' : 'Previous step'} className={cn('icon-button grid h-10 w-10 place-items-center rounded-xl', !onCancel && step === 0 && 'invisible')} onClick={() => step > 0 ? setStep((current) => current - 1) : onCancel?.()} type="button"><ArrowLeft size={19} /></button>
          <div className="text-center">
            <p className="text-sm font-semibold">Pocket Ledger</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Let’s set up your journey</p>
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-[var(--muted)]">{progressValue}/{TOTAL_STEPS}</span>
        </header>
        <div aria-label="Onboarding progress" className="mx-5 h-1 overflow-hidden rounded-full bg-[var(--surface-3)] sm:mx-7" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={progressValue}>
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(progressValue / TOTAL_STEPS) * 100}%` }} />
        </div>

        <form className="flex flex-1 flex-col px-5 pb-5 pt-7 sm:px-8 sm:pb-8" onSubmit={next}>
          <div className="flex-1">
            {step === 0 && <WelcomeStep name={name} setName={setName} />}
            {step === 1 && <SourceStep selected={sources} onToggle={toggleSource} />}
            {step === 2 && <IncomeStep settings={settings} setSettings={setSettings} setIncome={setIncome} />}
            {step === 3 && <PocketStep draft={draft} setDraft={setDraft} existing={Boolean(existingAccount)} />}
            {step === 4 && <PriorityStep selected={priorities} onToggle={togglePriority} />}
          </div>
          {error && <p className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--negative)_35%,transparent)] bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] px-3 py-2 text-sm text-[var(--negative)]" role="alert">{error}</p>}
          <button className="btn-primary w-full justify-center py-3.5 disabled:cursor-not-allowed disabled:opacity-45" disabled={!canContinue || loading}>
            {loading ? 'Saving…' : step === 4 ? 'Start my journey' : step === 0 ? 'Set up my journey' : 'Continue'}
            {!loading && (step === 4 ? <Check size={18} /> : <ArrowRight size={18} />)}
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
    <p className="mt-4 max-w-md text-base leading-7 text-[var(--muted)]">A few quick questions and your money turns into a simple journey to your next income date — what’s protected, what’s flexible, one useful move at a time. You can change anything later.</p>
    <label className="mt-8 block"><span className="form-label">What should we call you?</span><input autoComplete="name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your first name" /></label>
  </div>
}

function SourceStep({ selected, onToggle }: { selected: IncomeSourceType[]; onToggle: (value: IncomeSourceType) => void }) {
  return <div>
    <StepHeading eyebrow="Make it yours" title="How does money reach you?" detail="Pick everything that applies — it shapes the language and rhythm of your journey." />
    <div className="mt-7 grid gap-3 sm:grid-cols-2">{sourceOptions.map(({ id, title, detail, icon: Icon }) => {
      const active = selected.includes(id)
      return <button aria-pressed={active} className={cn('relative rounded-2xl border p-4 text-left transition-colors', active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]')} key={id} onClick={() => onToggle(id)} type="button">
        <span className={cn('absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-md border transition-colors', active ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]' : 'border-[var(--border-strong)]')}>{active && <Check size={13} />}</span>
        <Icon className={active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} size={21} />
        <span className="mt-4 block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{detail}</span>
      </button>
    })}</div>
  </div>
}

function IncomeStep({ settings, setSettings, setIncome }: { settings: JourneySettings; setSettings: (updater: (value: JourneySettings) => JourneySettings) => void; setIncome: (value: string) => void }) {
  return <div>
    <StepHeading eyebrow="Set the rhythm" title="When is money coming next?" detail="This date is the finish line for your current journey, and the amount is what you’ll have to work with." />
    <div className="mt-7 grid gap-4">
      <label><span className="form-label">Next income date</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} /><input className="form-input pl-10" min={futureDate(1)} type="date" value={settings.nextIncomeDate ?? ''} onChange={(event) => setSettings((current) => ({ ...current, nextIncomeDate: event.target.value }))} /></div></label>
      <label><span className="form-label">Typical amount (PKR)</span><input className="form-input font-display text-2xl font-semibold tabular-nums" inputMode="numeric" min="1" step="1" type="number" value={settings.typicalIncome || ''} onChange={(event) => setIncome(event.target.value)} placeholder="30,000" /></label>
    </div>
    <p className="mt-4 text-sm leading-6 text-[var(--muted-2)]">Not exact? A rough estimate is fine — you can fine-tune it any time in Settings.</p>
  </div>
}

function PocketStep({ draft, setDraft, existing }: { draft: Draft; setDraft: (value: Draft) => void; existing: boolean }) {
  return <div>
    <StepHeading eyebrow="Starting point" title={existing ? 'Your current balance' : 'What’s in your pocket now?'} detail="Count only money you can actually spend. You can add more accounts later." />
    <label className="mt-7 block"><span className="form-label">Amount you have (PKR)</span><input className="form-input font-display text-3xl font-semibold tabular-nums" disabled={existing} inputMode="numeric" min="0" step="1" type="number" value={draft.balance} onChange={(event) => setDraft({ ...draft, balance: event.target.value })} /></label>
    {!existing && <div className="mt-5">
      <span className="form-label">Where is it?</span>
      <div className="mt-1.5 grid grid-cols-3 gap-2">{accountTypes.map(({ id, label }) => {
        const active = draft.accountType === id
        return <button aria-pressed={active} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold transition-colors', active ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]')} key={id} onClick={() => setDraft({ ...draft, accountType: id, accountName: draft.accountName === '' || accountTypes.some((type) => type.label === draft.accountName) ? label : draft.accountName })} type="button">{label}</button>
      })}</div>
    </div>}
  </div>
}

function PriorityStep({ selected, onToggle }: { selected: MoneyPriority[]; onToggle: (value: MoneyPriority) => void }) {
  return <div>
    <StepHeading eyebrow="Choose your focus" title="What would feel like a win?" detail="Pick one or more. We’ll keep these front and centre without turning Home into a wall of numbers." />
    <div className="mt-7 grid gap-2">{priorityOptions.map((option) => {
      const active = selected.includes(option.id)
      return <button aria-pressed={active} className={cn('flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors', active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]')} key={option.id} onClick={() => onToggle(option.id)} type="button">
        <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors', active ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]' : 'border-[var(--border-strong)]')}>{active && <Check size={14} />}</span>
        <span><span className="block font-semibold">{option.title}</span><span className="mt-0.5 block text-sm text-[var(--muted)]">{option.detail}</span></span>
      </button>
    })}</div>
  </div>
}

function StepHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">{eyebrow}</p><h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-md text-base leading-7 text-[var(--muted)]">{detail}</p></>
}

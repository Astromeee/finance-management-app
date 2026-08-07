import { currencySymbol, formatAmount, formatMoney } from '../lib/currency'
import { ArrowLeft, ArrowRight, Check, CreditCard, GraduationCap, Home, Landmark, Plus, ShieldCheck, Sparkles, WalletCards, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AuthShell } from '../components/auth/AuthShell'
import { BrandLockup } from '../components/auth/BrandLockup'
import { ProgressDots } from '../components/auth/ProgressDots'
import { StepTracker, type TrackerStep } from '../components/auth/StepTracker'
import { localDateKey } from '../lib/date'
import { trackEvent } from '../lib/analytics'
import { parseWholePkr } from '../lib/money'
import { BILL_CATEGORY_OPTIONS, billsToUpcomingExpenses, billsTotal, type OnboardingBill } from '../lib/onboardingBills'
import { calculateSafeSpend } from '../utils/journeyCalculations'
import type { Account, AccountType, IncomeSourceType, JourneySettings } from '../types/finance'
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
  onComplete: (profile: { name: string }, account: Account | undefined, settings: JourneySettings, bills: OnboardingBill[]) => Promise<void>
  onCancel?: () => void
}

const STORAGE_KEY = 'pocket-ledger-onboarding-draft-v4'
const TOTAL_STEPS = 4

const nf = (value: number) => formatAmount(value)
const money = (value: number) => formatMoney(value)

const TRACKER_STEPS: TrackerStep[] = [
  { title: 'Income source', detail: 'How money reaches you' },
  { title: 'Income timing', detail: 'When the next one lands' },
  { title: 'Fixed bills', detail: 'What must be paid' },
  { title: 'All set', detail: 'Your first safe number' },
]

const sourceOptions: Array<{ id: IncomeSourceType; title: string; detail: string; icon: typeof Landmark }> = [
  { id: 'salary', title: 'Salary', detail: 'A regular payday', icon: Landmark },
  { id: 'allowance', title: 'Pocket money', detail: 'Allowance or family support', icon: GraduationCap },
  { id: 'irregular', title: 'Irregular', detail: 'Freelance, shifts or business', icon: Sparkles },
  { id: 'mixed', title: 'A mix', detail: 'More than one of these', icon: WalletCards },
]

const accountTypes: Array<{ id: AccountType; label: string }> = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank' },
  { id: 'wallet', label: 'Wallet' },
]

const quickAmounts = [15_000, 30_000, 50_000]

const billSuggestions: Array<{ name: string; category: string }> = [
  { name: 'Rent', category: 'Housing/Rent' },
  { name: 'Electricity', category: 'Utilities' },
  { name: 'Internet', category: 'Mobile & Internet' },
  { name: 'Phone', category: 'Mobile & Internet' },
]

// Eases a number up to its target once, honouring reduced-motion.
// Progress is tracked rather than the figure itself, so the effect never
// sets state synchronously — every update lands inside a rAF callback.
function useCountUp(target: number, run: boolean) {
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | undefined>(undefined)
  const [animate] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (!run || !animate) return
    const start = performance.now()
    const duration = 1300
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration)
      setProgress(elapsed)
      if (elapsed < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, run, animate])

  if (!run || !animate) return target
  return Math.round(target * (1 - Math.pow(1 - progress, 3)))
}

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
  return { accountId: crypto.randomUUID(), accountName: 'Cash', accountType: 'cash', balance: '' }
}

export function Onboarding({ email, initialName, initialSettings, existingAccount, onProgress, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(Math.min(initialSettings.onboardingStep, TOTAL_STEPS - 1))
  const [name] = useState(initialName ?? '')
  const [settings, setSettings] = useState<JourneySettings>(() => ({
    ...initialSettings,
    incomeSourceTypes: initialSettings.incomeSourceTypes ?? (initialSettings.incomeSourceType ? [initialSettings.incomeSourceType] : []),
    incomeCadence: initialSettings.incomeCadence ?? 'monthly',
    nextIncomeDate: initialSettings.nextIncomeDate ?? futureDate(14),
    onboardingVersion: 4,
  }))
  const [draft, setDraft] = useState(() => loadDraft(existingAccount))
  const [bills, setBills] = useState<OnboardingBill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existingAccount) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft, existingAccount])
  useEffect(() => { trackEvent('onboarding_started', { surface: 'onboarding', action: 'open' }) }, [])

  const parsedBalance = useMemo(() => draft.balance === '' ? 0 : parseWholePkr(draft.balance) ?? 0, [draft.balance])
  const parsedIncome = Number.isSafeInteger(settings.typicalIncome) ? settings.typicalIncome : 0
  const sources = settings.incomeSourceTypes ?? []

  const account = useMemo<Account>(() => ({
    id: draft.accountId,
    name: draft.accountName.trim() || 'Cash',
    type: draft.accountType,
    balance: parsedBalance,
    color: '#E2703A',
    activity: 'Opening balance',
    cardLabel: draft.accountType.toUpperCase(),
    includeInSafeSpend: true,
  }), [draft, parsedBalance])

  const canContinue = (step === 0 && sources.length > 0)
    || (step === 1 && Boolean(settings.nextIncomeDate) && parsedIncome > 0)
    || step === 2
    || step === 3

  const toggleSource = (id: IncomeSourceType) => setSettings((current) => {
    const list = current.incomeSourceTypes ?? []
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
    return { ...current, incomeSourceTypes: next, incomeSourceType: next[0] }
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
    const nextSettings: JourneySettings = {
      ...settings,
      onboardingStep: nextStep,
      // The final onboarding screen discloses the privacy-minimized analytics
      // that starts when a new user enters the ledger.
      ...(nextStep === TOTAL_STEPS ? { analyticsConsent: true } : {}),
    }
    try {
      if (nextStep < TOTAL_STEPS) {
        await onProgress(nextSettings)
        setSettings(nextSettings)
        setStep(nextStep)
      } else {
        await onComplete(
          { name: name.trim() || email?.split('@')[0] || 'Pocket Ledger user' },
          existingAccount ? undefined : account,
          { ...nextSettings, onboardingStep: TOTAL_STEPS },
          bills,
        )
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this step. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => step > 0 ? setStep((current) => current - 1) : onCancel?.()
  const showBack = step > 0 || Boolean(onCancel)

  const panel = <>
    <BrandLockup tone="espresso" />
    <div className="mt-12">
      <p className="ao-kicker">{step === 3 ? 'All done' : 'Welcome aboard'}</p>
      <h2 className="ao-headline">{step === 3 ? 'Your calm money life starts now.' : 'Let’s set up your money in four quick steps.'}</h2>
    </div>
    <StepTracker current={step + 1} steps={TRACKER_STEPS} />
    <p className="ao-panel-foot">Takes under a minute. You can change any of this later in Settings.</p>
  </>

  return <AuthShell variant="wizard" panel={panel} progress={<ProgressDots current={step + 1} total={TOTAL_STEPS} />}>
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={next}>
      <div className="flex-1">
        {step === 0 && <SourceStep selected={sources} onToggle={toggleSource} />}
        {step === 1 && <TimingStep draft={draft} setDraft={setDraft} existing={Boolean(existingAccount)} settings={settings} setSettings={setSettings} setIncome={setIncome} />}
        {step === 2 && <BillsStep bills={bills} setBills={setBills} />}
        {step === 3 && <RevealStep account={account} bills={bills} name={name} settings={settings} />}
      </div>
      {error && <p className="ao-message" role="alert">{error}</p>}
      <div className="ao-actions">
        {showBack && <button aria-label={step === 0 ? 'Cancel onboarding' : 'Previous step'} className="ao-back" onClick={goBack} type="button"><ArrowLeft size={19} /></button>}
        <button className={cn('ao-cta', step === 3 && 'is-full')} disabled={!canContinue || loading}>
          {loading ? 'Saving…' : step === 3 ? 'Enter Pocket Ledger' : 'Continue'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>
    </form>
  </AuthShell>
}

function StepHeading({ accent, kicker, lead, support }: { accent: string; kicker: string; lead: string; support: string }) {
  return <header>
    <p className="ao-kicker">{kicker}</p>
    <h1 className="ao-headline">{lead} <em>{accent}</em></h1>
    <p className="ao-support">{support}</p>
  </header>
}

function SourceStep({ onToggle, selected }: { onToggle: (value: IncomeSourceType) => void; selected: IncomeSourceType[] }) {
  return <div>
    <StepHeading kicker="Make it yours" lead="How does money" accent="reach you?" support="Pick everything that applies. It shapes the rhythm of your budgeting cycle." />
    <div className="ao-options is-grid">
      {sourceOptions.map(({ detail, icon: Icon, id, title }) => {
        const active = selected.includes(id)
        return <button aria-pressed={active} className={cn('ao-option', active && 'is-selected')} key={id} onClick={() => onToggle(id)} type="button">
          <span className="ao-option-icon"><Icon size={21} /></span>
          <span className="ao-option-copy"><strong>{title}</strong><small>{detail}</small></span>
          <span className="ao-check">{active && <Check size={15} strokeWidth={3} />}</span>
        </button>
      })}
    </div>
  </div>
}

function TimingStep({ draft, existing, setDraft, setIncome, setSettings, settings }: {
  draft: Draft
  existing: boolean
  setDraft: (value: Draft) => void
  setIncome: (value: string) => void
  setSettings: (updater: (value: JourneySettings) => JourneySettings) => void
  settings: JourneySettings
}) {
  return <div>
    <StepHeading kicker="Set the rhythm" lead="When is money" accent="coming next?" support="This date is the finish line for your current cycle, and the amounts tell us what you have to work with." />
    <div className="mt-7 grid gap-5">
      <label className="ao-field">
        <span className="ao-label">Next income date</span>
        <input className="ao-input" min={futureDate(1)} onChange={(event) => setSettings((current) => ({ ...current, nextIncomeDate: event.target.value }))} type="date" value={settings.nextIncomeDate ?? ''} />
      </label>
      <label className="ao-field">
        <span className="ao-label">Typical amount (PKR)</span>
        <input className="ao-input is-figure" inputMode="numeric" min="1" onChange={(event) => setIncome(event.target.value)} placeholder="30,000" step="1" type="number" value={settings.typicalIncome || ''} />
      </label>
      <div className="ao-pills">
        {quickAmounts.map((amount) => <button className={cn('ao-pill', settings.typicalIncome === amount && 'is-selected')} key={amount} onClick={() => setIncome(String(amount))} type="button">{nf(amount)}</button>)}
      </div>
      <label className="ao-field">
        <span className="ao-label">What you have right now (PKR)</span>
        <input className="ao-input is-figure" disabled={existing} inputMode="numeric" min="0" onChange={(event) => setDraft({ ...draft, balance: event.target.value })} placeholder="0" step="1" type="number" value={draft.balance} />
      </label>
      {!existing && <div>
        <span className="ao-label">Where is it?</span>
        <div className="ao-pills">
          {accountTypes.map(({ id, label }) => <button
            className={cn('ao-pill', draft.accountType === id && 'is-selected')}
            key={id}
            onClick={() => setDraft({ ...draft, accountType: id, accountName: draft.accountName === '' || accountTypes.some((type) => type.label === draft.accountName) ? label : draft.accountName })}
            type="button"
          >{label}</button>)}
        </div>
      </div>}
    </div>
    <p className="ao-support">A close guess is fine. You can fine-tune any of this later in Settings.</p>
  </div>
}

function BillsStep({ bills, setBills }: { bills: OnboardingBill[]; setBills: (value: OnboardingBill[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [billName, setBillName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)

  const resetBillDraft = () => {
    setBillName('')
    setAmount('')
    setCategory('')
    setDueDay('')
    setSelectedSuggestion(null)
  }

  const openBillForm = () => {
    resetBillDraft()
    setDueDay('1')
    setAdding(true)
  }

  const openSuggestedBill = (suggestion: (typeof billSuggestions)[number]) => {
    setBillName(suggestion.name)
    setAmount('')
    setCategory(suggestion.category)
    setDueDay('1')
    setSelectedSuggestion(suggestion.name)
    setAdding(true)
  }

  const save = () => {
    const value = Number(amount)
    const parsedDueDay = Number(dueDay)
    if (!billName.trim() || !Number.isFinite(value) || value <= 0 || !category || !Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) return
    setBills([...bills, {
      id: crypto.randomUUID(),
      name: billName.trim(),
      amount: Math.floor(value),
      category,
      dueDay: parsedDueDay,
      frequency: 'monthly',
    }])
    resetBillDraft()
    setAdding(false)
  }

  const parsedDueDay = Number(dueDay)
  const canSave = Boolean(billName.trim())
    && Number.isFinite(Number(amount))
    && Number(amount) > 0
    && Boolean(category)
    && Number.isInteger(parsedDueDay)
    && parsedDueDay >= 1
    && parsedDueDay <= 31
  const remainingSuggestions = billSuggestions.filter((suggestion) => !bills.some((bill) => bill.name.toLowerCase() === suggestion.name.toLowerCase()))

  return <div>
    <StepHeading kicker="Protect the essentials" lead="What must be" accent="paid each cycle?" support="Pick a common expense or add your own. You always enter the amount yourself." />

    {remainingSuggestions.length > 0 && <div className="ao-bill-chips">
      {remainingSuggestions.map((suggestion) => <button aria-pressed={selectedSuggestion === suggestion.name} className={cn('ao-bill-chip', selectedSuggestion === suggestion.name && 'is-selected')} key={suggestion.name} onClick={() => openSuggestedBill(suggestion)} type="button"><Plus size={13} strokeWidth={2.6} />{suggestion.name}</button>)}
    </div>}

    <div className="ao-bill-list">
      {bills.map((bill) => <div className="ao-bill" key={bill.id}>
        <span className="ao-option-icon">{bill.category === 'Housing/Rent' ? <Home size={19} /> : bill.category === 'Utilities' ? <Zap size={19} /> : <CreditCard size={19} />}</span>
        <span className="ao-bill-copy"><strong>{bill.name}</strong><small>Monthly, due {bill.dueDay}</small></span>
        <span className="ao-bill-amount">{money(bill.amount)}</span>
        <button aria-label={`Remove ${bill.name}`} className="ao-bill-remove" onClick={() => setBills(bills.filter((item) => item.id !== bill.id))} type="button"><X size={17} /></button>
      </div>)}

      {adding ? <div className="ao-bill-form">
        {selectedSuggestion
          ? <div className="ao-bill-copy"><strong>{billName}</strong><small>{category}</small></div>
          : <label className="ao-field"><span className="ao-label">Bill name</span><input aria-label="Bill name" className="ao-input" onChange={(event) => setBillName(event.target.value)} placeholder="Enter bill name" type="text" value={billName} /></label>}
        <div className="ao-bill-form-row">
          <label className="ao-field"><span className="ao-label">Amount (PKR)</span><input aria-label="Amount (PKR)" className="ao-input" inputMode="numeric" min="1" onChange={(event) => setAmount(event.target.value)} step="1" type="number" value={amount} /></label>
          <label className="ao-field"><span className="ao-label">Due day</span><input aria-label="Due day" className="ao-input" max="31" min="1" onChange={(event) => setDueDay(event.target.value)} step="1" type="number" value={dueDay} /></label>
        </div>
        {!selectedSuggestion && <label className="ao-field"><span className="ao-label">Category</span><select aria-label="Category" className="ao-input" onChange={(event) => setCategory(event.target.value)} value={category}><option disabled value="">Choose a category</option>{BILL_CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>}
        <div className="ao-bill-form-actions">
          <button className="is-cancel" onClick={() => { resetBillDraft(); setAdding(false) }} type="button">Cancel</button>
          <button className="is-save" disabled={!canSave} onClick={save} type="button">Save bill</button>
        </div>
      </div> : <button className="ao-bill-add" onClick={openBillForm} type="button"><Plus size={18} />{bills.length ? 'Add another bill' : 'Add a bill'}</button>}
    </div>

    <div className="ao-ink-card ao-bill-summary">
      <div>
        <p className="ao-ink-label">Set aside each cycle</p>
        <p className="ao-hero-note">Protected before you spend</p>
      </div>
      <strong>{money(billsTotal(bills))}</strong>
    </div>
  </div>
}

function RevealStep({ account, bills, name, settings }: { account: Account; bills: OnboardingBill[]; name: string; settings: JourneySettings }) {
  const safeSpend = useMemo(() => calculateSafeSpend({
    accounts: [account],
    budgets: [],
    categories: [],
    upcomingExpenses: billsToUpcomingExpenses(bills),
    settings,
  }), [account, bills, settings])

  const total = billsTotal(bills)
  const cycleDays = safeSpend.cycle?.totalDays ?? 30
  const dailyFlow = Math.max(0, Math.floor((settings.typicalIncome - total) / Math.max(1, cycleDays)))
  const ready = safeSpend.state !== 'needs_setup'
  // The stored default is a placeholder, not something to greet someone by.
  const greeting = name.trim() === 'Pocket Ledger user' ? '' : name.trim()
  const counted = useCountUp(ready ? safeSpend.safeToSpendToday : 0, ready)

  return <div>
    <StepHeading
      kicker="You are all set"
      lead={greeting ? 'You are all set,' : 'Here is your first'}
      accent={greeting ? `${greeting}.` : 'safe number.'}
      support="Here is the only number you need for today. It already sets aside every bill you added."
    />
    <div className="ao-ink-card mt-7 text-center">
      <p className="ao-ink-label">Safe to spend today</p>
      <p className="ao-hero-figure"><small>{currencySymbol()}</small>{ready ? nf(counted) : '···'}</p>
      <p className="ao-hero-note">{ready ? 'Bills, savings and your reserve are already protected.' : 'Add a balance and a future income date and this number appears right away.'}</p>
    </div>
    <div className="ao-summary">
      <div className="ao-summary-row"><span>Income</span><strong>{money(settings.typicalIncome)}</strong></div>
      <div className="ao-summary-row"><span>Fixed bills</span><strong>{money(total)}</strong></div>
      <div className="ao-summary-row"><span>Daily flow</span><strong>{money(dailyFlow)}</strong></div>
    </div>
    <div className="ao-analytics-notice" role="note">
      <ShieldCheck aria-hidden="true" size={19} />
      <p><strong>Private usage analytics</strong><span>When you enter, Pocket Ledger starts analytics to count new and active users and understand feature use. We send a pseudonymous account ID and fixed event names, never your email, balances, amounts, transaction names, or notes. <a href="/privacy" rel="noreferrer" target="_blank">Privacy details</a></span></p>
    </div>
  </div>
}

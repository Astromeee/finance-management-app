import { ArrowRightLeft, ChevronDown, MoreVertical, PencilLine, Plus, ShoppingCart, Trash2, WalletCards, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useRef, useState, type Dispatch, type SetStateAction, type UIEvent } from 'react'
import type { Account, Transaction } from '../types/finance'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import { cn } from '../utils/ui'
import { localDateKey, localMonthKey } from '../lib/date'

/* ============================================================
   Accounts — V3 redesign (mock 5a)
   Carousel of full-size identity cards + per-card spending trends.
   All modals, the color picker, and account CRUD are preserved.

   ONE integration change in App.tsx (non-breaking, prop is optional):
     <Accounts accounts={accounts} transactions={transactions} ... />
   ============================================================ */

const cardColorOptions = [
  { name: 'Red', value: '#c2413d' },
  { name: 'Black', value: '#111317' },
  { name: 'Silver', value: '#b9bec7' },
  { name: 'Navy Blue', value: '#162a4a' },
  { name: 'Green', value: '#1f4938' },
  { name: 'Orange', value: '#ff7a1a' },
  { name: 'Yellow', value: '#c9b431' },
]

function normalizeHex(value: string) {
  const cleaned = value.trim().replace(/^#/, '').slice(0, 6)
  return `#${cleaned}`
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function adjustHexLightness(hex: string, amount: number) {
  if (!isValidHex(hex)) return hex
  const clean = hex.slice(1)
  const channels = [0, 2, 4].map((start) => Number.parseInt(clean.slice(start, start + 2), 16))
  const adjusted = channels.map((channel) => {
    const target = amount >= 0 ? 255 : 0
    return clampColorChannel(channel + (target - channel) * Math.abs(amount / 100))
  })
  return `#${adjusted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/* Card text should be dark on light card colors, light on dark ones */
function isLightColor(hex: string) {
  if (!isValidHex(hex)) return false
  const clean = hex.slice(1)
  const [r, g, b] = [0, 2, 4].map((start) => Number.parseInt(clean.slice(start, start + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

interface AccountsProps {
  accounts: Account[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
  onTransfer: () => void
  /** optional — pass transactions={transactions} from App.tsx to light up per-card trends */
  transactions?: Transaction[]
  /** optional — "Details →" on the top-category row opens the Transactions page */
  onOpenTransactions?: () => void
  onSaveAccount?: (account: Account, openingBalance?: number) => Promise<void>
  onAdjustBalance?: (account: Account, transaction: Transaction) => Promise<void>
  onArchiveAccount?: (id: string) => Promise<void>
}

const makeAccountId = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account'}-${Date.now().toString(36)}`

/* ---------- per-card trend helpers ---------- */

function monthKey(date: string) {
  return date.slice(0, 7)
}

function labelForMonthKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, 1)
  return date.toLocaleDateString('en-US', year === new Date().getFullYear() ? { month: 'long' } : { month: 'short', year: 'numeric' })
}

/** Plain amounts (no "Rs") for the In / Out / Kept pills and top-category line, per mock 5a */
function formatPlain(amount: number) {
  return Math.round(Math.abs(amount)).toLocaleString('en-US')
}

function accountMonthStats(account: Account, transactions: Transaction[], key: string) {
  let moneyIn = 0
  let moneyOut = 0
  const categoryTotals = new Map<string, number>()
  const weeklySpend = [0, 0, 0, 0, 0]

  for (const transaction of transactions) {
    if (monthKey(transaction.date) !== key) continue
    const isSource = transaction.accountId === account.id || transaction.fromAccountId === account.id
    const isTarget = transaction.toAccountId === account.id
    if (!isSource && !isTarget) continue

    const outflow =
      (transaction.type === 'expense' || transaction.type === 'goal_saving' || transaction.type === 'debt_payment') && transaction.accountId === account.id
        ? transaction.amount
        : transaction.type === 'transfer' && transaction.fromAccountId === account.id
          ? transaction.amount
          : 0
    const inflow =
      transaction.type === 'income' && transaction.accountId === account.id
        ? transaction.amount
        : transaction.type === 'transfer' && transaction.toAccountId === account.id
          ? transaction.amount
          : 0

    moneyIn += inflow
    moneyOut += outflow

    if (outflow > 0 && transaction.type === 'expense' && transaction.category) {
      categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + outflow)
    }
    if (outflow > 0) {
      const day = Number(transaction.date.slice(8, 10))
      const week = Math.min(4, Math.floor((day - 1) / 7))
      weeklySpend[week] += outflow
    }
  }

  let topCategory: { name: string; amount: number } | null = null
  for (const [name, amount] of categoryTotals) {
    if (!topCategory || amount > topCategory.amount) topCategory = { name, amount }
  }

  return { moneyIn, moneyOut, kept: moneyIn - moneyOut, weeklySpend, topCategory }
}

/* ============================================================ */

export function Accounts({ accounts, setAccounts, setTransactions, onTransfer, onOpenTransactions, onSaveAccount, onAdjustBalance, onArchiveAccount, transactions = [] }: AccountsProps) {
  const [addingAccount, setAddingAccount] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [menuAccount, setMenuAccount] = useState<Account | null>(null)
  const [notice, setNotice] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const total = totalBalance(accounts)
  const activeAccount = accounts[Math.min(activeIndex, Math.max(0, accounts.length - 1))] ?? null

  const now = new Date()
  const [thisMonthKey] = useState(() => localMonthKey(now))
  const [selectedMonthKey, setSelectedMonthKey] = useState(thisMonthKey)

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([thisMonthKey])
    for (const transaction of transactions) if (transaction.date) keys.add(monthKey(transaction.date))
    return [...keys].sort().reverse()
  }, [transactions, thisMonthKey])

  const previousMonthKey = useMemo(() => {
    const [year, month] = selectedMonthKey.split('-').map(Number)
    const previous = new Date(year, (month || 1) - 2, 1)
    return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`
  }, [selectedMonthKey])

  const monthLabel = labelForMonthKey(selectedMonthKey)
  const previousMonthLabel = labelForMonthKey(previousMonthKey)
  const viewingCurrentMonth = selectedMonthKey === thisMonthKey

  const stats = useMemo(
    () => (activeAccount ? accountMonthStats(activeAccount, transactions, selectedMonthKey) : null),
    [activeAccount, transactions, selectedMonthKey],
  )
  const lastStats = useMemo(
    () => (activeAccount ? accountMonthStats(activeAccount, transactions, previousMonthKey) : null),
    [activeAccount, transactions, previousMonthKey],
  )

  const spendDelta = stats && lastStats && lastStats.moneyOut > 0
    ? Math.round(((stats.moneyOut - lastStats.moneyOut) / lastStats.moneyOut) * 100)
    : null

  const onCarouselScroll = (event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget
    const cardWidth = node.firstElementChild instanceof HTMLElement ? node.firstElementChild.offsetWidth + 14 : 1
    const index = Math.round(node.scrollLeft / cardWidth)
    if (index !== activeIndex) setActiveIndex(Math.max(0, Math.min(accounts.length - 1, index)))
  }

  const scrollToIndex = (index: number) => {
    const node = carouselRef.current
    if (!node) return
    const cardWidth = node.firstElementChild instanceof HTMLElement ? node.firstElementChild.offsetWidth + 14 : 0
    node.scrollTo({ left: index * cardWidth, behavior: 'smooth' })
  }

  const maxWeeklySpend = stats ? Math.max(...stats.weeklySpend, 1) : 1
  const highlightWeek = viewingCurrentMonth
    ? Math.min(4, Math.floor((now.getDate() - 1) / 7))
    : stats
      ? Math.max(0, stats.weeklySpend.indexOf(Math.max(...stats.weeklySpend)))
      : 0
  const weeksToShow = viewingCurrentMonth
    ? (now.getDate() > 28 ? 5 : 4)
    : (stats && stats.weeklySpend[4] > 0 ? 5 : 4)
  const selectionScope = `${activeAccount?.id ?? 'none'}:${selectedMonthKey}`
  const [selectedWeek, setSelectedWeek] = useState<{ scope: string; week: number } | null>(null)
  const selectedWeekNumber = selectedWeek?.scope === selectionScope ? selectedWeek.week : null
  const displayWeek = selectedWeekNumber ?? highlightWeek

  return (
    <div className="space-y-5">
      {notice && <div className="rounded-2xl border border-[rgba(255, 122, 26,.25)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{notice}</div>}

      {/* ---- Header: Wallet / Accounts + add button (mock 5a) ---- */}
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Wallet</p>
          <h2 className="mt-0.5 text-[32px] font-semibold leading-tight text-white">Accounts</h2>
        </div>
        <button
          aria-label="Add account"
          className="grid h-[52px] w-[52px] place-items-center rounded-full border border-white/12 bg-white/[.055] text-white backdrop-blur-xl transition hover:border-[rgba(255, 122, 26,.35)]"
          onClick={() => setAddingAccount(true)}
        >
          <Plus size={21} />
        </button>
      </section>

      {/* ---- Total balance ---- */}
      <section>
        <p className="text-sm text-[var(--muted)]">Total balance</p>
        <h3 className="mt-1 text-[42px] font-semibold leading-none tracking-tight text-white sm:text-5xl">{formatPKR(total)}</h3>
      </section>

      {/* ---- Card carousel ---- */}
      {accounts.length > 0 ? (
        <section>
          <div
            ref={carouselRef}
            className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: 'none' }}
            onScroll={onCarouselScroll}
          >
            {accounts.map((account) => {
              const light = isLightColor(account.color)
              const ink = light ? '#191714' : '#F2EFEA'
              const inkSoft = light ? 'rgba(25,23,20,.62)' : 'rgba(242,239,234,.62)'
              const share = total > 0 ? Math.round((account.balance / total) * 100) : 0
              return (
                <article
                  key={account.id}
                  className="relative min-w-[calc(100%-3.5rem)] snap-center overflow-hidden rounded-[30px] border p-6 shadow-[0_18px_36px_rgba(0,0,0,.45)] sm:min-w-[330px]"
                  style={{
                    background: `linear-gradient(150deg, ${adjustHexLightness(account.color, 14)}, ${adjustHexLightness(account.color, -32)})`,
                    borderColor: light ? 'rgba(25,23,20,.14)' : 'rgba(255,255,255,.16)',
                    color: ink,
                  }}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 top-6 h-56 w-56 rounded-full"
                    style={{ background: `radial-gradient(circle, ${light ? 'rgba(255, 122, 26,.18)' : 'rgba(255, 122, 26,.30)'}, transparent 66%)` }}
                  />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-[15px] font-semibold">{account.name}</p>
                      <p className="mt-0.5 text-[12px] capitalize" style={{ color: inkSoft }}>
                        {account.type}{account.cardLabel ? ` - ${account.cardLabel}` : ''}
                      </p>
                    </div>
                    <button
                      aria-label={`${account.name} options`}
                      className="-mr-1.5 -mt-1 rounded-full p-1.5 transition hover:bg-black/10"
                      style={{ color: inkSoft }}
                      onClick={() => setMenuAccount(account)}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  <p className="relative mt-10 text-[38px] font-semibold leading-none tracking-tight">{formatPKR(account.balance)}</p>
                  <div className="relative mt-10 flex items-center justify-between">
                    <p className="text-[10.5px] font-semibold tracking-[.18em]" style={{ color: inkSoft }}>POCKET LEDGER</p>
                    <p className="text-[12px]" style={{ color: inkSoft }}>{share}% of portfolio</p>
                  </div>
                </article>
              )
            })}
          </div>

          {/* dots */}
          <div className="mt-3 flex justify-center gap-2">
            {accounts.map((account, index) => (
              <button
                key={account.id}
                aria-label={`Go to ${account.name}`}
                className={cn('h-1.5 rounded-full transition-all', index === activeIndex ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-white/20')}
                onClick={() => scrollToIndex(index)}
              />
            ))}
          </div>
        </section>
      ) : (
        <button className="w-full rounded-[1.5rem] border border-dashed border-white/15 bg-white/[.03] px-5 py-10 text-left transition hover:border-[rgba(255, 122, 26,.35)] hover:bg-[rgba(255, 122, 26,.06)]" onClick={() => setAddingAccount(true)}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-[#16130F]"><Plus size={22} /></span>
          <span className="mt-5 block text-xl font-semibold text-white">Add your first account</span>
          <span className="mt-2 block text-sm text-[var(--muted)]">Create cash, bank, or wallet accounts to start tracking.</span>
        </button>
      )}

      {/* ---- Per-card spending trends ---- */}
      {activeAccount && stats && (
        <motion.section key={activeAccount.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[17px] font-semibold text-white">{activeAccount.name} · {viewingCurrentMonth ? 'this month' : monthLabel}</p>
            <label className="relative inline-flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-[var(--accent)]">
              {monthLabel}
              <ChevronDown size={14} />
              <select
                aria-label="Select month"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={selectedMonthKey}
                onChange={(event) => setSelectedMonthKey(event.target.value)}
              >
                {monthOptions.map((key) => <option key={key} value={key}>{labelForMonthKey(key)}</option>)}
              </select>
            </label>
          </div>

          {/* in / out / kept */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[18px] border border-white/10 bg-white/[.055] px-4 py-3.5 backdrop-blur-xl">
              <p className="text-[11px] text-[var(--muted-2)]">In</p>
              <p className="mt-1 text-lg font-semibold text-[var(--positive)]">{formatPlain(stats.moneyIn)}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[.055] px-4 py-3.5 backdrop-blur-xl">
              <p className="text-[11px] text-[var(--muted-2)]">Out</p>
              <p className="mt-1 text-lg font-semibold text-[var(--negative)]">{formatPlain(stats.moneyOut)}</p>
            </div>
            <div className="rounded-[18px] border border-[rgba(255, 122, 26,.28)] bg-[rgba(255, 122, 26,.14)] px-4 py-3.5 backdrop-blur-xl">
              <p className="text-[11px] text-[#ff7a1a]">Kept</p>
              <p className="mt-1 text-lg font-semibold text-white">{stats.kept >= 0 ? '+' : '-'}{formatPlain(stats.kept)}</p>
            </div>
          </div>

          {/* weekly spend bars */}
          <div className="rounded-[22px] border border-white/10 bg-white/[.055] px-4.5 py-4 backdrop-blur-xl">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[12px] text-[var(--muted-2)]">
                {selectedWeekNumber === null ? 'Weekly spend from this card' : `Week ${selectedWeekNumber + 1} · ${formatPKR(stats.weeklySpend[selectedWeekNumber])}`}
              </p>
              {spendDelta !== null && (
                <p className={cn('text-[12px] font-semibold', spendDelta > 0 ? 'text-[var(--negative)]' : 'text-[var(--positive)]')}>
                  {spendDelta > 0 ? '▲' : '▼'} {Math.abs(spendDelta)}% vs {previousMonthLabel}
                </p>
              )}
            </div>
            <div className="flex h-[56px] items-end gap-3">
              {stats.weeklySpend.slice(0, weeksToShow).map((amount, week) => {
                const isActive = week === displayWeek
                return (
                  <button
                    key={week}
                    type="button"
                    aria-label={`Week ${week + 1}: ${formatPKR(amount)}`}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    onClick={() => setSelectedWeek((current) => (current?.scope === selectionScope && current.week === week ? null : { scope: selectionScope, week }))}
                  >
                    <span
                      className="w-full rounded-[7px] transition-all"
                      style={{
                        height: `${Math.max(10, (amount / maxWeeklySpend) * 100)}%`,
                        background: isActive ? 'linear-gradient(180deg,#ff7a1a,#ff7a1a)' : '#3A3A3E',
                        boxShadow: isActive ? '0 0 16px rgba(255, 122, 26,.4)' : undefined,
                      }}
                    />
                    <span className={cn('text-[10px]', isActive ? 'text-[#ff7a1a]' : 'text-[var(--muted-2)]')}>W{week + 1}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* top category */}
          {stats.topCategory && (
            <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[.055] px-4 py-3.5 backdrop-blur-xl">
              <span className="grid h-10 w-10 place-items-center rounded-[13px] border border-[rgba(255, 122, 26,.28)] bg-[rgba(255, 122, 26,.16)] text-[var(--accent)]">
                <ShoppingCart size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-white">Top category: {stats.topCategory.name}</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--muted-2)]">
                  {formatPlain(stats.topCategory.amount)} · {stats.moneyOut > 0 ? Math.round((stats.topCategory.amount / stats.moneyOut) * 100) : 0}% of this card's spend
                </p>
              </div>
              {onOpenTransactions && (
                <button className="shrink-0 text-[12.5px] font-semibold text-[var(--accent)]" onClick={onOpenTransactions}>
                  Details →
                </button>
              )}
            </div>
          )}
          {!stats.topCategory && stats.moneyIn === 0 && stats.moneyOut === 0 && (
            <p className="rounded-[20px] border border-white/10 bg-white/[.035] px-4 py-3 text-xs text-[var(--muted)]">No activity on this account yet this month.</p>
          )}
        </motion.section>
      )}

      {/* ---- Card ⋮ action sheet ---- */}
      {menuAccount && (
        <div className="fixed inset-0 z-50 grid items-end bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setMenuAccount(null)}>
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-lg rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-1 text-xs text-[var(--muted)]">{menuAccount.name}</p>
            <div className="mt-3 grid gap-2">
              <button
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-sm font-semibold text-white"
                onClick={() => { setEditingAccount(menuAccount); setMenuAccount(null) }}
              >
                <PencilLine size={17} className="text-[var(--accent)]" /> Edit card
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-sm font-semibold text-white"
                onClick={() => { setSelectedAccount(menuAccount); setMenuAccount(null) }}
              >
                <WalletCards size={17} className="text-[var(--accent)]" /> Adjust balance
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                disabled={accounts.length < 2}
                title={accounts.length < 2 ? 'Add at least two accounts to transfer money.' : undefined}
                onClick={() => { setMenuAccount(null); onTransfer() }}
              >
                <ArrowRightLeft size={17} className="text-[var(--accent)]" /> Transfer money
              </button>
              <button
                className="flex items-center gap-3 rounded-2xl border border-[rgba(232,105,74,.25)] bg-[rgba(232,105,74,.06)] px-4 py-3.5 text-sm font-semibold text-[var(--negative)] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={accounts.length < 2}
                onClick={async () => {
                  if (!menuAccount || accounts.length < 2) return
                  try {
                    await onArchiveAccount?.(menuAccount.id)
                    setAccounts((current) => current.filter((item) => item.id !== menuAccount.id))
                    setNotice(`${menuAccount.name} archived.`)
                    setMenuAccount(null)
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : 'Could not archive account.')
                  }
                }}
              >
                <Trash2 size={17} /> Archive account
              </button>
            </div>
            <button className="mt-3 w-full rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={() => setMenuAccount(null)}>
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <AddAccountModal
        open={addingAccount}
        onClose={() => setAddingAccount(false)}
        onNotice={setNotice}
        onSaveAccount={onSaveAccount}
        setAccounts={setAccounts}
      />
      <AdjustBalanceModal
        key={selectedAccount?.id ?? 'closed'}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onNotice={setNotice}
        onAdjustBalance={onAdjustBalance}
        setAccounts={setAccounts}
        setTransactions={setTransactions}
      />
      <EditAccountModal
        key={editingAccount?.id ?? 'edit-closed'}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onNotice={setNotice}
        onAdjustBalance={onAdjustBalance}
        onSaveAccount={onSaveAccount}
        setAccounts={setAccounts}
        setTransactions={setTransactions}
      />
    </div>
  )
}

/* ============================================================
   Modals & color picker — unchanged behavior, V3 accents only
   ============================================================ */

function AddAccountModal({
  open,
  onClose,
  onNotice,
  onSaveAccount,
  setAccounts,
}: {
  open: boolean
  onClose: () => void
  onNotice: (message: string) => void
  onSaveAccount?: (account: Account, openingBalance?: number) => Promise<void>
  setAccounts: Dispatch<SetStateAction<Account[]>>
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<Account['type']>('bank')
  const [balance, setBalance] = useState('')
  const [cardLabel, setCardLabel] = useState('')
  const [color, setColor] = useState('#1d2026')
  const [baseColor, setBaseColor] = useState('#1d2026')
  const [lightness, setLightness] = useState(0)
  const [hexInput, setHexInput] = useState('#1d2026')

  if (!open) return null

  const setColorFromBase = (nextBase: string, nextLightness = lightness) => {
    setBaseColor(nextBase)
    setLightness(nextLightness)
    const nextColor = adjustHexLightness(nextBase, nextLightness)
    setColor(nextColor)
    setHexInput(nextColor)
  }

  const setColorFromHex = (value: string) => {
    const normalized = normalizeHex(value)
    setHexInput(normalized)
    if (!isValidHex(normalized)) return
    setBaseColor(normalized)
    setLightness(0)
    setColor(normalized)
  }

  const saveAccount = async () => {
    const parsedBalance = Number(balance || 0)
    if (!name.trim() || !Number.isFinite(parsedBalance) || !isValidHex(color)) return
    const label = cardLabel.trim().toUpperCase() || name.trim().slice(0, 5).toUpperCase()
    const account: Account = {
      id: makeAccountId(name),
      name: name.trim(),
      type,
      balance: parsedBalance,
      color,
      activity: '',
      cardLabel: label,
      includeInSafeSpend: true,
    }

    try {
      await onSaveAccount?.(account, parsedBalance)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not add account.')
      return
    }
    setAccounts((current) => [account, ...current])
    onNotice(`${account.name} added.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">New account card</p>
            <h2 className="text-xl font-semibold text-white">Add account</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close add account"><X size={19} /></button>
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="form-label">Account name</span>
            <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="HBL Account" />
          </label>
          <label>
            <span className="form-label">Account type</span>
            <select className="form-input" value={type} onChange={(event) => setType(event.target.value as Account['type'])}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
            </select>
          </label>
          <label>
            <span className="form-label">Opening balance</span>
            <input className="form-input text-2xl font-semibold" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="Rs. 0" />
          </label>
          <label>
            <span className="form-label">Masked card label</span>
            <input className="form-input uppercase" maxLength={8} placeholder="HBL" value={cardLabel} onChange={(event) => setCardLabel(event.target.value)} />
          </label>
          <CardColorPicker
            baseColor={baseColor}
            color={color}
            hexInput={hexInput}
            lightness={lightness}
            setColorFromBase={setColorFromBase}
            setColorFromHex={setColorFromHex}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center disabled:opacity-60" onClick={saveAccount} disabled={!name.trim() || !Number.isFinite(Number(balance || 0)) || !isValidHex(color)}>Save</button>
        </div>
      </motion.section>
    </div>
  )
}

function EditAccountModal({
  account,
  onClose,
  onNotice,
  onAdjustBalance,
  onSaveAccount,
  setAccounts,
  setTransactions,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  onAdjustBalance?: (account: Account, transaction: Transaction) => Promise<void>
  onSaveAccount?: (account: Account, openingBalance?: number) => Promise<void>
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<Account['type']>(account?.type ?? 'bank')
  const [balance, setBalance] = useState(account?.balance.toString() ?? '')
  const [cardLabel, setCardLabel] = useState(account?.cardLabel ?? '')
  const [color, setColor] = useState(account?.color ?? '#1d2026')
  const [baseColor, setBaseColor] = useState(account?.color ?? '#1d2026')
  const [lightness, setLightness] = useState(0)
  const [hexInput, setHexInput] = useState(account?.color ?? '#1d2026')

  if (!account) return null

  const setColorFromBase = (nextBase: string, nextLightness = lightness) => {
    setBaseColor(nextBase)
    setLightness(nextLightness)
    const nextColor = adjustHexLightness(nextBase, nextLightness)
    setColor(nextColor)
    setHexInput(nextColor)
  }

  const setColorFromHex = (value: string) => {
    const normalized = normalizeHex(value)
    setHexInput(normalized)
    if (!isValidHex(normalized)) return
    setBaseColor(normalized)
    setLightness(0)
    setColor(normalized)
  }

  const saveAccount = async () => {
    const parsedBalance = Number(balance)
    if (!name.trim() || !Number.isFinite(parsedBalance) || !isValidHex(color)) return
    const balanceDifference = parsedBalance - account.balance
    const absoluteDifference = Math.abs(balanceDifference)
    const adjustmentLabel = balanceDifference > 0 ? 'Unexplained Income' : 'Unexplained Expense'
    const updatedName = name.trim()

    const updatedAccount: Account = {
      ...account,
      name: updatedName,
      type,
      balance: parsedBalance,
      color,
      cardLabel: cardLabel.trim().toUpperCase() || account.cardLabel,
      activity: balanceDifference === 0 ? account.activity : `${adjustmentLabel}: ${formatPKR(absoluteDifference)}`,
    }
    let adjustment: Transaction | undefined
    if (balanceDifference !== 0) {
      adjustment = {
          id: `edit-adj-${account.id}-${Date.now().toString(36)}`,
          title: adjustmentLabel,
          amount: absoluteDifference,
          type: balanceDifference > 0 ? 'income' : 'expense',
          category: adjustmentLabel,
          source: balanceDifference > 0 ? adjustmentLabel : undefined,
          account: updatedName,
          accountId: account.id,
          date: localDateKey(),
          notes: `Balance edited from ${formatPKR(account.balance)} to ${formatPKR(parsedBalance)}`,
          createdAt: new Date().toISOString(),
        }
    }

    try {
      if (adjustment) await onAdjustBalance?.(updatedAccount, adjustment)
      else await onSaveAccount?.(updatedAccount)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not update account.')
      return
    }
    setAccounts((current) => current.map((item) => item.id === account.id ? updatedAccount : item))
    if (adjustment) setTransactions((current) => [adjustment, ...current])

    onNotice(balanceDifference === 0 ? `${updatedName} updated. Card carousel is synced.` : `${adjustmentLabel} recorded for ${updatedName}.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">Edit account card</p>
            <h2 className="text-xl font-semibold text-white">{account.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close edit account"><X size={19} /></button>
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="form-label">Account name</span>
            <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Account type</span>
            <select className="form-input" value={type} onChange={(event) => setType(event.target.value as Account['type'])}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
            </select>
          </label>
          <label>
            <span className="form-label">Balance</span>
            <input className="form-input text-2xl font-semibold" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Masked card label</span>
            <input className="form-input uppercase" maxLength={8} placeholder="HBL" value={cardLabel} onChange={(event) => setCardLabel(event.target.value)} />
          </label>
          <CardColorPicker
            baseColor={baseColor}
            color={color}
            hexInput={hexInput}
            lightness={lightness}
            setColorFromBase={setColorFromBase}
            setColorFromHex={setColorFromHex}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center disabled:opacity-60" onClick={saveAccount} disabled={!name.trim() || !Number.isFinite(Number(balance)) || !isValidHex(color)}>Save</button>
        </div>
      </motion.section>
    </div>
  )
}

function CardColorPicker({
  baseColor,
  color,
  hexInput,
  lightness,
  setColorFromBase,
  setColorFromHex,
}: {
  baseColor: string
  color: string
  hexInput: string
  lightness: number
  setColorFromBase: (nextBase: string, nextLightness?: number) => void
  setColorFromHex: (value: string) => void
}) {
  return (
    <div>
      <span className="form-label">Card color</span>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {cardColorOptions.map((option) => (
          <button
            key={option.name}
            aria-label={`Use ${option.name}`}
            className={cn('h-12 rounded-2xl border transition', baseColor === option.value ? 'border-[var(--accent)] ring-2 ring-[rgba(255, 122, 26,.25)]' : 'border-white/10')}
            title={option.name}
            style={{ background: option.value }}
            onClick={() => setColorFromBase(option.value, 0)}
            type="button"
          />
        ))}
      </div>
      <label className="mt-4 block">
        <span className="form-label">Lighten / darken</span>
        <input className="w-full accent-[var(--accent)]" type="range" min="-55" max="55" value={lightness} onChange={(event) => setColorFromBase(baseColor, Number(event.target.value))} />
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]"><span>Darker</span><span>{lightness > 0 ? `+${lightness}` : lightness}</span><span>Lighter</span></div>
      </label>
      <label className="mt-4 block">
        <span className="form-label">Hex code</span>
        <div className="grid grid-cols-[1fr_3.25rem] gap-3">
          <input className="form-input uppercase" value={hexInput} onChange={(event) => setColorFromHex(event.target.value)} placeholder="#1D2026" />
          <input className="form-input h-12 p-2" type="color" value={isValidHex(color) ? color : '#1d2026'} onChange={(event) => setColorFromHex(event.target.value)} aria-label="Custom card color" />
        </div>
        {!isValidHex(hexInput) && <p className="mt-2 text-xs text-[var(--negative)]">Use a 6-digit hex color, like #162A4A.</p>}
      </label>
      <div className="mt-4 h-12 rounded-2xl border border-white/10" style={{ background: isValidHex(color) ? color : '#1d2026' }} />
    </div>
  )
}

function AdjustBalanceModal({
  account,
  onClose,
  onNotice,
  onAdjustBalance,
  setAccounts,
  setTransactions,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  onAdjustBalance?: (account: Account, transaction: Transaction) => Promise<void>
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}) {
  const [actualBalance, setActualBalance] = useState('')
  const [date, setDate] = useState(() => localDateKey())
  const [note, setNote] = useState('Balance adjusted manually')

  if (!account) return null

  const parsedBalance = Number(actualBalance)
  const hasValue = actualBalance !== '' && Number.isFinite(parsedBalance)
  const difference = hasValue ? parsedBalance - account.balance : 0
  const isIncrease = difference > 0
  const isDecrease = difference < 0
  const absoluteDifference = Math.abs(difference)
  const adjustmentLabel = isIncrease ? 'Unexplained Income' : isDecrease ? 'Unexplained Expense' : 'No adjustment needed'

  const confirmAdjustment = async () => {
    if (!hasValue || difference === 0) {
      onNotice('No adjustment needed.')
      onClose()
      return
    }

    const updatedAccount = { ...account, balance: parsedBalance, activity: `${adjustmentLabel}: ${formatPKR(absoluteDifference)}` }
    const adjustment: Transaction = {
        id: crypto.randomUUID(),
        title: adjustmentLabel,
        amount: absoluteDifference,
        type: isIncrease ? 'income' : 'expense',
        category: adjustmentLabel,
        account: account.name,
        accountId: account.id,
        date,
        notes: note || 'Balance adjusted manually',
        createdAt: new Date().toISOString(),
      }
    try {
      await onAdjustBalance?.(updatedAccount, adjustment)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not adjust balance.')
      return
    }
    setAccounts((current) => current.map((item) => item.id === account.id ? updatedAccount : item))
    setTransactions((current) => [adjustment, ...current])
    onNotice(`${adjustmentLabel} recorded for ${account.name}.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">Adjust Balance</p>
            <h2 className="text-xl font-semibold text-white">{account.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close adjust balance"><X size={19} /></button>
        </div>

        <div className="mt-5 rounded-3xl bg-[var(--surface-2)] p-4">
          <p className="text-sm text-[var(--muted)]">Recorded balance</p>
          <strong className="mt-1 block text-3xl text-white">{formatPKR(account.balance)}</strong>
        </div>

        <div className="mt-4 grid gap-4">
          <label>
            <span className="form-label">Actual balance</span>
            <input className="form-input text-2xl font-semibold" type="number" placeholder="Rs. 42,000" value={actualBalance} onChange={(event) => setActualBalance(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Date</span>
            <input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            <span className="form-label">Note / reason</span>
            <textarea className="form-input min-h-20 resize-none" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>

        <div className="mt-4 rounded-3xl border border-white/8 bg-[var(--surface-2)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--muted)]">Difference</span>
            <strong className={cn(isIncrease && 'amount-positive', isDecrease && 'amount-negative', !difference && 'amount-neutral')}>
              {hasValue ? `${formatPKR(absoluteDifference)}${isIncrease ? ' increase' : isDecrease ? ' decrease' : ''}` : 'Enter actual balance'}
            </strong>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {hasValue && difference !== 0
              ? `This will be recorded as ${adjustmentLabel} ${isIncrease ? 'into' : 'from'} ${account.name}.`
              : 'No transaction is created when balances are equal.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>Cancel</button>
          <button className="btn-primary justify-center" onClick={confirmAdjustment}>Confirm</button>
        </div>
      </motion.section>
    </div>
  )
}

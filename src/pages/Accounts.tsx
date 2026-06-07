import { ArrowRightLeft, Banknote, Building2, MoreHorizontal, PencilLine, Plus, Smartphone, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { Account, Transaction } from '../types/finance'
import { formatPKR, totalBalance } from '../utils/financeCalculations'
import { cn } from '../utils/ui'

const iconMap = { cash: Banknote, bank: Building2, wallet: Smartphone }

const cardStyles: Record<string, { className: string; detail: string }> = {
  cash: { className: 'bg-[#d8c7a3] text-[#181512]', detail: 'Daily cash' },
  hbl: { className: 'bg-[#202125] text-white', detail: 'Main spending account' },
  meezan: { className: 'bg-[#1f4938] text-[#f6f3ea]', detail: 'Savings bank' },
  jazzcash: { className: 'bg-[#c57b45] text-[#17110d]', detail: 'Digital wallet' },
  easypaisa: { className: 'bg-[#5e9da0] text-[#101718]', detail: 'PKR wallet' },
}

interface AccountsProps {
  accounts: Account[]
  transactions: Transaction[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}

export function Accounts({ accounts, transactions, setAccounts, setTransactions }: AccountsProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [notice, setNotice] = useState('')

  const breakdown = useMemo(() => ({
    cash: accounts.filter((account) => account.type === 'cash').reduce((sum, account) => sum + account.balance, 0),
    banks: accounts.filter((account) => account.type === 'bank').reduce((sum, account) => sum + account.balance, 0),
    wallets: accounts.filter((account) => account.type === 'wallet').reduce((sum, account) => sum + account.balance, 0),
  }), [accounts])

  const recentActivity = [
    ...transactions.filter((transaction) => accounts.some((account) => transaction.account.includes(account.name))).slice(0, 5),
    { id: 'a1', title: 'ATM withdrawal to Cash', amount: 10000, type: 'transfer', category: 'Transfer', account: 'HBL Account to Cash', date: '2026-06-01' },
  ].slice(0, 5) as Transaction[]

  return (
    <div className="space-y-4 sm:space-y-5">
      {notice && <div className="rounded-2xl border border-[rgba(221,255,69,.2)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{notice}</div>}

      <section className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <article className="balance-card">
          <p className="text-sm text-[var(--muted)]">Total Balance</p>
          <h3 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{formatPKR(totalBalance(accounts))}</h3>
          <div className="mt-5 grid gap-2 text-sm text-[var(--muted)]">
            <div className="flex justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2"><span>Cash</span><strong className="text-white">{formatPKR(breakdown.cash)}</strong></div>
            <div className="flex justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2"><span>Banks</span><strong className="text-white">{formatPKR(breakdown.banks)}</strong></div>
            <div className="flex justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2"><span>Wallets</span><strong className="text-white">{formatPKR(breakdown.wallets)}</strong></div>
          </div>
        </article>

        <article className="card">
          <div className="section-title"><div><p>Account actions</p><h3>Wallet tools</h3></div></div>
          <div className="grid grid-cols-3 gap-3">
            <button className="quick-action"><Plus className="mx-auto" size={18} /><span className="mt-2 block text-xs font-semibold">Add account</span></button>
            <button className="quick-action"><ArrowRightLeft className="mx-auto" size={18} /><span className="mt-2 block text-xs font-semibold">Transfer</span></button>
            <button className="quick-action quick-action-primary" onClick={() => setSelectedAccount(accounts[0])}><PencilLine className="mx-auto" size={18} /><span className="mt-2 block text-xs font-semibold">Adjust</span></button>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Wallet cards</p>
              <h3 className="text-2xl font-semibold text-white">Your accounts</h3>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map((account) => {
              const Icon = iconMap[account.type]
              const style = cardStyles[account.id] ?? cardStyles.hbl
              return (
                <article key={account.id} className={cn('relative min-h-44 overflow-hidden rounded-[1.75rem] p-5 shadow-xl shadow-black/25 transition hover:-translate-y-0.5', style.className)}>
                  <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-12 right-10 h-28 w-28 rounded-full border border-white/15" />
                  <div className="relative flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/15"><Icon size={21} /></span>
                    <button className="grid h-9 w-9 place-items-center rounded-full bg-black/15" aria-label={`Adjust ${account.name}`} onClick={() => setSelectedAccount(account)}>
                      <MoreHorizontal size={19} />
                    </button>
                  </div>
                  <div className="relative mt-7">
                    <p className="text-sm opacity-75">{account.name}</p>
                    <h4 className="mt-1 text-3xl font-semibold tracking-tight">{formatPKR(account.balance)}</h4>
                  </div>
                  <div className="relative mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[.16em] opacity-60">{account.type}</p>
                      <p className="mt-1 text-sm opacity-80">{style.detail}</p>
                    </div>
                    <button className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-semibold" onClick={() => setSelectedAccount(account)}>Adjust</button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="card">
          <div className="section-title"><div><p>Recent</p><h3>Account activity</h3></div></div>
          <div className="space-y-2.5">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-3)] text-[var(--accent)]">
                  {activity.type === 'income' ? <Plus size={18} /> : activity.type === 'transfer' ? <ArrowRightLeft size={18} /> : <Banknote size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{activity.title}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{activity.account} · {activity.date}</p>
                </div>
                <strong className={cn('text-sm', activity.type === 'income' ? 'amount-positive' : activity.type === 'expense' ? 'amount-negative' : 'amount-neutral')}>
                  {activity.type === 'income' ? '+' : activity.type === 'expense' ? '-' : ''}{formatPKR(activity.amount)}
                </strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <AdjustBalanceModal
        key={selectedAccount?.id ?? 'closed'}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onNotice={setNotice}
        setAccounts={setAccounts}
        setTransactions={setTransactions}
      />
    </div>
  )
}

function AdjustBalanceModal({
  account,
  onClose,
  onNotice,
  setAccounts,
  setTransactions,
}: {
  account: Account | null
  onClose: () => void
  onNotice: (message: string) => void
  setAccounts: Dispatch<SetStateAction<Account[]>>
  setTransactions: Dispatch<SetStateAction<Transaction[]>>
}) {
  const [actualBalance, setActualBalance] = useState('')
  const [date, setDate] = useState('2026-06-05')
  const [note, setNote] = useState('Balance adjusted manually')

  if (!account) return null

  const parsedBalance = Number(actualBalance)
  const hasValue = actualBalance !== '' && Number.isFinite(parsedBalance)
  const difference = hasValue ? parsedBalance - account.balance : 0
  const isIncrease = difference > 0
  const isDecrease = difference < 0
  const absoluteDifference = Math.abs(difference)
  const adjustmentLabel = isIncrease ? 'Unexplained Income' : isDecrease ? 'Unexplained Expense' : 'No adjustment needed'

  const confirmAdjustment = () => {
    if (!hasValue || difference === 0) {
      onNotice('No adjustment needed.')
      onClose()
      return
    }

    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id
          ? { ...item, balance: parsedBalance, activity: `${adjustmentLabel}: ${formatPKR(absoluteDifference)}` }
          : item,
      ),
    )

    setTransactions((current) => [
      {
        id: `adj-${account.id}-${current.length + 1}`,
        title: adjustmentLabel,
        amount: absoluteDifference,
        type: isIncrease ? 'income' : 'expense',
        category: adjustmentLabel,
        account: account.name,
        date,
        notes: note || 'Balance adjusted manually',
      },
      ...current,
    ])
    onNotice(`${adjustmentLabel} recorded for ${account.name}.`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.section initial={{ opacity: 0, y: 44, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mx-auto w-full max-w-lg rounded-t-[1.75rem] border border-white/10 bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem] sm:p-5">
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

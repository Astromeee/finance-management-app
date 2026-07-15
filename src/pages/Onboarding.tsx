import { useState, type FormEvent } from 'react'
import type { Account, AccountType } from '../types/finance'
import { parseWholePkr } from '../lib/money'

export function Onboarding({ email, initialName, onComplete }: { email?: string; initialName?: string; onComplete: (profile: { name: string }, account: Account) => Promise<void> }) {
  const [name, setName] = useState(initialName ?? '')
  const [accountName, setAccountName] = useState('Cash')
  const [accountType, setAccountType] = useState<AccountType>('cash')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amount = balance === '0' ? 0 : parseWholePkr(balance)
    if (amount === null) return setError('Opening balance must be a whole PKR amount.')
    setLoading(true)
    setError('')
    try {
      await onComplete({ name: name.trim() || email?.split('@')[0] || 'Pocket Ledger user' }, {
        id: crypto.randomUUID(), name: accountName.trim(), type: accountType, balance: amount,
        color: '#ff5c00', activity: 'Opening balance', cardLabel: accountType.toUpperCase(),
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not finish setup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-deep)] p-5">
      <section className="w-full max-w-lg rounded-[2rem] border border-[var(--glass-border)] bg-[var(--surface)] p-6">
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">PUBLIC BETA</span>
        <h1 className="mt-4 text-3xl font-semibold text-white">Set up your first ledger</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Pocket Ledger tracks the entries you record manually. It does not connect to or move money from your bank accounts.</p>
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]"><strong className="text-white">Defaults:</strong> PKR currency · Pakistan dates · Asia/Karachi timezone</div>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <label><span className="form-label">Your name</span><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we greet you?" /></label>
          <label><span className="form-label">First account name</span><input className="form-input" value={accountName} onChange={(event) => setAccountName(event.target.value)} required /></label>
          <label><span className="form-label">Account type</span><select className="form-input" value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="wallet">Wallet</option></select></label>
          <label><span className="form-label">Current balance</span><input className="form-input" inputMode="numeric" min="0" step="1" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} required /></label>
          {error && <p className="text-sm text-[var(--negative)]" role="alert">{error}</p>}
          <button className="btn-primary justify-center disabled:opacity-60" disabled={loading || !accountName.trim()}>{loading ? 'Creating your ledger…' : 'Start using Pocket Ledger'}</button>
        </form>
      </section>
    </main>
  )
}

export function BrandLockup({ tone = 'cream' }: { tone?: 'cream' | 'espresso' }) {
  return <div className={`ao-lockup is-${tone}`}>
    <span className="ao-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M6 5.5h9M6 11h7M6 16.5h5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="17.5" cy="16.5" r="2.1" fill="currentColor" />
      </svg>
    </span>
    <span className="ao-wordmark">Pocket Ledger</span>
  </div>
}

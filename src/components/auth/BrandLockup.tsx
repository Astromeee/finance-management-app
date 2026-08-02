/** The real "Vault" mark from public/favicon.svg, inlined so the three
 *  fills can flip for dark surfaces. Geometry must stay in sync with
 *  public/favicon.svg — it is the same artwork. */
export function BrandLockup({ tone = 'cream' }: { tone?: 'cream' | 'espresso' }) {
  return <div className={`ao-lockup is-${tone}`}>
    <span className="ao-mark" aria-hidden="true">
      <svg viewBox="0 0 512 512">
        <rect className="ao-mark-tile" width="512" height="512" rx="114" />
        <g className="ao-mark-bars">
          <rect x="136" y="153" width="240" height="42" rx="13" />
          <rect x="136" y="235" width="240" height="42" rx="13" />
          <rect x="136" y="317" width="150" height="42" rx="13" />
        </g>
        <rect className="ao-mark-cursor" x="304" y="317" width="42" height="42" rx="13" />
      </svg>
    </span>
    <span className="ao-wordmark">Pocket Ledger</span>
  </div>
}

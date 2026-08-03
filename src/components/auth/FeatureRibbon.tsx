/** The four surfaced features, stated as a quiet typographic ribbon along the
 *  bottom of the desktop auth plane rather than sold with app screenshots.
 *  Desktop only — the mobile block hides it. */
const CELLS: Array<{ id: string; value: string; prefix?: string; kicker: string; line: string }> = [
  { id: 'safe', prefix: 'Rs', value: '4,280', kicker: 'Safe to spend', line: 'Balances, bills and goals, resolved into one number.' },
  { id: 'record', value: 'Record', kicker: 'A few taps', line: 'Amount, category, done. Quick enough to keep up.' },
  { id: 'insights', value: 'Insights', kicker: 'By category and cycle', line: 'Months of transactions turned into clear patterns.' },
  { id: 'goals', value: 'Goals', kicker: 'And debts', line: 'Side by side, with the pace to stay on schedule.' },
]

export function FeatureRibbon() {
  return <div className="ao-ribbon" aria-hidden="true">
    {CELLS.map((cell) => <div className="ao-ribbon-cell" key={cell.id}>
      <p className="ao-ribbon-value">{cell.prefix && <small>{cell.prefix}</small>}{cell.value}</p>
      <p className="ao-ribbon-kicker">{cell.kicker}</p>
      <p className="ao-ribbon-line">{cell.line}</p>
    </div>)}
  </div>
}

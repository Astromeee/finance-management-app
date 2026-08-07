import { ArrowRight } from 'lucide-react'
import { currencySymbol, formatAmount } from '../../lib/currency'
import type { SafeSpendResult } from '../../types/finance'
import { VaultSheet } from './VaultSheet'

/**
 * "How was this worked out?" for the daily number.
 *
 * Presented as a receipt rather than a dashboard: one column of figures, a
 * hairline before the subtotal, a heavier rule before the result. Every value
 * already exists on SafeSpendResult — nothing here is recalculated, so the
 * sheet can never disagree with the number that opened it.
 *
 * The two deductions are tappable. Someone asking why the number is small is
 * exactly the person who should be shown where bills and the reserve are set,
 * which makes this the app's best teaching surface as well as its explanation.
 */
export function SafeSpendSheet({
  open,
  safeSpend,
  onClose,
  onNavigate,
  onSetupJourney,
}: {
  open: boolean
  safeSpend: SafeSpendResult
  onClose: () => void
  onNavigate: (page: string) => void
  onSetupJourney: () => void
}) {
  const symbol = currencySymbol()
  const days = safeSpend.cycle?.daysRemaining ?? 0
  const go = (run: () => void) => () => { onClose(); run() }

  return (
    <VaultSheet open={open} label="How your daily number is worked out" onClose={onClose}>
      <p className="vault-eyebrow">Your daily number</p>
      <h2 className="vault-h2 mt-1">
        How <span className="vault-digits">{symbol} {formatAmount(safeSpend.safeToSpendToday)}</span> was worked out
      </h2>

      <div className="ss-receipt mt-5">
        <button className="ss-line is-tappable" type="button" onClick={go(() => onNavigate('accounts'))}>
          <span className="ss-line-label">In your spending accounts<ArrowRight size={12} strokeWidth={2.4} /></span>
          <span className="ss-line-value vault-digits">{formatAmount(safeSpend.includedBalance)}</span>
        </button>

        <button className="ss-line is-tappable" type="button" onClick={go(() => onNavigate('budgets'))}>
          <span className="ss-line-label">Reserved for bills<ArrowRight size={12} strokeWidth={2.4} /></span>
          <span className="ss-line-value vault-digits is-minus">− {formatAmount(safeSpend.reservedForBills)}</span>
        </button>

        <button className="ss-line is-tappable" type="button" onClick={go(onSetupJourney)}>
          <span className="ss-line-label">Safety reserve<ArrowRight size={12} strokeWidth={2.4} /></span>
          <span className="ss-line-value vault-digits is-minus">− {formatAmount(safeSpend.safetyReserve)}</span>
        </button>

        <div className="ss-line is-subtotal">
          <span className="ss-line-label">Free to spend this cycle</span>
          <span className="ss-line-value vault-digits">{formatAmount(safeSpend.flexibleMoneyRemaining)}</span>
        </div>

        {days > 0 && (
          <div className="ss-line">
            <span className="ss-line-label">Split across {days} {days === 1 ? 'day' : 'days'} to payday</span>
            <span className="ss-line-value vault-digits is-minus">÷ {days}</span>
          </div>
        )}

        <div className="ss-line is-total">
          <span className="ss-line-label">Safe to spend today</span>
          <span className="ss-line-value vault-digits">{symbol} {formatAmount(safeSpend.safeToSpendToday)}</span>
        </div>
      </div>

      <p className="vault-sheet-note mt-4">
        Bills and your reserve come out first, so this is what is genuinely yours to spend today.
      </p>
      {safeSpend.explanation && <p className="vault-sheet-note mt-2">{safeSpend.explanation}</p>}
    </VaultSheet>
  )
}

# Pocket Ledger desktop parity audit

Date: 2026-07-31  
Viewport: 1440 × 900  
Scope: Home, Ledger, Wallet, Insights, Goals, Plan, Settings, and Categories

## Outcome

The desktop redesign is visually consistent with the supplied package and now exposes the important mobile workflows. The main functional cause of apparently missing Ledger and Insights data was the desktop defaulting to the current income cycle; records outside that calculated range were valid but hidden. Desktop now starts on All time and offers a clear recovery action when a narrower period is empty.

## Implemented

- Ledger: all-time default, period recovery state, working type filters, search, record, edit, and delete.
- Wallet: live accounts and balances, account selector, transfers, add account, edit account, and archive account.
- Insights: live income/spending area chart, live category bar chart, all-time fallback, safe-spend context, and limit/cool-off actions.
- Goals: create goals, add a payment to a specific goal, edit/delete goals, add/edit/delete debts, and record debt payments.
- Plan: add or update spending limits, schedule/edit/delete/pay bills, add and review cool-off items, and start/end quests.
- Settings: profile, analytics, notifications, journey-cycle setup, categories, linked accounts, CSV export, and sign out.
- Categories: desktop-native list, add/edit, usage protection, and archive.

## Design recommendations

1. Add a persistent desktop command palette. Search already has the right data surface; extending it to “Record expense,” “Pay rent,” or “Add to laptop goal” would reduce navigation and make the desktop experience feel intentionally faster than mobile.
2. Add a unified “Needs attention” inbox. Combine overdue bills, exceeded limits, ready cool-off decisions, and stalled goals into one ranked list with direct actions.
3. Add saved views to Ledger. Useful defaults are “This payday cycle,” “Subscriptions,” “Cash only,” and “Uncategorized.” Let users pin two or three views beside the current filter chips.
4. Make charts explain change, not only totals. Add period-over-period deltas and a plain-language sentence such as “Dining out fell 18% while transport rose Rs 1,200.”
5. Add keyboard shortcuts for desktop: `N` to record, `/` to search, `G` then `L/W/I/G/P` for primary pages, and `Esc` to close panels.
6. Add reversible confirmations for destructive actions. Archive/delete can use a short undo toast so frequent desktop management remains quick without being risky.
7. Improve empty states with a next action. For a new account, goal, or plan, show one recommended first step and an example of the insight that will appear after data is recorded.

## Product opportunities

- Recurring transaction detection: suggest turning repeated ledger entries into scheduled bills.
- Smart reconciliation: flag account balances that no longer match recorded activity and guide the user through an adjustment.
- Goal rules: automatically move a percentage of income or round up selected expenses into a goal.
- Bill calendar: monthly view with cash-flow pressure days and projected balance after scheduled payments.
- Shared household ledger: invite-only shared accounts or budgets with clear ownership of each entry.
- Receipt attachment and OCR: optional receipt capture with extracted amount, date, and merchant.
- Data-quality score: highlight uncategorized records, missing account links, and duplicate transactions.
- Privacy-first backup health: show last successful sync/export and provide a guided recovery check.

## Evidence

- Before contact sheet: `/Users/astromee/Pocket Ledger App/design-audit/desktop-parity-2026-07-31/desktop-before-contact-sheet.jpg`
- After contact sheet: `/Users/astromee/Pocket Ledger App/design-audit/desktop-parity-2026-07-31/desktop-after-contact-sheet.jpg`
- Individual post-change captures: Insights, Goals, and Plan in the same audit folder.

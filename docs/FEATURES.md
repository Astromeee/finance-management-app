# Pocket Ledger Features

Pocket Ledger is a personal finance tracking frontend prototype for daily PKR money management. It is not a business accounting app.

## Included Screens

- Dashboard / Home with a refined balance hero, quick action row, compact financial summary, account preview, major recent transaction section, analytics preview, goals, debts, and budget warning.
- Transactions with search, type/category/month filters, transaction chips, icons, type badges, and styled income, expense, transfer, goal, and debt rows.
- Accounts with total balance, cash/bank/wallet breakdown, premium wallet-card account cards, compact account actions, recent activity, and manual balance adjustment.
- Goals & Debts with progress cards, remaining amounts, percentages, due dates, and status badges.
- Budgets with monthly category limits, used amounts, remaining balance, progress bars, near-limit warnings, and over-budget states.
- Reports with monthly summary, category donut chart, weekly spending trend, income source bar chart, account breakdown, budget usage, goal progress, debt progress, and needs vs wants comparison.
- Settings with currency, theme, categories, accounts, export/import placeholders, Supabase placeholder, and documentation reference.

## Add Transaction Modal

The modal supports tabs for Income, Expense, Transfer, Goal, and Debt. On mobile it opens as a thumb-friendly bottom sheet; on desktop it opens as a centered modal. Each tab exposes relevant fields and currently records a session-only mock submission count.

## Responsive Behavior

- Mobile uses a native-inspired single-column layout, compact cards, icon-only floating dock navigation, extra bottom padding, touch-sized controls, and a smaller add button.
- Tablet uses 2-column grids where suitable while retaining bottom navigation below the desktop breakpoint.
- Desktop uses a refined sidebar, sticky top header, modular grid layouts, restrained card polish, and side-by-side charts.

# Pocket Ledger Features

Pocket Ledger is a personal finance tracking frontend prototype for daily PKR money management. It is not a business accounting app.

## Included Screens

- Dashboard / Home with a refined balance hero, quick action row, stacked account preview cards, and icon-only bottom navigation.
- Transactions with search, type/category/month filters, transaction chips, icons, type badges, and styled income, expense, transfer, goal, and debt rows.
- Accounts with total balance, cash/bank/wallet breakdown, premium wallet-card account cards, compact account actions, editable card labels/colors, and manual balance adjustment.
- Goals & Debts with savings goals, debt progress cards, and Upcoming Expenses for future planned payments.
- Budgets with monthly category limits, used amounts, remaining balance, progress bars, near-limit warnings, and over-budget states.
- Reports with monthly summary, category donut chart, weekly spending trend, income source bar chart, account breakdown, budget usage, goal progress, debt progress, and needs vs wants comparison.
- Settings with currency, theme, categories, accounts, export/import placeholders, Supabase placeholder, and documentation reference.

## Working Finance Actions

Pocket Ledger now uses separate animated bottom-sheet modals for the main actions instead of one generic transaction form.

- Add Income increases the selected account balance, creates an income transaction, and updates dashboard totals.
- Add Expense decreases the selected account balance, creates an expense transaction, updates category budget usage, and warns if the account will go negative.
- Transfer Money moves balance between two accounts, creates a transfer transaction, and does not affect income or expense totals.
- Add Goal creates a savings goal in local state and shows it on Goals & Debts.
- Debt Payment records a payment, decreases the selected account, updates debt progress, and adds a transaction.
- Add Upcoming Expense creates a planned payment with due date, optional linked account, notes, and recurring settings. It does not affect balances, actual expense totals, budgets, or reports spending until marked paid.
- Mark Upcoming Expense as Paid asks for a paid-from account and payment date, then creates a real expense transaction, decreases the selected account, updates matching budget usage, and marks the planned item paid.
- Recurring upcoming expenses automatically create the next future planned item after the current item is marked paid.
- Manual balance adjustment remains available from Accounts and records unexplained income or expense when balances differ.

All action results update the Dashboard, Home account cards, Accounts, Transactions, Reports, Goals, Debts, and Budgets immediately during the current session.

## Responsive Behavior

- Mobile uses a native-inspired single-column layout, compact cards, icon-only floating dock navigation, extra bottom padding, touch-sized controls, and a smaller add button.
- Tablet uses 2-column grids where suitable while retaining bottom navigation below the desktop breakpoint.
- Desktop uses a refined sidebar, sticky top header, modular grid layouts, restrained card polish, and side-by-side charts.

# Pocket Ledger User Flows

## Add Income

Tap the Income quick action, enter amount, choose source, choose receiving account, add date and notes, then save. The selected account balance increases and the transaction appears at the top of Transactions.

## Add Expense

Tap the Home plus button, desktop Quick add, or Expense quick action. Enter amount, select category, choose paid-from account and payment method, add date and notes, then save. The selected account balance decreases. If the amount is larger than the balance, the modal warns that the balance will go negative.

## Transfer Money

Tap the Transfer quick action, enter amount, select from account and to account, add date and notes, then save. Transfers update both account balances but do not affect income or expenses. Transfers are blocked when the selected from-account has insufficient balance.

## Adjust Account Balance

Open Accounts, choose Adjust on an account card, enter the actual balance, date, and optional note, then confirm. A lower actual balance records an Unexplained Expense, a higher actual balance records Unexplained Income, and an equal balance creates no transaction.

## Add Savings Goal

Tap the Goal quick action or Add goal on Goals & Debts. Enter goal name, target amount, initial saved amount, optional linked account, deadline, and notes. Track progress on Goals & Debts and Reports.

## Add Debt

Create a debt with name, total amount, paid amount, due date, and status. Overdue items use warning styling.

## Pay Debt

Tap Pay debt on Goals & Debts, select the debt, enter amount paid, choose paid-from account, add date and notes, and save. The account balance decreases, debt progress increases, and a debt payment transaction is added.

## Add Upcoming Expense

Open Goals & Debts, tap Add Upcoming Expense, enter title, amount, category, due date, optional linked account, and notes, then save. The item appears in Upcoming Expenses with a status badge. It does not reduce balances, increase monthly expenses, update budget used, or appear in Transactions until paid.

## Add Recurring Upcoming Expense

In Add Upcoming Expense, enable Recurring, choose frequency, repeat start date, optional repeat end date, and optional reminder days before due date. The current planned item appears like any other upcoming expense and shows a Recurring badge.

## Mark Upcoming Expense As Paid

Tap Mark as Paid on an upcoming expense. Confirm the paid-from account, payment date, and optional notes. The app creates a real expense transaction, decreases the selected account balance, updates matching budget usage, marks the planned expense Paid, and the item then counts in actual monthly expense totals and reports.

## Auto-Create Next Recurring Expense

When a recurring upcoming expense is marked paid, Pocket Ledger automatically creates the next unpaid planned expense using the selected frequency. If the next due date is beyond the optional repeat end date, no new item is created.

## Create Budget

Choose a category, set the monthly budget amount, and track used, remaining, near-limit, and over-budget states.

## View Reports

Open Reports, choose a period from the top selector, and review the structured analytics in order: summary cards, Spending by Category, Income by Source, Spending Trend, Needs vs Wants, Spending by Account, Budget Performance, Upcoming Expenses, and Goals & Debts.

Changing the period recalculates income, actual expenses, net saved, savings rate, category totals, income sources, spending trend, account usage, and budget performance. All Time includes every transaction. Custom Range uses the selected start and end dates.

Upcoming Expenses stay in their own planned section and do not count as actual expenses until marked paid elsewhere.

## Mobile Navigation

Use the icon-only floating dock to switch between Home, Transactions, Accounts, Goals, and Reports. The app adds bottom padding so scrollable content remains visible above the navigation bar.

## Dashboard Quick Actions

Use the quick action row on the Dashboard for common actions. Income opens Add Income, Expense opens Add Expense, Transfer opens Transfer Money, and Goal opens Add Goal. Each action updates shared local state immediately.

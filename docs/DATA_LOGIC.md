# Pocket Ledger Data Logic

## Currency

All amounts are displayed in Pakistani Rupees using `PKR / Rs.` formatting.

## Calculations

- Total Balance = sum of all account balances.
- Monthly Income = sum of transactions with type `income`.
- Monthly Expenses = sum of transactions with type `expense`.
- Net Saving = Monthly Income - Monthly Expenses.
- Goal Progress = Saved Amount / Target Amount x 100.
- Debt Progress = Paid Amount / Total Debt Amount x 100.
- Budget Usage = Category Spending / Category Budget x 100.
- Remaining Budget = Budget Amount - Used Amount.
- Remaining Goal Amount = Target Amount - Saved Amount.
- Remaining Debt Amount = Total Debt Amount - Paid Amount.
- Account Breakdown = grouped total of cash, bank, and wallet account balances.
- Upcoming Expense Planning Total = unpaid planned expenses by due date; these are planning values, not actual spending.

## Transfers

Transfers move money from one account to another. They do not count as income or expenses.

## Working Local Actions

- Income increases the selected account balance and creates an `income` transaction with source, account, date, and optional notes.
- Expense decreases the selected account balance and creates an `expense` transaction with category, payment method, account, date, and optional notes. If a matching budget category exists, its used amount increases.
- Transfer moves money from one account to another and creates a `transfer` transaction. Total balance stays the same and transfers are excluded from income and expense calculations.
- Goal creation adds a new goal to shared local state. Initial saved amount is recorded on the goal; if present, a `goal_saving` transaction is also added for audit context, but the app does not subtract it from an account yet.
- Debt payment decreases the selected account balance, increases the selected debt paid amount, and creates a `debt_payment` transaction.
- Upcoming expenses are planned expenses. They do not reduce account balances or increase actual expenses until marked as paid.
- Creating or editing an upcoming expense only updates `upcomingExpenses` in shared local state.
- Marking an upcoming expense as paid creates a real `expense` transaction, decreases the selected account balance, updates matching budget usage, stores the transaction id on the planned expense, and marks the planned expense `paid`.
- Recurring upcoming expenses generate the next unpaid planned item after payment using the selected frequency: weekly, monthly, every 3 months, every 6 months, or yearly. If an end date exists and the next due date passes it, no next item is created.
- Goal contribution follows the same intended model as goal saving: goal progress increases, selected account balance decreases, and a `goal_saving` transaction is created. A dedicated contribution button can be added when the goal card UI needs it.
- Unexplained income/expense from balance adjustment keeps manual corrections auditable.

## Manual Balance Adjustment Logic

- If actual balance is lower than recorded balance, create an `Unexplained Expense` transaction for the difference and reduce the selected account balance.
- If actual balance is higher than recorded balance, create an `Unexplained Income` transaction for the difference and increase the selected account balance.
- If actual balance equals recorded balance, no transaction is created and the app shows `No adjustment needed.`
- This keeps the ledger auditable instead of silently overwriting balances.

## Safe-To-Spend

The prototype estimates safe-to-spend by subtracting remaining budget commitments, a short-term goal reserve, and a debt reserve from total account balance. This can be refined later with due dates and recurring commitments.

Upcoming expenses may be used for planning safe-to-spend, but unpaid upcoming expenses remain separate from real expenses. If included, the safe-to-spend planning formula is:

Safe to Spend = Total Balance - unpaid upcoming expenses due this month - debt payments due this month - planned goal contributions.

This planning value must not be treated as actual spending.

## Upcoming Expenses

Upcoming expenses live in shared local finance state as `UpcomingExpense` records with title, amount, category, due date, optional linked account, notes, status, recurring settings, creation date, and optional paid transaction id.

Statuses display as:

- `Upcoming` for unpaid items due later than 7 days away.
- `Due Soon` for unpaid items due within the next 7 days.
- `Overdue` for unpaid items past due.
- `Paid` for planned items already converted to actual expense transactions.

Unpaid upcoming expenses do not appear in Transactions and do not feed actual expense charts. Only paid conversion creates a real transaction.

## Mock Content

The v3 mock data remains tuned for a Pakistani personal finance workflow for Moeed, including accounts like Cash, HBL Account, Meezan Bank, JazzCash, and Easypaisa; income such as Parents Support and Freelancing Payment; and expenses such as Food & Groceries, Transport, Course Fee, Clothes, and Dining Out.

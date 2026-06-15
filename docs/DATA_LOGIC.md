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

## Reports Period Filtering

Reports use a selected period before calculating summaries and breakdowns.

- `This Month` uses the current calendar month.
- `Last Month` uses the previous full calendar month.
- `Last 3 Months` and `Last 6 Months` start at the first day of the earliest included month and end today.
- `This Year` starts on January 1 of the current year.
- `All Time` includes every transaction in local state.
- `Custom Range` includes transactions between the selected start and end dates.
- Specific month options such as `June 2026` use the first through last day of that month.

All transaction-driven report sections use this selected period.

## Reports Actual Calculations

- Actual Income = sum of selected-period transactions where `type === "income"`.
- Actual Expenses = sum of selected-period transactions where `type === "expense"`.
- Net Saved = Actual Income - Actual Expenses.
- Savings Rate = Net Saved / Actual Income x 100. If income is zero, savings rate displays as 0%.
- Spending by Category groups only actual `expense` transactions by category.
- Income by Source groups only actual `income` transactions by source, category, or title.
- Spending by Account groups only actual `expense` transactions by account and counts those expense transactions.
- Transfers are excluded from income, expenses, account spending, and category reports.
- `goal`, `goal_saving`, `debt`, and `debt_payment` transaction types are not counted as actual income or actual expenses.
- Unpaid upcoming expenses are excluded from Actual Expenses, category breakdowns, budget actuals, account usage, needs vs wants, and spending trends.
- Upcoming expenses appear only in the Upcoming Expenses report preview until they are marked paid and converted into a real `expense` transaction.

## Transfers

Transfers move money from one account to another. They do not count as income or expenses.

## Working Local Actions

- Income increases the selected account balance and creates an `income` transaction with source, account, date, and optional notes.
- Expense decreases the selected account balance and creates an `expense` transaction with category, payment method, account, date, and optional notes. If a matching budget category exists, its used amount increases.
- Transfer moves money from one account to another and creates a `transfer` transaction. Total balance stays the same and transfers are excluded from income and expense calculations.
- Goal creation adds a new goal to shared local state. Initial saved amount is recorded on the goal; if present, a `goal_saving` transaction is also added for audit context, but the app does not subtract it from an account yet.
- Debt / money owed payment decreases the selected account balance, increases the selected item's paid amount, recalculates remaining amount, marks the item Paid when paid amount reaches total amount, and creates a `debt_payment` transaction titled `Payment toward [debt title]`.
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

## Debts & Money Owed

Debt-related records cover formal debts, overdue payments, installments, and personal money owed to someone.

Each item stores:

- `id`
- `title`
- optional `personOrCompany`
- `totalAmount`
- `paidAmount`
- calculated remaining amount: `totalAmount - paidAmount`
- optional `dueDate`
- `category`: Debt, Overdue Payment, Money I Owe, Installment, or Other
- `status`: Active, Due Soon, Overdue, or Paid
- optional `notes`
- `createdAt`

Status display logic:

- Paid when `paidAmount >= totalAmount`.
- Overdue when the due date has passed and the item is not fully paid.
- Due Soon when the due date is within the next 7 days and the item is not fully paid.
- Active when it is not paid, overdue, or due soon.

Debt payments are recorded as `debt_payment` transactions and are excluded from normal expense category reports. They still reduce the selected account balance because cash has left that account.

## Mock Content

The default mock finance state stays minimal, with debt examples for Borrowed from Brother, Laptop Installment, Pending Course Fee, and Owe friend for shared dinner to demonstrate the Debts & Money Owed flow.

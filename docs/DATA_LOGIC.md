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

## Transfers

Transfers move money from one account to another. They do not count as income or expenses.

## Manual Balance Adjustment Logic

- If actual balance is lower than recorded balance, create an `Unexplained Expense` transaction for the difference and reduce the selected account balance.
- If actual balance is higher than recorded balance, create an `Unexplained Income` transaction for the difference and increase the selected account balance.
- If actual balance equals recorded balance, no transaction is created and the app shows `No adjustment needed.`
- This keeps the ledger auditable instead of silently overwriting balances.

## Safe-To-Spend

The prototype estimates safe-to-spend by subtracting remaining budget commitments, a short-term goal reserve, and a debt reserve from total account balance. This can be refined later with due dates and recurring commitments.

## Mock Content

The v3 mock data remains tuned for a Pakistani personal finance workflow for Moeed, including accounts like Cash, HBL Account, Meezan Bank, JazzCash, and Easypaisa; income such as Parents Support and Freelancing Payment; and expenses such as Food & Groceries, Transport, Course Fee, Clothes, and Dining Out.

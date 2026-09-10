# Ledger quick-add widget

Install beta.9 over the existing APK, open Ledger once, and sign in. Long-press an empty space on the Android home screen, choose Widgets, then drag **Ledger · Quick add** onto the home screen. The default widget is 4 × 2 cells and can resize horizontally.

Expense and Income open a separate floating entry activity over the launcher. They do not launch the dashboard. Enter a whole-number amount, choose a category/source and account, then save. The date is today. A confirmed save closes the window and shows a short confirmation. This version requires internet access; it does not queue offline transactions.

The entry WebView uses the same Capacitor origin and persistent Supabase session as the main app. Saving calls the existing `record_finance_action` RPC with the signed-in user's permissions. No credentials or balances are stored in the launcher widget. A failed request keeps the form open and retries use the same transaction ID. If a response is lost, the transaction is checked before reporting failure. Once a save has been attempted, its fields remain fixed to keep retries consistent.

## Verification

- Unit coverage: expense/income payloads, invalid amounts, failed saves with stable retry IDs, and recovery after a committed save loses its response.
- Browser verification with mocked data: both compact forms render and save without mounting the dashboard.
- Android debug build, manifest and signing checks.
- Physical phone still needed: add widget; open each action; verify shared sign-in; save a small entry and check exactly one transaction and matching balance change; test airplane mode; rotate/open keyboard; confirm closing returns to launcher. Delete any test transactions afterward.

No database migration or new Android permission is required. The usual website login and recording flow remain the same.

# Ledger quick-add widget

## Beta.10: monthly spending and Pixel Quick Tap

Install beta.10 over the existing APK and open Ledger once to populate the monthly widget. In the home-screen widget picker, add **Ledger · Monthly spending**. It shows month-to-date expenses, highest categories first, with remaining categories combined into Other categories when needed. Income, transfers and future-dated expenses are excluded.

The summary updates when transactions change in the native app or a quick entry is saved. It is a cached summary, not continuous background cloud sync. Use the refresh arrow for changes made on the website or another device: this briefly opens the small entry window to fetch the ledger and closes it after updating. The widget displays the last update time. On month rollover it requests a refresh instead of presenting last month's total as current. Signing out clears the cached summary.

For Pixel 7 Pro: Settings → System → Gestures → Quick Tap → Open app → gear → **Ledger Quick Record**. This extra launcher entry is included in the same APK and opens only the floating form. The usual Ledger icon still opens the dashboard. The form has an Expense/Income selector, amount, category/source and account. It requires internet and an existing Ledger sign-in. Android controls gesture availability; test the gesture on your unlocked phone.

Phone checks: confirm both launcher entries work; select Quick Record in Quick Tap and double-tap the back; save one expense and income; compare widget total against the app; edit/delete the expense and confirm update; refresh after a web entry; sign out and confirm totals disappear. Automated tests cover aggregation, overflow grouping, dates and switching entry direction. Physical Pixel gesture behavior has not been tested here.

Install beta.9 over the existing APK, open Ledger once, and sign in. Long-press an empty space on the Android home screen, choose Widgets, then drag **Ledger · Quick add** onto the home screen. The default widget is 4 × 2 cells and can resize horizontally.

Expense and Income open a separate floating entry activity over the launcher. They do not launch the dashboard. Enter a whole-number amount, choose a category/source and account, then save. The date is today. A confirmed save closes the window and shows a short confirmation. This version requires internet access; it does not queue offline transactions.

The entry WebView uses the same Capacitor origin and persistent Supabase session as the main app. Saving calls the existing `record_finance_action` RPC with the signed-in user's permissions. No credentials or balances are stored in the launcher widget. A failed request keeps the form open and retries use the same transaction ID. If a response is lost, the transaction is checked before reporting failure. Once a save has been attempted, its fields remain fixed to keep retries consistent.

## Verification

- Unit coverage: expense/income payloads, invalid amounts, failed saves with stable retry IDs, and recovery after a committed save loses its response.
- Browser verification with mocked data: both compact forms render and save without mounting the dashboard.
- Android debug build, manifest and signing checks.
- Physical phone still needed: add widget; open each action; verify shared sign-in; save a small entry and check exactly one transaction and matching balance change; test airplane mode; rotate/open keyboard; confirm closing returns to launcher. Delete any test transactions afterward.

No database migration or new Android permission is required. The usual website login and recording flow remain the same.

# Ledger simplification and daily reminders

The app removes the safe-to-spend, affordability, cool-off, and weekly-quest entry points. Existing bills, limits, goals, account balances, and transaction history remain. Old feature records remain in the database for compatibility.

Sunday recaps summarize the last completed Sunday–Saturday week. They appear once per user/device on Sunday when entries exist and can be reopened from Story/Insights throughout the week. The recap reuses the existing sheet, fonts, and colors.

Receivables track an existing obligation without changing cash on creation. Repayments increase the selected account atomically and are separate from earned income. Write-offs preserve cash and history; later recovery is supported. Deleting a repayment reverses its effects; the toast's icon-only Undo restores it. Full JSON backups include receivables and their immutable event history.

Daily logging reminders are opt-in per device under Settings, defaulting to 21:00 in the device's time zone. A service worker receives Web Push while the app is closed. iPhone/iPad require a supported iOS version and installation on the Home Screen. Delivery timing remains subject to device/browser notification settings and connectivity.

## Backend deployment

Apply both `20260909054626_receivables_and_daily_push.sql` and `20260909060843_schedule_daily_reminders.sql`, and deploy `supabase/functions/daily-reminders` with `verify_jwt = false`. This function uses its own private cron header for sends; GET returns only the public VAPID key. VAPID private material and the cron secret stay in Supabase Vault. Do not rotate the VAPID key without a subscription migration.

The schedule migration targets Finance management (`ioojdmerropjhoaazrez`). Change the URL when deploying to another project. The cron job checks due subscriptions every five minutes and claims at most one delivery per local calendar date. It catches up later the same day after an outage. Uncertain send failures retain the claim to prevent duplicate prompts; expired subscriptions are removed.

Both migrations and the function were deployed through the authenticated Supabase dashboard. An invocation using the configured cron command returned HTTP 200 with zero sends/failures before any device opted in. Unauthorized POST requests returned 401. Device delivery still requires an opted-in physical device check.

## Validation

- `npm run check`: lint, 107 unit tests, and production PWA build.
- Playwright: mobile back behavior, direct Paths navigation, recap replay and Sunday frequency, mobile/desktop receivables, deletion Undo, retired feature visibility, narrow-screen circle sizing, and public routes.
- `supabase/tests/receivables_and_reminders.sql`: run in a disposable database; fixtures roll back. Covers partial repayment, overpayment rejection, idempotency, write-off/recovery/reversal, ordinary expense reversal, user isolation, protected columns/private config, invalid time zones, and daily deduplication.

Physical iOS/Android delivery has not been verified. No existing financial records were changed during deployment verification.

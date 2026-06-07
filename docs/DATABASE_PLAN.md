# Future Supabase Database Plan

Supabase is intentionally not implemented in version 1. The frontend is structured so mock data can later be replaced with queries and mutations.

## Tables

- `profiles`: user settings, display name, default currency, theme.
- `accounts`: account name, type, opening balance, current balance, color, user id.
- `categories`: name, kind, color, sort order, user id.
- `transactions`: title, amount, type, category id, account id, transfer account id, date, notes, attachment path, user id.
- `goals`: name, target amount, saved amount, due date, status, user id.
- `debts`: name, total amount, paid amount, due date, status, user id.
- `budgets`: category id, budget amount, period month, used amount or calculated usage, user id.
- `attachments`: transaction id, storage path, file name, mime type, user id.

## Notes

Transactions should be the source of truth for account balance calculations once persistence is added. Transfers should create linked transaction records or a transaction with both source and destination accounts.

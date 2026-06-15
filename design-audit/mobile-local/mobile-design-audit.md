# Pocket Ledger Mobile Design Audit

Date: 2026-06-16
Viewport: 390 x 844, DPR 2
Local app: http://127.0.0.1:5174/
Capture folder: screenshots/

## Screens Captured

1. Home
   - Health: strong visual identity, but too dark and the bottom nav clips at both edges.
   - Evidence: screenshots/01-home-viewport.png, screenshots/01-home-full.png

2. Transactions
   - Health: clean filter UI, but empty results look unfinished because there is no helpful empty state or primary action.
   - Evidence: screenshots/02-transactions-viewport.png, screenshots/02-transactions-full.png

3. Accounts
   - Health: useful structure and actions, but empty/current state needs stronger onboarding and the bottom nav overlaps the first-account card area.
   - Evidence: screenshots/03-accounts-viewport.png, screenshots/03-accounts-full.png

4. Goals & Debts
   - Health: most useful screen in the current data state, but dense, tall, and partly obscured by the bottom nav.
   - Evidence: screenshots/04-goals-debts-viewport.png, screenshots/04-goals-debts-full.png

5. Reports / Analytics
   - Health: comprehensive, but zero-data screens become a long stack of repeated empty analytics.
   - Evidence: screenshots/05-reports-viewport.png, screenshots/05-reports-full.png

6. Budgets
   - Health: visually consistent, but not reachable from mobile nav and empty state gives no way to create a budget.
   - Evidence: screenshots/06-budgets-viewport.png, screenshots/06-budgets-full.png

7. Settings
   - Health: clear list design, but not reachable from mobile nav and several items read like placeholders.
   - Evidence: screenshots/07-settings-viewport.png, screenshots/07-settings-full.png

8. Add Expense Modal
   - Health: strong bottom-sheet pattern with good control sizes; needs smarter finance helpers.
   - Evidence: screenshots/08-add-expense-modal.png

## Highest Impact Changes

1. Fix mobile navigation first.
   The current dock is wider than the viewport when an item expands, so the first and last icons clip offscreen. Also, mobile only exposes Home, Transactions, Cards, Goals, and Analytics. Budgets and Settings are hidden on phones even though they are important.

   Recommendation:
   - Replace the expanding-pill dock with a fixed 5-item compact dock plus a More button, or use 4 core items plus a central Add button.
   - Put Budgets, Settings, Export, and Categories behind More.
   - Keep labels short and stable. Avoid changing button widths on small screens.

2. Raise contrast across the dark theme.
   The design direction is good, but the captured mobile UI is very dim. Text, borders, and icons often sit too close to the background. This makes the app feel premium at first glance but tiring for daily money tracking.

   Recommendation:
   - Keep graphite + lime as the brand theme.
   - Increase primary text brightness and muted text contrast.
   - Reduce page-wide dark overlays and heavy shadow opacity.
   - Use lime for action, focus, and progress, not for every card border.

3. Add real empty states.
   Transactions, Budgets, Reports, and parts of Accounts look blank or incomplete when there is little data.

   Recommendation:
   - Transactions: "No transactions yet" plus Add income, Add expense, Transfer.
   - Budgets: "Create your first monthly limit" plus suggested budget chips like Rent, Food, Transport, Mobile.
   - Reports: show a starter insight panel instead of many zero cards.
   - Accounts: show a short setup checklist: Add cash wallet, Add bank, Add JazzCash/Easypaisa.

4. Add richer starter/sample data for design and testing.
   src/data/mockData.ts currently has empty accounts, transactions, goals, budgets, upcoming expenses, and only debts populated. This makes it hard to judge the real app experience and makes many screens feel empty.

   Recommendation:
   - Keep a realistic local demo dataset for UI testing.
   - Include 3 to 5 accounts, 12 to 20 transactions, 3 budgets, 2 goals, 3 upcoming expenses, and existing debts.
   - Add a "Reset demo data" action for development or a sample-mode toggle.

5. Make Home more useful at a glance.
   The balance card is visually memorable, but Home should answer: Can I spend today? What needs attention? What did I recently do?

   Recommendation:
   - Add a small "This month" insight strip below balance: spent, income, safe-to-spend, upcoming due.
   - Show the next 2 alerts directly, not only behind the bell.
   - Add recent transaction rows below accounts when data exists.

6. Rework Reports into insight cards, not just charts.
   Current Reports is complete but too dashboard-like for mobile. With little data, it becomes many panels saying zero.

   Recommendation:
   - Top: "June snapshot" with one sentence: "No income logged yet. You still have Rs X debt remaining."
   - Then 3 priority cards: Spending, Cashflow, Debt.
   - Hide empty chart panels behind collapsed "More analytics" sections until data exists.

7. Improve Goals & Debts layout.
   This screen has useful content, but the first viewport feels crowded. The Add debt button text wraps, and the bottom nav covers card actions.

   Recommendation:
   - Split into tabs: Goals, Debts, Upcoming.
   - Keep summary cards horizontal-scrollable or 2x2 only if text fits.
   - Make Add Payment a full-width action above destructive actions.
   - Add extra bottom padding to long action-card screens.

8. Make forms smarter.
   The Add Expense bottom sheet is good. It can become much more useful with finance-specific helpers.

   Recommendation:
   - Add amount chips: 500, 1000, 2500, 5000.
   - Show selected account balance and warn before negative balance.
   - Preselect likely categories from recent behavior.
   - Add "Save and add another" for fast entry.

## Suggested Theme Direction

Best direction: keep the dark graphite + neon-lime identity, but make it cleaner, brighter, and less hazy.

Use:
- Background: #101214 or #111315.
- Surface: #1b1d22.
- Elevated card: #22252b.
- Primary text: #f7f8ef.
- Muted text: #b8bbc2.
- Accent lime: #d9ff35 or current #ddff45.
- Warning/debt: #f09668.
- Success: #7ee08a.
- Info: #75c7ff or a muted teal for non-money highlights.

Avoid:
- Too many lime borders at once.
- Low-opacity gray text on black.
- Big expanding nav pills on 390px screens.
- Empty panels that only say zero.

Alternative themes worth exploring later:
- Premium light: warm off-white background, graphite text, lime accent.
- Bank-card editorial: dark base, richer account-card colors, more tactile wallet surfaces.
- Minimal utility: flatter surfaces, less glow, smaller cards, denser lists.

## Screen-by-Screen Recommendations

### Home

- Fix bottom nav clipping.
- Increase contrast on greeting, muted text, card contents, and account card.
- Add "Safe to spend" and "Upcoming due" metrics.
- Make the balance hidden state more elegant: use "Rs hidden" or a skeleton-like mask instead of very dim bullets.
- If only one account exists, show an inline prompt to add cash/bank/mobile wallet.

### Transactions

- Add empty state with primary actions.
- Move filters into a collapsible filter sheet after the search field. Right now filters take the whole first viewport when there are no rows.
- Keep chips, but reduce chip size slightly on mobile.
- When data exists, show newest transaction immediately under search before advanced filters.

### Accounts

- Keep the wallet-card idea.
- Add account type templates for Cash, Bank, JazzCash, Easypaisa.
- Put "Add account" as the strongest action when there are zero real accounts.
- Keep disabled Transfer, but explain what unlocks it in one line.
- Add bottom padding so the first account/add-account card is never hidden by nav.

### Goals & Debts

- Split this into Goals, Debts, Upcoming tabs on mobile.
- Shorten "Debts & Money Owed" header on mobile to "Debts".
- Change "Add debt" to a compact icon + label button that does not wrap.
- Add status filters: Active, Due soon, Overdue, Paid.
- Make debt cards less tall by moving notes into expandable detail.

### Budgets

- Add this to mobile navigation via More or a second-level menu.
- Add "Create budget" action to the empty state.
- Show suggested budget templates from categories.
- Once populated, show "Needs attention" first, then all budgets.

### Reports

- Replace the zero-data first view with an insight empty state.
- Keep the detailed analytics lower down, collapsed when empty.
- Add a monthly summary sentence and a "What changed?" section.
- Make chart panels shorter on mobile and use list-first layouts when data is sparse.

### Settings

- Add access through mobile More.
- Replace placeholder text with disabled labels or real actions.
- Group settings into Data, Preferences, Sync, Support.
- Consider making Theme and Currency actual controls.

### Add Expense Modal

- Keep the bottom sheet.
- Add quick amount chips.
- Add account balance warning before submit.
- Use segmented control for Expense/Income/Transfer if this modal becomes a universal Add flow.
- Keep submit button sticky at the bottom if the form gets longer.

## Recommended Build Order

1. Fix bottom navigation width and add More.
2. Add empty states and primary actions.
3. Add richer demo/mock data.
4. Improve contrast tokens in CSS.
5. Redesign Reports around insights.
6. Split Goals/Debts/Upcoming into mobile tabs.
7. Add smart helpers to finance modals.
8. Polish microinteractions after the structure is right.

## Files To Review For Implementation

- src/components/navigation/Navigation.tsx
- src/components/layout/AppShell.tsx
- src/index.css
- src/data/mockData.ts
- src/pages/Dashboard.tsx
- src/pages/Transactions.tsx
- src/pages/Accounts.tsx
- src/pages/Budgets.tsx
- src/pages/GoalsDebts.tsx
- src/pages/Reports.tsx
- src/pages/Settings.tsx

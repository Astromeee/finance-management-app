# Pocket Ledger Mobile App Design

This document describes the current Pocket Ledger mobile design so future redesigns can keep the app consistent, easier to improve, and faithful to the existing dark neon fintech direction.

## Design Direction

Pocket Ledger is a premium dark-mode personal finance app. The design language is futuristic, glassy, and neon-accented, but still practical for daily money tracking. The app should feel like a modern mobile banking dashboard: high contrast, large balances, rounded cards, icon-led actions, and a persistent bottom dock.

Core qualities:

- Dark graphite / near-black base.
- Neon-lime primary accent.
- Large rounded cards with subtle borders and glow.
- Glass/frosted navigation and controls.
- Strong financial hierarchy: balance first, actions second, lists third.
- Mobile-first spacing and thumb-friendly controls.
- Icons only in the bottom navigation.
- No page title top bars except the Home profile header.

## Visual Tokens

Use these as the default visual foundation.

| Token | Value | Usage |
| --- | --- | --- |
| App background | `#0d0e10`, `#121315` | Full app background, including status bar area |
| Primary surface | `#1a1c20` | Main cards and panels |
| Secondary surface | `#23262b` | Inputs, filter controls, inactive pills |
| Raised surface | `#2c3036` | Pressed states, dense panels |
| Primary text | `#f6f3ea` | Headings, balances, important labels |
| Muted text | `#a7a8ac` | Supporting copy, captions, metadata |
| Secondary muted | `#777b82` | Lower-priority metadata |
| Neon lime | `#ddff45` | Main CTA, active nav, key icons, active chips |
| Positive | `#8be28f` | Income and positive amounts |
| Negative | `#e98d67` | Expenses, delete actions, warning amounts |
| Cyan | `#39dced` | Upcoming / informational metric accents |
| Purple | `#b46cff` | Goal or secondary metric accents |

## Typography

The app uses Inter/system sans. Keep type bold, compact, and readable on small screens.

- Hero balance: very large, bold, white. It should dominate the Home card.
- Section titles: large and bold, around `28-34px` on mobile.
- Card titles: bold white, around `20-24px`.
- Labels: uppercase, letter-spaced, muted grey.
- Metadata: muted grey, medium weight.
- Amounts in lists: bold, right-aligned when possible.

Avoid thin typography for financial values. Avoid negative letter spacing. Do not let large amounts overflow cards.

## Spacing And Layout

Mobile layout uses generous vertical rhythm and rounded panels.

- Page horizontal padding: about `16px`.
- Main vertical gap between large sections: `24-36px`.
- Card internal padding: `20-28px`.
- Small card grid gap: `12-16px`.
- Bottom content padding must account for the floating nav and safe area.
- Status bar background must match the app background and extend to the very top.

Pages other than Home should not show a large page-title top bar. They should start with the first functional section after safe-area spacing.

## Core Components

### Bottom Navigation Dock

The bottom dock is the main mobile navigation.

- Floating, centered, rounded pill.
- Dark frosted/glass background.
- Icons only, no text labels.
- Five icons: Home, Transactions, Accounts, Goals, Reports.
- Active icon sits inside a neon-lime circular/rounded cell.
- Inactive icons are muted grey/white.
- Dock must not cover important content; all pages need bottom padding.
- Dock should feel wide enough for comfortable tapping but not full-width edge-to-edge.

### Cards And Panels

Cards should use:

- Dark layered gradients.
- Subtle `1px` borders.
- Rounded corners between `24px` and `34px`.
- Soft dark shadow.
- Occasional neon border/glow for important cards.
- Futuristic ring/wire overlays on the right side.

Do not use bright full-card colors except as controlled accents. The app should remain dark and premium.

### Buttons

Primary buttons use neon-lime fill with dark text.

Secondary buttons use dark glass surfaces with subtle borders.

Danger/delete buttons use orange-red text/border and low-opacity background.

Buttons should be large enough for thumbs on mobile. Icon + text is preferred for actions like Add savings, Edit, Delete, Transfer, and Adjust.

### Modals / Bottom Sheets

Mobile modals slide up from the bottom.

- Rounded top corners.
- Dark surface with subtle border.
- Smooth, slightly slow animation.
- Scrollable content when the form is tall.
- Drag-down gesture should close when implemented.
- Avoid Cancel buttons on mobile where a close icon or drag-down exists.

## Page Designs

## Home

Home is the most visually expressive page.

### Structure

1. Status bar and safe top background.
2. Profile row.
3. Total balance hero card.
4. Quick action pill bar.
5. My Accounts stacked account cards.
6. Bottom navigation dock.

### Profile Row

Current design:

- Left: neon-lime circular avatar with `M`.
- Text stack: muted `Good Morning,` and bold white `Moeed`.
- Right: dark glass notification button.
- Menu button has been removed.

Keep the row slightly below the phone status bar. The avatar glow is part of the brand signal.

### Balance Hero Card

The hero card is a large rounded dark card with a neon-lime wireframe globe pattern on the right.

Content:

- Uppercase `TOTAL BALANCE`.
- Eye icon beside the label.
- Large balance value.
- Secondary line: `Available to use: Rs ...`.
- `Overview` pill button with lime text and arrow.

Behavior:

- Balance is hidden by default and revealed by the eye icon.
- Overview navigates to Reports.
- Do not add extra chart buttons inside the card.

Visual notes:

- Border is subtle lime.
- Right-side pattern should not overpower text.
- Keep text left-aligned and spacious.

### Quick Actions

The quick action bar is a large rounded dark pill.

Actions:

- Income.
- Expense.
- Transfer.
- Goal.

Each action has:

- Neon-lime circular icon.
- White label below or beside depending on width.
- Thin dividers between actions.

Hover/tap effects should highlight only the circular icon area, not the whole action cell.

### My Accounts

The Home accounts section shows the same account order set on the Accounts page.

Header:

- Left: `My Accounts`.
- Right: account count in neon lime.

Cards:

- Straight left/right sides with rounded corners.
- Closely stacked with consistent vertical gaps.
- Dark neon backgrounds with account-specific accent lines.
- Include logo/initial box, account name, account type, masked label, amount, and right chevron.
- Account names must be white/readable on dark backgrounds.

Accent examples:

- Cash: neon lime.
- UBL/HBL/bank accounts: teal, aqua, navy, or user-selected card color.
- Meezan: purple.
- JazzCash: orange.
- Easypaisa: cyan.

## Transactions

Transactions is a functional list page with filters and transaction cards.

### Filter Panel

The top panel is a large rounded dark card containing:

- Search field.
- Type dropdown.
- Category dropdown.
- Month dropdown.
- Filter icon button.
- Type chips: All, Income, Expense, Transfer, Goal, Debt.

Active chip uses neon lime with dark text.

### Transaction Cards

Each transaction row/card should show:

- Left icon block.
- Title.
- Type badge.
- Category/source, account, date metadata.
- Optional description/note.
- Amount.
- View, Edit, Delete buttons.

Income amount uses green. Expense amount uses orange-red. Neutral transaction types use white/grey.

View opens a details modal including description. Edit and delete must reverse/replay account effects correctly.

## Accounts

Accounts manages actual account cards and ordering.

### Top Balance Panel

Shows:

- Total balance.
- Breakdown rows: Cash, Banks, Wallets.

Use the same dark/lime bordered card language as the rest of the app.

### Wallet Tools

Actions:

- Add account.
- Transfer.
- Adjust.

Adjust is the primary neon-lime action. Add and Transfer are dark secondary buttons.

### Account Cards

Account cards are larger wallet-style cards than Home cards.

Each card includes:

- Account icon.
- Edit button.
- Account name.
- Balance.
- Account type.
- Masked card label.
- Card color selected by user.
- Subtle right-side circular pattern.

Interactions:

- Long press card to unlock reordering.
- Haptic feedback confirms unlock.
- Drag the card up/down.
- Page scroll locks while reordering.
- Order commits when released and syncs to Home.
- Editing balance creates an audit transaction:
  - Decrease: expense, category `Unexplained Expense`.
  - Increase: income, category `Unexplained Income`.

## Goals And Debts

This page combines savings goals, debts, money owed, and upcoming expenses.

### Top Metrics

Four cards in a `2x2` grid:

- Total Savings.
- Debt to Pay.
- Upcoming This Month.
- Due Next 7 Days.

Each metric card uses:

- Dark background.
- Accent border.
- Large amount.
- Uppercase label.
- Icon chip in the top-right.
- Large faint ring pattern in the lower-right.

Accent mapping:

- Savings: neon lime.
- Debt: orange.
- Upcoming: cyan.
- Due soon: purple.

### Savings Goals

Section header:

- Eyebrow: `Savings Goals`.
- Title: `Build future money`.
- Add goal button on the right.

Goal cards:

- Dark card with lime border/glow.
- Uppercase label `SAVED AMOUNT`.
- Goal name.
- Status badge.
- Progress bar.
- Saved/target amount.
- Remaining amount and due date.
- Large percent on the right.
- Buttons: Add savings, Edit, Delete.

Add savings should deduct only from the Savings account. If Savings has insufficient balance, show a clear popup.

### Debts And Money Owed

Debt cards should use the same visual system as goal cards.

Each debt card should include:

- Debt title/person/company.
- Remaining/paid information.
- Due date and status.
- Pay debt button inside the individual card.
- Edit and Delete buttons.

The section-level button should be `Add debt`, not Pay debt.

## Reports

Reports is the analysis page.

### Period Card

Top card:

- Uppercase `REPORTS PERIOD`.
- Current period title, e.g. `June 2026`.
- Large period dropdown.

Keep this card calm and spacious.

### Summary Metrics

Four cards in a `2x2` grid:

- Total Income.
- Total Expenses.
- Net Saved.
- Savings Rate.

Cards follow the same metric-card design as Goals:

- Dark background.
- Accent border.
- Uppercase label.
- Large value.
- Icon chip.
- Faint ring pattern.

Expense card uses orange/red accent. Positive/savings cards use lime.

### Spending By Category

Large rounded panel:

- Eyebrow: `Actual expenses only`.
- Title: `Spending by Category`.
- Right meta: number of categories used.
- Top spending category pill.
- Ranked category rows.

Each row:

- Category name.
- Amount.
- Percentage.
- Horizontal progress bar using orange for spending.

At the bottom of Reports there is an expense category setup area. New categories added there must appear in expense recording and transaction edit modals.

## Interaction Rules

- Primary financial actions should produce visible feedback: toast, modal close, or updated list item.
- Destructive actions require a confirmation popup.
- Touch interactions must be smooth on mobile.
- Reordering should not accidentally scroll the page while active.
- Modals should stay scrollable even after form fields are filled.
- Account edits that affect money should create transactions so the ledger remains explainable.
- The same data order and categories should be reused across pages.

## Accessibility And Usability

- Maintain strong contrast: white text on dark backgrounds.
- Do not place grey text over bright/complex card areas.
- Touch targets should be at least `44px`.
- Icon-only buttons need accessible labels in code.
- Avoid overlapping bottom navigation with content.
- Amounts should remain readable on small screens.
- Forms should use clear labels above fields.

## Future Redesign Guidelines

When redesigning Pocket Ledger, keep these principles:

1. Keep the dark neon identity.
2. Keep neon lime as the main brand accent.
3. Keep Home visually premium and dashboard-like.
4. Keep other pages more functional and list-focused.
5. Preserve the floating icon-only bottom dock.
6. Use the same card language across accounts, goals, debts, reports, and transactions.
7. Do not reintroduce bulky page title headers on non-Home pages.
8. Avoid random colors; every accent should communicate meaning.
9. Keep financial auditability visible: changes to balances should become transactions.
10. Design for one-handed mobile use first.

## Current Pain Points To Improve Later

These are good future redesign opportunities:

- Some dense list pages could use slightly more breathing room around the bottom dock.
- Reports has strong data cards but could benefit from more visual charts later.
- Transaction filters are useful but tall; future versions could collapse them.
- Account cards have strong personality, but bank logos/initials could become more polished.
- Goals and Debts are visually consistent, but the lower sections can become crowded on small phones.

## Screenshot Reference

The current mobile design was documented from screenshots dated 2026-06-15:

- Home: `Screenshot_20260615-234638.png`.
- Transactions: `Screenshot_20260615-234641.png`.
- Accounts: `Screenshot_20260615-234648.png`.
- Goals and Debts: `Screenshot_20260615-234651.png`.
- Reports: `Screenshot_20260615-234658.png`.

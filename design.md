# Pocket Ledger Design System

> Authoritative visual and interaction specification for the Payday Journey release. This file replaces the previous graphite/lime/orange variants and should be updated before shared design foundations change.

## 1. Direction

Pocket Ledger is a calm daily money companion, not a financial control panel. The defining composition is a journey from the user's last income event to the next one. The interface is mobile-first, concise, tactile, and supportive.

The visual scene is a student or young worker checking their phone in the evening for a quick, reassuring answer. That scene supports a dark palette, high-contrast type, restrained motion, and one warm route color.

### Committed direction

The matched concept comparison favored **midnight plum + persimmon + mint** over graphite + orange because it is more recognizable, warmer, and less interchangeable with conventional fintech. Graphite remains inside the neutral ramp rather than acting as the brand identity.

## 2. Color

### Primitive tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `plum/1000` | `#0D0915` | Deep canvas and scrims |
| `plum/950` | `#171225` | App canvas |
| `plum/900` | `#201A31` | Primary surface |
| `plum/850` | `#29213D` | Raised surface |
| `plum/750` | `#3B3151` | Strong divider or pressed state |
| `neutral/100` | `#F7F3EE` | Primary text |
| `lavender/300` | `#C6BED4` | Secondary text |
| `lavender/500` | `#9389A7` | Tertiary text |
| `persimmon/500` | `#FF6B3D` | Brand action and journey route |
| `persimmon/650` | `#D94E28` | Pressed action |
| `mint/400` | `#77D6A3` | Positive progress |
| `amber/400` | `#F1B75A` | Caution |
| `coral/400` | `#FF806B` | Risk and destructive action |

### Semantic tokens

- Canvas: `plum/950`
- Surface: `plum/900`
- Raised surface: `plum/850`
- Primary text: `neutral/100`
- Secondary text: `lavender/300`
- Tertiary text: `lavender/500`
- Accent: `persimmon/500`
- Positive: `mint/400`
- Warning: `amber/400`
- Negative: `coral/400`
- Focus ring: `neutral/100` at full opacity with a 2px offset

Persimmon is reserved for primary actions, active navigation, and the completed journey route. Mint, amber, and coral only communicate semantic state. Every semantic color is paired with text or an icon.

## 3. Typography

- **Sora:** journey amount, page heading, and major financial values.
- **Outfit:** interface labels, body copy, controls, and transaction content.
- Financial numerals use tabular figures.
- Display tracking never goes below `-0.03em`.
- Body text defaults to 16px; compact metadata may use 13–14px after contrast validation.
- Headings use balanced wrapping and body copy uses pretty wrapping.

## 4. Layout

- Base spacing unit: 4px.
- Supported spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48px.
- Phone gutter: 16px; minimum 12px at 360px.
- Standard section gap: 24px.
- Card padding: 16 or 20px; 24px only for the Journey surface.
- Standard radius: 12px for controls, 16px for surfaces, 20px for bottom sheets.
- Full pills are only for statuses and compact filter controls.
- Prefer tonal separation and dividers over large shadows or decorative borders.

Primary viewport is 390x844. Validate at 360x800, 430x932, tablet, desktop, landscape, and 200% zoom.

## 5. Motion

- Press response: under 100ms.
- Standard state transition: 160–220ms, ease-out-quart.
- Bottom-sheet transition: no more than 320ms.
- Journey progress animates only when the underlying state changes.
- No bounce, elastic motion, or orchestrated page-load sequence.
- Reduced motion uses instant state changes or a short crossfade.

## 6. Navigation

Mobile has five top-level destinations:

1. Home
2. Activity
3. Plan
4. Goals
5. Insights

Accounts open from the Home balance/account affordance and remain available on desktop. Profile, Settings, categories, export, and the reusable tour live behind the avatar menu.

Plan contains four focused views: Budgets, Bills, Wishlist, and Quests. Only one view is visible at a time.

## 7. Home information budget

Home contains exactly four regions:

1. Payday Journey hero
2. Income, Expense, and Transfer actions
3. One `Today's move`
4. Up to three recent transactions

No independent statistic grid, account-card carousel, or chart is shown on Home. The journey combines the safe-to-spend amount, cycle progress, status, next-income date, and purchase-planning action.

`Today's move` chooses one message in this order: urgent bill, near-complete quest, money leak, newly earned win, then a neutral suggestion.

## 8. Core components

### Foundations

- `AppCanvas`, `SafeAreaPage`, `Surface`, `Divider`
- `CurrencyValue`, `StatusLabel`, `ProgressTrack`

### Actions and fields

- `Button`: primary, secondary, quiet, danger
- `IconButton`, `QuickAction`, `InlineAction`
- `TextField`, `AmountField`, `DateField`, `SelectField`
- `CategoryPicker`, `AccountPicker`, `SegmentedControl`

### Product surfaces

- `PaydayJourney`
- `SafeSpendBreakdown`
- `TodaysMove`
- `TransactionRow`
- `AffordabilityResult`
- `BottomSheet`
- `CoachMark`, `Toast`, `Banner`
- `Skeleton`, `EmptyState`, `ErrorState`, `OfflineState`

Every interactive component includes default, hover where applicable, focus, active, disabled, loading, and error states. Category selectors include a persistent `Manage categories in Settings` action.

## 9. Core flow and screen inventory

Design and implement these screens before retention features:

1. Welcome and product explanation
2. Income-source selection
3. Income-cycle setup
4. First account and balance
5. Priority selection
6. Starter plan with category guidance
7. Onboarding completion
8. Home: Comfortable
9. Home: Watchful / Protect
10. Purchase simulator: Safe / Caution / Risky
11. Plan destination
12. Settings > Categories
13. First-use Home coach marks

Onboarding uses one decision per screen, shows progress, saves progress, and can resume after refresh. The welcome explanation is skippable; the minimum financial setup required to calculate a journey is not.

## 10. Content

- Use direct, human sentences rather than banking language.
- Never imply that Pocket Ledger connects to or moves money from a bank.
- Avoid shame. Use `Your plan needs attention` rather than `You failed your budget`.
- Do not claim skipped wishlist money was saved unless the user moves it to a goal.
- Explain derived insights with the contributing dates, categories, and rules.
- Starter-plan copy: `We've added starter income and expense categories. You can edit, add, or archive them anytime from Settings > Categories.`

## 11. Accessibility and responsive requirements

- WCAG 2.2 AA contrast and semantics.
- Minimum touch target: 44x44px; primary actions target 48px.
- Visible focus on every interactive element.
- Focus order follows visual order in navigation, forms, and sheets.
- Dialogs trap focus, close with Escape, restore focus, and announce titles.
- Safe areas prevent fixed navigation from covering content.
- Long names and large PKR values wrap or truncate deliberately.
- Charts provide text summaries and are not required to understand primary states.

## 12. Design and release gates

A surface is ready only when:

- Its populated, empty, loading, error, disabled, and offline states are addressed.
- 360px, 390px, 430px, tablet, and desktop layouts have been checked.
- Keyboard, screen reader, reduced motion, and contrast have been checked.
- Existing finance behavior remains correct.
- Lint, unit tests, build, and relevant E2E tests pass.
- A screenshot is captured for review.

Implementation proceeds in isolated milestones: visual foundation, schema/calculations, onboarding, Payday Journey, simulator, Plan, leaks, quests, wishlist, stories, analytics, and final polish.

## 13. Out of scope

AI-generated advice, bank syncing, receipt scanning, Money Mood, social comparison, leaderboards, XP, artificial currency, mascots, and push notifications are not part of this release.

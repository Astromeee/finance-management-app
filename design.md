# Pocket Ledger v2 Design System

> Living product and interface specification. Update this document before implementing a new visual direction or shared component.

## 1. Project Status

| Item | Status |
| --- | --- |
| Product | Pocket Ledger mobile-first personal finance app |
| Version | v2 redesign |
| Working branch | `codex/mobile-redesign-v2` |
| Production policy | Do not merge to `main` or promote to production without Abdul Moeed's explicit approval |
| Data policy | Use real application data and real empty states; never add mock finance data |
| Visual direction | Approved: dark black and graphite surfaces with restrained orange accents |
| Typography | Pending user direction |
| Home screen composition | Approved and implemented locally for first review |
| Figma library | Planned after foundations and typography are approved |

## 2. Product Intent

Pocket Ledger should feel like a purpose-built financial instrument: calm, precise, tactile, and trustworthy. It should be visually distinctive without making daily money tasks slower.

The redesign must improve:

- Scan speed for balances, totals, categories, dates, and status.
- One-handed operation on 390px and 430px mobile viewports.
- Confidence when adding, editing, transferring, or deleting money records.
- Clear separation between primary actions, supporting controls, and destructive actions.
- Data comprehension without turning every screen into a dashboard.
- Visual consistency across every page, modal, chart, empty state, and interaction state.

## 3. Approved Visual Direction

### Refined Industrial Finance

The v2 language takes only its color and tonal inspiration from the supplied reference image:

![Dark graphite and orange color reference](docs/design-v2/references/dark-graphite-orange-color-reference.webp)

What to carry forward:

- Deep black canvas with layered graphite surfaces.
- Warm white typography and cool neutral supporting text.
- Orange used as a deliberate focal signal.
- Crisp geometry, strong numeric hierarchy, and restrained decoration.
- Subtle texture or tonal depth only where it helps establish hierarchy.

What not to copy:

- The reference layout, content, typography, charts, or device mockup.
- Large decorative gradients, excessive glow, or orange on every component.
- Low-contrast grey-on-grey text.
- Tiny editorial labels that are difficult to read on a phone.

### Brand Character

- **Precise:** amounts and account states are immediate and unambiguous.
- **Tactile:** controls respond quickly and visibly to touch.
- **Restrained:** one brand accent, disciplined spacing, minimal ornament.
- **Personal:** plain, useful language rather than banking jargon.
- **Premium:** polish comes from proportion, typography, motion, and detail rather than visual noise.

## 4. Color System

These are v2 foundation candidates. They become final only after they are tested in working screens and pass contrast checks.

### Primitive Palette

| Token | Value | Purpose |
| --- | --- | --- |
| `black/1000` | `#070809` | Deepest canvas and scrims |
| `black/950` | `#0B0C0E` | App background |
| `graphite/900` | `#111316` | Primary surface |
| `graphite/850` | `#17191D` | Raised card and navigation surface |
| `graphite/800` | `#1E2126` | Inputs and secondary controls |
| `graphite/700` | `#292D33` | Pressed surface and strong dividers |
| `graphite/600` | `#393D44` | Focused borders and disabled controls |
| `neutral/500` | `#777C84` | Tertiary text |
| `neutral/300` | `#B5B8BD` | Secondary text |
| `neutral/100` | `#F3F2EE` | Primary text |
| `orange/700` | `#D9430D` | Pressed brand state |
| `orange/600` | `#F24D12` | Strong active state |
| `orange/500` | `#FF5A1F` | Primary brand accent |
| `orange/400` | `#FF7545` | Hover/highlight state |
| `orange/100` | `#FFD8C9` | Accent text on dark soft fills |

### Semantic Tokens

| Token | Default mapping | Usage |
| --- | --- | --- |
| `color/bg/canvas` | `black/950` | App background |
| `color/bg/surface` | `graphite/900` | Standard cards and sheets |
| `color/bg/surface-raised` | `graphite/850` | Elevated controls and active panels |
| `color/bg/control` | `graphite/800` | Inputs, chips, segmented controls |
| `color/bg/pressed` | `graphite/700` | Touch feedback |
| `color/text/primary` | `neutral/100` | Titles, balances, key values |
| `color/text/secondary` | `neutral/300` | Supporting text and metadata |
| `color/text/tertiary` | `neutral/500` | Low-priority labels |
| `color/border/subtle` | `rgba(255,255,255,0.08)` | Standard separation |
| `color/border/strong` | `rgba(255,255,255,0.16)` | Focused or selected surfaces |
| `color/accent/default` | `orange/500` | Primary CTA, selected state, focus |
| `color/accent/hover` | `orange/400` | Pointer hover only |
| `color/accent/pressed` | `orange/700` | Touch/pointer pressed state |
| `color/accent/soft` | `rgba(255,90,31,0.14)` | Selected chips and icon wells |
| `color/accent/on-accent` | `#0A0A0B` | Text and icons on solid orange |

### Semantic Finance Colors

These colors communicate meaning, not branding. Always pair them with a sign, label, or icon so color is never the only signal.

| Token | Value | Usage |
| --- | --- | --- |
| `color/positive` | `#65C98A` | Income, completed goal, positive cashflow |
| `color/negative` | `#FF7164` | Expense, destructive action, overdue |
| `color/warning` | `#F3B35A` | Due soon, attention required |
| `color/info` | `#A9B0BA` | Neutral informational state |

### Color Rules

- Orange is the only brand accent and should occupy less than roughly 15% of a typical screen.
- Do not assign a different decorative color to every account, category, metric, or chart.
- Use graphite surface changes before adding borders or shadows.
- Normal text must meet WCAG AA contrast of at least 4.5:1.
- Large text and essential UI graphics must meet at least 3:1.
- Solid orange buttons use near-black content, not white, if contrast testing confirms it is stronger.
- Avoid pure white and pure black for large areas; warm white and near-black are easier on the eyes.

## 5. Typography

Typography is intentionally pending until the user supplies the desired fonts.

The chosen system must support:

- Clear differentiation between display balances, section titles, body copy, labels, and metadata.
- Tabular numerals for currency, percentages, dates, and chart axes.
- Urdu/Arabic glyph coverage if future localization requires it.
- Variable font delivery or a small number of optimized weights.
- `font-display: swap` and stable fallback metrics.

Provisional role names:

| Role | Intended use |
| --- | --- |
| `display/balance` | Home balance and major financial totals |
| `heading/page` | Screen identity where needed |
| `heading/section` | Section headers |
| `heading/card` | Card title and transaction title |
| `body/default` | Descriptions and form content |
| `body/compact` | Transaction metadata and dense summaries |
| `label/default` | Buttons, tabs, chips, and fields |
| `label/eyebrow` | Rare uppercase context labels |
| `numeric/default` | Currency and percentages with tabular figures |

No production type sizes should be finalized until the fonts are selected and tested on 390px and 430px screens.

## 6. Layout Foundations

### Mobile Viewports

- Primary design viewport: `390 x 844`.
- Secondary validation viewport: `430 x 932`.
- Small-device validation: `360 x 800`.
- Layouts must also remain operable in landscape and at 200% browser zoom.

### Spacing Scale

Use a 4px base grid.

| Token | Value |
| --- | --- |
| `space/1` | `4px` |
| `space/2` | `8px` |
| `space/3` | `12px` |
| `space/4` | `16px` |
| `space/5` | `20px` |
| `space/6` | `24px` |
| `space/8` | `32px` |
| `space/10` | `40px` |
| `space/12` | `48px` |

Rules:

- Default phone gutter: `16px`; never less than `12px` on supported widths.
- Standard section gap: `24px`.
- Related control gap: `8px` or `12px`.
- Card padding: normally `16px` or `20px`; use `24px` only for a true hero surface.
- Fixed bottom navigation must reserve its full height, gap, and safe-area inset in page padding.
- Avoid horizontal content scrolling for cards, filters, summaries, or analytics.

### Radius Scale

| Token | Value | Usage |
| --- | --- | --- |
| `radius/sm` | `8px` | Small controls and tags |
| `radius/md` | `12px` | Inputs, buttons, compact panels |
| `radius/lg` | `16px` | Cards and transaction rows |
| `radius/xl` | `20px` | Hero cards and bottom sheets |
| `radius/full` | `999px` | Chips, avatars, circular controls |

Avoid excessive 24-34px rounding. Repeated containers should feel engineered and compact, not inflated.

### Elevation

- Prefer tonal separation and borders over large shadows.
- `elevation/1`: subtle card separation.
- `elevation/2`: fixed navigation and sticky controls.
- `elevation/3`: modal and bottom-sheet layer.
- No neon glow. A soft orange halo is allowed only for a momentary focus or confirmation state.

## 7. Interaction Standards

- Minimum interactive target: `44 x 44px`; target `48px` for primary controls.
- Minimum gap between adjacent targets: `8px`.
- Controls respond visually within `100ms` of touch.
- Standard state transition: `160-220ms` using transform and opacity.
- Complex sheet transitions may use up to `320ms`.
- Press feedback may use a subtle surface change and scale down no further than `0.98`.
- Never rely on hover for discovery or completion.
- Respect `prefers-reduced-motion`; information must be immediately readable without animation.
- Preserve filter, scroll, tab, and form state when navigating back.
- Provide visible loading, success, error, empty, disabled, and offline states.
- Destructive actions require confirmation or an undo path.

## 8. Navigation

Keep five top-level destinations:

1. Home
2. Transactions
3. Cards
4. Goals
5. Analytics

Bottom navigation requirements:

- Fixed and safe-area aware.
- Equal-width touch targets with icon and label available to assistive technology.
- Active destination is obvious without relying only on orange.
- It must never cover content, form controls, chart legends, or card actions.
- Deep screens and bottom sheets use predictable back/close behavior.

The exact visual treatment of the dock will be designed alongside the Home screen.

## 9. Component Architecture

All shared components need documented variants, sizes, states, accessibility behavior, and motion. Figma and code should use the same names where practical.

### Foundations

- `AppCanvas`
- `SafeAreaPage`
- `SectionHeader`
- `Divider`
- `Surface`
- `Icon`
- `CurrencyValue`
- `PercentageValue`

### Actions

- `Button`: primary, secondary, quiet, danger; default and large sizes
- `IconButton`: neutral, accent, danger
- `FloatingActionButton`: only where a single persistent action is justified
- `QuickAction`: icon, label, pressed, disabled
- `InlineAction`

### Inputs And Selection

- `TextField`
- `AmountField`
- `SearchField`
- `SelectField`
- `DateField`
- `SegmentedControl`
- `FilterChip`
- `Switch`
- `Checkbox`
- `Radio`
- `CategoryPicker`
- `AccountPicker`

### Finance Surfaces

- `BalanceHero`
- `AccountRow`
- `AccountCard`
- `TransactionRow`
- `TransactionBadge`
- `SummaryTile`
- `InsightCard`
- `ProgressCard`
- `DebtCard`
- `GoalCard`
- `UpcomingCard`
- `CategoryLegendRow`
- `ChartTooltip`

### Feedback And Overlays

- `BottomSheet`
- `Dialog`
- `Toast`
- `Banner`
- `Skeleton`
- `EmptyState`
- `ErrorState`
- `ConfirmationState`
- `ContextMenu`

### Navigation

- `BottomNavigation`
- `BottomNavigationItem`
- `TabBar`
- `TopBar`
- `BackButton`

## 10. Screen Scope

Every screen will be redesigned; behavior and real data remain intact.

### Home

Approved visual references:

![Mobile finance composition board](docs/design-v2/references/mobile-finance-composition-board.webp)

![Mobile finance Home and Analytics reference](docs/design-v2/references/mobile-finance-home-and-analytics-reference.webp)

Use the references for composition, hierarchy, and tactile card behavior rather than copying their monochrome palette or sample data.

Home v2 structure:

1. Compact identity header with Abdul Moeed, install access, and notifications.
2. Total balance with a privacy toggle and direct Analytics link.
3. Horizontally scrollable, snap-aligned account cards using real account data.
4. Four touch-friendly quick actions: Income, Expense, Transfer, and Goal.
5. `Month in motion` summary using current real income and expense transactions.
6. Recent activity list using category-specific icons and real transactions.

Home rules:

- The account rail is the only intentionally horizontal-scrolling Home region.
- Account cards use graphite material variations and one orange accent rather than unrelated account colors.
- Balance privacy controls both the total balance and account-card balances.
- Recent activity shows no more than five entries before `View all`.
- The current month summary derives its top expense category and net cashflow from real transactions.
- Motion is restrained, touch-triggered where possible, and removed for `prefers-reduced-motion`.
- Use the shared category icon resolver so Home and Transactions use the same visual language.

### Transactions

- Search, category, month, and quick-type filters remain functional together.
- Category options remain contextual to the selected transaction type.
- Filtered total and transaction count update immediately.
- Rows prioritize title, type, account/date metadata, amount, then secondary actions.
- Long lists must remain smooth and must not hide actions behind navigation.

### Cards

- Total balance and account breakdown remain prominent but compact.
- Add account, transfer, adjust, edit, and reorder stay fully functional.
- Account surfaces use hierarchy and material, not unrelated rainbow colors.

### Goals

- Preserve Goals, Debts, and Upcoming tabs.
- Preserve the 2x2 summary layout without horizontal scrolling.
- Primary progress/payment actions come before edit and delete.
- Due, paid, remaining, and overdue states are clear in text as well as color.

### Analytics

- Prioritize useful insights over a wall of charts.
- Use line/area for trends, bars for comparison, and donut only for five or fewer proportions.
- Every chart supports touch tooltips with expanded hit areas.
- Every chart has a concise text insight and accessible data summary.
- Low-value panels remain collapsed under `More analytics` until requested.
- Category creation remains available at the end of the relevant analytics setup area.

### Modals And Forms

- Finance creation and editing flows use mobile bottom sheets where appropriate.
- Labels remain visible; placeholders never replace labels.
- Numeric fields request the numeric keyboard.
- Validation appears beside the field with a recovery instruction.
- Unsaved changes are protected on dismissal.

## 11. Data Visualization

- Orange represents the selected or primary series, not every series.
- Comparison series use neutral greys with sufficient contrast.
- Positive and negative semantic colors appear only when their meaning matters.
- Do not use pie/donut charts for more than five categories; use ranked bars instead.
- Tap regions for points, bars, slices, and legend rows must be at least 44px.
- Tooltips show exact localized currency, date, category, and percentage values.
- Legends sit beside their charts within the same viewport context.
- Gridlines are quiet; axes are readable without rotated labels.
- Entrance motion is subtle, interruptible, and disabled for reduced motion.
- Empty charts become useful empty states, never zero-filled decoration.

## 12. Accessibility And Content

- Body text targets `16px` unless a compact role has been validated at `14px` with sufficient contrast.
- No essential text below `12px`.
- Financial amounts use locale-aware formatting and tabular numerals.
- Icon-only buttons require accessible names and visible focus treatment.
- Focus order follows visual order in sheets, forms, filters, and cards.
- Selected, expanded, invalid, busy, and disabled states are announced semantically.
- Copy should be direct: `Add expense`, `Payment recorded`, `Due in 3 days`.
- Avoid generic messages such as `Something went wrong`; state what failed and how to recover.

## 13. Figma System Plan

The Figma library will follow the same source-of-truth structure as code.

### Phase 0: Discovery And Scope

- Inspect the chosen Figma file and any available libraries.
- Inventory current code tokens, components, and states.
- Resolve every code/Figma mismatch before creating components.
- Lock the first component batch after typography and Home direction are approved.

### Phase 1: Foundations

- Primitive collection: black, graphite, neutral, orange, semantic finance colors.
- Semantic color collection: dark mode first; no fake light mode.
- Spacing, radius, size, motion, and typography collections.
- CSS variable code syntax mapped to all relevant variables.

### Phase 2: Documentation

- Cover
- Getting Started
- Foundations: Color, Typography, Spacing, Radius, Elevation, Motion, Iconography
- Components
- Patterns: Forms, Filters, Finance Rows, Charts, Navigation, Empty States
- Screens

### Phase 3: Components

Create atoms before composed finance components. Each component gets:

- Dedicated page or clearly separated family section.
- Auto layout and token bindings.
- Complete but controlled variant set.
- Text, boolean, and instance-swap properties where appropriate.
- Usage guidance and accessibility notes.
- Metadata and screenshot validation before the next component.

### Phase 4: Integration

- Code Connect for shared React components.
- Contrast, naming, binding, and touch-target audit.
- Screen compositions built from approved library components.
- Final comparison against implemented 390px and 430px previews.

No Figma component library should be created until a Figma file is selected and typography is approved.

## 14. Build And Preview Workflow

1. Work only on `codex/mobile-redesign-v2`.
2. Update this document when a foundational design decision is approved.
3. Implement one coherent screen or component family at a time.
4. Run local build and mobile browser checks before sharing.
5. Push only the redesign branch when a Vercel preview is requested.
6. Use the Vercel preview for review; never promote it to production automatically.
7. Merge to `main` only after explicit final approval.

GitHub and Vercel rules:

- No direct redesign commits to `main`.
- No production deployment from the redesign branch.
- Preview deployments must be clearly labeled as v2 review builds.
- Supabase data behavior must remain unchanged unless a separate data change is approved.
- Never commit credentials, local environment files, or production secrets.

## 15. Verification Checklist

Before a screen is considered ready for review:

- Test at 360px, 390px, and 430px widths.
- Confirm no horizontal page scroll.
- Confirm all touch targets are at least 44px.
- Confirm the bottom navigation covers nothing.
- Confirm long names and large currency values wrap or truncate intentionally.
- Test real populated, empty, loading, error, disabled, and offline states where applicable.
- Test keyboard navigation and visible focus.
- Test reduced motion.
- Confirm normal text contrast is at least 4.5:1.
- Confirm controls preserve all current finance behavior.
- Run `npm run build`.
- Inspect the working screen in Browser or Chrome before sharing a preview.

## 16. Decision Log

| Date | Decision | Status |
| --- | --- | --- |
| 2026-06-27 | Redesign the entire production React app rather than create a disconnected mockup | Approved |
| 2026-06-27 | Keep production unchanged during design exploration | Approved |
| 2026-06-27 | Use `codex/mobile-redesign-v2` with optional Vercel preview deployments | Approved |
| 2026-06-27 | Replace lime-led neon palette with dark black, graphite grey, warm white, and orange | Approved |
| 2026-06-27 | Use the supplied image for color direction only, not layout or typography | Approved |
| 2026-06-27 | Redesign every screen and shared component with real data only | Approved |
| 2026-06-27 | Select fonts before locking the type scale | Pending user input |
| 2026-06-27 | Base Home hierarchy on the supplied card-led mobile finance references | Approved |
| 2026-06-27 | Use a horizontal snap carousel for real account cards on Home | Approved |
| 2026-06-27 | Follow account cards with quick actions, current-month insight, and recent activity | Implemented for review |
| 2026-06-27 | Use shared Lucide category icons across Home and Transactions | Implemented for review |
| 2026-06-27 | Use Framer Motion for live UI motion; reserve Remotion for rendered video assets | Approved implementation choice |

## 17. Next Design Inputs

The next update to this document should add:

1. Approved display and body fonts with available weights.
2. Review notes on the first local Home implementation.
3. Finalized typography tokens after testing the selected fonts.
4. The next screen chosen for v2 redesign.

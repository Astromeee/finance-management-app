# Pocket Ledger v2 Home Design QA

- Source visual truth: `docs/design-v2/references/mobile-finance-home-and-analytics-reference.webp`
- Supporting source: `docs/design-v2/references/mobile-finance-composition-board.webp`
- Implementation screenshot: `design-audit/v2-home/home-390-viewport.png`
- Responsive screenshot: `design-audit/v2-home/home-430-viewport.png`
- Combined comparison: `design-audit/v2-home/home-comparison.png`
- Viewports: 390 x 844 and 430 x 932
- State: Home, balances private, first account card visible, empty local finance state

**Full-View Comparison Evidence**

The combined comparison preserves the references' compact identity header, prominent financial total, horizontal physical-card metaphor, icon-led actions, and descending financial summary. Pocket Ledger intentionally replaces the reference's monochrome palette and sample content with the approved graphite/orange tokens and real application states.

**Focused Region Comparison Evidence**

- Header: compact identity and utilities remain within one touch-safe row at both widths.
- Account rail: first card occupies roughly 82% of the phone width and exposes the next card edge as a scroll affordance.
- Quick actions: four equal controls remain readable and at least 44px tall.
- Bottom navigation: inherited expanding dock was resized to fit 390px without clipping either outer item.
- Typography: current system font remains provisional, but hierarchy, wrapping, and numeric alignment are stable.

**Findings**

- No actionable P0, P1, or P2 issues remain.
- [P3] Carousel position is communicated by the visible next-card edge rather than page dots. This is acceptable for the first review and avoids another small control row.
- [P3] Typography cannot be judged as final until the user supplies the requested font direction.

**Required Fidelity Surfaces**

- Fonts and typography: clean system fallback, no overflow, clear financial hierarchy; final family remains pending.
- Spacing and layout rhythm: consistent 4/8px rhythm, 14px mobile gutters, touch-safe controls, no page-level horizontal overflow.
- Colors and visual tokens: graphite surfaces, warm white text, and restrained orange accents match the approved v2 system; finance semantic colors remain limited to income and expense meaning.
- Image quality and asset fidelity: the screen requires no decorative raster assets. Lucide icons are used consistently rather than approximated drawings.
- Copy and content: all Home labels are product-specific and derived summaries use the existing finance state.

**Patches Made During QA**

- Reduced expanding bottom-nav widths and gaps so all five items fit at 390px.
- Confirmed account rail snap sizing at 390px and 430px.
- Verified the balance privacy toggle updates total and account balances together.
- Verified the Income quick action opens the existing functional bottom sheet.

**Implementation Checklist**

- Build: passed.
- Lint: passed.
- 390px viewport: passed.
- 430px viewport: passed.
- Keyboard/semantic control structure: passed through DOM inspection.
- Reduced-motion handling: implemented.
- Production deployment: intentionally not performed.

final result: passed

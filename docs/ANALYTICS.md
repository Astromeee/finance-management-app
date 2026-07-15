# Privacy-safe analytics

Pocket Ledger initializes GA4 only after the user enables **Settings → Private analytics**. Advertising storage, ad personalization, Google Signals, and automatic page views remain disabled.

Allowed parameters are compile-time enums: `surface`, `state`, and `action`. Never add amounts, balances, category names, transaction titles, notes, email addresses, user IDs, goal names, wishlist names, or other free-form content.

Tracked product questions:

| Event | Product question |
| --- | --- |
| `onboarding_started`, `onboarding_completed` | Can users finish personalized setup? |
| `journey_breakdown_opened` | Do users need the calculation explanation? |
| `simulator_opened`, `simulator_result_viewed`, `simulator_expense_handoff` | Does purchase planning lead to an intentional entry? |
| `category_management_opened` | Can users find category controls? |
| `quest_started`, `quest_ended` | Are weekly quests useful or abandoned? |
| `wishlist_item_added`, `wishlist_decision` | Does cooling off produce a decision? |
| `insight_viewed`, `story_opened` | Do people engage with reflective content? |

The measurement ID is provided through `VITE_GA_MEASUREMENT_ID`. Without it, analytics remains a no-op even when consent is enabled.

First evidence-led improvement to test: if many users open the journey breakdown but few open the simulator, revise the quick-action label from “Plan buy” to “Can I afford it?” and compare simulator opens without changing the calculation.

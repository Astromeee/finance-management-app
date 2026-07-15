# Teacher demo runbook

Use a separate demo user. Never seed a personal ledger.

1. Apply all Supabase migrations.
2. Create or sign in to the demo user and copy its Auth user UUID.
3. In the Supabase SQL editor, run `set app.demo_user_id = '<uuid>';` followed by the contents of `supabase/teacher_demo_seed.sql` in the same query.
4. Sign in on mobile width and follow this two-minute path:
   - Home: explain the journey line, Watchful state, and safe-to-spend breakdown.
   - Plan buy: show a Safe and a Risky amount, then hand one into the expense form.
   - Home: show the single money-leak Today’s Move.
   - Plan: show an upcoming bill, active quest, and ready wishlist decision.
   - Insights: open the weekly reveal, completed-cycle Money Story, and Tiny Wins.
   - Settings: show essential/flexible categories and privacy-safe analytics consent.

The seed is repeatable for the chosen demo user and contains realistic whole-PKR values. It removes only that demo user’s ledger rows before rebuilding the scenario.

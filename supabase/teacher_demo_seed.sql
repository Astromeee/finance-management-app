-- Teacher demo data. Run only for a dedicated demo Auth user:
-- set app.demo_user_id = '00000000-0000-0000-0000-000000000000';

do $$
declare
  demo_user uuid := nullif(current_setting('app.demo_user_id', true), '')::uuid;
  cycle_anchor date := current_date - 35;
begin
  if demo_user is null then raise exception 'Set app.demo_user_id to the dedicated demo user UUID first'; end if;

  delete from public.money_wins where user_id = demo_user;
  delete from public.wishlist_items where user_id = demo_user;
  delete from public.money_quests where user_id = demo_user;
  delete from public.transactions where user_id = demo_user;
  delete from public.upcoming_expenses where user_id = demo_user;
  delete from public.budgets where user_id = demo_user;
  delete from public.goals where user_id = demo_user;
  delete from public.debts where user_id = demo_user;
  delete from public.accounts where user_id = demo_user;
  delete from public.categories where user_id = demo_user;

  insert into public.accounts (user_id, id, name, type, opening_balance, balance, color, activity, card_label, archived, include_in_safe_spend) values
    (demo_user, 'demo-cash', 'Daily Cash', 'cash', 0, 18500, '#FF6B3D', 'Demo balance', 'CASH', false, true),
    (demo_user, 'demo-bank', 'Salary Account', 'bank', 0, 42000, '#77D6A3', 'Demo balance', 'BANK', false, true),
    (demo_user, 'demo-save', 'Emergency Savings', 'bank', 0, 30000, '#8E7FA6', 'Protected savings', 'SAVE', false, false);

  insert into public.categories (user_id, id, name, kind, color, sort_order, archived, spending_nature) values
    (demo_user, 'demo-salary', 'Salary', 'income', '#77D6A3', 0, false, 'flexible'),
    (demo_user, 'demo-food', 'Food & Essentials', 'expense', '#FF6B3D', 0, false, 'essential'),
    (demo_user, 'demo-transport', 'Transport', 'expense', '#F1B75A', 1, false, 'essential'),
    (demo_user, 'demo-bills', 'Utilities', 'expense', '#8E7FA6', 2, false, 'essential'),
    (demo_user, 'demo-eating', 'Dining Out', 'expense', '#FF806B', 3, false, 'flexible'),
    (demo_user, 'demo-fun', 'Entertainment', 'expense', '#C6BED4', 4, false, 'flexible');

  insert into public.goals (user_id, id, name, target, saved, due_date, status) values
    (demo_user, 'demo-laptop', 'Laptop fund', 150000, 45000, current_date + 90, 'Active');
  insert into public.debts (user_id, id, name, title, total, paid, due_date, category, status) values
    (demo_user, 'demo-course', 'Course installment', 'Course installment', 30000, 10000, current_date + 20, 'Installment', 'Active');

  insert into public.budgets (user_id, id, category, category_id, amount, used, period_month, archived) values
    (demo_user, 'demo-food-budget', 'Food & Essentials', 'demo-food', 18000, 0, date_trunc('month', current_date)::date, false),
    (demo_user, 'demo-eating-budget', 'Dining Out', 'demo-eating', 7000, 0, date_trunc('month', current_date)::date, false);
  insert into public.upcoming_expenses (user_id, id, title, amount, category, due_date, status, is_recurring, recurring_frequency) values
    (demo_user, 'demo-internet', 'Internet bill', 4500, 'Utilities', current_date + 4, 'upcoming', true, 'monthly'),
    (demo_user, 'demo-fee', 'Course fee', 8000, 'Education', current_date + 9, 'upcoming', false, null);

  insert into public.transactions (user_id, id, title, amount, type, category, category_id, category_name_snapshot, source, account, account_id, transaction_date) values
    (demo_user, 'demo-income-1', 'Salary', 70000, 'income', 'Salary', 'demo-salary', 'Salary', 'Salary', 'Salary Account', 'demo-bank', cycle_anchor),
    (demo_user, 'demo-grocery-1', 'Groceries', 9500, 'expense', 'Food & Essentials', 'demo-food', 'Food & Essentials', null, 'Salary Account', 'demo-bank', cycle_anchor + 3),
    (demo_user, 'demo-transport-1', 'Fuel', 4200, 'expense', 'Transport', 'demo-transport', 'Transport', null, 'Daily Cash', 'demo-cash', cycle_anchor + 8),
    (demo_user, 'demo-goal-1', 'Goal Saving', 10000, 'goal_saving', 'Laptop fund', null, 'Laptop fund', null, 'Salary Account', 'demo-bank', cycle_anchor + 12),
    (demo_user, 'demo-income-2', 'Salary', 70000, 'income', 'Salary', 'demo-salary', 'Salary', 'Salary', 'Salary Account', 'demo-bank', current_date - 9),
    (demo_user, 'demo-eat-1', 'Cafe', 650, 'expense', 'Dining Out', 'demo-eating', 'Dining Out', null, 'Daily Cash', 'demo-cash', current_date - 8),
    (demo_user, 'demo-eat-2', 'Lunch', 850, 'expense', 'Dining Out', 'demo-eating', 'Dining Out', null, 'Daily Cash', 'demo-cash', current_date - 6),
    (demo_user, 'demo-eat-3', 'Coffee', 480, 'expense', 'Dining Out', 'demo-eating', 'Dining Out', null, 'Daily Cash', 'demo-cash', current_date - 4),
    (demo_user, 'demo-eat-4', 'Takeaway', 1200, 'expense', 'Dining Out', 'demo-eating', 'Dining Out', null, 'Daily Cash', 'demo-cash', current_date - 2),
    (demo_user, 'demo-eat-5', 'Snack', 420, 'expense', 'Dining Out', 'demo-eating', 'Dining Out', null, 'Daily Cash', 'demo-cash', current_date);

  insert into public.money_quests (user_id, id, quest_type, title, target_count, starts_on, ends_on, status) values
    (demo_user, 'demo-quest', 'tracking_days', 'Track money on 4 days', 4, current_date - 2, current_date + 4, 'active');
  insert into public.wishlist_items (user_id, id, name, amount, category_id, reconsider_at, status) values
    (demo_user, 'demo-headphones', 'Noise-cancelling headphones', 18000, 'demo-fun', now() - interval '1 day', 'ready');
  insert into public.money_wins (user_id, id, win_type, title, detail, earned_at) values
    (demo_user, 'demo-win-1', 'tracking_consistency', 'Kept a full week accurate', 'Seven days with fresh entries', now() - interval '5 days'),
    (demo_user, 'demo-win-2', 'goal_milestone', 'Laptop fund reached 30%', 'A quiet step forward', now() - interval '2 days');

  insert into public.user_settings (user_id, display_name, currency, timezone, onboarding_completed, income_source_type, income_cadence, typical_income_amount, next_income_date, primary_money_priority, safety_reserve, onboarding_version, onboarding_step, tour_completed, analytics_consent)
  values (demo_user, 'Demo Student', 'PKR', 'Asia/Karachi', true, 'mixed', 'monthly', 70000, current_date + 12, 'stretch', 10000, 2, 6, true, false)
  on conflict (user_id) do update set display_name = excluded.display_name, onboarding_completed = true,
    income_source_type = excluded.income_source_type, income_cadence = excluded.income_cadence,
    typical_income_amount = excluded.typical_income_amount, next_income_date = excluded.next_income_date,
    primary_money_priority = excluded.primary_money_priority, safety_reserve = excluded.safety_reserve,
    onboarding_version = 2, onboarding_step = 6, tour_completed = true, analytics_consent = false;
end $$;

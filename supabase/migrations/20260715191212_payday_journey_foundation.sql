-- Payday Journey settings and retention foundation.
-- Every public table is explicitly granted to authenticated users and protected by RLS.

alter table public.user_settings
  add column if not exists income_source_type text,
  add column if not exists income_cadence text,
  add column if not exists typical_income_amount numeric not null default 0,
  add column if not exists next_income_date date,
  add column if not exists primary_money_priority text,
  add column if not exists safety_reserve numeric not null default 0,
  add column if not exists onboarding_version smallint not null default 1,
  add column if not exists onboarding_step smallint not null default 0,
  add column if not exists tour_completed boolean not null default false,
  add column if not exists analytics_consent boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_income_source_type_check') then
    alter table public.user_settings add constraint user_settings_income_source_type_check
      check (income_source_type is null or income_source_type in ('salary', 'allowance', 'irregular', 'mixed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_income_cadence_check') then
    alter table public.user_settings add constraint user_settings_income_cadence_check
      check (income_cadence is null or income_cadence in ('weekly', 'monthly', 'custom'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_money_priority_check') then
    alter table public.user_settings add constraint user_settings_money_priority_check
      check (primary_money_priority is null or primary_money_priority in ('stretch', 'save', 'control_spending', 'bills_debt', 'understand'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_typical_income_check') then
    alter table public.user_settings add constraint user_settings_typical_income_check
      check (typical_income_amount >= 0 and typical_income_amount = trunc(typical_income_amount));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_safety_reserve_check') then
    alter table public.user_settings add constraint user_settings_safety_reserve_check
      check (safety_reserve >= 0 and safety_reserve = trunc(safety_reserve));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_onboarding_step_check') then
    alter table public.user_settings add constraint user_settings_onboarding_step_check
      check (onboarding_step between 0 and 6);
  end if;
end $$;

alter table public.accounts
  add column if not exists include_in_safe_spend boolean not null default true;

alter table public.categories
  add column if not exists spending_nature text not null default 'flexible';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_spending_nature_check') then
    alter table public.categories add constraint categories_spending_nature_check
      check (spending_nature in ('essential', 'flexible'));
  end if;
end $$;

update public.categories
set spending_nature = 'essential'
where kind = 'expense'
  and lower(name) in ('food', 'groceries', 'food & essentials', 'transport', 'housing', 'rent', 'utilities', 'healthcare', 'education', 'family support');

create table if not exists public.money_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  quest_type text not null check (quest_type in ('no_spend_days', 'category_limit', 'tracking_days', 'goal_contribution')),
  title text not null,
  category_id text,
  goal_id text,
  target_amount numeric,
  target_count integer,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint money_quests_valid_window check (ends_on >= starts_on),
  constraint money_quests_target_amount_check check (target_amount is null or (target_amount > 0 and target_amount = trunc(target_amount))),
  constraint money_quests_target_count_check check (target_count is null or target_count > 0),
  constraint money_quests_category_fkey foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint money_quests_goal_fkey foreign key (user_id, goal_id) references public.goals(user_id, id) on delete set null (goal_id)
);

create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  amount numeric not null check (amount > 0 and amount = trunc(amount)),
  category_id text,
  goal_id text,
  reconsider_at timestamptz not null,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'bought', 'skipped', 'moved_to_goal')),
  transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint wishlist_items_category_fkey foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint wishlist_items_goal_fkey foreign key (user_id, goal_id) references public.goals(user_id, id) on delete set null (goal_id),
  constraint wishlist_items_transaction_fkey foreign key (user_id, transaction_id) references public.transactions(user_id, id) on delete set null (transaction_id)
);

create table if not exists public.money_wins (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  win_type text not null check (win_type in ('quest_completed', 'goal_milestone', 'budget_recovered', 'cycle_improved', 'tracking_consistency', 'wishlist_skipped')),
  title text not null,
  detail text,
  cycle_start date,
  cycle_end date,
  earned_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint money_wins_cycle_check check (cycle_start is null or cycle_end is null or cycle_end >= cycle_start)
);

create unique index if not exists money_quests_one_active_idx
  on public.money_quests(user_id) where status = 'active';
create index if not exists money_quests_user_dates_idx
  on public.money_quests(user_id, starts_on desc, ends_on desc);
create index if not exists wishlist_items_user_reconsider_idx
  on public.wishlist_items(user_id, status, reconsider_at);
create index if not exists money_wins_user_earned_idx
  on public.money_wins(user_id, earned_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists money_quests_touch_updated_at on public.money_quests;
create trigger money_quests_touch_updated_at before update on public.money_quests
  for each row execute function private.touch_updated_at();
drop trigger if exists wishlist_items_touch_updated_at on public.wishlist_items;
create trigger wishlist_items_touch_updated_at before update on public.wishlist_items
  for each row execute function private.touch_updated_at();

alter table public.money_quests enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.money_wins enable row level security;

drop policy if exists "Users manage their own money quests" on public.money_quests;
create policy "Users manage their own money quests" on public.money_quests
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own wishlist items" on public.wishlist_items;
create policy "Users manage their own wishlist items" on public.wishlist_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own money wins" on public.money_wins;
create policy "Users manage their own money wins" on public.money_wins
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.money_quests, public.wishlist_items, public.money_wins from public, anon;
grant select, insert, update, delete on public.money_quests, public.wishlist_items, public.money_wins to authenticated;
grant select, insert, update, delete on public.money_quests, public.wishlist_items, public.money_wins to service_role;

notify pgrst, 'reload schema';

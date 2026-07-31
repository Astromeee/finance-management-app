-- Responsive Plan workspace: retained history, richer cool-off notes, and up to
-- three concurrently active quests. The application enforces the three-quest
-- cap so existing clients can continue using simple row-level CRUD.

alter table public.wishlist_items
  add column if not exists reason text;

drop index if exists public.money_quests_one_active_idx;

alter table public.wishlist_items drop constraint if exists wishlist_items_status_check;
alter table public.wishlist_items add constraint wishlist_items_status_check
  check (status in ('waiting', 'ready', 'bought', 'skipped', 'moved_to_goal', 'removed'));

alter table public.upcoming_expenses drop constraint if exists upcoming_expenses_status_check;
alter table public.upcoming_expenses add constraint upcoming_expenses_status_check
  check (status in ('upcoming', 'due_soon', 'overdue', 'paid', 'cancelled'));

create index if not exists money_quests_user_active_idx
  on public.money_quests(user_id, created_at desc) where status = 'active';

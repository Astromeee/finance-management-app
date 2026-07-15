-- Cover optional composite foreign keys used by Plan and retention queries.
create index if not exists money_quests_user_category_idx
  on public.money_quests(user_id, category_id) where category_id is not null;
create index if not exists money_quests_user_goal_idx
  on public.money_quests(user_id, goal_id) where goal_id is not null;
create index if not exists wishlist_items_user_category_idx
  on public.wishlist_items(user_id, category_id) where category_id is not null;
create index if not exists wishlist_items_user_goal_idx
  on public.wishlist_items(user_id, goal_id) where goal_id is not null;
create index if not exists wishlist_items_user_transaction_idx
  on public.wishlist_items(user_id, transaction_id) where transaction_id is not null;

-- Existing monitoring table was also surfaced by the advisor.
create index if not exists client_error_events_user_idx
  on public.client_error_events(user_id);

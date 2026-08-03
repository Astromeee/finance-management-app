-- Privacy-minimized product activity. One aggregate row is kept per user/day;
-- financial values, labels, notes, routes, and free-form content are never stored.
create table if not exists public.user_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  session_count integer not null default 0 check (session_count >= 0),
  page_view_count integer not null default 0 check (page_view_count >= 0),
  meaningful_action_count integer not null default 0 check (meaningful_action_count >= 0),
  primary key (user_id, activity_date)
);

alter table public.user_activity_daily enable row level security;

revoke all on public.user_activity_daily from public, anon, authenticated;
grant select, insert, update on public.user_activity_daily to authenticated;

drop policy if exists "Users can view their own daily activity" on public.user_activity_daily;
create policy "Users can view their own daily activity"
on public.user_activity_daily for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own daily activity" on public.user_activity_daily;
create policy "Users can create their own daily activity"
on public.user_activity_daily for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own daily activity" on public.user_activity_daily;
create policy "Users can update their own daily activity"
on public.user_activity_daily for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists user_activity_daily_activity_date_idx
  on public.user_activity_daily (activity_date desc);

create or replace function public.record_app_activity(p_kind text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_activity_date date := (now() at time zone 'UTC')::date;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_kind not in ('session', 'page_view', 'meaningful_action') then
    raise exception 'Unsupported activity kind';
  end if;

  insert into public.user_activity_daily (
    user_id,
    activity_date,
    session_count,
    page_view_count,
    meaningful_action_count
  ) values (
    v_user_id,
    v_activity_date,
    case when p_kind = 'session' then 1 else 0 end,
    case when p_kind = 'page_view' then 1 else 0 end,
    case when p_kind = 'meaningful_action' then 1 else 0 end
  )
  on conflict (user_id, activity_date) do update set
    last_seen_at = now(),
    session_count = public.user_activity_daily.session_count + excluded.session_count,
    page_view_count = public.user_activity_daily.page_view_count + excluded.page_view_count,
    meaningful_action_count = public.user_activity_daily.meaningful_action_count + excluded.meaningful_action_count;
end;
$$;

revoke all on function public.record_app_activity(text) from public, anon, authenticated;
grant execute on function public.record_app_activity(text) to authenticated;

-- Keep account deletion complete even if Auth deletion later needs support help.
create or replace function public.delete_my_finance_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then raise exception 'User id required'; end if;
  delete from public.user_activity_daily where user_id = p_user;
  delete from public.client_error_events where user_id = p_user;
  delete from public.finance_states where user_id = p_user;
  delete from public.user_settings where user_id = p_user;
  delete from public.upcoming_expenses where user_id = p_user;
  delete from public.transactions where user_id = p_user;
  delete from public.budgets where user_id = p_user;
  delete from public.goals where user_id = p_user;
  delete from public.debts where user_id = p_user;
  delete from public.accounts where user_id = p_user;
  delete from public.categories where user_id = p_user;
end;
$$;

revoke all on function public.delete_my_finance_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_my_finance_data(uuid) to service_role;

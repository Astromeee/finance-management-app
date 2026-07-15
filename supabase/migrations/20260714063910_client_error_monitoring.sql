create table if not exists public.client_error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('render_failure', 'unhandled_error', 'unhandled_rejection')),
  error_name text not null check (char_length(error_name) between 1 and 80),
  route text not null check (char_length(route) between 1 and 80),
  app_version text not null check (char_length(app_version) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.client_error_events enable row level security;
revoke all on public.client_error_events from public, anon, authenticated;
grant insert on public.client_error_events to authenticated;

drop policy if exists "Users can report their own client errors" on public.client_error_events;
create policy "Users can report their own client errors"
on public.client_error_events for insert
to authenticated
with check ((select auth.uid()) = user_id);

create index if not exists client_error_events_created_at_idx
  on public.client_error_events (created_at);

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'purge-pocket-ledger-client-errors') then
    perform cron.schedule(
      'purge-pocket-ledger-client-errors',
      '17 2 * * *',
      'delete from public.client_error_events where created_at < now() - interval ''30 days'''
    );
  end if;
end $$;

create or replace function public.delete_my_finance_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then raise exception 'User id required'; end if;
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

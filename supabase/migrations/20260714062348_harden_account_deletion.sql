drop function if exists public.delete_my_finance_data();

create or replace function public.delete_my_finance_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then raise exception 'User id required'; end if;
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

create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category_id);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.finance_states_backup_20260714'::regclass
      and contype = 'p'
  ) then
    alter table private.finance_states_backup_20260714
      add primary key (user_id);
  end if;
end $$;

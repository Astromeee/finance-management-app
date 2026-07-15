-- Pocket Ledger public-beta relational cutover.
-- The migration is deliberately idempotent so it can be rehearsed safely.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.finance_states_backup_20260714 as
select * from public.finance_states;
revoke all on private.finance_states_backup_20260714 from public, anon, authenticated;

alter table public.accounts add column if not exists opening_balance numeric not null default 0;
alter table public.categories add column if not exists archived boolean not null default false;
alter table public.transactions add column if not exists category_id text;
alter table public.transactions add column if not exists category_name_snapshot text;
alter table public.budgets add column if not exists category_id text;
alter table public.budgets add column if not exists archived boolean not null default false;
alter table public.user_settings add column if not exists timezone text not null default 'Asia/Karachi';
alter table public.user_settings add column if not exists onboarding_completed boolean not null default false;
alter table public.user_settings add column if not exists avatar text;
alter table public.debts add column if not exists title text;
alter table public.debts add column if not exists person_or_company text;
alter table public.debts add column if not exists category text not null default 'Debt';

alter table public.debts drop constraint if exists debts_status_check;
alter table public.debts add constraint debts_status_check
  check (status in ('Active', 'Due Soon', 'Overdue', 'Paid'));

create unique index if not exists categories_user_kind_name_unique
  on public.categories (user_id, kind, lower(name)) where archived = false;
create unique index if not exists budgets_user_category_period_unique
  on public.budgets (user_id, category_id, period_month) where category_id is not null;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.accounts, public.categories, public.transactions,
  public.budgets, public.goals, public.debts, public.upcoming_expenses, public.user_settings
  to authenticated;
revoke all on public.finance_states from anon;
revoke insert, update, delete on public.finance_states from authenticated;
grant select on public.finance_states to authenticated;

-- Seed the general Pakistan-first category set for every existing ledger owner.
with users as (
  select user_id from public.finance_states
), defaults(kind, name, sort_order) as (
  values
    ('income', 'Salary', 0), ('income', 'Business/Freelance', 1),
    ('income', 'Family Support', 2), ('income', 'Allowance/Pocket Money', 3),
    ('income', 'Rental Income', 4), ('income', 'Investment Income', 5),
    ('income', 'Gift', 6), ('income', 'Refund', 7), ('income', 'Other Income', 8),
    ('expense', 'Housing/Rent', 0), ('expense', 'Utilities', 1),
    ('expense', 'Groceries', 2), ('expense', 'Dining Out', 3),
    ('expense', 'Transport/Fuel', 4), ('expense', 'Mobile & Internet', 5),
    ('expense', 'Healthcare', 6), ('expense', 'Education', 7),
    ('expense', 'Shopping/Clothing', 8), ('expense', 'Entertainment', 9),
    ('expense', 'Subscriptions', 10), ('expense', 'Family & Gifts', 11),
    ('expense', 'Charity/Zakat', 12), ('expense', 'Miscellaneous', 13)
)
insert into public.categories (user_id, id, name, kind, color, sort_order)
select u.user_id, d.kind || '-' || substr(md5(lower(d.name)), 1, 12), d.name, d.kind,
  case when d.kind = 'income' then '#2d9d78' else '#ff5c00' end, d.sort_order
from users u cross join defaults d
on conflict do nothing;

-- Preserve every existing custom category, while generalising sibling support.
with raw_categories as (
  select fs.user_id, 'income'::text as kind,
    case when lower(value #>> '{}') = 'siblings support' then 'Family Support' else value #>> '{}' end as name,
    ordinality::int + 100 as sort_order
  from public.finance_states fs,
    jsonb_array_elements(coalesce(fs.data->'incomeCategories', '[]'::jsonb)) with ordinality
  union all
  select fs.user_id, 'expense', value #>> '{}', ordinality::int + 100
  from public.finance_states fs,
    jsonb_array_elements(coalesce(fs.data->'expenseCategories', '[]'::jsonb)) with ordinality
), clean as (
  select distinct on (user_id, kind, lower(trim(name))) user_id, kind, trim(name) as name, sort_order
  from raw_categories where nullif(trim(name), '') is not null
  order by user_id, kind, lower(trim(name)), sort_order
)
insert into public.categories (user_id, id, name, kind, color, sort_order)
select user_id, kind || '-' || substr(md5(lower(name)), 1, 12), name, kind,
  case when kind = 'income' then '#2d9d78' else '#ff5c00' end, sort_order
from clean
on conflict do nothing;

-- Accounts are migrated before dependent rows. Opening balance is reconstructed
-- so the migrated transaction ledger produces the saved current balance.
insert into public.accounts (user_id, id, name, type, opening_balance, balance, color, activity, card_label, archived)
select fs.user_id,
  account->>'id', account->>'name', coalesce(account->>'type', 'wallet'),
  coalesce((account->>'balance')::numeric, 0) - coalesce((
    select sum(case
      when tx->>'type' = 'income' and tx->>'accountId' = account->>'id' then coalesce((tx->>'amount')::numeric, 0)
      when tx->>'type' in ('expense','goal_saving','debt_payment') and tx->>'accountId' = account->>'id' then -coalesce((tx->>'amount')::numeric, 0)
      when tx->>'type' = 'transfer' and tx->>'fromAccountId' = account->>'id' then -coalesce((tx->>'amount')::numeric, 0)
      when tx->>'type' = 'transfer' and tx->>'toAccountId' = account->>'id' then coalesce((tx->>'amount')::numeric, 0)
      else 0 end)
    from jsonb_array_elements(coalesce(fs.data->'transactions', '[]'::jsonb)) tx
  ), 0),
  coalesce((account->>'balance')::numeric, 0), coalesce(account->>'color', '#ff5c00'),
  coalesce(account->>'activity', ''), coalesce(account->>'cardLabel', ''), false
from public.finance_states fs,
  jsonb_array_elements(coalesce(fs.data->'accounts', '[]'::jsonb)) account
where nullif(account->>'id', '') is not null
on conflict (user_id, id) do update set
  name = excluded.name, type = excluded.type, opening_balance = excluded.opening_balance,
  balance = excluded.balance, color = excluded.color, activity = excluded.activity,
  card_label = excluded.card_label, archived = false, updated_at = now();

insert into public.goals (user_id, id, name, target, saved, due_date, linked_account_id, notes, status)
select fs.user_id, goal->>'id', goal->>'name', coalesce((goal->>'target')::numeric, 0),
  coalesce((goal->>'saved')::numeric, 0), nullif(goal->>'dueDate', '')::date,
  nullif(goal->>'linkedAccountId', ''), nullif(goal->>'notes', ''), coalesce(goal->>'status', 'Active')
from public.finance_states fs,
  jsonb_array_elements(coalesce(fs.data->'goals', '[]'::jsonb)) goal
where nullif(goal->>'id', '') is not null
on conflict (user_id, id) do update set name = excluded.name, target = excluded.target,
  saved = excluded.saved, due_date = excluded.due_date, linked_account_id = excluded.linked_account_id,
  notes = excluded.notes, status = excluded.status, updated_at = now();

insert into public.debts (user_id, id, name, title, person_or_company, total, paid, due_date, notes, category, status)
select fs.user_id, debt->>'id', coalesce(debt->>'title', debt->>'name', 'Debt'),
  coalesce(debt->>'title', debt->>'name', 'Debt'), nullif(debt->>'personOrCompany', ''),
  coalesce((coalesce(debt->>'totalAmount', debt->>'total'))::numeric, 0),
  coalesce((coalesce(debt->>'paidAmount', debt->>'paid'))::numeric, 0),
  nullif(debt->>'dueDate', '')::date, nullif(debt->>'notes', ''),
  coalesce(nullif(debt->>'category', ''), 'Debt'),
  case when coalesce(debt->>'status', 'Active') = 'Completed' then 'Paid' else coalesce(debt->>'status', 'Active') end
from public.finance_states fs,
  jsonb_array_elements(coalesce(fs.data->'debts', '[]'::jsonb)) debt
where nullif(debt->>'id', '') is not null
on conflict (user_id, id) do update set name = excluded.name, title = excluded.title,
  person_or_company = excluded.person_or_company, total = excluded.total, paid = excluded.paid,
  due_date = excluded.due_date, notes = excluded.notes, category = excluded.category,
  status = excluded.status, updated_at = now();

insert into public.transactions (
  user_id, id, title, amount, type, category, category_id, category_name_snapshot,
  source, account, account_id, from_account_id, to_account_id, goal_id, debt_id,
  payment_method, transaction_date, notes, created_at
)
select fs.user_id, tx->>'id',
  case when coalesce(tx->>'source', tx->>'category', '') ilike 'Siblings Support%'
    then 'Family Support' else coalesce(tx->>'title', 'Transaction') end,
  coalesce((tx->>'amount')::numeric, 0), tx->>'type',
  mapped.category_name,
  (select c.id from public.categories c where c.user_id = fs.user_id
    and c.kind = case when tx->>'type' = 'income' then 'income' else 'expense' end
    and lower(c.name) = lower(mapped.category_name) and not c.archived limit 1),
  mapped.category_name,
  case when coalesce(tx->>'source', '') ilike 'Siblings Support%' then 'Family Support' else nullif(tx->>'source', '') end,
  coalesce(tx->>'account', ''), nullif(tx->>'accountId', ''), nullif(tx->>'fromAccountId', ''),
  nullif(tx->>'toAccountId', ''), nullif(tx->>'goalId', ''), nullif(tx->>'debtId', ''),
  nullif(tx->>'paymentMethod', ''), coalesce(nullif(tx->>'date', '')::date, current_date),
  case
    when coalesce(tx->>'source', '') ilike 'Siblings Support - %' then
      concat_ws(E'\n', nullif(tx->>'notes', ''), 'Received from: ' || substring(tx->>'source' from 20))
    else nullif(tx->>'notes', '') end,
  coalesce(nullif(tx->>'createdAt', '')::timestamptz, now())
from public.finance_states fs,
  jsonb_array_elements(coalesce(fs.data->'transactions', '[]'::jsonb)) tx
cross join lateral (
  select case
    when coalesce(tx->>'source', tx->>'category', '') ilike 'Siblings Support%' then 'Family Support'
    else coalesce(nullif(tx->>'category', ''), nullif(tx->>'source', ''), 'Miscellaneous') end as category_name
) mapped
where nullif(tx->>'id', '') is not null
on conflict (user_id, id) do update set title = excluded.title, amount = excluded.amount,
  type = excluded.type, category = excluded.category, category_id = excluded.category_id,
  category_name_snapshot = excluded.category_name_snapshot, source = excluded.source,
  account = excluded.account, account_id = excluded.account_id,
  from_account_id = excluded.from_account_id, to_account_id = excluded.to_account_id,
  goal_id = excluded.goal_id, debt_id = excluded.debt_id, payment_method = excluded.payment_method,
  transaction_date = excluded.transaction_date, notes = excluded.notes, updated_at = now();

insert into public.budgets (user_id, id, category, category_id, amount, used, period_month)
select fs.user_id, budget->>'id', budget->>'category', c.id,
  coalesce((budget->>'amount')::numeric, 0), 0,
  coalesce(nullif(budget->>'periodMonth', '')::date, date_trunc('month', current_date)::date)
from public.finance_states fs
cross join lateral jsonb_array_elements(coalesce(fs.data->'budgets', '[]'::jsonb)) budget
left join public.categories c on c.user_id = fs.user_id and c.kind = 'expense'
  and lower(c.name) = lower(budget->>'category') and not c.archived
where nullif(budget->>'id', '') is not null
on conflict (user_id, id) do update set category = excluded.category,
  category_id = excluded.category_id, amount = excluded.amount, used = 0,
  period_month = excluded.period_month, updated_at = now();

insert into public.upcoming_expenses (
  user_id, id, title, amount, category, due_date, linked_account_id, notes, status,
  is_recurring, recurring_frequency, repeat_start_date, repeat_end_date,
  reminder_days_before, paid_transaction_id, created_at
)
select fs.user_id, expense->>'id', expense->>'title', coalesce((expense->>'amount')::numeric, 0),
  coalesce(expense->>'category', 'Miscellaneous'), nullif(expense->>'dueDate', '')::date,
  nullif(expense->>'linkedAccountId', ''), nullif(expense->>'notes', ''),
  coalesce(expense->>'status', 'upcoming'), coalesce((expense->>'isRecurring')::boolean, false),
  nullif(expense->>'recurringFrequency', ''), nullif(expense->>'repeatStartDate', '')::date,
  nullif(expense->>'repeatEndDate', '')::date,
  nullif(expense->>'reminderDaysBefore', '')::int, nullif(expense->>'paidTransactionId', ''),
  coalesce(nullif(expense->>'createdAt', '')::timestamptz, now())
from public.finance_states fs,
  jsonb_array_elements(coalesce(fs.data->'upcomingExpenses', '[]'::jsonb)) expense
where nullif(expense->>'id', '') is not null and nullif(expense->>'dueDate', '') is not null
on conflict (user_id, id) do update set title = excluded.title, amount = excluded.amount,
  category = excluded.category, due_date = excluded.due_date,
  linked_account_id = excluded.linked_account_id, notes = excluded.notes, status = excluded.status,
  is_recurring = excluded.is_recurring, recurring_frequency = excluded.recurring_frequency,
  repeat_start_date = excluded.repeat_start_date, repeat_end_date = excluded.repeat_end_date,
  reminder_days_before = excluded.reminder_days_before,
  paid_transaction_id = excluded.paid_transaction_id, updated_at = now();

insert into public.user_settings (user_id, display_name, currency, theme, timezone, onboarding_completed, avatar)
select fs.user_id, nullif(fs.data->'profile'->>'name', ''), 'PKR',
  coalesce(fs.data->'profile'->>'theme', 'dark'), 'Asia/Karachi',
  jsonb_array_length(coalesce(fs.data->'accounts', '[]'::jsonb)) > 0,
  nullif(fs.data->'profile'->>'avatar', '')
from public.finance_states fs
on conflict (user_id) do update set display_name = excluded.display_name,
  currency = 'PKR', timezone = 'Asia/Karachi',
  onboarding_completed = excluded.onboarding_completed, avatar = excluded.avatar, updated_at = now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_user_id_category_id_fkey') then
    alter table public.transactions add constraint transactions_user_id_category_id_fkey
      foreign key (user_id, category_id) references public.categories(user_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_user_id_category_id_fkey') then
    alter table public.budgets add constraint budgets_user_id_category_id_fkey
      foreign key (user_id, category_id) references public.categories(user_id, id);
  end if;
end $$;

-- One atomic entry point for every balance-changing action. RLS still applies
-- because this function is SECURITY INVOKER and always uses auth.uid().
create or replace function public.record_finance_action(p_action jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id text := coalesce(nullif(p_action->>'id', ''), gen_random_uuid()::text);
  v_type text := p_action->>'type';
  v_amount numeric := (p_action->>'amount')::numeric;
  v_account_id text := nullif(p_action->>'accountId', '');
  v_from_id text := nullif(p_action->>'fromAccountId', '');
  v_to_id text := nullif(p_action->>'toAccountId', '');
  v_goal_id text := nullif(p_action->>'goalId', '');
  v_debt_id text := nullif(p_action->>'debtId', '');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_type not in ('income','expense','transfer','goal_saving','debt_payment') then
    raise exception 'Unsupported finance action';
  end if;
  if v_amount is null or v_amount <= 0 or v_amount <> trunc(v_amount) or v_amount > 999999999999 then
    raise exception 'Amount must be a positive whole PKR value';
  end if;

  if v_type = 'income' then
    update public.accounts set balance = balance + v_amount, updated_at = now()
      where user_id = v_user and id = v_account_id;
    if not found then raise exception 'Account not found'; end if;
  elsif v_type in ('expense','goal_saving','debt_payment') then
    update public.accounts set balance = balance - v_amount, updated_at = now()
      where user_id = v_user and id = v_account_id
        and (v_type = 'expense' or balance >= v_amount);
    if not found then raise exception 'Account not found or balance is insufficient'; end if;
  elsif v_type = 'transfer' then
    if v_from_id = v_to_id then raise exception 'Transfer accounts must differ'; end if;
    update public.accounts set balance = balance - v_amount, updated_at = now()
      where user_id = v_user and id = v_from_id and balance >= v_amount;
    if not found then raise exception 'Insufficient balance'; end if;
    update public.accounts set balance = balance + v_amount, updated_at = now()
      where user_id = v_user and id = v_to_id;
    if not found then raise exception 'Destination account not found'; end if;
  end if;

  if v_type = 'goal_saving' then
    update public.goals set saved = least(target, saved + v_amount),
      status = case when saved + v_amount >= target then 'Completed' else status end,
      updated_at = now()
    where user_id = v_user and id = v_goal_id;
    if not found then raise exception 'Goal not found'; end if;
  elsif v_type = 'debt_payment' then
    update public.debts set paid = least(total, paid + v_amount),
      status = case when paid + v_amount >= total then 'Paid' else status end,
      updated_at = now()
    where user_id = v_user and id = v_debt_id;
    if not found then raise exception 'Debt not found'; end if;
  end if;

  insert into public.transactions (
    user_id, id, title, amount, type, category, category_id, category_name_snapshot,
    source, account, account_id, from_account_id, to_account_id, goal_id, debt_id,
    transaction_date, notes
  ) values (
    v_user, v_id, coalesce(p_action->>'title', 'Transaction'), v_amount, v_type,
    nullif(p_action->>'category', ''), nullif(p_action->>'categoryId', ''),
    nullif(p_action->>'category', ''), nullif(p_action->>'source', ''),
    coalesce(p_action->>'account', ''), v_account_id, v_from_id, v_to_id,
    v_goal_id, v_debt_id, coalesce(nullif(p_action->>'date', '')::date, current_date),
    nullif(p_action->>'notes', '')
  );

  return jsonb_build_object('id', v_id, 'ok', true);
end;
$$;

revoke all on function public.record_finance_action(jsonb) from public, anon;
grant execute on function public.record_finance_action(jsonb) to authenticated;

create or replace function public.delete_finance_transaction(p_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_tx from public.transactions
    where user_id = v_user and id = p_id for update;
  if not found then raise exception 'Transaction not found'; end if;

  if v_tx.type = 'income' then
    update public.accounts set balance = balance - v_tx.amount, updated_at = now()
      where user_id = v_user and id = v_tx.account_id;
  elsif v_tx.type in ('expense','goal_saving','debt_payment') then
    update public.accounts set balance = balance + v_tx.amount, updated_at = now()
      where user_id = v_user and id = v_tx.account_id;
  elsif v_tx.type = 'transfer' then
    update public.accounts set balance = balance + v_tx.amount, updated_at = now()
      where user_id = v_user and id = v_tx.from_account_id;
    update public.accounts set balance = balance - v_tx.amount, updated_at = now()
      where user_id = v_user and id = v_tx.to_account_id;
  end if;

  if v_tx.type = 'goal_saving' and v_tx.goal_id is not null then
    update public.goals set saved = greatest(0, saved - v_tx.amount), status = 'Active', updated_at = now()
      where user_id = v_user and id = v_tx.goal_id;
  elsif v_tx.type = 'debt_payment' and v_tx.debt_id is not null then
    update public.debts set paid = greatest(0, paid - v_tx.amount), status = 'Active', updated_at = now()
      where user_id = v_user and id = v_tx.debt_id;
  end if;

  delete from public.transactions where user_id = v_user and id = p_id;
end;
$$;

revoke all on function public.delete_finance_transaction(text) from public, anon;
grant execute on function public.delete_finance_transaction(text) to authenticated;

create or replace function public.update_finance_transaction(p_id text, p_action jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.delete_finance_transaction(p_id);
  return public.record_finance_action(p_action || jsonb_build_object('id', p_id));
end;
$$;

revoke all on function public.update_finance_transaction(text, jsonb) from public, anon;
grant execute on function public.update_finance_transaction(text, jsonb) to authenticated;

create or replace function public.mark_upcoming_expense_paid(
  p_upcoming_id text,
  p_action jsonb,
  p_next_upcoming jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
  v_transaction_id text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  perform 1 from public.upcoming_expenses
    where user_id = v_user and id = p_upcoming_id and status <> 'paid'
    for update;
  if not found then raise exception 'Upcoming expense not found or already paid'; end if;

  v_result := public.record_finance_action(p_action || jsonb_build_object('type', 'expense'));
  v_transaction_id := v_result->>'id';

  update public.upcoming_expenses
    set status = 'paid', paid_transaction_id = v_transaction_id, updated_at = now()
    where user_id = v_user and id = p_upcoming_id;

  if p_next_upcoming is not null then
    insert into public.upcoming_expenses (
      user_id, id, title, amount, category, due_date, linked_account_id, notes,
      status, is_recurring, recurring_frequency, repeat_start_date,
      repeat_end_date, reminder_days_before
    ) values (
      v_user, coalesce(nullif(p_next_upcoming->>'id', ''), gen_random_uuid()::text),
      p_next_upcoming->>'title', (p_next_upcoming->>'amount')::numeric,
      coalesce(nullif(p_next_upcoming->>'category', ''), 'Miscellaneous'),
      (p_next_upcoming->>'dueDate')::date, nullif(p_next_upcoming->>'linkedAccountId', ''),
      nullif(p_next_upcoming->>'notes', ''), 'upcoming', true,
      nullif(p_next_upcoming->>'recurringFrequency', ''),
      nullif(p_next_upcoming->>'repeatStartDate', '')::date,
      nullif(p_next_upcoming->>'repeatEndDate', '')::date,
      nullif(p_next_upcoming->>'reminderDaysBefore', '')::int
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.mark_upcoming_expense_paid(text, jsonb, jsonb) from public, anon;
grant execute on function public.mark_upcoming_expense_paid(text, jsonb, jsonb) to authenticated;

create or replace function public.adjust_account_balance(p_account jsonb, p_action jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_new_balance numeric := (p_account->>'balance')::numeric;
  v_difference numeric;
  v_transaction_id text := coalesce(nullif(p_action->>'id', ''), gen_random_uuid()::text);
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_new_balance < 0 or v_new_balance <> trunc(v_new_balance) or v_new_balance > 999999999999 then
    raise exception 'Balance must be a non-negative whole PKR value';
  end if;

  select * into v_account from public.accounts
    where user_id = v_user and id = p_account->>'id' and not archived for update;
  if not found then raise exception 'Account not found'; end if;
  v_difference := v_new_balance - v_account.balance;

  update public.accounts set
    name = coalesce(nullif(p_account->>'name', ''), name),
    type = coalesce(nullif(p_account->>'type', ''), type),
    balance = v_new_balance,
    color = coalesce(nullif(p_account->>'color', ''), color),
    activity = coalesce(p_account->>'activity', activity),
    card_label = coalesce(p_account->>'cardLabel', card_label),
    updated_at = now()
  where user_id = v_user and id = v_account.id;

  if v_difference <> 0 then
    insert into public.transactions (
      user_id, id, title, amount, type, category, category_name_snapshot,
      source, account, account_id, transaction_date, notes
    ) values (
      v_user, v_transaction_id,
      case when v_difference > 0 then 'Balance Adjustment Income' else 'Balance Adjustment Expense' end,
      abs(v_difference), case when v_difference > 0 then 'income' else 'expense' end,
      'Balance Adjustment', 'Balance Adjustment',
      case when v_difference > 0 then 'Balance Adjustment' else null end,
      coalesce(nullif(p_account->>'name', ''), v_account.name), v_account.id,
      coalesce(nullif(p_action->>'date', '')::date, current_date), nullif(p_action->>'notes', '')
    );
  end if;

  return jsonb_build_object('id', v_transaction_id, 'difference', v_difference, 'ok', true);
end;
$$;

revoke all on function public.adjust_account_balance(jsonb, jsonb) from public, anon;
grant execute on function public.adjust_account_balance(jsonb, jsonb) to authenticated;

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
  -- Remaining relational rows cascade when auth.users is removed; explicit
  -- deletes let the authenticated Edge Function verify data removal first.
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

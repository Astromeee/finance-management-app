-- Forward-only: retired feature data is retained. Existing finance RPCs remain intact.
create table public.receivables (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null, person text not null check(length(trim(person)) between 1 and 100),
 amount numeric not null check(amount > 0 and amount = trunc(amount) and amount <= 999999999999),
 received numeric not null default 0 check(received >= 0),
 written_off numeric not null default 0 check(written_off >= 0),
 due_date date, notes text, archived boolean not null default false,
 created_at timestamptz not null default now(), primary key(user_id,id),
 check(received + written_off <= amount)
);
alter table public.receivables enable row level security;
revoke all on public.receivables from public,anon,authenticated;
create policy own_receivables on public.receivables to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select on public.receivables to authenticated;
grant insert(user_id,id,person,amount,due_date,notes,archived,created_at), update(person,amount,due_date,notes,archived) on public.receivables to authenticated;

create table public.receivable_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null, receivable_id text not null, kind text not null check(kind in ('write_off','repayment','repayment_reversed')),
 amount numeric not null check(amount > 0), created_at timestamptz not null default now(),
 primary key(user_id,id), foreign key(user_id,receivable_id) references public.receivables(user_id,id) on delete cascade
);
alter table public.receivable_events enable row level security;
revoke all on public.receivable_events from public,anon,authenticated;
create policy own_receivable_events on public.receivable_events for select to authenticated using ((select auth.uid())=user_id);
grant select on public.receivable_events to authenticated;
create index receivable_events_parent on public.receivable_events(user_id,receivable_id);

alter table public.transactions add column receivable_id text;
alter table public.transactions add column recovered_amount numeric not null default 0;
alter table public.transactions add constraint transactions_receivable_fkey foreign key(user_id,receivable_id) references public.receivables(user_id,id);
create index transactions_receivable on public.transactions(user_id,receivable_id) where receivable_id is not null;
-- The original schema uses text with a check constraint.
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check(type in ('income','expense','transfer','goal','debt','goal_saving','debt_payment','receivable_payment'));

create function public.record_receivable_payment(p_id text,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); r public.receivables%rowtype; a public.accounts%rowtype;
 n numeric:=(p_action->>'amount')::numeric; txid text:=coalesce(nullif(p_action->>'id',''),gen_random_uuid()::text); recovered numeric;
begin
 if u is null then raise exception 'Authentication required'; end if;
 if n is null or n<=0 or n<>trunc(n) or n>999999999999 then raise exception 'Enter a positive whole amount'; end if;
 select * into r from public.receivables where user_id=u and id=p_id for update;
 if not found or r.archived then raise exception 'Receivable not found'; end if;
 -- Idempotency: an existing transaction must match this exact payment.
 if exists(select 1 from public.transactions where user_id=u and id=txid and receivable_id=p_id and amount=n and account_id=p_action->>'accountId') then return jsonb_build_object('id',txid); end if;
 if n>r.amount-r.received then raise exception 'Repayment exceeds amount owed'; end if;
 select * into a from public.accounts where user_id=u and id=p_action->>'accountId' and not archived for update;
 if not found then raise exception 'Account not found'; end if;
 recovered:=greatest(0,n-(r.amount-r.received-r.written_off));
 insert into public.transactions(user_id,id,title,amount,type,account,account_id,receivable_id,recovered_amount,transaction_date,notes)
 values(u,txid,coalesce(nullif(p_action->>'title',''),'Repayment from '||r.person),n,'receivable_payment',a.name,a.id,r.id,recovered,coalesce(nullif(p_action->>'date','')::date,current_date),nullif(p_action->>'notes',''));
 update public.accounts set balance=balance+n,updated_at=now() where user_id=u and id=a.id;
 update public.receivables set received=received+n,written_off=written_off-recovered where user_id=u and id=r.id;
 insert into public.receivable_events(user_id,id,receivable_id,kind,amount) values(u,gen_random_uuid()::text,r.id,'repayment',n);
 return jsonb_build_object('id',txid,'ok',true);
end $$;
revoke all on function public.record_receivable_payment(text,jsonb) from public,anon;
grant execute on function public.record_receivable_payment(text,jsonb) to authenticated;

create function public.write_off_receivable(p_id text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.receivables%rowtype; n numeric;
begin
 if u is null then raise exception 'Authentication required'; end if;
 select * into r from public.receivables where user_id=u and id=p_id for update;
 if not found then raise exception 'Receivable not found'; end if;
 n:=r.amount-r.received-r.written_off;
 if n<=0 then return; end if;
 update public.receivables set written_off=written_off+n where user_id=u and id=p_id;
 insert into public.receivable_events(user_id,id,receivable_id,kind,amount) values(u,gen_random_uuid()::text,p_id,'write_off',n);
end $$;
revoke all on function public.write_off_receivable(text) from public,anon;
grant execute on function public.write_off_receivable(text) to authenticated;

alter function public.record_finance_action(jsonb) rename to record_finance_action_original;
create function public.record_finance_action(p_action jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_action->>'type'='receivable_payment' then return public.record_receivable_payment(p_action->>'receivableId',p_action); end if;
 return public.record_finance_action_original(p_action);
end $$;
revoke all on function public.record_finance_action(jsonb) from public,anon;
grant execute on function public.record_finance_action(jsonb) to authenticated;

alter function public.delete_finance_transaction(text) rename to delete_finance_transaction_original;
create function public.delete_finance_transaction(p_id text) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t public.transactions%rowtype;
begin
 if u is null then raise exception 'Authentication required'; end if;
 select * into t from public.transactions where user_id=u and id=p_id for update;
 if not found then raise exception 'Transaction not found'; end if;
 if t.type<>'receivable_payment' then perform public.delete_finance_transaction_original(p_id); return; end if;
 update public.accounts set balance=balance-t.amount,updated_at=now() where user_id=u and id=t.account_id;
 update public.receivables set received=received-t.amount,written_off=written_off+t.recovered_amount where user_id=u and id=t.receivable_id;
 insert into public.receivable_events(user_id,id,receivable_id,kind,amount) values(u,gen_random_uuid()::text,t.receivable_id,'repayment_reversed',t.amount);
 delete from public.transactions where user_id=u and id=p_id;
end $$;
revoke all on function public.delete_finance_transaction(text) from public,anon;
grant execute on function public.delete_finance_transaction(text) to authenticated;

create table public.push_subscriptions (
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text primary key check(endpoint ~ '^https://'),
 p256dh text not null, auth text not null,
 timezone text not null default 'Asia/Karachi', reminder_time time not null default '21:00',
 enabled boolean not null default true, last_sent_date date,
 created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public,anon,authenticated;
create policy own_push_subscriptions on public.push_subscriptions to authenticated using ((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,delete on public.push_subscriptions to authenticated;
grant insert(user_id,endpoint,p256dh,auth,timezone,reminder_time,enabled),update(p256dh,auth,timezone,reminder_time,enabled) on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
create index push_subscriptions_owner on public.push_subscriptions(user_id);
-- Only the server can claim a day's delivery. Validates IANA zones via pg_timezone_names.
create function public.claim_daily_reminders() returns setof public.push_subscriptions
language sql security definer set search_path='' as $$
 update public.push_subscriptions s set last_sent_date=(now() at time zone s.timezone)::date
 where s.enabled and exists(select 1 from pg_timezone_names z where z.name=s.timezone)
 and (s.last_sent_date is null or s.last_sent_date<(now() at time zone s.timezone)::date)
 and (now() at time zone s.timezone)::time>=s.reminder_time
 and (now() at time zone s.timezone)::time<s.reminder_time+interval '30 minutes'
 returning s.*;
$$;
revoke all on function public.claim_daily_reminders() from public,anon,authenticated;
grant execute on function public.claim_daily_reminders() to service_role;

-- Private VAPID material never enters the client bundle or SQL output.
create function public.reminder_server_config() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('publicKey',(select decrypted_secret from vault.decrypted_secrets where name='reminder_vapid_public'), 'privateKey',(select decrypted_secret from vault.decrypted_secrets where name='reminder_vapid_private'), 'cronSecret',(select decrypted_secret from vault.decrypted_secrets where name='reminder_cron_secret'));
$$;
revoke all on function public.reminder_server_config() from public,anon,authenticated;
grant execute on function public.reminder_server_config() to service_role;
create function public.initialize_reminder_keys(p_public text,p_private text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(917030);
 if not exists(select 1 from vault.secrets where name='reminder_vapid_public') then
  perform vault.create_secret(p_public,'reminder_vapid_public');
  perform vault.create_secret(p_private,'reminder_vapid_private');
 end if;
 return public.reminder_server_config();
end $$;
revoke all on function public.initialize_reminder_keys(text,text) from public,anon,authenticated;
grant execute on function public.initialize_reminder_keys(text,text) to service_role;
-- Receivable payments must go through the atomic RPC, never direct client writes.
create policy receivable_rpc_insert on public.transactions as restrictive for insert to authenticated with check(type <> 'receivable_payment');
create policy receivable_rpc_update on public.transactions as restrictive for update to authenticated using(type <> 'receivable_payment') with check(type <> 'receivable_payment');
create policy receivable_rpc_delete on public.transactions as restrictive for delete to authenticated using(type <> 'receivable_payment');

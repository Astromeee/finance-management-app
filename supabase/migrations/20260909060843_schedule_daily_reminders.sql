-- Validate time zones before conversion; catch up once later the same day after outages.
create or replace function public.claim_daily_reminders() returns setof public.push_subscriptions
language sql security definer set search_path='' as $$
 with due as materialized (
  select s.endpoint, case when exists(select 1 from pg_timezone_names z where z.name=s.timezone)
    then now() at time zone s.timezone else null end as local_now
  from public.push_subscriptions s where s.enabled
 )
 update public.push_subscriptions s set last_sent_date=due.local_now::date
 from due where s.endpoint=due.endpoint
 and (s.last_sent_date is null or s.last_sent_date<due.local_now::date)
 and due.local_now::time>=s.reminder_time returning s.*;
$$;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='reminder_cron_secret') then
  perform vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'reminder_cron_secret');
 end if;
end $$;
select cron.schedule('pocket-ledger-daily-reminders','*/5 * * * *', $job$
 select net.http_post(
  url := 'https://ioojdmerropjhoaazrez.supabase.co/functions/v1/daily-reminders',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
   (select decrypted_secret from vault.decrypted_secrets where name='reminder_cron_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 10000
 );
$job$);

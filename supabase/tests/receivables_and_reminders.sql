-- Run in a disposable database with the app schema and migration installed.
-- All fixture changes are rolled back.
begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000091'),('00000000-0000-0000-0000-000000000092');
insert into public.accounts(user_id,id,name,balance) values('00000000-0000-0000-0000-000000000091','rec-test-wallet','Test wallet',1000);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
insert into public.receivables(user_id,id,person,amount) values(auth.uid(),'rec-test','Test person',10000);
select public.record_receivable_payment('rec-test','{"id":"rec-payment","amount":2000,"accountId":"rec-test-wallet"}');
select public.record_receivable_payment('rec-test','{"id":"rec-payment","amount":2000,"accountId":"rec-test-wallet"}');
do $$ begin
 if (select balance from public.accounts where id='rec-test-wallet')<>3000 then raise exception 'Idempotency failed'; end if;
 if (select received from public.receivables where id='rec-test')<>2000 then raise exception 'Partial repayment failed'; end if;
 begin perform public.record_receivable_payment('rec-test','{"amount":9000,"accountId":"rec-test-wallet"}'); raise exception 'Overpayment allowed'; exception when raise_exception then if SQLERRM='Overpayment allowed' then raise; end if; end;
 begin update public.receivables set received=9000 where id='rec-test'; raise exception 'Direct balance edit allowed'; exception when insufficient_privilege then null; end;
end $$;
select public.write_off_receivable('rec-test');
do $$ begin
 if (select written_off from public.receivables where id='rec-test')<>8000 then raise exception 'Writeoff failed'; end if;
 if (select balance from public.accounts where id='rec-test-wallet')<>3000 then raise exception 'Writeoff changed cash'; end if;
end $$;
select public.record_receivable_payment('rec-test','{"id":"rec-recovery","amount":1000,"accountId":"rec-test-wallet"}');
select public.delete_finance_transaction('rec-recovery');
do $$ begin
 if (select written_off from public.receivables where id='rec-test')<>8000 then raise exception 'Recovery reversal failed'; end if;
end $$;
select public.record_finance_action('{"id":"rec-recovery","type":"receivable_payment","receivableId":"rec-test","amount":1000,"accountId":"rec-test-wallet"}');
select public.record_finance_action('{"id":"ordinary-expense","type":"expense","amount":500,"accountId":"rec-test-wallet"}');
select public.delete_finance_transaction('ordinary-expense');
do $$ begin
 if (select balance from public.accounts where id='rec-test-wallet')<>4000 then raise exception 'Existing expense reversal regressed'; end if;
 if (select written_off from public.receivables where id='rec-test')<>7000 then raise exception 'Recovery restore failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000092',true);
do $$ begin
 if exists(select 1 from public.receivables where id='rec-test') then raise exception 'Cross-user read'; end if;
 begin perform public.write_off_receivable('rec-test'); raise exception 'Cross-user write'; exception when raise_exception then if SQLERRM='Cross-user write' then raise; end if; end;
 begin perform public.record_receivable_payment('rec-test','{"amount":1,"accountId":"rec-test-wallet"}'); raise exception 'Cross-user repayment'; exception when raise_exception then if SQLERRM='Cross-user repayment' then raise; end if; end;
 begin perform public.reminder_server_config(); raise exception 'Secret readable'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,timezone,reminder_time) values('00000000-0000-0000-0000-000000000091','https://fcm.googleapis.com/test','test','test','UTC',(now() at time zone 'UTC')::time);
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,timezone,reminder_time) values('00000000-0000-0000-0000-000000000091','https://fcm.googleapis.com/invalid-zone','test','test','Invalid/Zone','00:00');
do $$ declare n integer; begin
 select count(*) into n from public.claim_daily_reminders(); if n<>1 then raise exception 'First delivery not claimed'; end if;
 select count(*) into n from public.claim_daily_reminders(); if n<>0 then raise exception 'Duplicate daily delivery'; end if;
end $$;
rollback;

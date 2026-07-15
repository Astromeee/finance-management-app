begin;

set local role authenticated;
set local request.jwt.claims = '{"sub":"23db8284-62ab-4544-9db6-b5802cd96642","role":"authenticated"}';

insert into public.accounts (user_id, id, name, type, opening_balance, balance, color)
values
  (auth.uid(), 'atomic-test-a', 'Atomic A', 'cash', 0, 0, '#000000'),
  (auth.uid(), 'atomic-test-b', 'Atomic B', 'cash', 0, 0, '#000000');

select public.record_finance_action('{"id":"atomic-income","title":"Test","type":"income","amount":100,"accountId":"atomic-test-a","account":"Atomic A","date":"2026-07-14"}');
select public.update_finance_transaction('atomic-income', '{"id":"atomic-income","title":"Test","type":"income","amount":110,"accountId":"atomic-test-a","account":"Atomic A","date":"2026-07-14"}');
select public.delete_finance_transaction('atomic-income');
select public.record_finance_action('{"id":"atomic-income","title":"Test","type":"income","amount":100,"accountId":"atomic-test-a","account":"Atomic A","date":"2026-07-14"}');

do $$ begin
  if (select balance from public.accounts where id = 'atomic-test-a') <> 100 then
    raise exception 'Income action did not update balance';
  end if;

  begin
    perform public.record_finance_action('{"id":"atomic-failed-transfer","title":"Test","type":"transfer","amount":101,"fromAccountId":"atomic-test-a","toAccountId":"atomic-test-b","date":"2026-07-14"}');
    raise exception 'Insufficient transfer unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'Insufficient transfer unexpectedly succeeded' then raise; end if;
  end;

  if (select balance from public.accounts where id = 'atomic-test-a') <> 100
    or exists (select 1 from public.transactions where id = 'atomic-failed-transfer') then
    raise exception 'Failed transfer did not roll back';
  end if;
end $$;

select public.record_finance_action('{"id":"atomic-transfer","title":"Transfer","type":"transfer","amount":40,"fromAccountId":"atomic-test-a","toAccountId":"atomic-test-b","date":"2026-07-14"}');

insert into public.goals (user_id, id, name, target, saved, status)
values (auth.uid(), 'atomic-goal', 'Atomic goal', 50, 0, 'Active');
select public.record_finance_action('{"id":"atomic-goal-saving","title":"Save","type":"goal_saving","amount":20,"accountId":"atomic-test-b","goalId":"atomic-goal","date":"2026-07-14"}');

insert into public.debts (user_id, id, name, title, total, paid, status, category)
values (auth.uid(), 'atomic-debt', 'Atomic debt', 'Atomic debt', 50, 0, 'Active', 'Debt');
select public.record_finance_action('{"id":"atomic-debt-payment","title":"Pay","type":"debt_payment","amount":10,"accountId":"atomic-test-a","debtId":"atomic-debt","date":"2026-07-14"}');

insert into public.upcoming_expenses (user_id, id, title, amount, category, due_date, status)
values (auth.uid(), 'atomic-upcoming', 'Atomic bill', 5, 'Utilities', '2026-07-14', 'upcoming');
select public.mark_upcoming_expense_paid(
  'atomic-upcoming',
  '{"id":"atomic-upcoming-payment","title":"Atomic bill","amount":5,"accountId":"atomic-test-a","date":"2026-07-14"}',
  null
);

select public.adjust_account_balance(
  '{"id":"atomic-test-a","name":"Atomic A","type":"cash","balance":123,"color":"#000000","activity":"Test","cardLabel":"TEST"}',
  '{"id":"atomic-adjustment","date":"2026-07-14","notes":"Atomic test"}'
);

do $$ begin
  if (select balance from public.accounts where id = 'atomic-test-a') <> 123 then raise exception 'Adjustment failed'; end if;
  if (select balance from public.accounts where id = 'atomic-test-b') <> 20 then raise exception 'Transfer or goal saving failed'; end if;
  if (select saved from public.goals where id = 'atomic-goal') <> 20 then raise exception 'Goal saving failed'; end if;
  if (select paid from public.debts where id = 'atomic-debt') <> 10 then raise exception 'Debt payment failed'; end if;
  if (select status from public.upcoming_expenses where id = 'atomic-upcoming') <> 'paid' then raise exception 'Upcoming payment failed'; end if;
end $$;

rollback;

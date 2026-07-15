begin;

set local role authenticated;
set local request.jwt.claims = '{"sub":"23db8284-62ab-4544-9db6-b5802cd96642","role":"authenticated"}';

insert into public.money_quests (user_id, id, quest_type, title, target_count, starts_on, ends_on)
values (auth.uid(), 'quest-rls-test', 'tracking_days', 'Track three days', 3, '2026-07-13', '2026-07-19');

insert into public.wishlist_items (user_id, id, name, amount, reconsider_at)
values (auth.uid(), 'wishlist-rls-test', 'Headphones', 4500, now() + interval '3 days');

insert into public.money_wins (user_id, id, win_type, title)
values (auth.uid(), 'win-rls-test', 'tracking_consistency', 'Three days tracked');

do $$
declare
  other_user uuid := '4b3e5f99-6634-4063-9a41-3ad41395a2e4';
  affected integer;
begin
  if exists (select 1 from public.money_quests where user_id = other_user) then
    raise exception 'RLS failure: another user quest is visible';
  end if;

  update public.wishlist_items set name = name where user_id = other_user;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS failure: another user wishlist item was updated'; end if;

  begin
    insert into public.money_wins (user_id, id, win_type, title)
    values (other_user, 'cross-user-win', 'tracking_consistency', 'Cross user');
    raise exception 'RLS failure: cross-user win insert succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

rollback;

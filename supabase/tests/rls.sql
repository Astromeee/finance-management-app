begin;

set local role authenticated;
set local request.jwt.claims = '{"sub":"23db8284-62ab-4544-9db6-b5802cd96642","role":"authenticated"}';

do $$
declare
  other_user uuid := '4b3e5f99-6634-4063-9a41-3ad41395a2e4';
  affected integer;
begin
  if exists (select 1 from public.accounts where user_id = other_user) then
    raise exception 'RLS failure: user can select another user account';
  end if;

  begin
    insert into public.categories (user_id, id, name, kind, color, sort_order)
    values (other_user, 'rls-cross-user-test', 'RLS test', 'expense', '#000000', 999);
    raise exception 'RLS failure: cross-user insert succeeded';
  exception when insufficient_privilege then
    null;
  end;

  update public.accounts set name = name where user_id = other_user;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS failure: cross-user update succeeded'; end if;

  delete from public.accounts where user_id = other_user;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS failure: cross-user delete succeeded'; end if;
end $$;

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  if exists (select 1 from public.accounts) then
    raise exception 'RLS failure: anonymous user can select accounts';
  end if;
end $$;

rollback;

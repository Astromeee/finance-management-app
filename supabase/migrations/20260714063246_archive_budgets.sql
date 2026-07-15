alter table public.budgets
  add column if not exists archived boolean not null default false;

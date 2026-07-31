alter table public.categories
  add column if not exists icon_name text;

alter table public.categories
  drop constraint if exists categories_icon_name_check;

alter table public.categories
  add constraint categories_icon_name_check check (
    icon_name is null or icon_name in (
      'home', 'dining', 'groceries', 'coffee', 'car', 'transport', 'fuel',
      'shopping', 'clothing', 'health', 'medicine', 'education', 'bills',
      'phone', 'internet', 'entertainment', 'tickets', 'work', 'gift',
      'wallet', 'bank', 'fitness', 'travel', 'grooming'
    )
  );

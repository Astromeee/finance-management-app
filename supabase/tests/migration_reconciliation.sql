-- Returns rows only when the relational cutover differs from the immutable backup.
with legacy as (
  select fs.user_id, left(t->>'date', 7) as period_key, t->>'type' as tx_type,
    count(*) as tx_count, sum((t->>'amount')::numeric) as total_amount
  from private.finance_states_backup_20260714 fs
  cross join lateral jsonb_array_elements(coalesce(fs.data->'transactions', '[]'::jsonb)) t
  group by fs.user_id, left(t->>'date', 7), t->>'type'
), relational as (
  select user_id, to_char(transaction_date, 'YYYY-MM') as period_key, type as tx_type,
    count(*) as tx_count, sum(amount) as total_amount
  from public.transactions
  group by user_id, to_char(transaction_date, 'YYYY-MM'), type
)
select coalesce(l.user_id, r.user_id) user_id, coalesce(l.period_key, r.period_key) period_key,
  coalesce(l.tx_type, r.tx_type) tx_type, l.tx_count legacy_count,
  r.tx_count relational_count, l.total_amount legacy_amount, r.total_amount relational_amount
from legacy l full join relational r using (user_id, period_key, tx_type)
where l.tx_count is distinct from r.tx_count or l.total_amount is distinct from r.total_amount;

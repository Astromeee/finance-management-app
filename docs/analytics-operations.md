# Pocket Ledger analytics operations

Pocket Ledger uses two complementary sources:

- **Supabase** is the exact first-party source for registered users and aggregate signed-in activity.
- **Google Analytics 4 (GA4)** provides privacy-minimized engagement, retention, feature-event, and cross-session reports for newly onboarded accounts.

No financial values, titles, notes, categories, email addresses, or other free-form content are sent to either activity system.

## One-time production setup

### 1. Apply the Supabase migration

Deploy `supabase/migrations/20260803132443_user_activity_metrics.sql` to the production Supabase project. It creates the RLS-protected `user_activity_daily` table and `record_app_activity` RPC.

After deployment, verify that a signed-in app visit creates one row in **Supabase Dashboard → Table Editor → user_activity_daily**.

### 2. Connect GA4

1. In [Google Analytics](https://analytics.google.com/), create or open a GA4 property.
2. Go to **Admin → Data collection and modification → Data streams → Web**.
3. Create the Pocket Ledger web stream and copy its Measurement ID (`G-XXXXXXXXXX`).
4. Add `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to the production hosting environment.
5. Redeploy the web app. Vite embeds this value at build time, so changing the environment without rebuilding is not enough.
6. Complete onboarding, enter Pocket Ledger, and browse a few pages. The final onboarding screen discloses analytics before it starts.
7. Confirm the visit in **GA4 → Reports → Realtime**. Standard reports can take 24–48 hours to settle.

Do not register `user_id` as a custom dimension. Pocket Ledger sends it through GA4's reserved authenticated User-ID setting.

## Exact metrics in Supabase

Open **Supabase Dashboard → SQL Editor → New query**, paste the query below, and click **Run**. Save it as `Pocket Ledger — usage summary` for reuse.

```sql
with activity as (
  select * from public.user_activity_daily
), totals as (
  select
    count(distinct user_id) filter (
      where activity_date = (now() at time zone 'UTC')::date
    ) as dau,
    count(distinct user_id) filter (
      where activity_date >= (now() at time zone 'UTC')::date - 6
    ) as wau,
    count(distinct user_id) filter (
      where activity_date >= (now() at time zone 'UTC')::date - 29
    ) as mau,
    coalesce(sum(session_count) filter (
      where activity_date >= (now() at time zone 'UTC')::date - 29
    ), 0) as sessions_30d,
    coalesce(sum(page_view_count) filter (
      where activity_date >= (now() at time zone 'UTC')::date - 29
    ), 0) as page_views_30d,
    coalesce(sum(meaningful_action_count) filter (
      where activity_date >= (now() at time zone 'UTC')::date - 29
    ), 0) as meaningful_actions_30d
  from activity
)
select
  (select count(*) from auth.users) as registered_users,
  (select count(*) from auth.users where last_sign_in_at is not null) as users_ever_signed_in,
  dau,
  wau,
  mau,
  round(100.0 * dau / nullif(mau, 0), 1) as dau_mau_percent,
  round(100.0 * wau / nullif(mau, 0), 1) as wau_mau_percent,
  sessions_30d,
  round(sessions_30d::numeric / nullif(mau, 0), 2) as sessions_per_monthly_user,
  page_views_30d,
  meaningful_actions_30d
from totals;
```

Definitions:

- **Registered users:** current Auth accounts.
- **Users ever signed in:** accounts with a Supabase `last_sign_in_at` value.
- **DAU / WAU / MAU:** unique signed-in users active in the last 1, 7, or 30 UTC days.
- **DAU/MAU and WAU/MAU:** stickiness; a higher percentage means users return more frequently.
- **Sessions per monthly user:** average app opens per MAU in the last 30 days.
- **Meaningful actions:** successful saves such as recording money, saving an account, budget, goal, debt, bill, category, wish, or quest.

### Daily trend

Save this second SQL Editor query as `Pocket Ledger — daily activity`:

```sql
select
  activity_date,
  count(distinct user_id) as active_users,
  sum(session_count) as sessions,
  sum(page_view_count) as page_views,
  sum(meaningful_action_count) as meaningful_actions
from public.user_activity_daily
where activity_date >= (now() at time zone 'UTC')::date - 29
group by activity_date
order by activity_date desc;
```

### Per-user frequency without exposing financial data

```sql
select
  u.id as user_id,
  u.created_at as signed_up_at,
  u.last_sign_in_at,
  count(a.activity_date) filter (
    where a.activity_date >= (now() at time zone 'UTC')::date - 29
  ) as active_days_30d,
  coalesce(sum(a.session_count) filter (
    where a.activity_date >= (now() at time zone 'UTC')::date - 29
  ), 0) as sessions_30d,
  coalesce(sum(a.meaningful_action_count) filter (
    where a.activity_date >= (now() at time zone 'UTC')::date - 29
  ), 0) as meaningful_actions_30d
from auth.users u
left join public.user_activity_daily a on a.user_id = u.id
group by u.id, u.created_at, u.last_sign_in_at
order by active_days_30d desc, sessions_30d desc;
```

## Where to check GA4

- **Reports → Realtime:** confirm tracking and see users active now.
- **Reports → Engagement → Events:** inspect `login`, `sign_up`, `page_view`, `finance_action_recorded`, and saved-feature events.
- **Reports → Engagement → Pages and screens:** see which app surfaces users visit.
- **Reports → Retention:** review returning users and Day 1, Day 7, and Day 30 retention.
- **Reports → User attributes:** devices and broad geography for consented users.
- **Explore → Free form:** combine Active users, Sessions, Engaged sessions, Engagement time, and Event count.

Useful GA4 comparisons include **Signed in with user ID = Yes** and event-name filters. Newly onboarded users are enabled automatically after the disclosure. Supabase remains the exact operational count for every account, including people who do not finish onboarding and regions where Google consent requirements limit collection.

## Events currently collected by GA4

Authentication: `login`, `sign_up`.

Core use: `page_view`, `finance_action_recorded`, `account_saved`, `budget_saved`, `goal_saved`, `debt_saved`, `upcoming_expense_saved`, `category_saved`, `wishlist_saved`, `quest_saved`.

Product discovery and retention: onboarding, simulator, journey, quest, wishlist, insight, and story events already defined in `src/lib/analytics.ts`.

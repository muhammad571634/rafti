-- B9: the cost log at scale (docs/scale-plan.md).
--
-- 1. `model_spend_today()`: what the model cost since the UTC day began, at list price. The API
--    reads it each minute for the day's budget (`MODEL_BUDGET_USD_PER_DAY`, server/src/llm/gate.ts),
--    so the cap holds across restarts and across machines.
-- 2. `usage_daily`: one row per account, UTC day, kind, mode and model, filled each night from
--    `usage_events`. At 10,000 installs the raw log grows by about 100,000 rows a day; the roll-up
--    is what reports read once the raw rows are kept for a shorter time. Nothing is deleted here:
--    `purge_expired` still keeps raw usage for 13 months (docs/legal/privacy-policy.md).
--
-- Server only, like `usage_events`: no policy, so only the service role reads or writes.

-- Append-only and read by time: a block-range index stays a few kilobytes at any size.
create index usage_events_created_idx on public.usage_events using brin (created_at);

create function public.model_spend_today() returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0)
  from public.usage_events
  where kind = 'llm'
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

revoke execute on function public.model_spend_today() from public, anon, authenticated;
grant execute on function public.model_spend_today() to service_role;

create table public.usage_daily (
  day date not null,
  -- As in usage_events: the cost stays when the account goes.
  user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  mode text not null default '',
  model text not null default '',
  calls int not null,
  input_tokens bigint not null default 0,
  cached_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  seconds numeric not null default 0,
  cost_usd numeric(14, 6) not null default 0
);

create index usage_daily_day_idx on public.usage_daily (day);
create index usage_daily_user_idx on public.usage_daily (user_id, day);

alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from anon, authenticated;

-- Every whole UTC day not rolled up yet, oldest first: the first run takes the log from its start,
-- a missed night only means the next run takes two days. A day is written once (it starts after
-- the newest day already there), so a second run the same night adds nothing.
create function public.roll_usage_daily() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_day date;
  last_day date := (now() at time zone 'utc')::date - 1;
begin
  select coalesce(max(day) + 1, (select min(created_at at time zone 'utc')::date from public.usage_events))
    into first_day
    from public.usage_daily;
  if first_day is null or first_day > last_day then
    return;
  end if;

  insert into public.usage_daily (day, user_id, kind, mode, model, calls, input_tokens, cached_tokens, output_tokens, seconds, cost_usd)
  select
    (created_at at time zone 'utc')::date,
    user_id,
    kind,
    coalesce(mode, ''),
    coalesce(model, ''),
    count(*),
    coalesce(sum(input_tokens), 0),
    coalesce(sum(cached_tokens), 0),
    coalesce(sum(output_tokens), 0),
    coalesce(sum(seconds), 0),
    coalesce(sum(cost_usd), 0)
  from public.usage_events
  where created_at >= first_day::timestamp at time zone 'utc'
    and created_at < (last_day + 1)::timestamp at time zone 'utc'
  group by 1, 2, 3, 4, 5;
end;
$$;

revoke all on function public.roll_usage_daily() from public, anon, authenticated;

select cron.schedule('roll-usage-daily', '25 0 * * *', 'select public.roll_usage_daily()');

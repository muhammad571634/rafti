-- B16: Persistent daily rate-limit quotas & privacy-promised retention purges.
--
-- 1. `daily_quotas`: one row per UTC day, scope (user id or 'all') and bucket ('user_day',
--    'side_day', 'first_text', 'report', 'community_report', 'publish', 'events', 'voice_user',
--    'voice_all'). Replaces per-process memory maps for daily caps so Fly deploys and multiple
--    machines share one authoritative count and voice/model bills stay protected.
-- 2. `consume_daily_quota(p_scope, p_bucket, p_amount, p_limit)`: atomic single-statement check
--    and increment. Never increments past `p_limit`; returns `true` when admitted, `false` when
--    over limit.
-- 3. `purge_expired()`: keeps the existing 12-month report & 13-month usage_events purges (B4),
--    and adds 13-month `app_events` purge (promised in docs/legal/privacy-policy.md) plus 7-day
--    `daily_quotas` cleanup so rolling quota counters stay tiny forever.

create table public.daily_quotas (
  day date not null,
  scope text not null,
  bucket text not null,
  used int not null default 0 check (used >= 0),
  primary key (day, scope, bucket)
);

create index daily_quotas_day_idx on public.daily_quotas (day);

alter table public.daily_quotas enable row level security;
revoke all on public.daily_quotas from anon, authenticated;

create function public.consume_daily_quota(
  p_scope text,
  p_bucket text,
  p_amount int,
  p_limit int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  new_used int;
begin
  if p_limit <= 0 or p_amount <= 0 or p_amount > p_limit then
    return false;
  end if;

  insert into public.daily_quotas (day, scope, bucket, used)
  values (today, p_scope, p_bucket, p_amount)
  on conflict (day, scope, bucket) do update
    set used = public.daily_quotas.used + p_amount
    where public.daily_quotas.used + p_amount <= p_limit
  returning used into new_used;

  return new_used is not null;
end;
$$;

revoke execute on function public.consume_daily_quota(text, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_daily_quota(text, text, int, int) to service_role;

create or replace function public.purge_expired() returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.reports where created_at < now() - interval '12 months';
  delete from public.usage_events where created_at < now() - interval '13 months';
  delete from public.app_events where created_at < now() - interval '13 months';
  delete from public.daily_quotas where day < (now() at time zone 'utc')::date - 7;
$$;

revoke all on function public.purge_expired() from public, anon, authenticated;

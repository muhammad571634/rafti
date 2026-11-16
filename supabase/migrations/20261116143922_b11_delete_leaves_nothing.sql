-- B11: deleting an account leaves nothing of it on the server (owner, 2026-11-16).
--
-- Every user table already followed `auth.users` with `on delete cascade` except the cost log:
-- `usage_events` and `usage_daily` kept the rows with `user_id` set to null. They now go with the
-- account too.
--
-- One number must survive: what the model cost today, which the API reads each minute for the day's
-- budget (`model_spend_today()`, server/src/llm/gate.ts). Without it an account deleted mid-day would
-- lower today's spend and reopen the cap. So a removed row of today adds its cost to `spend_removed`:
-- a date and an amount, nothing about who. Older rows (the 13-month purge) are not counted.

alter table public.usage_events
  drop constraint usage_events_user_id_fkey,
  add constraint usage_events_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.usage_daily
  drop constraint usage_daily_user_id_fkey,
  add constraint usage_daily_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

create table public.spend_removed (
  day date primary key,
  cost_usd numeric(14, 6) not null default 0
);

alter table public.spend_removed enable row level security;
revoke all on public.spend_removed from anon, authenticated;

create function public.keep_spend_of_removed() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind = 'llm'
    and coalesce(old.cost_usd, 0) > 0
    and old.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc' then
    insert into public.spend_removed (day, cost_usd)
    values ((now() at time zone 'utc')::date, old.cost_usd)
    on conflict (day) do update set cost_usd = public.spend_removed.cost_usd + excluded.cost_usd;
  end if;
  return old;
end;
$$;

revoke execute on function public.keep_spend_of_removed() from public, anon, authenticated;

create trigger usage_events_keep_spend
  before delete on public.usage_events
  for each row execute function public.keep_spend_of_removed();

create or replace function public.model_spend_today() returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0)
    + coalesce((select r.cost_usd from public.spend_removed r where r.day = (now() at time zone 'utc')::date), 0)
  from public.usage_events
  where kind = 'llm'
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

revoke execute on function public.model_spend_today() from public, anon, authenticated;
grant execute on function public.model_spend_today() to service_role;

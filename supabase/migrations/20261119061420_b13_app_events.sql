-- B13: product analytics, first-party (0z282, docs/polybuzz-core.md §5.1, src/lib/analytics-events.ts).
--
-- `app_events`: what people do in the app (a launch, a screen, a message sent, the plan picker
-- opened), sent by the phone in batches through `POST /v1/events`. Never message words: an event is
-- a name and a few short props (ids, counts, flags). Server only, like `usage_events`: no policy,
-- so only the service role reads or writes. It goes with the account (`on delete cascade`, B11) and
-- after 13 months (`purge_expired`), as the privacy policy says.
--
-- The `analytics` schema holds the views the numbers are read from. PostgREST does not serve it, and
-- the grants keep it to the service role (Supabase's SQL editor, the MCP's read-only SQL).

create table public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The phone's id of the event: a batch sent twice is kept once.
  client_id text not null,
  name text not null check (name ~ '^[a-z][a-z0-9_]{1,39}$'),
  props jsonb not null default '{}',
  session_id text not null,
  -- When it happened on the phone (pulled into range by the server); `created_at` is when it arrived.
  at timestamptz not null,
  app_version text not null,
  channel text not null check (channel in ('dev', 'preview', 'production', 'unknown')),
  platform text not null,
  locale text not null,
  bucket smallint not null check (bucket between 0 and 99),
  created_at timestamptz not null default now(),
  -- Starts with user_id, so it covers the foreign key and per-user reads too.
  unique (user_id, client_id)
);

-- Append-only and read by time: a block-range index stays small at any size.
create index app_events_at_idx on public.app_events using brin (at);
create index app_events_name_at_idx on public.app_events (name, at);

alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;

create or replace function public.purge_expired() returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.reports where created_at < now() - interval '12 months';
  delete from public.usage_events where created_at < now() - interval '13 months';
  delete from public.app_events where at < now() - interval '13 months';
$$;

revoke all on function public.purge_expired() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- The numbers. Every view has a `channel` column: real users are `production`; `preview` is the
-- owner's and testers' APK, `dev` is Expo Go.

create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to service_role;

-- Each account's first day (UTC) and channel: the cohort it belongs to.
create view analytics.first_seen with (security_invoker = true) as
  select user_id, min(at)::date as day, (array_agg(channel order by at))[1] as channel
  from public.app_events
  group by user_id;

-- Active accounts, sessions and events per day.
create view analytics.daily with (security_invoker = true) as
  select at::date as day, channel,
    count(distinct user_id) as active_users,
    count(distinct session_id) as sessions,
    count(*) filter (where name = 'message_sent') as messages,
    count(distinct user_id) filter (where name = 'message_sent') as senders
  from public.app_events
  group by 1, 2;

-- Of the accounts that started on a day, how many came back 1, 7 and 30 days later (any event).
create view analytics.retention with (security_invoker = true) as
  with days as (
    select distinct user_id, at::date as day from public.app_events
  )
  select f.day as cohort, f.channel,
    count(*) as users,
    count(*) filter (where exists (select 1 from days d where d.user_id = f.user_id and d.day = f.day + 1)) as d1,
    count(*) filter (where exists (select 1 from days d where d.user_id = f.user_id and d.day = f.day + 7)) as d7,
    count(*) filter (where exists (select 1 from days d where d.user_id = f.user_id and d.day = f.day + 30)) as d30
  from analytics.first_seen f
  group by 1, 2;

-- The first day of each cohort: who got through onboarding, sent a first message, a fifth, a twentieth.
create view analytics.first_day with (security_invoker = true) as
  with sent as (
    select e.user_id, count(*) filter (where e.name = 'message_sent') as messages,
      bool_or(e.name = 'onboarding_done') as onboarded,
      bool_or(e.name = 'paywall_view') as saw_paywall
    from public.app_events e
    join analytics.first_seen f on f.user_id = e.user_id and e.at::date = f.day
    group by e.user_id
  )
  select f.day as cohort, f.channel,
    count(*) as users,
    count(*) filter (where s.onboarded) as onboarded,
    count(*) filter (where s.messages >= 1) as sent_1,
    count(*) filter (where s.messages >= 5) as sent_5,
    count(*) filter (where s.messages >= 20) as sent_20,
    count(*) filter (where s.saw_paywall) as saw_paywall
  from analytics.first_seen f
  left join sent s on s.user_id = f.user_id
  group by 1, 2;

-- Onboarding, step by step: how many accounts reached each step (last 30 days).
create view analytics.onboarding with (security_invoker = true) as
  select channel, props ->> 'step' as step, count(distinct user_id) as users
  from public.app_events
  where name = 'onboarding_step' and at > now() - interval '30 days'
  group by 1, 2;

-- Running out of shells and starting a plan, per day: the shells sheet by why and where it
-- opened, and plans started by plan (`source` = the plan's id there).
create view analytics.paywall with (security_invoker = true) as
  select at::date as day, channel, name,
    coalesce(props ->> 'source', props ->> 'plan', '') as source,
    coalesce(props ->> 'where', '') as screen,
    count(*) as times,
    count(distinct user_id) as users
  from public.app_events
  where name in ('paywall_view', 'plan_start')
  group by 1, 2, 3, 4, 5;

-- Which screens people use (last 30 days).
create view analytics.screens with (security_invoker = true) as
  select channel, props ->> 'name' as screen, count(*) as views, count(distinct user_id) as users
  from public.app_events
  where name = 'screen' and at > now() - interval '30 days'
  group by 1, 2;

-- An experiment's arms side by side: who was in each, and how many came back the next day.
create view analytics.experiments with (security_invoker = true) as
  with exposed as (
    select distinct on (user_id, props ->> 'experiment') user_id, props ->> 'experiment' as experiment, props ->> 'arm' as arm, at::date as day, channel
    from public.app_events
    where name = 'exposure'
    order by user_id, props ->> 'experiment', at
  )
  select x.experiment, x.arm, x.channel,
    count(*) as users,
    count(*) filter (where exists (
      select 1 from public.app_events e where e.user_id = x.user_id and e.at::date = x.day + 1
    )) as back_next_day
  from exposed x
  group by 1, 2, 3;

revoke all on all tables in schema analytics from public, anon, authenticated;
grant select on all tables in schema analytics to service_role;

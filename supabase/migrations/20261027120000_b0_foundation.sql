-- B0 foundation (docs/backend-plan.md §4, §14.2, corrected by docs/backend-schema-gaps.md).
--
-- Rules for every table here:
--   * RLS is on. A signed-in user may read only their own rows; the official cast is readable by
--     everyone signed in.
--   * Nothing is written from the app directly: the server (service role) is the source of truth
--     for money, progress and plans (backend-plan §1.1). The client roles keep SELECT only.
--   * The shell ledger is append-only; a wallet's balance is a cache of its ledger.

-- ---------------------------------------------------------------------------------------------
-- Accounts

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  handle text check (char_length(handle) <= 30),
  locale text not null default 'en-US',
  -- IANA zone from bootstrap; the server computes the user's day from it (§14.3.6).
  time_zone text not null default 'UTC',
  time_zone_set_at timestamptz,
  -- Only the year is kept, for the 18+ gate.
  birth_year int check (birth_year between 1900 and 2100),
  age_confirmed_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Characters: the official cast (owner_id null, seeded from src/mock) and the users' creations.

create table public.characters (
  id text primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  handle text not null default '',
  bio text not null default '' check (char_length(bio) <= 400),
  category text not null check (category in ('school', 'fantasy', 'idol', 'daily', 'original')),
  gender text check (gender in ('male', 'female')),
  series text,
  accent_index int not null default 0,
  voice_ready boolean not null default false,
  greeting text not null default '',
  opening text,
  quirk text,
  tags text[] not null default '{}',
  -- Everything the prompt and the profile use (tagline, age, heightCm, look, backstory, likes,
  -- dislikes, definition, greetings, starters, speakingStyle, temper, role, voicePreset), in the
  -- client's camelCase so `Character` maps one to one. Versioned so cached prompts can follow it.
  persona jsonb not null default '{}'::jsonb,
  persona_version int not null default 1,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  review text check (review in ('pending', 'approved', 'rejected')),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  -- Every character is an adult (content policy); the creation form enforces 18+ too.
  constraint characters_adult check (persona ->> 'age' is null or (persona ->> 'age')::int >= 18)
);

create index characters_owner_idx on public.characters (owner_id);

-- ---------------------------------------------------------------------------------------------
-- The bond with each friend, the chats and their messages.

create table public.relationships (
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references public.characters (id) on delete cascade,
  intimacy int not null default 0 check (intimacy >= 0),
  level int not null default 1 check (level between 0 and 100),
  label text,
  streak_days int not null default 0 check (streak_days >= 0),
  last_chat_day date,
  anniversary date not null default current_date,
  background_id text not null default 'bg_room',
  nickname text check (char_length(nickname) <= 30),
  voice_replies boolean not null default false,
  messages_first boolean not null default true,
  -- Rolling summary of the chat (memory layer 2, B2).
  summary text,
  created_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id text not null references public.characters (id) on delete cascade,
  pinned boolean not null default false,
  muted boolean not null default false,
  last_message_at timestamptz,
  -- The chat's reply-language lock (`lockedReplyLanguage`, src/ai/reply-language.ts).
  reply_language text,
  ai_notice_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Kept on the row so RLS needs no join.
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null check (author in ('me', 'them')),
  kind text not null default 'text' check (kind in ('text', 'voice', 'image', 'system', 'call')),
  text text,
  transcript text,
  media_path text,
  duration_sec int,
  lang text,
  -- The app's own id: a resent message is stored once.
  client_id text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (conversation_id, client_id)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Money: wallet (cache), the append-only ledger, plans and minutes.

create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Cached balance; the ledger is the truth (sum of deltas).
  shells int not null default 0 check (shells >= 0),
  -- Today's free bucket: spent first, burnt at the user's midnight (schema-gaps §2).
  free_day date,
  free_amount int not null default 0 check (free_amount >= 0),
  trial_used boolean not null default false,
  bought_shells boolean not null default false,
  -- Start of the plan period whose monthly shells were already paid.
  plan_shells_period timestamptz,
  updated_at timestamptz not null default now()
);

create table public.shell_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in (
    'welcome', 'daily', 'expired', 'ad', 'spin', 'purchase', 'chat', 'voice', 'photo', 'note', 'board',
    'invite', 'share', 'date', 'photoBooth', 'voiceClone', 'portrait', 'stream', 'trial', 'membership',
    'call', 'topUp', 'plan', 'radio', 'quest', 'other'
  )),
  -- Free credits expire at the user's midnight; paid shells and the welcome gift never do.
  bucket text not null default 'paid' check (bucket in ('free', 'paid')),
  expires_at timestamptz,
  character_id text references public.characters (id) on delete set null,
  ref text,
  -- Every money request carries one: a retried request is booked once (backend-plan §5).
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index shell_ledger_user_idx on public.shell_ledger (user_id, created_at desc);

-- No row is ever changed, and none is removed while its user exists. Deleting the account
-- (App Store 5.1.1(v)) cascades here after the auth user is gone, and that is allowed.
create function public.ledger_is_append_only() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;
  raise exception 'shell_ledger is append-only';
end;
$$;

create trigger shell_ledger_append_only before update or delete on public.shell_ledger
  for each row execute function public.ledger_is_append_only();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (plan_id in ('basic', 'pro', 'proAnnual')),
  store text check (store in ('app_store', 'play_store', 'test')),
  -- The store's original transaction: a webhook delivered twice changes nothing.
  original_tx_id text unique,
  status text not null check (status in ('trial', 'active', 'grace', 'expired', 'refunded')),
  term_start timestamptz not null,
  term_end timestamptz not null,
  will_renew boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id, term_end desc);

-- One row per plan period (30 days, also on the yearly plan): what was used of its allowance.
create table public.quota_periods (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  plan_id text not null check (plan_id in ('basic', 'pro', 'proAnnual')),
  call_seconds_used int not null default 0 check (call_seconds_used >= 0),
  voice_seconds_used int not null default 0 check (voice_seconds_used >= 0),
  photos_used int not null default 0 check (photos_used >= 0),
  portraits_used int not null default 0 check (portraits_used >= 0),
  -- The trial draws one free character picture a day (owner, 2026-10-27).
  last_portrait_at timestamptz,
  primary key (user_id, period_start)
);

create table public.minute_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('call', 'voice')),
  seconds_total int not null check (seconds_total > 0),
  seconds_used int not null default 0 check (seconds_used >= 0),
  bought_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ledger_id uuid references public.shell_ledger (id) on delete set null,
  check (seconds_used <= seconds_total)
);

-- One row per user per local day (schema-gaps §4 merges daily_state and daily_usage).
create table public.daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  messages int not null default 0,
  ads int not null default 0,
  spins int not null default 0,
  checkin_amount int,
  quick_creates int not null default 0,
  greeted_slots text[] not null default '{}',
  called_slots text[] not null default '{}',
  primary key (user_id, day)
);

-- What every model / voice call cost (backend-plan §1.5). Server only, never shown to users.
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('llm', 'tts', 'stt', 'call', 'image')),
  mode text,
  model text,
  prompt_version text,
  input_tokens int,
  cached_tokens int,
  output_tokens int,
  seconds numeric,
  cost_usd numeric(12, 6),
  created_at timestamptz not null default now()
);

create index usage_events_user_idx on public.usage_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Row level security

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.relationships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.wallets enable row level security;
alter table public.shell_ledger enable row level security;
alter table public.subscriptions enable row level security;
alter table public.quota_periods enable row level security;
alter table public.minute_packs enable row level security;
alter table public.daily_usage enable row level security;
alter table public.usage_events enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "cast and own creations" on public.characters for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "own relationships" on public.relationships for select to authenticated using (user_id = (select auth.uid()));
create policy "own conversations" on public.conversations for select to authenticated using (user_id = (select auth.uid()));
create policy "own messages" on public.messages for select to authenticated using (user_id = (select auth.uid()));
create policy "own wallet" on public.wallets for select to authenticated using (user_id = (select auth.uid()));
create policy "own ledger" on public.shell_ledger for select to authenticated using (user_id = (select auth.uid()));
create policy "own subscriptions" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "own quota" on public.quota_periods for select to authenticated using (user_id = (select auth.uid()));
create policy "own packs" on public.minute_packs for select to authenticated using (user_id = (select auth.uid()));
create policy "own days" on public.daily_usage for select to authenticated using (user_id = (select auth.uid()));
-- usage_events: no policy, so only the service role sees it.

-- The app reads; only the server writes. RLS already blocks writes without a policy; the grants
-- make it explicit, so a policy added later cannot open a money table by accident.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
revoke select on public.usage_events from authenticated;
-- Tables added by later migrations start the same way: readable at most, never writable by the app.
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Money moves only through these functions, run by the server (service role).

-- Books one ledger row and moves the cached balance in the same transaction. A repeated
-- idempotency key returns the first booking and changes nothing.
create function public.book_shells(
  p_user uuid,
  p_delta int,
  p_reason text,
  p_idempotency_key text,
  p_bucket text default 'paid',
  p_expires_at timestamptz default null,
  p_character_id text default null,
  p_ref text default null
) returns public.shell_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  booked public.shell_ledger;
begin
  insert into public.shell_ledger (user_id, delta, reason, bucket, expires_at, character_id, ref, idempotency_key)
  values (p_user, p_delta, p_reason, p_bucket, p_expires_at, p_character_id, p_ref, p_idempotency_key)
  on conflict (user_id, idempotency_key) do nothing
  returning * into booked;

  if booked.id is null then
    select * into booked from public.shell_ledger where user_id = p_user and idempotency_key = p_idempotency_key;
    return booked;
  end if;

  -- The balance check makes an overspend fail (shells >= 0) and roll the ledger row back.
  update public.wallets set shells = shells + p_delta, updated_at = now() where user_id = p_user;
  if not found then
    raise exception 'no wallet for %', p_user;
  end if;
  return booked;
end;
$$;

-- First call after sign-in: creates the profile and the wallet and pays the one-time welcome gift
-- (100 shells, never expires; WELCOME_SHELLS in the app). Later calls change nothing but the
-- locale, and the time zone at most once a day (§14.3.6).
create function public.bootstrap_user(
  p_user uuid,
  p_locale text default null,
  p_time_zone text default null,
  p_welcome int default 100
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof public.profiles;
  wal public.wallets;
  sub public.subscriptions;
  is_new boolean := false;
begin
  insert into public.profiles (id, locale, time_zone, time_zone_set_at)
  values (p_user, coalesce(p_locale, 'en-US'), coalesce(p_time_zone, 'UTC'), case when p_time_zone is null then null else now() end)
  on conflict (id) do nothing;
  is_new := found;

  if not is_new then
    update public.profiles set
      locale = coalesce(p_locale, locale),
      time_zone = case
        when p_time_zone is not null and p_time_zone <> time_zone
          and (time_zone_set_at is null or time_zone_set_at < now() - interval '1 day') then p_time_zone
        else time_zone end,
      time_zone_set_at = case
        when p_time_zone is not null and p_time_zone <> time_zone
          and (time_zone_set_at is null or time_zone_set_at < now() - interval '1 day') then now()
        else time_zone_set_at end
    where id = p_user;
  end if;

  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  perform public.book_shells(p_user, p_welcome, 'welcome', 'welcome');

  select * into prof from public.profiles where id = p_user;
  select * into wal from public.wallets where user_id = p_user;
  select * into sub from public.subscriptions
    where user_id = p_user and status in ('trial', 'active', 'grace') and term_end > now()
    order by term_end desc limit 1;

  return jsonb_build_object(
    'isNew', is_new,
    'profile', jsonb_build_object(
      'id', prof.id,
      'displayName', prof.display_name,
      'handle', prof.handle,
      'locale', prof.locale,
      'timeZone', prof.time_zone,
      'birthYear', prof.birth_year,
      'onboardedAt', prof.onboarded_at
    ),
    'wallet', jsonb_build_object(
      'shells', wal.shells,
      'free', case when wal.free_day is null then null else jsonb_build_object('day', wal.free_day, 'amount', wal.free_amount) end,
      'trialUsed', wal.trial_used,
      'boughtShells', wal.bought_shells
    ),
    'subscription', case when sub.id is null then null else jsonb_build_object(
      'plan', sub.plan_id,
      'status', case when sub.status = 'trial' then 'trial' else 'active' end,
      'termStart', sub.term_start,
      'termEnd', sub.term_end,
      'willRenew', sub.will_renew
    ) end
  );
end;
$$;

revoke execute on function public.book_shells(uuid, int, text, text, text, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.bootstrap_user(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.book_shells(uuid, int, text, text, text, timestamptz, text, text) to service_role;
grant execute on function public.bootstrap_user(uuid, text, text, int) to service_role;

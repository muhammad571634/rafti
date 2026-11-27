-- B14: the community library (0z300, docs/agent-tasks/community-library.md, src/lib/community.ts).
--
-- `community_characters`: a user's own character shared in Find. The card is only what others may see
-- (no picture, voice, sample dialog, looks or secret), cleaned by the server before it lands. A publish
-- is reviewed by the model: `live` at once, or `rejected` with a reason. Three different reporters
-- hide it (`hidden`) until a person looks; `removed` is a takedown (Terms §5, "Rights holders").
-- Server only, like `app_events`: no policy, so only the service role reads or writes. Everything goes
-- with the creator's account (`on delete cascade`, B11).

create table public.community_characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- The creator's own id for it on their phone: publishing again updates the same row.
  local_id text not null check (char_length(local_id) between 1 and 100),
  card jsonb not null,
  status text not null check (status in ('live', 'rejected', 'hidden', 'removed')),
  reason text check (reason in ('realPerson', 'minor', 'explicit', 'hate', 'harm', 'busy')),
  chats integer not null default 0 check (chats >= 0),
  reports integer not null default 0 check (reports >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, local_id)
);

-- The shelf reads live ones, newest or most chatted.
create index community_live_new_idx on public.community_characters (created_at desc) where status = 'live';
create index community_live_popular_idx on public.community_characters (chats desc, created_at desc) where status = 'live';

-- One report per user per character; the reporter's own rows go with their account too.
create table public.community_reports (
  character_id uuid not null references public.community_characters (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (character_id, reporter_id)
);
create index community_reports_reporter_idx on public.community_reports (reporter_id);

-- One add per user per character, so the chat count counts people.
create table public.community_adds (
  character_id uuid not null references public.community_characters (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (character_id, user_id)
);
create index community_adds_user_idx on public.community_adds (user_id);

alter table public.community_characters enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_adds enable row level security;
revoke all on public.community_characters, public.community_reports, public.community_adds from anon, authenticated;

-- A user adds a live character: counted once per user; answers the chat count, or null when it is not live.
create or replace function public.community_add(p_user uuid, p_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer;
  total integer;
begin
  if not exists (select 1 from public.community_characters where id = p_id and status = 'live') then
    return null;
  end if;
  insert into public.community_adds (character_id, user_id) values (p_id, p_user) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    update public.community_characters set chats = chats + 1 where id = p_id returning chats into total;
  else
    select chats into total from public.community_characters where id = p_id;
  end if;
  return total;
end;
$$;

-- A report: once per user; at `p_hide_at` different reporters a live character is hidden. Answers the status.
create or replace function public.community_report(p_user uuid, p_id uuid, p_reason text, p_hide_at integer) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer;
  state text;
begin
  if not exists (select 1 from public.community_characters where id = p_id) then
    return null;
  end if;
  insert into public.community_reports (character_id, reporter_id, reason) values (p_id, p_user, p_reason) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    update public.community_characters
      set reports = reports + 1,
          status = case when status = 'live' and reports + 1 >= p_hide_at then 'hidden' else status end
      where id = p_id
      returning status into state;
  else
    select status into state from public.community_characters where id = p_id;
  end if;
  return state;
end;
$$;

revoke all on function public.community_add(uuid, uuid) from public, anon, authenticated;
revoke all on function public.community_report(uuid, uuid, text, integer) from public, anon, authenticated;

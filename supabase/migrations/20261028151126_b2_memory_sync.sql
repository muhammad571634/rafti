-- B2.3: the server keeps the characters' memory (flows D124).
--
-- The phone keeps each character's memory (`MemoryItem`) and each chat's summary; the memory pass
-- (B2.2) writes them. Here the server keeps a mirror, as `messages` does for the chats (B1.3b):
-- a character is named by the app's own id (user-made characters have no `characters` row yet),
-- `body` is the app's whole item and the columns beside it are copied out of it for the server's
-- own reading (retrieval, B2.4). Only the server writes, through `sync_memories`.

create table public.memories (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The app's ids.
  client_id text not null check (char_length(client_id) between 1 and 100),
  character_id text not null check (char_length(character_id) between 1 and 100),
  body jsonb not null,
  text text not null,
  about text check (about in ('you', 'them', 'story')),
  type text,
  status text not null default 'active' check (status in ('active', 'superseded', 'archived')),
  pinned boolean not null default false,
  importance real,
  -- A plan's date: 30 days after it the phone archives the fact (backend-plan §12.2).
  until date,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, client_id),
  constraint memories_body_size check (pg_column_size(body) <= 8192)
);

create index memories_user_character_idx on public.memories (user_id, character_id);

-- One row per chat: its rolling summary (memory layer 2) and the last message the pass read.
create table public.chat_memory (
  user_id uuid not null references auth.users (id) on delete cascade,
  chat_id text not null check (char_length(chat_id) between 1 and 100),
  summary text check (char_length(summary) <= 2000),
  mark text check (char_length(mark) <= 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, chat_id)
);

alter table public.memories enable row level security;
alter table public.chat_memory enable row level security;
create policy "own memories" on public.memories for select to authenticated using (user_id = (select auth.uid()));
create policy "own chat memory" on public.chat_memory for select to authenticated using (user_id = (select auth.uid()));

-- One sync from the phone, all or nothing. Each character sent replaces the server's list for it
-- (what is not in the list is deleted: a forgotten fact leaves the server too); each chat sent
-- replaces its row, and a chat with neither a summary nor a mark is deleted. The server checks
-- every item first (`cleanMemorySync`), so the ids are unique and the dates parse.
create function public.sync_memories(p_user uuid, p_characters jsonb, p_chats jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.memories m
  using jsonb_array_elements(coalesce(p_characters, '[]'::jsonb)) as c (value)
  where m.user_id = p_user
    and m.character_id = c.value ->> 'characterId'
    and not exists (
      select 1 from jsonb_array_elements(c.value -> 'items') as i (value) where i.value ->> 'id' = m.client_id
    );

  insert into public.memories as m
    (user_id, client_id, character_id, body, text, about, type, status, pinned, importance, until, created_at)
  select
    p_user,
    i.value ->> 'id',
    c.value ->> 'characterId',
    i.value,
    i.value ->> 'text',
    coalesce(i.value ->> 'about', 'you'),
    i.value ->> 'type',
    coalesce(i.value ->> 'status', 'active'),
    coalesce((i.value ->> 'pinned')::boolean, false),
    (i.value ->> 'importance')::real,
    (i.value ->> 'until')::date,
    (i.value ->> 'createdAt')::timestamptz
  from jsonb_array_elements(coalesce(p_characters, '[]'::jsonb)) as c (value)
  cross join lateral jsonb_array_elements(c.value -> 'items') as i (value)
  on conflict (user_id, client_id) do update set
    character_id = excluded.character_id,
    body = excluded.body,
    text = excluded.text,
    about = excluded.about,
    type = excluded.type,
    status = excluded.status,
    pinned = excluded.pinned,
    importance = excluded.importance,
    until = excluded.until,
    created_at = excluded.created_at,
    updated_at = now()
  -- A character sent again unchanged writes nothing.
  where m.body is distinct from excluded.body;

  delete from public.chat_memory cm
  using jsonb_array_elements(coalesce(p_chats, '[]'::jsonb)) as h (value)
  where cm.user_id = p_user
    and cm.chat_id = h.value ->> 'chatId'
    and coalesce(h.value ->> 'summary', '') = ''
    and coalesce(h.value ->> 'mark', '') = '';

  insert into public.chat_memory as cm (user_id, chat_id, summary, mark)
  select p_user, h.value ->> 'chatId', nullif(h.value ->> 'summary', ''), nullif(h.value ->> 'mark', '')
  from jsonb_array_elements(coalesce(p_chats, '[]'::jsonb)) as h (value)
  where coalesce(h.value ->> 'summary', '') <> '' or coalesce(h.value ->> 'mark', '') <> ''
  on conflict (user_id, chat_id) do update set
    summary = excluded.summary,
    mark = excluded.mark,
    updated_at = now()
  where cm.summary is distinct from excluded.summary or cm.mark is distinct from excluded.mark;
end;
$$;

revoke execute on function public.sync_memories(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_memories(uuid, jsonb, jsonb) to service_role;

-- B1.3b: the server keeps the chats (flows D115).
--
-- The phone keeps every message in SQLite (B1.3a) and sends the rows it has not sent yet; a new
-- install reads them back in `seq` order. The app's chats are not server rows yet (user-made
-- characters and group chats have no `conversations` row), so a message names its chat by the
-- app's own id (`chat_id`) and `conversation_id` stays empty until chats move to the server.
-- `body` is the app's whole message; the columns beside it are copied out of it for the server's
-- own reading (memory, summaries in B2). Only the server writes, through `sync_messages`.
-- The table was empty until now (nothing wrote to it), so the new columns can be NOT NULL.

alter table public.messages
  alter column conversation_id drop not null,
  alter column client_id set not null,
  add column chat_id text not null check (char_length(chat_id) between 1 and 100),
  add column body jsonb not null,
  -- Insert order, which is the chat's order; an update keeps it. A chat whose order changed is
  -- sent as dropped and then whole again, so it gets new numbers in its new order.
  add column seq bigint generated always as identity,
  add column updated_at timestamptz not null default now(),
  add constraint messages_user_client_key unique (user_id, client_id),
  add constraint messages_body_size check (pg_column_size(body) <= 65536);

create unique index messages_user_seq_idx on public.messages (user_id, seq);
create index messages_user_chat_idx on public.messages (user_id, chat_id);
-- The unique keys above start with user_id, so they cover the foreign key now.
drop index public.messages_user_idx;

-- One sync from the phone, all or nothing: chats dropped (or about to be sent whole again), then
-- single messages deleted, then the new and changed ones in the order sent. Answers the user's
-- newest `seq`.
create function public.sync_messages(p_user uuid, p_dropped text[], p_deleted text[], p_upserts jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if cardinality(p_dropped) > 0 then
    delete from public.messages where user_id = p_user and chat_id = any (p_dropped);
  end if;
  if cardinality(p_deleted) > 0 then
    delete from public.messages where user_id = p_user and client_id = any (p_deleted);
  end if;

  insert into public.messages as m
    (user_id, chat_id, client_id, body, author, kind, text, transcript, duration_sec, created_at)
  select
    p_user,
    u.value ->> 'chatId',
    u.value -> 'message' ->> 'id',
    u.value -> 'message',
    u.value -> 'message' ->> 'author',
    u.value -> 'message' ->> 'kind',
    u.value -> 'message' ->> 'text',
    u.value -> 'message' ->> 'transcript',
    (u.value -> 'message' ->> 'durationSec')::numeric::int,
    (u.value -> 'message' ->> 'createdAt')::timestamptz
  from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb)) with ordinality as u (value, ord)
  order by u.ord
  on conflict (user_id, client_id) do update set
    chat_id = excluded.chat_id,
    body = excluded.body,
    author = excluded.author,
    kind = excluded.kind,
    text = excluded.text,
    transcript = excluded.transcript,
    duration_sec = excluded.duration_sec,
    created_at = excluded.created_at,
    updated_at = now();

  return (select max(seq) from public.messages where user_id = p_user);
end;
$$;

revoke execute on function public.sync_messages(uuid, text[], text[], jsonb) from public, anon, authenticated;
grant execute on function public.sync_messages(uuid, text[], text[], jsonb) to service_role;

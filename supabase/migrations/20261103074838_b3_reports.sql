-- B3: a user's report on a character's message reaches a person (docs/road-to-launch.md item 8).
-- The server writes it (`POST /v1/reports`) with the lines before the message, for review in context.
-- Server only: no policy, so only the service role reads or writes it. Deleting the account
-- deletes its reports with it (App Store 5.1.1(v)).

create table public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The phone's id of the report: a resend after a lost answer is kept once.
  client_id text not null,
  -- Text, not a foreign key: a character the user made is not in public.characters.
  character_id text not null,
  reason text not null check (reason in ('harmful', 'sexual', 'offCharacter', 'other')),
  message_text text not null,
  context jsonb not null default '[]',
  created_at timestamptz not null default now(),
  -- Starts with user_id, so it covers the foreign key too.
  unique (user_id, client_id)
);

-- The review queue reads the newest first.
create index reports_created_idx on public.reports (created_at desc);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

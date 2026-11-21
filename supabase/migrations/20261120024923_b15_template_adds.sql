-- B15: real counts for the story templates on Find (docs/agent-tasks/template-library.md §3,
-- src/lib/templates.ts). The templates themselves ship in the app; the server keeps only who used
-- which one: one row per account per template, `hi` (said hi) or `own` (made it their own; a `hi`
-- becomes `own` when they later make it theirs). Counts read only accounts older than a day, so a
-- burst of fresh accounts cannot push a card up. Server only (no policy), like `community_adds`;
-- rows go with the account (`on delete cascade`, B11).

create table public.template_adds (
  template_id text not null check (template_id ~ '^t_[a-z0-9_]{1,40}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  how text not null check (how in ('hi', 'own')),
  created_at timestamptz not null default now(),
  primary key (template_id, user_id)
);
create index template_adds_created_idx on public.template_adds (created_at);
create index template_adds_user_idx on public.template_adds (user_id);

alter table public.template_adds enable row level security;
revoke all on public.template_adds from anon, authenticated;

-- One use per account per template; making it their own upgrades an earlier hi.
create or replace function public.template_add(p_user uuid, p_id text, p_how text) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.template_adds (template_id, user_id, how) values (p_id, p_user, p_how)
  on conflict (template_id, user_id) do update set how = 'own'
  where excluded.how = 'own' and public.template_adds.how = 'hi';
$$;

-- Every template's people: all time, the last 7 days, and how many made it their own.
create or replace function public.template_stats() returns table (template_id text, chats bigint, week bigint, owns bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select a.template_id,
         count(*),
         count(*) filter (where a.created_at > now() - interval '7 days'),
         count(*) filter (where a.how = 'own')
  from public.template_adds a
  join auth.users u on u.id = a.user_id
  where u.created_at < now() - interval '1 day'
  group by a.template_id;
$$;

revoke all on function public.template_add(uuid, text, text) from public, anon, authenticated;
revoke all on function public.template_stats() from public, anon, authenticated;

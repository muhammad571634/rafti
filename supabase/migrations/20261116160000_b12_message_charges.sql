-- B12: the server counts messages itself (road-to-launch item 4, HANDOFF 0z260).
--
-- Every line the user sends to the model carries a key the app made for it (`pay` on
-- /v1/chat/reply and /v1/chat/group). `take_message` decides it once per key, the way the app's
-- `payLine` does: today's free messages first (30, a plan's fair use 200; src/economy/free-messages.ts),
-- then a shell booked under `spend:<key>`, the very key the app's own spend mirror uses, so the two
-- can never charge twice. A photo always takes its shell. "Today" is the server's: the date in the
-- profile's time zone (`user_today`), never a date the app sends.
--
-- `p_charge` false is the shadow mode (`ENFORCE_WALLET` off): the decision is recorded and answered,
-- no shell moves and nobody is refused; the app's spend mirror keeps paying as before.

create table public.message_charges (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (length(key) between 1 and 100),
  -- The user's day the message was counted in.
  day date not null,
  -- What the message cost by the server's count: 0 = one of the day's free messages.
  shells smallint not null check (shells >= 0),
  -- Replies asked under this key (a retry, a group's members); capped by the caller.
  uses smallint not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index message_charges_day_idx on public.message_charges (user_id, day);

-- Server only: no policy, so the app cannot read or write it.
alter table public.message_charges enable row level security;
revoke all on public.message_charges from anon, authenticated;

create function public.take_message(
  p_user uuid,
  p_key text,
  p_reason text,
  p_cost int,
  p_free_limit int,
  p_plan_limit int,
  p_may_be_free boolean,
  p_max_uses int,
  p_use boolean,
  p_charge boolean,
  p_character_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.wallets;
  today date;
  m public.message_charges;
  lim int;
  used int;
  outcome text;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'badAmount';
  end if;
  -- Locks the wallet row: one user's messages are decided one at a time.
  w := public.wallet_settle(p_user);
  today := public.user_today(p_user);
  -- Only today's rows count; older ones go as the user's own messages come (two days kept for retries).
  delete from public.message_charges where user_id = p_user and day < today - 2;
  lim := case when exists (
      select 1 from public.subscriptions
      where user_id = p_user and status in ('trial', 'active', 'grace') and term_end > now()
    ) then p_plan_limit else p_free_limit end;

  select * into m from public.message_charges where user_id = p_user and key = p_key for update;
  if found then
    if p_use and m.uses >= p_max_uses then
      outcome := 'overused';
    else
      if p_use then
        update public.message_charges set uses = uses + 1 where user_id = p_user and key = p_key;
      end if;
      outcome := 'again';
    end if;
  else
    select count(*) into used from public.message_charges where user_id = p_user and day = today and shells = 0;
    if exists (select 1 from public.shell_ledger where user_id = p_user and idempotency_key = 'spend:' || p_key) then
      -- The app's spend mirror got here first: that shell paid for it.
      insert into public.message_charges (user_id, key, day, shells, uses) values (p_user, p_key, today, p_cost, case when p_use then 1 else 0 end);
      outcome := 'paid';
    elsif p_may_be_free and used < lim then
      insert into public.message_charges (user_id, key, day, shells, uses) values (p_user, p_key, today, 0, case when p_use then 1 else 0 end);
      outcome := 'free';
    elsif w.shells < p_cost then
      -- Nothing recorded: once the user has shells, the same key is decided again.
      outcome := 'noShells';
    else
      if p_charge then
        perform public.wallet_spend(p_user, p_cost, p_reason, 'spend:' || p_key, p_character_id);
      end if;
      insert into public.message_charges (user_id, key, day, shells, uses) values (p_user, p_key, today, p_cost, case when p_use then 1 else 0 end);
      outcome := 'paid';
    end if;
  end if;

  return jsonb_build_object(
    'outcome', outcome,
    'freeUsed', (select count(*) from public.message_charges where user_id = p_user and day = today and shells = 0),
    'freeLimit', lim,
    'wallet', public.wallet_json(p_user)
  );
end;
$$;

revoke execute on function public.take_message(uuid, text, text, int, int, int, boolean, int, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.take_message(uuid, text, text, int, int, int, boolean, int, boolean, boolean, text) to service_role;

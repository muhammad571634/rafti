-- B1.2: the wallet runs on the server (docs/backend-plan.md §8, flows D114).
--
-- Free shells (check-in, wheel) sit in today's free bucket: spent first, burnt at the user's
-- midnight (src/economy/shells.ts). "Today" is always the server's: the date in the profile's time
-- zone, never a date the app sends. The numbers (check-in ladder, wheel segments and odds) stay in
-- the app's shared code (src/mock/misc.ts); the server passes them in, so they live in one place.
-- Like book_shells, every function here runs for the server only (service role).

alter table public.wallets
  add column check_in_day date,
  add column check_in_streak int not null default 0 check (check_in_streak between 0 and 7);

-- The user's today, in their profile's time zone (UTC without a profile).
create function public.user_today(p_user uuid) returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce((select time_zone from public.profiles where id = p_user), 'UTC'))::date;
$$;

-- The wallet as the app reads it.
create function public.wallet_json(p_user uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'shells', w.shells,
    'free', case when w.free_day is null or w.free_amount = 0 then null
                 else jsonb_build_object('day', w.free_day, 'amount', w.free_amount) end,
    'trialUsed', w.trial_used,
    'boughtShells', w.bought_shells,
    'today', public.user_today(p_user),
    'checkIn', jsonb_build_object('lastDay', w.check_in_day, 'streak', w.check_in_streak),
    'spinsToday', coalesce((select spins from public.daily_usage where user_id = p_user and day = public.user_today(p_user)), 0)
  )
  from public.wallets w
  where w.user_id = p_user;
$$;

-- Burns a free bucket from an earlier day (booked once per day it burns) and returns the wallet,
-- locked for the rest of the caller's transaction. Raises noWallet before bootstrap_user ran.
create function public.wallet_settle(p_user uuid) returns public.wallets
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.wallets;
  today date := public.user_today(p_user);
  gone int;
begin
  select * into w from public.wallets where user_id = p_user for update;
  if not found then
    raise exception 'noWallet';
  end if;
  if w.free_day is not null and w.free_day < today then
    gone := least(w.free_amount, w.shells);
    if gone > 0 then
      perform public.book_shells(p_user, -gone, 'expired', 'expired:' || w.free_day, 'free');
    end if;
    update public.wallets set free_day = null, free_amount = 0, updated_at = now()
      where user_id = p_user returning * into w;
  end if;
  return w;
end;
$$;

-- What the app reads on open: the wallet after any overnight burn.
create function public.wallet_state(p_user uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.wallet_settle(p_user);
  return public.wallet_json(p_user);
end;
$$;

-- Spends shells, today's free ones first. A repeated key changes nothing; too few shells raise
-- noShells and change nothing. A character the database does not know (a creation not yet synced)
-- is left off the ledger row.
create function public.wallet_spend(
  p_user uuid,
  p_amount int,
  p_reason text,
  p_key text,
  p_character_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.wallets;
  today date := public.user_today(p_user);
  from_free int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'badAmount';
  end if;
  w := public.wallet_settle(p_user);
  if exists (select 1 from public.shell_ledger where user_id = p_user and idempotency_key = p_key) then
    return public.wallet_json(p_user);
  end if;
  if w.shells < p_amount then
    raise exception 'noShells';
  end if;
  from_free := case when w.free_day = today then least(w.free_amount, p_amount) else 0 end;
  perform public.book_shells(
    p_user, -p_amount, p_reason, p_key,
    case when from_free = p_amount then 'free' else 'paid' end,
    null,
    (select id from public.characters where id = p_character_id)
  );
  if from_free > 0 then
    update public.wallets set free_amount = free_amount - from_free, updated_at = now() where user_id = p_user;
  end if;
  return public.wallet_json(p_user);
end;
$$;

-- Credits shells: into today's free bucket (burns at midnight) or as kept shells. A repeated key
-- changes nothing.
create function public.wallet_credit(
  p_user uuid,
  p_amount int,
  p_reason text,
  p_key text,
  p_free boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.user_today(p_user);
  booked boolean;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'badAmount';
  end if;
  perform public.wallet_settle(p_user);
  booked := exists (select 1 from public.shell_ledger where user_id = p_user and idempotency_key = p_key);
  if not booked then
    perform public.book_shells(p_user, p_amount, p_reason, p_key, case when p_free then 'free' else 'paid' end);
    -- The starter pack is offered only until the first purchase (the app's addShells).
    if p_reason = 'purchase' then
      update public.wallets set bought_shells = true where user_id = p_user;
    end if;
    if p_free then
      update public.wallets set
        free_amount = case when free_day = today then free_amount + p_amount else p_amount end,
        free_day = today,
        updated_at = now()
      where user_id = p_user;
    end if;
  end if;
  return public.wallet_json(p_user);
end;
$$;

-- The daily check-in (src/store/use-app-store.ts claimDailyLogin): once per user day, day 1-7 of a
-- streak that restarts after a missed day; day 7 rolls between its floor and p_top. Pays 0 when
-- today is already claimed.
create function public.wallet_check_in(p_user uuid, p_ladder int[], p_top int) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.wallets;
  today date := public.user_today(p_user);
  streak int;
  amount int;
  len int := array_length(p_ladder, 1);
begin
  w := public.wallet_settle(p_user);
  if w.check_in_day = today then
    return jsonb_build_object('amount', 0, 'day', w.check_in_streak, 'wallet', public.wallet_json(p_user));
  end if;
  streak := case when w.check_in_day = today - 1 then (w.check_in_streak % len) + 1 else 1 end;
  amount := p_ladder[streak];
  if streak = len then
    amount := amount + floor(random() * (p_top - amount + 1))::int;
  end if;
  update public.wallets set check_in_day = today, check_in_streak = streak where user_id = p_user;
  insert into public.daily_usage (user_id, day, checkin_amount) values (p_user, today, amount)
    on conflict (user_id, day) do update set checkin_amount = excluded.checkin_amount;
  perform public.wallet_credit(p_user, amount, 'daily', 'daily:' || today, true);
  return jsonb_build_object('amount', amount, 'day', streak, 'wallet', public.wallet_json(p_user));
end;
$$;

-- The lucky wheel (spinWheel): p_free_spins a user day, the segment drawn here by its odds, the
-- prize into today's free bucket. Index is 0-based, clockwise from the pointer; null when no spin
-- is left today.
create function public.wallet_spin(p_user uuid, p_segments int[], p_weights int[], p_free_spins int) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.user_today(p_user);
  used int;
  roll numeric;
  total int := 0;
  -- A FOR loop's own variable is gone after the loop, so the pick is kept here.
  pick int;
begin
  perform public.wallet_settle(p_user);
  insert into public.daily_usage (user_id, day) values (p_user, today) on conflict (user_id, day) do nothing;
  select spins into used from public.daily_usage where user_id = p_user and day = today for update;
  if used >= p_free_spins then
    return jsonb_build_object('index', null, 'reward', 0, 'wallet', public.wallet_json(p_user));
  end if;
  for k in 1 .. array_length(p_weights, 1) loop
    total := total + p_weights[k];
  end loop;
  roll := random() * total;
  for k in 1 .. array_length(p_weights, 1) loop
    pick := k;
    roll := roll - p_weights[k];
    exit when roll < 0;
  end loop;
  update public.daily_usage set spins = spins + 1 where user_id = p_user and day = today;
  perform public.wallet_credit(p_user, p_segments[pick], 'spin', 'spin:' || today || ':' || (used + 1), true);
  return jsonb_build_object('index', pick - 1, 'reward', p_segments[pick], 'wallet', public.wallet_json(p_user));
end;
$$;

revoke execute on function public.user_today(uuid) from public, anon, authenticated;
revoke execute on function public.wallet_json(uuid) from public, anon, authenticated;
revoke execute on function public.wallet_settle(uuid) from public, anon, authenticated;
revoke execute on function public.wallet_state(uuid) from public, anon, authenticated;
revoke execute on function public.wallet_spend(uuid, int, text, text, text) from public, anon, authenticated;
revoke execute on function public.wallet_credit(uuid, int, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.wallet_check_in(uuid, int[], int) from public, anon, authenticated;
revoke execute on function public.wallet_spin(uuid, int[], int[], int) from public, anon, authenticated;
grant execute on function public.user_today(uuid) to service_role;
grant execute on function public.wallet_json(uuid) to service_role;
grant execute on function public.wallet_settle(uuid) to service_role;
grant execute on function public.wallet_state(uuid) to service_role;
grant execute on function public.wallet_spend(uuid, int, text, text, text) to service_role;
grant execute on function public.wallet_credit(uuid, int, text, text, boolean) to service_role;
grant execute on function public.wallet_check_in(uuid, int[], int) to service_role;
grant execute on function public.wallet_spin(uuid, int[], int[], int) to service_role;

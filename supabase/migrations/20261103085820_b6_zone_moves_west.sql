-- B6: a time zone that moves west puts the user's "today" back (HANDOFF 0z89, still to do 3).
-- Flying Tashkent → New York after the 1 a.m. check-in: today goes from 11-04 to 11-03.
--
-- Before: `wallet_check_in` saw check_in_day (11-04) <> today (11-03), reset the streak, moved
-- check_in_day back and answered amount > 0, though `wallet_credit` paid nothing ('daily:11-03' was
-- already booked), so the app logged a + row that never happened. A free bucket dated ahead of today
-- was overwritten by the next free credit (those shells never burned) and was not spent first.
--
-- Now: a day already claimed, or a later one, is claimed (amount 0, streak kept), and so is a day
-- whose key is already booked. A free bucket keeps the later of its day and today, adds to it, and
-- is spent first. Only travellers west see any change: for everyone else free_day is today or null
-- after `wallet_settle`, and check_in_day is never ahead of today.
--
-- And the burn: a bucket dated 11-04 can burn twice (at Tashkent's midnight, then a new 11-04
-- bucket at New York's). The second `expired:11-04` key was already booked, so book_shells skipped
-- it while settle still cleared the bucket, and those shells never burned. A repeat day now gets
-- its own key.

create or replace function public.wallet_settle(p_user uuid) returns public.wallets
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.wallets;
  today date := public.user_today(p_user);
  gone int;
  burn_key text;
  burnt int;
begin
  select * into w from public.wallets where user_id = p_user for update;
  if not found then
    raise exception 'noWallet';
  end if;
  if w.free_day is not null and w.free_day < today then
    gone := least(w.free_amount, w.shells);
    if gone > 0 then
      burn_key := 'expired:' || w.free_day;
      -- The day already burnt once (a zone moved west): this burn is the next one of that day.
      select count(*) into burnt from public.shell_ledger
        where user_id = p_user and (idempotency_key = burn_key or idempotency_key like burn_key || ':%');
      if burnt > 0 then
        burn_key := burn_key || ':' || burnt;
      end if;
      perform public.book_shells(p_user, -gone, 'expired', burn_key, 'free');
    end if;
    update public.wallets set free_day = null, free_amount = 0, updated_at = now()
      where user_id = p_user returning * into w;
  end if;
  return w;
end;
$$;

create or replace function public.wallet_check_in(p_user uuid, p_ladder int[], p_top int) returns jsonb
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
  if w.check_in_day >= today then
    return jsonb_build_object('amount', 0, 'day', w.check_in_streak, 'wallet', public.wallet_json(p_user));
  end if;
  -- Only a row the old code moved back reaches this: today is paid, so it counts as claimed.
  if exists (select 1 from public.shell_ledger where user_id = p_user and idempotency_key = 'daily:' || today) then
    update public.wallets set check_in_day = today where user_id = p_user;
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

-- Credits shells: into the free bucket (burns at the midnight after its day) or as kept shells. A
-- repeated key changes nothing. After `wallet_settle` the bucket's day is null, today, or later
-- (a zone moved west): it keeps the later day and adds to it.
create or replace function public.wallet_credit(
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
        free_amount = case when free_day >= today then free_amount + p_amount else p_amount end,
        free_day = greatest(free_day, today),
        updated_at = now()
      where user_id = p_user;
    end if;
  end if;
  return public.wallet_json(p_user);
end;
$$;

-- Spends shells, the free bucket first (today's, or a later day's after a zone moved west). A
-- repeated key changes nothing; too few shells raise noShells and change nothing. A character the
-- database does not know (a creation not yet synced) is left off the ledger row.
create or replace function public.wallet_spend(
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
  from_free := case when w.free_day >= today then least(w.free_amount, p_amount) else 0 end;
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

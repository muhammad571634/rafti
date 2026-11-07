-- B7: the daily check-in's shells are for free users only (owner, 2026-11-07; HANDOFF 0z121).
-- A paid plan (Basic, Pro, Pro yearly) pays 2,000-5,000 shells a month; the check-in ladder
-- (30-50 a day, day 7 up to 100) is the free user's daily reason to come back. A trial pays no
-- shells, so a trial keeps the check-in. The app mirrors this in `onPaidPlan` (src/economy/plans.ts).
--
-- A paid user's open answers amount 0 and leaves the streak as it is: nothing is booked, the
-- check_in_day does not move, and the app shows no sheet. When the plan ends, the next open is a
-- normal check-in (a gap restarts the streak at day 1, as for anyone who missed days).
--
-- Same body as B6 otherwise.

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
  -- On a paid plan right now: no check-in shells (a trial is not paid).
  if exists (
    select 1 from public.subscriptions
    where user_id = p_user and status in ('active', 'grace') and term_end > now()
  ) then
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

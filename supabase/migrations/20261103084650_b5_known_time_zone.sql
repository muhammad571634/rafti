-- B5: the profile keeps only a time zone Postgres knows. `user_today` reads it on every wallet call
-- (`now() at time zone ...`), so a zone the phone's runtime accepts but Postgres does not would
-- make every wallet call for that user raise (HANDOFF 0z89, still to do 4). The server's
-- `cleanTimeZone` checks with Node's Intl only; this is the database's own check.
--
-- An unknown zone is not an error, so `bootstrap_user` never fails over it: an update keeps the
-- zone it had, a new profile starts at UTC, as with no zone at all.

create function public.profiles_known_time_zone() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.time_zone is not distinct from old.time_zone then
    return new;
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    if tg_op = 'UPDATE' then
      new.time_zone := old.time_zone;
      new.time_zone_set_at := old.time_zone_set_at;
    else
      new.time_zone := 'UTC';
      new.time_zone_set_at := null;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_known_time_zone() from public, anon, authenticated;

create trigger profiles_known_time_zone
  before insert or update of time_zone on public.profiles
  for each row execute function public.profiles_known_time_zone();

-- A zone kept before this check (none on 2026-11-03) starts over at UTC, so its next good zone is
-- taken at once.
update public.profiles set time_zone = 'UTC', time_zone_set_at = null
  where time_zone not in (select name from pg_catalog.pg_timezone_names);

-- B4: what the privacy policy promises to delete on time (docs/legal/privacy-policy.md, "How long
-- we keep it"): reports 12 months after they are made, usage records after 13 months. pg_cron runs
-- it every night at 03:15 UTC; a run deletes in one statement per table, so a missed night only
-- means the next one deletes more.

create extension if not exists pg_cron with schema pg_catalog;

create function public.purge_expired() returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.reports where created_at < now() - interval '12 months';
  delete from public.usage_events where created_at < now() - interval '13 months';
$$;

revoke all on function public.purge_expired() from public, anon, authenticated;

select cron.schedule('purge-expired', '15 3 * * *', 'select public.purge_expired()');

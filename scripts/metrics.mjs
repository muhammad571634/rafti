// scripts/metrics.mjs
// Retention and activity from what the server already records (docs/road-to-launch.md item 9).
// Read-only SQL through the Supabase management API; needs SUPABASE_ACCESS_TOKEN and SUPABASE_URL.
//
//   node scripts/metrics.mjs [--days 14] [--since 2026-11-10] [--exclude <uuid>,<uuid>]
//
// An active day is a day, in the user's own time zone, with a model call (`usage_events`) or a
// wallet move (`shell_ledger`). D1 / D7: of accounts whose day 1 / day 7 is over, the share active
// on exactly that day. Replies are one-to-one and group model calls. A user with the model off, or
// whose calls all failed, is not seen. METRICS_EXCLUDE (comma-separated ids) leaves test accounts out.

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const days = Number(arg('days') ?? 14);
const since = arg('since');
const exclude = [arg('exclude'), process.env.METRICS_EXCLUDE]
  .filter(Boolean)
  .flatMap((list) => list.split(','))
  .map((id) => id.trim())
  .filter(Boolean);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('--days: 1 to 365');
if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('--since: YYYY-MM-DD');
const badId = exclude.find((id) => !UUID.test(id));
if (badId) throw new Error(`not an account id: ${badId}`);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and SUPABASE_URL must be set');

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`query failed (${res.status}): ${JSON.stringify(body)}`);
  return body;
}

const people = `
  people as (
    select u.id, u.created_at, coalesce(p.time_zone, 'UTC') as tz
    from auth.users u left join public.profiles p on p.id = u.id
    where true
      ${since ? `and u.created_at >= '${since}'::date` : ''}
      ${exclude.length ? `and u.id not in (${exclude.map((id) => `'${id}'`).join(', ')})` : ''}
  ),
  moves as (
    select e.user_id, (e.created_at at time zone p.tz)::date as d, (e.mode in ('chat', 'group'))::int as reply
    from public.usage_events e join people p on p.id = e.user_id
    union all
    select l.user_id, (l.created_at at time zone p.tz)::date, 0
    from public.shell_ledger l join people p on p.id = l.user_id
  ),
  active as (select user_id, d, sum(reply)::int as replies from moves group by 1, 2),
  cohort as (
    select id, (created_at at time zone tz)::date as d0, (now() at time zone tz)::date as today from people
  )`;

const [summary] = await query(`
  with ${people}
  select
    (select count(*) from people)::int as accounts,
    count(*) filter (where c.d0 + 1 < c.today)::int as d1_due,
    count(*) filter (where c.d0 + 1 < c.today and exists (
      select 1 from active a where a.user_id = c.id and a.d = c.d0 + 1))::int as d1_back,
    count(*) filter (where c.d0 + 7 < c.today)::int as d7_due,
    count(*) filter (where c.d0 + 7 < c.today and exists (
      select 1 from active a where a.user_id = c.id and a.d = c.d0 + 7))::int as d7_back,
    (select count(distinct s.user_id) from public.subscriptions s join people p on p.id = s.user_id
      where s.status = 'active')::int as subscribed,
    (select count(*) from public.wallets w join people p on p.id = w.user_id where w.bought_shells)::int as bought_shells
  from cohort c`);

const byDay = await query(`
  with ${people},
  joined as (select d0 as d, count(*)::int as n from cohort group by 1)
  select a.d::text as day, count(*)::int as active, coalesce(max(j.n), 0)::int as new,
    sum(a.replies)::int as replies, round(sum(a.replies)::numeric / count(*), 1) as replies_per_active
  from active a left join joined j on j.d = a.d
  where a.d > current_date - ${days}
  group by a.d order by a.d`);

const pct = (back, due) => (due ? `${Math.round((100 * back) / due)}% (${back} of ${due})` : 'no one due yet');
console.log(`Accounts: ${summary.accounts}${since ? ` since ${since}` : ''}${exclude.length ? `, ${exclude.length} excluded` : ''}`);
console.log(`D1: ${pct(summary.d1_back, summary.d1_due)}`);
console.log(`D7: ${pct(summary.d7_back, summary.d7_due)}`);
console.log(`Paying: ${summary.subscribed} subscribed, ${summary.bought_shells} bought shells`);
console.log(`\nLast ${days} days:`);
console.table(byDay);

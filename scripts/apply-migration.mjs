// scripts/apply-migration.mjs
// Applies one migration file to the cloud Supabase project through the Management API, which names
// the version by its UTC clock (rename the file to the version it answers). Agents may not run it
// in auto mode, so the owner runs it: `! node scripts/apply-migration.mjs supabase/migrations/<file>.sql`.
// Needs SUPABASE_ACCESS_TOKEN and SUPABASE_URL.

import { readFileSync } from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
const match = file && path.basename(file).match(/^\d+_(.+)\.sql$/);
if (!match) throw new Error('usage: node scripts/apply-migration.mjs supabase/migrations/<version>_<name>.sql');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and SUPABASE_URL must be set');

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/migrations`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(file, 'utf8'), name: match[1] }),
});
console.log(res.status, await res.text());

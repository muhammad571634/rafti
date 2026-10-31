import { writeFileSync } from 'node:fs';

import { castSeedSql } from './seed-cast.ts';

// `npm run db:seed-file`: rewrites supabase/seed.sql from the app's mock cast.
const target = new URL('../../../supabase/seed.sql', import.meta.url);
writeFileSync(target, castSeedSql());
console.log(`Wrote ${target.pathname}`);

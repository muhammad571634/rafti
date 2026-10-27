import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { castSeedSql, officialCast, personaOf, text } from './seed-cast.ts';

describe('the seeded cast', () => {
  it('matches the app: supabase/seed.sql is what the mock cast makes (run `npm run db:seed-file`)', () => {
    const file = readFileSync(new URL('../../../supabase/seed.sql', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
    assert.equal(file, castSeedSql());
  });

  it('is the forty officials, each an adult with a full profile', () => {
    const cast = officialCast();
    assert.equal(cast.length, 40);
    for (const c of cast) {
      const persona = personaOf(c);
      assert.ok((persona.age as number) >= 18, c.id);
      for (const key of ['tagline', 'heightCm', 'backstory', 'likes', 'dislikes', 'definition', 'starters']) assert.ok(persona[key], `${c.id} ${key}`);
    }
  });

  it('quotes text safely', () => {
    assert.equal(text("Don't"), "'Don''t'");
    assert.equal(text(undefined), 'null');
  });
});

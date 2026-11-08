import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/** The chat's share poster (0z158) reads `sharePoster.s1` ... `s3`; keep in step with `POSTER_SCRIPTS`. */
const SCRIPTS = 3;
const PARTS = ['you', 'a', 'hook', 'tail'] as const;
const dir = join(process.cwd(), 'src/i18n/locales');

describe('the share poster speaks every product language (0z158)', () => {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    it(file, () => {
      const poster = JSON.parse(readFileSync(join(dir, file), 'utf8')).sharePoster;
      assert.ok(poster, 'sharePoster missing');
      for (let i = 1; i <= SCRIPTS; i++) {
        for (const part of PARTS) {
          const line: string = poster[`s${i}`]?.[part];
          assert.ok(line?.trim(), `s${i}.${part} missing`);
          // A gendered pair is {g:female|male}, nothing else in braces (the friend's own gender fills it).
          for (const brace of line.match(/\{[^}]*\}/g) ?? []) assert.match(brace, /^\{g:[^|}]+\|[^}]+\}$/, `s${i}.${part}: ${brace}`);
        }
      }
      assert.match(poster.typing, /\{\{name\}\}/);
      assert.ok(poster.store.trim());
      assert.ok(poster.badge?.trim(), 'badge missing');
    });
  }
});

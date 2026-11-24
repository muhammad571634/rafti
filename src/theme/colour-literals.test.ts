import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';


/**
 * Screens read colours from `src/theme` (audit 2026-11-24 #7, HIG Color: "avoid hard-coding"). A
 * ratchet: no file may hold more hex / rgba literals than it did when the guard came in, and a new
 * file holds none. Lower a file's number when you clean it (`npm test` prints what to write); art
 * that is drawn in code (the orbit, stationery, tickets, the mascot) keeps its own numbers.
 */
const ROOTS = ['src/app', 'src/components'];
const LITERAL = /#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

export function literalCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const root of ROOTS) {
    for (const path of files(root)) {
      const n = readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .reduce((sum, line) => sum + (line.match(LITERAL)?.length ?? 0), 0);
      if (n) counts[relative('.', path).split(sep).join('/')] = n;
    }
  }
  return counts;
}

describe('colour literals in screens (audit 2026-11-24)', () => {
  it('never grow: colours come from src/theme', () => {
    const baseline = JSON.parse(readFileSync('src/theme/colour-literals.baseline.json', 'utf8')) as Record<string, number>;
    const grown = Object.entries(literalCounts()).filter(([file, n]) => n > (baseline[file] ?? 0));
    assert.deepEqual(grown, [], `Use a token from src/theme instead of a hex or rgba in: ${grown.map(([f, n]) => `${f} (${n}, was ${baseline[f] ?? 0})`).join(', ')}`);
  });
});

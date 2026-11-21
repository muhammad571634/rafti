import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * The four main tabs draw nothing while nothing happens (docs/performance.md): an endless animation
 * on a home screen costs every frame on every phone, and on a Galaxy A51 the hero's slow "breath"
 * alone took 12-13 ms of GPU per frame (0z131). An endless loop is allowed only where it shows a
 * live event and stops with it; each one is listed here with that event.
 */
const LOOPS_ALLOWED: Record<string, string> = {
  'src/app/(tabs)/chat.tsx': 'typing dots, only while a friend is typing',
  'src/app/(tabs)/index.tsx': 'the widget jiggle, only in edit mode',
};

const MAIN_TAB_CODE = ['src/app/(tabs)', 'src/components/today', 'src/components/find', 'src/components/us', 'src/components/today-hero.tsx'];
/** Endless motion: a Reanimated repeat with -1, a looping Lottie, a JS interval that sets state. */
const ENDLESS = [/withRepeat\([\s\S]{0,400}?,\s*-1/, /<(?:LottieView|Anim)\b[^>]*\bloop(?!\s*=\s*\{false\})/, /setInterval\(/];

function files(path: string): string[] {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(path, e.name)) : /\.tsx?$/.test(e.name) && !e.name.includes('.test.') ? [join(path, e.name)] : [],
  );
}

describe('main tabs stay idle', () => {
  const all = MAIN_TAB_CODE.flatMap(files).map((f) => f.replace(/\\/g, '/'));

  it('finds the main tab code', () => {
    assert.ok(all.includes('src/app/(tabs)/index.tsx'));
    assert.ok(all.includes('src/components/today-hero.tsx'));
  });

  for (const file of all) {
    it(`${file} has no endless motion of its own`, () => {
      const code = readFileSync(file, 'utf8');
      const found = ENDLESS.some((re) => re.test(code));
      if (LOOPS_ALLOWED[file]) assert.ok(found, `${file} no longer loops: drop it from LOOPS_ALLOWED`);
      else assert.ok(!found, `${file} starts an endless animation on a main tab; see docs/performance.md`);
    });
  }
});

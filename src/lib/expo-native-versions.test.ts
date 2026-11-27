import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Expo ships many iOS modules as prebuilt frameworks, each compiled against the ExpoModulesCore of
 * the day it was published. A module newer than the version the installed `expo` itself picks
 * (`expo/bundledNativeModules.json`) can call into a core that is not in the app yet, and iOS then
 * refuses to start the app at all (dyld "Symbol not found"). Android resolves lazily and runs, so
 * the break shows only on an iPhone: expo-image-manipulator 58.0.16 did this on 2026-11-26.
 * Modules built from source with the app (no `prebuilds/output`) link against the same core and
 * are not at risk. Upgrade with `npx expo install --fix` (which moves `expo` too), never one
 * prebuilt module ahead of it.
 */
const root = process.cwd();
const req = createRequire(join(root, 'package.json'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
const expected = req('expo/bundledNativeModules.json') as Record<string, string>;

const parts = (v: string) => v.replace(/^[~^]/, '').split('-')[0].split('.').map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

const prebuilt = (name: string) => existsSync(join(dirname(req.resolve(`${name}/package.json`)), 'prebuilds', 'output'));

describe('expo native modules (iOS prebuilds)', () => {
  it('finds the prebuilt modules it guards', () => {
    assert.ok(Object.keys(pkg.dependencies).filter((name) => expected[name] && prebuilt(name)).length > 0);
  });

  it('no prebuilt module is newer than the version the installed expo picks', () => {
    const ahead = Object.keys(pkg.dependencies)
      .filter((name) => expected[name] && prebuilt(name))
      .map((name) => ({ name, installed: (req(`${name}/package.json`) as { version: string }).version, picked: expected[name] }))
      .filter(({ installed, picked }) => newer(installed, picked))
      .map(({ name, installed, picked }) => `${name} ${installed} > ${picked}`);
    assert.deepEqual(ahead, []);
  });
});

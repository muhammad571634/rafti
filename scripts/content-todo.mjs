// scripts/content-todo.mjs
// Shows a translator only the strings a language still lacks, and puts the answers back without touching the rest.
//
//   node scripts/content-todo.mjs                  how many strings each language still lacks
//   node scripts/content-todo.mjs export ru        writes .content-todo/ru.json: the missing strings in English, en.json's shape
//   node scripts/content-todo.mjs merge ru         lays .content-todo/ru.json over src/i18n/content/ru.json
//   node scripts/content-todo.mjs merge ru --final also accepts strings still the same as the English (names, loanwords)
//
// In an exported array, `null` marks an item the language already has: leave it as null.
// A merge skips what is still in English, so a half-done file is safe: export again to see what is left.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'src', 'i18n', 'content');
const todoDir = path.join(rootDir, '.content-todo');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const isObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

const en = readJson(path.join(contentDir, 'en.json'));
const localeFile = (code) => path.join(contentDir, `${code}.json`);
const todoFile = (code) => path.join(todoDir, `${code}.json`);

/** What `local` lacks of `base`, or undefined when it lacks nothing. */
function missing(base, local) {
  if (typeof base === 'string') return typeof local === 'string' && local.trim() ? undefined : base;
  if (Array.isArray(base)) {
    const have = Array.isArray(local) && local.length === base.length ? local : [];
    const items = base.map((x, i) => missing(x, have[i]));
    return items.every((x) => x === undefined) ? undefined : items.map((x) => (x === undefined ? null : x));
  }
  const out = {};
  for (const key of Object.keys(base)) {
    const left = missing(base[key], isObject(local) ? local[key] : undefined);
    if (left !== undefined) out[key] = left;
  }
  return Object.keys(out).length ? out : undefined;
}

/** `local` with the answers of `todo` laid over it, in the order of `base`; anything else in `local` is dropped. */
function merged(base, local, todo, final) {
  if (typeof base === 'string') {
    const answered = typeof todo === 'string' && todo.trim() && (final || todo !== base);
    return answered ? todo : local;
  }
  if (Array.isArray(base)) {
    const have = Array.isArray(local) && local.length === base.length ? local : [];
    const items = base.map((x, i) => merged(x, have[i], Array.isArray(todo) ? todo[i] : undefined, final));
    return items.some((x) => x !== undefined) ? items : undefined;
  }
  const out = {};
  for (const key of Object.keys(base)) {
    const value = merged(base[key], isObject(local) ? local[key] : undefined, isObject(todo) ? todo[key] : undefined, final);
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

const countStrings = (node) => {
  if (typeof node === 'string') return 1;
  if (Array.isArray(node)) return node.reduce((sum, x) => sum + countStrings(x), 0);
  return isObject(node) ? Object.values(node).reduce((sum, x) => sum + countStrings(x), 0) : 0;
};

const [command, code, flag] = process.argv.slice(2);

if (!command) {
  for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith('.json') && f !== 'en.json').sort()) {
    console.log(`${file.replace(/\.json$/, '').padEnd(8)}${countStrings(missing(en, readJson(path.join(contentDir, file))))}`);
  }
  process.exit(0);
}

if (!['export', 'merge'].includes(command) || !code || !fs.existsSync(localeFile(code))) {
  console.error('Usage: node scripts/content-todo.mjs [export <code> | merge <code> [--final]]');
  process.exit(1);
}

if (command === 'export') {
  const todo = missing(en, readJson(localeFile(code))) ?? {};
  fs.mkdirSync(todoDir, { recursive: true });
  writeJson(todoFile(code), todo);
  console.log(`${code}: ${countStrings(todo)} strings to translate in ${path.relative(rootDir, todoFile(code))}`);
} else {
  if (!fs.existsSync(todoFile(code))) {
    console.error(`Nothing to merge: run export ${code} first.`);
    process.exit(1);
  }
  const next = merged(en, readJson(localeFile(code)), readJson(todoFile(code)), flag === '--final');
  writeJson(localeFile(code), next);
  console.log(`${code}: ${countStrings(missing(en, next))} strings left. Now run: node scripts/check-content.mjs ${code}`);
}

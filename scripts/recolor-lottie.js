#!/usr/bin/env node
/**
 * Recolour a Lottie file so a downloaded animation matches the app palette.
 *
 *   node scripts/recolor-lottie.js <file.json> 333a4e=FFB3CF 212432=FF5E9A ...
 *   node scripts/recolor-lottie.js <file.json> --list
 *
 * `--list` prints every colour the file uses (as hex) with how often it appears,
 * so you can decide what to map. Colours are matched exactly; Lottie stores them
 * as 0..1 RGBA arrays, which is what makes an exact match reliable here.
 *
 * Writes in place. Handles solid fills/strokes (`c.k`) and gradient stop arrays
 * (`g.k.k`), including animated values.
 */
const fs = require('fs');
const path = require('path');

const toHex = (rgb) =>
  rgb
    .slice(0, 3)
    .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex) => [
  parseInt(hex.slice(0, 2), 16) / 255,
  parseInt(hex.slice(2, 4), 16) / 255,
  parseInt(hex.slice(4, 6), 16) / 255,
];

function eachSolidColor(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((child) => eachSolidColor(child, visit));
    return;
  }
  if (!node || typeof node !== 'object') return;

  const c = node.c;
  if (c && Array.isArray(c.k)) {
    if (typeof c.k[0] === 'number') {
      visit(c.k);
    } else {
      // animated: each keyframe holds start/end values
      c.k.forEach((kf) => {
        if (Array.isArray(kf.s) && typeof kf.s[0] === 'number') visit(kf.s);
        if (Array.isArray(kf.e) && typeof kf.e[0] === 'number') visit(kf.e);
      });
    }
  }

  Object.values(node).forEach((child) => eachSolidColor(child, visit));
}

function eachGradientColor(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((child) => eachGradientColor(child, visit));
    return;
  }
  if (!node || typeof node !== 'object') return;

  // Gradient stops are flat: [offset, r, g, b, offset, r, g, b, ...]
  if (node.g && node.g.k && Array.isArray(node.g.k.k) && typeof node.g.k.k[0] === 'number') {
    const stops = node.g.k.k;
    const count = node.g.p ?? Math.floor(stops.length / 4);
    for (let i = 0; i < count; i += 1) {
      const at = i * 4 + 1;
      if (at + 2 < stops.length) visit(stops, at);
    }
  }

  Object.values(node).forEach((child) => eachGradientColor(child, visit));
}

function main() {
  const [file, ...rest] = process.argv.slice(2);

  if (!file) {
    console.error('usage: node scripts/recolor-lottie.js <file.json> [--list] [from=to ...]');
    process.exit(1);
  }

  const full = path.resolve(file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));

  if (rest.includes('--list') || rest.length === 0) {
    const counts = {};
    const tally = (rgb) => {
      const hex = toHex(rgb);
      counts[hex] = (counts[hex] || 0) + 1;
    };
    eachSolidColor(json, tally);
    eachGradientColor(json, (stops, at) => tally(stops.slice(at, at + 3)));

    console.log(path.basename(full));
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([hex, n]) => console.log(`  #${hex}  x${n}`));
    return;
  }

  const map = new Map();
  for (const pair of rest) {
    const [from, to] = pair.split('=');
    if (!from || !to) continue;
    map.set(from.replace('#', '').toLowerCase(), fromHex(to.replace('#', '')));
  }

  let changed = 0;

  eachSolidColor(json, (rgb) => {
    const next = map.get(toHex(rgb));
    if (!next) return;
    rgb[0] = next[0];
    rgb[1] = next[1];
    rgb[2] = next[2];
    changed += 1;
  });

  eachGradientColor(json, (stops, at) => {
    const next = map.get(toHex(stops.slice(at, at + 3)));
    if (!next) return;
    stops[at] = next[0];
    stops[at + 1] = next[1];
    stops[at + 2] = next[2];
    changed += 1;
  });

  fs.writeFileSync(full, JSON.stringify(json));
  console.log(`${path.basename(full)}: recoloured ${changed} value(s)`);
}

main();

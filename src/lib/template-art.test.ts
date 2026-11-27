import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { coverFocus, PORTRAIT_ASPECT, portraitFace, TEMPLATE_FACES } from './portrait-focus';
import { TEMPLATE_IDS } from './templates';

const root = process.cwd();
const portraitsSrc = fs.readFileSync(path.join(root, 'assets/portraits/registry.ts'), 'utf8');
const avatarsSrc = fs.readFileSync(path.join(root, 'assets/avatars/registry.ts'), 'utf8');
/** Template ids with a painting registered (docs/nano-banana-story-templates.md). */
const painted = [...portraitsSrc.matchAll(/^\s+(t_[a-z]+): require\('\.\/(t_[a-z]+)\.jpg'\)/gm)].map((m) => {
  assert.equal(m[1], m[2], `${m[1]} points at another file`);
  return m[1];
});

describe('story template pictures', () => {
  it('belong to real templates, each with a scene, a square avatar and both files', () => {
    assert.ok(painted.length >= 16);
    for (const id of painted) {
      assert.ok(TEMPLATE_IDS.has(id), `${id} is not a template`);
      assert.ok(fs.existsSync(path.join(root, 'assets/portraits', `${id}.jpg`)), `missing scene file for ${id}`);
      assert.ok(avatarsSrc.includes(`  ${id}: require('./${id}_avatar.jpg'),`), `missing avatar registry for ${id}`);
      assert.ok(fs.existsSync(path.join(root, 'assets/avatars', `${id}_avatar.jpg`)), `missing avatar file for ${id}`);
    }
  });

  it('has a measured face for every painted template, and none for one without a painting', () => {
    assert.deepEqual([...painted].sort(), Object.keys(TEMPLATE_FACES).sort());
    for (const id of painted) {
      const face = portraitFace(id);
      assert.ok(face.x > 0 && face.x < 1 && face.y > 0 && face.y < 1, id);
    }
  });

  it('keeps every template face inside a full phone screen (the chat ground)', () => {
    const phone = 1080 / 2400;
    for (const id of painted) {
      const face = portraitFace(id);
      const pos = coverFocus(face, PORTRAIT_ASPECT, phone, 0.5);
      // Cover fit on a narrow screen crops the sides only: where the face lands across.
      const width = PORTRAIT_ASPECT / phone;
      const x = pos.left * (1 - width) + face.x * width;
      assert.ok(x > 0.1 && x < 0.9, `${id} lands at ${x.toFixed(2)} across`);
    }
  });
});

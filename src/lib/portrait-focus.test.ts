import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { coverFocus, PORTRAIT_ASPECT, PORTRAIT_FACES, portraitFace, portraitStretch, stretchLeft } from './portrait-focus';

/** Where the face ends up in the frame (0..1 across, 0..1 down) for a cover-fit picture and its position. */
function landed(face: { x: number; y: number }, imageAspect: number, frameAspect: number, pos: { left: number; top: number }) {
  const width = Math.max(frameAspect, imageAspect);
  const height = width / imageAspect;
  const x = (pos.left * (frameAspect - width) + face.x * width) / frameAspect;
  const y = pos.top * (1 - height) + face.y * height;
  return { x, y };
}

describe('portrait focus', () => {
  it('has a face for every one of the twelve, inside the picture', () => {
    assert.equal(Object.keys(PORTRAIT_FACES).length, 12);
    for (const face of Object.values(PORTRAIT_FACES)) {
      assert.ok(face.x > 0 && face.x < 1 && face.y > 0 && face.y < 1);
    }
  });

  it('keeps every face on a full phone screen (the chat ground)', () => {
    const phone = 1080 / 2400;
    for (const [id, face] of Object.entries(PORTRAIT_FACES)) {
      const at = landed(face, PORTRAIT_ASPECT, phone, coverFocus(face, PORTRAIT_ASPECT, phone, 0.5));
      assert.ok(at.x > 0.15 && at.x < 0.85, `${id} lands at ${at.x.toFixed(2)} across`);
      assert.ok(at.y > 0.05 && at.y < 0.5, `${id} lands at ${at.y.toFixed(2)} down`);
    }
  });

  it('brings Clara (face at the top right) into a full screen, which the middle crop cut off', () => {
    const phone = 1080 / 2400;
    const face = portraitFace('c_clara');
    const middle = landed(face, PORTRAIT_ASPECT, phone, { left: 0.5, top: 0 });
    const framed = landed(face, PORTRAIT_ASPECT, phone, coverFocus(face, PORTRAIT_ASPECT, phone, 0.5));
    assert.ok(middle.x > 0.95, 'the old middle crop puts her face on the edge');
    // As far as the painting allows: its right edge meets the screen's, her face well inside.
    assert.ok(framed.x > 0.5 && framed.x < 0.7, `lands at ${framed.x.toFixed(2)}`);
  });

  it('puts the face on the trailing side of a card wider than the picture (Today)', () => {
    const width = 1080;
    const aspect = 1080 / 1200;
    for (const [id, face] of Object.entries(PORTRAIT_FACES)) {
      const stretch = portraitStretch(face, aspect, 0.68, 1.36);
      assert.ok(stretch >= 1 && stretch <= 1.36);
      const left = stretchLeft(width, stretch, 0.68, face.x);
      const x = (left + face.x * width * stretch) / width;
      assert.ok(x > 0.55 && x < 0.9, `${id} lands at ${x.toFixed(2)} across`);
    }
  });

  it('keeps the old middle placement when no face is given', () => {
    assert.equal(stretchLeft(1000, 1.36, 0.68), Math.min(0, Math.max(1000 - 1360, 680 - 680)));
    assert.deepEqual(portraitFace('c_someone_made'), { x: 0.5, y: 0.2 });
  });

  it('leaves an axis with no slack in the middle', () => {
    assert.deepEqual(coverFocus({ x: 0.9, y: 0.1 }, 1, 1), { left: 0.5, top: 0.5 });
  });
});

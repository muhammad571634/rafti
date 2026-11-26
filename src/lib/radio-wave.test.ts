import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hexToRgb01, lineAt, lineStartSeconds } from './radio-clips';

describe('radio wave line markers & accent color math', () => {
  it('computes monotonically increasing start seconds that align with lineAt', () => {
    const lines = ['Rain is tapping on the window.', 'Take a slow breath with me.', 'I am right here tonight.'];
    const starts = lineStartSeconds(lines);
    assert.equal(starts.length, lines.length);
    assert.equal(starts[0], 0);
    for (let i = 0; i < starts.length; i++) {
      assert.equal(lineAt(lines, starts[i] + 0.05), i);
      if (i > 0) assert.ok(starts[i] > starts[i - 1]);
    }
  });

  it('parses valid hex colors into normalized 0..1 RGB and falls back safely', () => {
    const [r, g, b] = hexToRgb01('#FF8000');
    assert.equal(r, 1);
    assert.ok(Math.abs(g - 128 / 255) < 0.001);
    assert.equal(b, 0);

    const fb = hexToRgb01('invalid');
    assert.equal(fb.length, 3);
    assert.ok(fb[0] > 0.8 && fb[1] > 0.5);
  });
});

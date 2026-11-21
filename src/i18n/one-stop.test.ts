import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { endOneStop } from './one-stop';

describe('one stop at a sentence end', () => {
  it('folds an abbreviated date and the sentence stop into one', () => {
    assert.equal(endOneStop('Deine 2.000 Abo-Muscheln kommen wieder am 8. Dez..'), 'Deine 2.000 Abo-Muscheln kommen wieder am 8. Dez.');
  });
  it('leaves an ellipsis and plain sentences alone', () => {
    assert.equal(endOneStop('Wait... what?'), 'Wait... what?');
    assert.equal(endOneStop('Back on Dec 8.'), 'Back on Dec 8.');
  });
});

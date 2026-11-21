import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ANDROID_AWAY_MS, androidShareOutcome, canPayShare, iosShareOutcome } from './share-outcome';

describe('a share pays only when the picture went somewhere (0z160)', () => {
  it('iOS: a completed share to a social or messaging app is posted', () => {
    assert.equal(iosShareOutcome('sharedAction', 'com.burbn.instagram.shareextension'), 'posted');
    assert.equal(iosShareOutcome('sharedAction', 'ph.telegra.Telegraph.Share'), 'posted');
    assert.equal(iosShareOutcome('sharedAction', 'com.apple.UIKit.activity.Message'), 'posted');
  });

  it('iOS: saving, copying or printing keeps it on the phone, and a cancel is a cancel', () => {
    assert.equal(iosShareOutcome('sharedAction', 'com.apple.UIKit.activity.SaveToCameraRoll'), 'kept');
    assert.equal(iosShareOutcome('sharedAction', 'com.apple.UIKit.activity.CopyToPasteboard'), 'kept');
    assert.equal(iosShareOutcome('dismissedAction', null), 'dismissed');
  });

  it('Android: a quick return is a cancel; staying in the picked app counts', () => {
    assert.equal(androidShareOutcome(900), 'dismissed');
    assert.equal(androidShareOutcome(ANDROID_AWAY_MS - 1), 'dismissed');
    assert.equal(androidShareOutcome(ANDROID_AWAY_MS), 'posted');
    assert.equal(androidShareOutcome(25_000), 'posted');
  });

  it('one card pays once a day', () => {
    assert.equal(canPayShare(undefined, 'chat:c_hana'), true);
    assert.equal(canPayShare(['chat:c_hana'], 'chat:c_hana'), false);
    assert.equal(canPayShare(['chat:c_hana'], 'chat:c_zarek'), true);
    assert.equal(canPayShare(['chat:c_hana'], undefined), true);
  });
});

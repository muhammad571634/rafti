import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldEnableBackup, shouldSyncOnLaunch } from './backup-default';

describe('automatic cloud backup after AI consent', () => {
  it('stays off before the user consents to the AI & backup notice', () => {
    assert.equal(shouldEnableBackup({}), false);
    assert.equal(shouldSyncOnLaunch({}), false);
  });

  it('auto-enables backup once consented when the user has never explicitly turned it off', () => {
    const consented = { aiConsentAt: '2026-11-27T10:00:00Z' };
    assert.equal(shouldEnableBackup(consented), true);
    assert.equal(shouldSyncOnLaunch(consented), true);
  });

  it('does not re-enable backup when already on, and keeps syncing on launch', () => {
    const active = { aiConsentAt: '2026-11-27T10:00:00Z', serverMessages: true };
    assert.equal(shouldEnableBackup(active), false);
    assert.equal(shouldSyncOnLaunch(active), true);
  });

  it('strictly respects explicit opt-out in Profile (serverMessages === false)', () => {
    const optedOut = { aiConsentAt: '2026-11-27T10:00:00Z', serverMessages: false };
    assert.equal(shouldEnableBackup(optedOut), false);
    assert.equal(shouldSyncOnLaunch(optedOut), false);
  });
});

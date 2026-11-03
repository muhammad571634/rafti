import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayKey } from '../mock/time';
import { dailyNoteStep } from './daily-note';
import type { Message, SecretNote } from '@/types';

const now = new Date(2026, 10, 3, 9, 0);
const today = dayKey(now);
const yesterday = dayKey(new Date(2026, 10, 2, 9, 0));
const note = (status: SecretNote['status'], date = yesterday, characterId = 'kai'): SecretNote => ({
  id: `${characterId}-${date}-${status}`,
  characterId,
  date,
  prompt: 'A place you would go back to?',
  myNote: '',
  status,
});
const helpline = (at: Date): Message => ({ id: 'h', conversationId: 'c', author: 'them', kind: 'text', text: '', card: 'helpline', createdAt: at.toISOString() });

describe("Today's sealed note", () => {
  it('is written once a day by the friend you talked with last', () => {
    assert.equal(dailyNoteStep([], 'kai', [], now), 'new');
    assert.equal(dailyNoteStep([note('exchanged')], 'kai', [], now), 'new');
    assert.equal(dailyNoteStep([note('exchanged', today)], 'kai', [], now), null);
    // A note the user started today with someone else counts as today's.
    assert.equal(dailyNoteStep([note('exchanged', today, 'iris')], 'kai', [], now), null);
  });

  it('waits while a sealed note is still unopened, from anyone', () => {
    assert.equal(dailyNoteStep([note('ready')], 'kai', [], now), null);
    assert.equal(dailyNoteStep([note('ready', yesterday, 'iris')], 'kai', [], now), null);
  });

  it('asks again for their note when the model was busy', () => {
    assert.equal(dailyNoteStep([note('composing', today)], 'kai', [], now), 'ask');
    assert.equal(dailyNoteStep([note('composing'), note('exchanged', yesterday, 'iris')], 'kai', [], now), 'ask');
  });

  it('stays away on a day with a helpline card in that chat', () => {
    assert.equal(dailyNoteStep([], 'kai', [helpline(new Date(2026, 10, 3, 1, 0))], now), null);
    assert.equal(dailyNoteStep([note('composing', today)], 'kai', [helpline(new Date(2026, 10, 3, 8, 0))], now), null);
    // Yesterday's card does not keep today's note away.
    assert.equal(dailyNoteStep([], 'kai', [helpline(new Date(2026, 10, 2, 23, 0))], now), 'new');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sceneOpenCue } from '../ai/moment-prompt';
import { cleanWrite, parseWrite, WRITE_KINDS, writeParts, type WriteRequest } from '../ai/writes';
import { officialScenes } from '../mock/scenes';
import type { Character, Scene, User } from '@/types';

import { currentMoments, isWrittenMoment, momentFeed, momentSceneId, MOMENTS_COUNT, momentScenes, quotesOpening, type WrittenMoment } from './friend-moments';

const character = { id: 'c_ex', name: 'Mira', bio: 'Your ex. Still has your hoodie.', greeting: 'Hi.', tags: [] } as unknown as Character;
const user = { displayName: 'Sam', locale: 'en-US' } as User;
const now = new Date('2026-11-17T10:00:00.000Z');

const moment = (n: number, over: Partial<WrittenMoment> = {}): WrittenMoment => ({
  title: `Moment ${n}`,
  setting: `The two of you are at place ${n}. Something is already happening.`,
  line: `Line ${n}, said by them.`,
  ...over,
});

describe('momentScenes', () => {
  it('turns what the friend wrote into scenes of their own, with their first line', () => {
    const scenes = momentScenes('c_ex', '2026-W47', [moment(1, { role: 'The one who left' }), moment(2)], now);
    assert.equal(scenes.length, 2);
    assert.deepEqual(scenes[0], {
      id: momentSceneId('c_ex', '2026-W47', 0),
      title: 'Moment 1',
      setting: 'The two of you are at place 1. Something is already happening.',
      userRole: 'The one who left',
      opening: 'Line 1, said by them.',
      characterId: 'c_ex',
      createdAt: now.toISOString(),
    });
    assert.ok(!('userRole' in scenes[1]));
    assert.ok(scenes.every(isWrittenMoment));
  });

  it('leaves out a moment that breaks the scene rules, a repeat, and one with no line', () => {
    const scenes = momentScenes(
      'c_ex',
      '2026-W47',
      [moment(1), moment(2, { setting: 'I want to kill myself here' }), moment(3, { role: 'A high school student' }), moment(4, { line: ' ' }), moment(1), moment(5)],
      now,
    );
    assert.deepEqual(scenes.map((s) => s.title), ['Moment 1', 'Moment 5']);
    // Ids follow what was kept, so they stay unique.
    assert.deepEqual(scenes.map((s) => s.id), [momentSceneId('c_ex', '2026-W47', 0), momentSceneId('c_ex', '2026-W47', 1)]);
  });

  it('keeps nothing when too few are left, and never more than a week holds', () => {
    assert.deepEqual(momentScenes('c_ex', '2026-W47', [moment(1)], now), []);
    assert.equal(momentScenes('c_ex', '2026-W47', [1, 2, 3, 4, 5, 6].map((n) => moment(n)), now).length, MOMENTS_COUNT);
  });

  it('cuts overlong text to what a scene may hold', () => {
    const [scene] = momentScenes('c_ex', '2026-W47', [moment(1, { title: 'T'.repeat(90), line: 'L'.repeat(400) }), moment(2)], now);
    assert.equal(scene.title.length, 40);
    assert.equal(scene.opening?.length, 200);
  });
});

describe('what the page shows', () => {
  const written = momentScenes('c_ex', '2026-W47', [moment(1), moment(2)], now);
  const own: Scene[] = [{ id: 'scene_mine', title: 'Mine', setting: 'Somewhere.', opening: 'My line.', createdAt: now.toISOString() }];

  it('keeps moments only for their week and language', () => {
    const kept = { week: '2026-W47', lang: 'en', scenes: written };
    assert.equal(currentMoments(kept, '2026-W47', 'en').length, 2);
    assert.deepEqual(currentMoments(kept, '2026-W48', 'en'), []);
    assert.deepEqual(currentMoments(kept, '2026-W47', 'ru'), []);
    assert.deepEqual(currentMoments(undefined, '2026-W47', 'en'), []);
  });

  it('orders theirs, then the user’s, then the app’s, each once and no world entry scene', () => {
    const world: Scene = { id: 'scene_world', title: 'World', setting: 'A world.', official: true, series: 'w', createdAt: now.toISOString() };
    const feed = momentFeed(written, own, [...officialScenes, world, officialScenes[0]]);
    assert.deepEqual(feed.slice(0, 3).map((s) => s.id), [written[0].id, written[1].id, 'scene_mine']);
    assert.equal(feed.length, 3 + officialScenes.filter((s) => !s.series).length);
    assert.ok(!feed.some((s) => s.id === 'scene_world'));
  });

  it('quotes a first line only when it is really theirs to say', () => {
    assert.equal(quotesOpening(written[0], true), true);
    assert.equal(quotesOpening(own[0], true), true);
    // The app's stock line: with the model on they write their own, so the card stays silent.
    assert.equal(quotesOpening(officialScenes[0], true), false);
    assert.equal(quotesOpening(officialScenes[0], false), true);
    assert.equal(quotesOpening({ id: 'scene_x', opening: ' ' }, false), false);
  });
});

describe('the moments write', () => {
  const request = { kind: 'moments', week: '2026-W47', input: { character, user } } as WriteRequest & { kind: 'moments' };
  const prompt = () => writeParts(request).map((p) => p.text).join('\n');

  it('is a write kind the server lets through', () => {
    assert.ok(WRITE_KINDS.includes('moments'));
    const clean = cleanWrite({ kind: 'moments', week: '2026-W47-and-far-too-long', input: { character, user } });
    assert.equal(clean?.kind, 'moments');
    assert.equal(clean?.kind === 'moments' && clean.week, '2026-W47-and');
  });

  it('asks for as many moments as a week holds, as the friend, in the reply language', () => {
    const text = prompt();
    assert.match(text, new RegExp(`Write ${MOMENTS_COUNT} moments`));
    assert.match(text, /Mira/);
    assert.match(text, /"line": the first thing you say/);
    assert.match(text, /Shape: \{"moments":\[\{"title":"","setting":"","role":"","line":""\}\]\}/);
    assert.match(text, /REPLY LANGUAGE/);
  });

  it('reads an answer, dropping broken moments and keeping the rest', () => {
    const raw = JSON.stringify({ moments: [moment(1, { role: '' }), { title: 'No line', setting: 'x' }, moment(2, { role: 'Their neighbour' }), 'junk'] });
    assert.deepEqual(parseWrite(request, `Here you go:\n${raw}`), {
      moments: [
        { title: 'Moment 1', setting: moment(1).setting, line: moment(1).line },
        { title: 'Moment 2', setting: moment(2).setting, line: moment(2).line, role: 'Their neighbour' },
      ],
    });
    assert.equal(parseWrite(request, JSON.stringify({ moments: [moment(1)] })), null);
    assert.equal(parseWrite(request, '{"moments":"none"}'), null);
    assert.equal(parseWrite(request, JSON.stringify({ moments: [1, 2, 3, 4, 5, 6, 7].map((n) => moment(n)) }))?.moments.length, MOMENTS_COUNT);
  });
});

describe('a scene’s first line from the model', () => {
  it('tells them the scene and that it must be opened', () => {
    const cue = sceneOpenCue({ title: 'Night ferry', setting: 'The last ferry of the night.', userRole: 'A traveller' }).join('\n');
    assert.match(cue, /"Night ferry"/);
    assert.match(cue, /The last ferry of the night\./);
    assert.match(cue, /Who they are in it: A traveller/);
    assert.match(cue, /never skip/);
    assert.doesNotMatch(sceneOpenCue({ title: 'T', setting: 'S' }).join('\n'), /Who they are/);
  });
});

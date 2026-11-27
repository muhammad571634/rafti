import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { MIN_AGE, TRAITS } from './create-character';
import { BEAT_TURNS, beatOpenCue, countTurn, GROUP_STORIES, memberMark, nextBeat, storyCue, storyFits } from './group-stories';

describe('group stories (docs/group-stories.md)', () => {
  it('are unique, adult, two or three members each, with traits from the Create list', () => {
    assert.equal(new Set(GROUP_STORIES.map((s) => s.id)).size, GROUP_STORIES.length);
    for (const story of GROUP_STORIES) {
      assert.ok(story.members.length >= 2 && story.members.length <= 3, story.id);
      assert.equal(new Set(story.members.map((m) => m.id)).size, story.members.length, story.id);
      for (const m of story.members) {
        assert.ok(m.age >= MIN_AGE, `${story.id}:${m.id} age`);
        for (const tag of m.tags) assert.ok((TRAITS as readonly string[]).includes(tag), `${story.id}:${m.id} ${tag}`);
      }
    }
  });

  it('have scenes whose leads are members', () => {
    for (const story of GROUP_STORIES) {
      assert.ok(story.beats.length >= 3, story.id);
      for (const beat of story.beats) assert.ok(beat.lead >= 0 && beat.lead < story.members.length, `${story.id} ${beat.title}`);
    }
  });

  it('count the user’s messages and are ripe for a cut after BEAT_TURNS', () => {
    const story = GROUP_STORIES[0];
    let state = { id: story.id, beat: 0, turns: 0 };
    let ripe = false;
    for (let i = 0; i < BEAT_TURNS; i++) ({ state, cut: ripe } = countTurn(state, story));
    assert.equal(state.turns, BEAT_TURNS);
    assert.ok(ripe);
  });

  it('cut to the next scene, then end after the last', () => {
    const story = GROUP_STORIES[0];
    let state = nextBeat({ id: story.id, beat: 0, turns: 4 }, story);
    assert.deepEqual(state, { id: story.id, beat: 1, turns: 0 });
    state = nextBeat({ id: story.id, beat: story.beats.length - 1, turns: 2 }, story);
    assert.equal(state.done, true);
    assert.equal(countTurn(state, story).cut, false);
    // Ended: one line of shared past, so they still remember it.
    const after = storyCue(story, state, { title: '', setting: '', userRole: '' });
    assert.equal(after.length, 1);
    assert.match(after[0], /it is over now/);
  });

  it('cue fits the server’s eight lines with a turn’s own cue', () => {
    const story = GROUP_STORIES[1];
    const cue = storyCue(story, { id: story.id, beat: 4, turns: 0 }, { title: 'T', setting: 'S', userRole: 'You: the new hire' });
    assert.ok(cue.length + beatOpenCue('Eli and Max').length <= 8);
    assert.match(cue.join('\n'), /last scene/);
    assert.match(cue[0], /The user is the new hire\./);
  });

  it('fit Him / Her only when every member does', () => {
    const dorm = GROUP_STORIES.find((s) => s.id === 'g_dorm214')!;
    const ring = GROUP_STORIES.find((s) => s.id === 'g_ring')!;
    assert.ok(storyFits(dorm, 'female') && !storyFits(dorm, 'male') && storyFits(dorm, undefined));
    assert.ok(!storyFits(ring, 'female') && !storyFits(ring, 'male'));
  });

  it('register a bundled 3:4 cover and 1:1 member avatars for every story', () => {
    const root = path.resolve(process.cwd());
    const portraitsSrc = fs.readFileSync(path.join(root, 'assets/portraits/registry.ts'), 'utf8');
    const avatarsSrc = fs.readFileSync(path.join(root, 'assets/avatars/registry.ts'), 'utf8');
    for (const story of GROUP_STORIES) {
      assert.ok(portraitsSrc.includes(`${story.id}: require('./${story.id}.jpg')`), `missing portrait registry for ${story.id}`);
      assert.ok(fs.existsSync(path.join(root, 'assets/portraits', `${story.id}.jpg`)), `missing portrait file for ${story.id}`);
      for (const m of story.members) {
        const mark = memberMark(story.id, m.id);
        const file = `${story.id}_${m.id}_avatar.jpg`;
        assert.ok(avatarsSrc.includes(`'${mark}': require('./${file}')`), `missing avatar registry for ${mark}`);
        assert.ok(fs.existsSync(path.join(root, 'assets/avatars', file)), `missing avatar file for ${mark}`);
      }
    }
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectCare, saysBetter } from './care';
import {
  allReachKeys,
  careReach,
  everydayIdeas,
  helloReach,
  IDEA_TTL_MS,
  ideaCategory,
  ideaEffect,
  ideasCue,
  ideasFor,
  lifeReach,
  reachCare,
  shownIdeas,
  writtenIdeas,
} from './reply-ideas';
import { ideaAnswer } from '../mock/reply-ideas';
import type { Message } from '@/types';

const at = (min: number) => new Date(Date.UTC(2026, 9, 26, 12, min)).toISOString();
const line = (id: string, author: 'me' | 'them', min: number, extra: Partial<Message> = {}): Message => ({
  id,
  conversationId: 'c',
  author,
  kind: 'text',
  text: id,
  createdAt: at(min),
  ...extra,
});

describe('reply ideas', () => {
  it('give every line they write first two or three short ideas with an intent', () => {
    for (const reach of allReachKeys()) {
      const ideas = ideasFor(reach);
      assert.ok(ideas.length >= 2 && ideas.length <= 3, reach);
      for (const idea of ideas) {
        assert.ok(idea.intent, reach);
        assert.ok(idea.label.length <= 18, `${reach}: ${idea.label}`);
        assert.ok(ideaAnswer(reach, idea.intent!, 'seed').length > 0);
      }
    }
    assert.deepEqual(ideasFor('unknown:thing'), []);
  });

  it('let the chat act on what an idea says: skipped lunch and a long day open check-ins', () => {
    const lunch = ideasFor(lifeReach('parent', 'lunch'));
    assert.equal(detectCare(lunch.find((i) => i.intent === 'no')!.text), 'hungry');
    assert.equal(detectCare(ideasFor(lifeReach('parent', 'evening')).find((i) => i.intent === 'rough')!.text), 'tired');
    assert.equal(detectCare(ideasFor(lifeReach('grandparent', 'morning')).find((i) => i.intent === 'rough')!.text), 'tired');
    assert.equal(detectCare(ideasFor(helloReach('parent')).find((i) => i.intent === 'rough')!.text), 'sad');
  });

  it('close a check-in on "better" and never reopen one on "still not great"', () => {
    for (const reach of allReachKeys().filter((r) => r.startsWith('care:'))) {
      const ideas = ideasFor(reach);
      const better = ideas.find((i) => i.intent === 'better')!.text;
      const worse = ideas.find((i) => i.intent === 'worse')!.text;
      if (reach !== 'care:hungry') assert.ok(saysBetter(better), better);
      assert.equal(detectCare(worse), null, worse);
      assert.equal(saysBetter(worse), false, worse);
    }
  });

  it('ask once more after "still not great", never a third time', () => {
    assert.equal(ideaEffect(careReach('headache'), 'worse'), 'askAgain');
    assert.equal(ideaEffect(careReach('headache', true), 'worse'), null);
    assert.equal(ideaEffect(careReach('headache'), 'better'), null);
    assert.equal(ideaEffect(lifeReach('parent', 'lunch'), 'worse'), null);
    assert.equal(reachCare(careReach('sick', true)), 'sick');
    assert.deepEqual(ideasFor(careReach('sick', true)), ideasFor(careReach('sick')));
  });

  it('name push action sets without ":" or "-"', () => {
    for (const reach of allReachKeys()) assert.match(ideaCategory(reach), /^[a-z_]+$/);
    assert.equal(ideaCategory(careReach('tired', true)), ideaCategory(careReach('tired')));
  });

  it('show only under the newest line, before the user writes, while fresh', () => {
    const ideas = ideasFor(lifeReach('parent', 'lunch'));
    const asked = line('asked', 'them', 0, { ideas, reach: lifeReach('parent', 'lunch') });
    const now = Date.parse(at(5));
    assert.equal(shownIdeas(asked, [asked], now), ideas);
    assert.equal(shownIdeas(asked, [asked, line('mine', 'me', 2)], now), null);
    assert.equal(shownIdeas(asked, [asked, line('notice', 'them', 3, { kind: 'system' })], now), ideas);
    assert.equal(shownIdeas(asked, [asked], Date.parse(at(0)) + IDEA_TTL_MS + 1), null);
    assert.equal(shownIdeas(line('plain', 'them', 0), [line('plain', 'them', 0)], now), null);
  });

  it('answer a question when they asked one, else react', () => {
    assert.deepEqual(everydayIdeas('Do you want to go swimming tomorrow?', 'a').map((i) => i.label), ['Yes 🙂', 'Not really', 'Why do you ask?']);
    assert.equal(everydayIdeas('Haha. What did you eat today?', 'a')[1].label, 'You first!');
    const react = everydayIdeas('I saw a cat today.', 'm1');
    assert.equal(react.length, 2);
    assert.notEqual(react[0].label, react[1].label);
    assert.deepEqual(everydayIdeas('I saw a cat today.', 'm1'), react);
  });
});

describe('a moment’s buttons in the chat’s language (0z176)', () => {
  const stock = ideasFor('quest:t1');

  it('asks the model for each button by place and meaning', () => {
    const [cue] = ideasCue(stock);
    assert.match(cue, /exactly 2 ideas/);
    assert.match(cue, /1\) "I’m in! 💪" 2\) "Not today"/);
    assert.deepEqual(ideasCue([]), []);
  });

  it('keeps each stock button’s intent on the model’s words, by place', () => {
    const ideas = writtenIdeas(stock, [
      { label: 'Qilaman! 💪', text: 'Qilaman! 💪' },
      { label: 'Bugun emas', text: 'Bugun emas' },
    ]);
    assert.deepEqual(ideas.map((i) => [i.text, i.intent]), [['Qilaman! 💪', 'yes'], ['Bugun emas', 'no']]);
  });

  it('falls back to the stock buttons when the count is off or none came', () => {
    assert.deepEqual(writtenIdeas(stock, [{ label: 'Ha', text: 'Ha' }]), stock);
    assert.deepEqual(writtenIdeas(stock, undefined), stock);
    assert.deepEqual(writtenIdeas([], [{ label: 'Ha', text: 'Ha' }]), []);
  });
});

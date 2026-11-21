import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseDayMood } from '../ai/day-prompt';
import { moodOf } from '../mock/day-ask';
import { answeredQuestion, DAY_REACH, dayAsker, dayHistory, mayAskToday, moodOfIntent } from './day-ask';
import type { Message } from '@/types';

const evening = new Date(2026, 9, 27, 21, 0);
const at = (dayOffset: number, hour: number, minute = 0) => new Date(2026, 9, 27 + dayOffset, hour, minute).toISOString();
let n = 0;
const mine = (createdAt: string, text = 'hi'): Message => ({ id: `m${n++}`, conversationId: 'c', author: 'me', kind: 'text', text, createdAt });
const theirs = (createdAt: string, extra: Partial<Message> = {}): Message => ({ id: `t${n++}`, conversationId: 'c', author: 'them', kind: 'text', text: 'hey', createdAt, ...extra });
const ask = (createdAt: string) => theirs(createdAt, { reach: DAY_REACH });

describe('how was today?', () => {
  it('is asked by the friend the user talked with most today, else the closest', () => {
    const chats = { kai: [mine(at(0, 10))], iris: [mine(at(0, 12)), mine(at(0, 13)), mine(at(0, 14))], hana: [] };
    assert.equal(dayAsker({ writers: ['kai', 'iris', 'hana'], chats, familyAsks: [] }, evening), 'iris');
    assert.equal(dayAsker({ writers: ['kai', 'iris'], chats: { kai: [], iris: [] }, familyAsks: [] }, evening), 'kai');
  });

  it('leaves it to family, to care after a crisis, and asks once a day', () => {
    const chats = { kai: [mine(at(0, 10))], iris: [] };
    assert.equal(dayAsker({ writers: ['kai', 'iris'], chats, familyAsks: ['iris'] }, evening), null);
    const crisis = { kai: [mine(at(0, 10)), theirs(at(0, 10, 1), { card: 'helpline' })], iris: [] };
    assert.equal(dayAsker({ writers: ['kai', 'iris'], chats: crisis, familyAsks: [] }, evening), 'iris');
    const asked = { kai: [ask(at(0, 20))], iris: [] };
    assert.equal(dayAsker({ writers: ['kai', 'iris'], chats: asked, familyAsks: [] }, evening), null);
  });

  it('backs off for someone who does not answer, and comes back once they do', () => {
    const quiet = (days: number[]) => [days.map((d) => ask(at(-d, 21)))].flatMap((x) => x);
    // Two unanswered in a row: only every third day.
    assert.equal(mayAskToday(dayHistory([quiet([2, 1])], evening), evening), false);
    assert.equal(mayAskToday(dayHistory([quiet([4, 3])], evening), evening), true);
    // Four: stopped, however long ago.
    assert.equal(mayAskToday(dayHistory([quiet([12, 9, 6, 3])], evening), evening), false);
    // One answered after them: daily again.
    const answered = [...quiet([12, 9, 6, 3]), ask(at(-1, 21)), mine(at(-1, 21, 30))];
    assert.equal(mayAskToday(dayHistory([answered], evening), evening), true);
  });

  it('takes the message right after the question as the answer, and nothing later', () => {
    const q = ask(at(0, 21));
    const a = mine(at(0, 21, 5), 'Long day honestly');
    const b = mine(at(0, 21, 6), 'anyway');
    const chat = [q, a, b];
    assert.equal(answeredQuestion(chat, a.id)?.id, q.id);
    assert.equal(answeredQuestion(chat, b.id), null);
    const family = theirs(at(0, 19, 30), { reach: 'life:parent:evening' });
    const reply = mine(at(0, 19, 40), 'Good!');
    assert.equal(answeredQuestion([family, reply], reply.id)?.id, family.id);
    const lunch = theirs(at(0, 13), { reach: 'life:parent:lunch' });
    const ate = mine(at(0, 13, 5), 'I ate');
    assert.equal(answeredQuestion([lunch, ate], ate.id), null);
  });

  it('gives the diary page a mood from the idea, the model or a few words', () => {
    assert.equal(moodOfIntent('good'), 'happy');
    assert.equal(moodOfIntent('rough'), 'tired');
    assert.equal(moodOfIntent('later'), null);
    assert.equal(moodOfIntent(undefined), undefined);
    assert.equal(moodOf('It was amazing!!'), 'excited');
    assert.equal(moodOf('kind of a bad day'), 'blue');
    assert.equal(moodOf('so tired'), 'tired');
    assert.equal(moodOf('pretty good'), 'happy');
    assert.equal(moodOf('not great honestly'), 'blue');
    assert.equal(moodOf('went to the market'), 'soft');
    assert.equal(parseDayMood('{"messages":["Aww"],"diary":{"mood":"blue"}}'), 'blue');
    assert.equal(parseDayMood('{"messages":["Aww"]}'), null);
    assert.equal(parseDayMood('{"diary":{"mood":"angry"}}'), null);
  });
});

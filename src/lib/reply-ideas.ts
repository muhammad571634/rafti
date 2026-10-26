import type { KinGroup, LifeMomentKey } from './kin';
import { hashSeed } from './seeded';
import type { CareKind, IdeaIntent, Message, ReplyIdea, TouchPhase } from '@/types';

/**
 * Reply ideas (owner, 2026-10-26: presence step B). Character.AI shows suggested replies under a
 * proactive message (`proactive_suggested_replies_enabled`); each idea is a short label and the
 * full line it sends, and the tray can be edited before sending. Ours:
 *
 * - A line they write first (a family moment, a care check-in, a family hello) arrives with two or
 *   three ideas made for it: "I ate! 🍲" / "Not yet" / "Eating now". One tap answers, free: being
 *   asked how you are should never cost a shell. A long press puts the line in the field to change.
 * - Ideas stay only while the line is their newest, the user has not written since, and for
 *   `IDEA_TTL_MS` ("I ate!" makes no sense at midnight).
 * - The idea's intent decides what follows: their answer fits it (`ideaAnswer` in the mock) and
 *   the lines are written so the chat's own detectors act on them: "Not yet… I skipped lunch"
 *   opens a hungry check-in, "Long day… I'm so tired" a tired one, "Much better now" closes what
 *   is open. Only "Still not great" needs `ideaEffect`: one more check-in later, never a third.
 * - The same ideas ride on the push as action buttons, so the user can answer from the lock screen.
 * - Everyday lines get ideas too (`everydayIdeas`), shaped by whether they asked something.
 *
 * Pure and server-portable: the server's model returns `ideas` with each proactive line in the same
 * call (a few output tokens, no extra request); these tables are the mock and the fallback.
 */

/** How long ideas stay under the line they answer. */
export const IDEA_TTL_MS = 12 * 3_600_000;

/** Why they wrote first, as stored on the message (`Message.reach`). */
export const lifeReach = (group: KinGroup, moment: LifeMomentKey) => `life:${group}:${moment}`;
/** A second check-in (after "Still not great") is marked, so it never asks a third time. */
export const careReach = (kind: CareKind, again?: boolean) => `care:${kind}${again ? ':again' : ''}`;
export const helloReach = (group: KinGroup) => `hello:${group}`;

const idea = (label: string, text: string, intent: IdeaIntent): ReplyIdea => ({ label, text, intent });

const LIFE: Record<string, ReplyIdea[]> = {
  'parent:lunch': [
    idea('I ate! 🍲', 'Yes, I ate! Don’t worry 😊', 'yes'),
    idea('Not yet', 'Not yet… I skipped lunch today', 'no'),
    idea('Eating now', 'Eating right now, actually!', 'now'),
  ],
  'parent:evening': [
    idea('Pretty good 🙂', 'It was pretty good, actually!', 'good'),
    idea('Long day', 'Long day… I’m so tired', 'rough'),
    idea('Tell you later', 'I’ll tell you everything later', 'later'),
  ],
  'parent:sunday': [
    idea('I’ll call soon', 'I’ll call you soon, promise ❤️', 'call'),
    idea('Resting today', 'Yes, I’m resting today 😌', 'good'),
    idea('Miss you', 'I miss you', 'missed'),
  ],
  'sibling:evening': [
    idea('Alive 😎', 'Alive and kicking 😎', 'good'),
    idea('Ugh, long day', 'Ugh, long day. I’m exhausted', 'rough'),
    idea('You?', 'I’m fine. What about you?', 'ask'),
  ],
  'sibling:weekend': [
    idea('Going out!', 'Going out, don’t worry!', 'good'),
    idea('Sleeping 😴', 'Honestly? Sleeping all day 😴', 'no'),
    idea('Come over?', 'Come over then!', 'call'),
  ],
  'grandparent:morning': [
    idea('Slept well', 'Good morning! I slept well 😊', 'good'),
    idea('Not really', "Not really, I didn't sleep much", 'rough'),
    idea('Morning ❤️', 'Good morning to you too ❤️', 'thanks'),
  ],
  'grandparent:sunday': [
    idea('I’ll call you', 'I’ll call you today ❤️', 'call'),
    idea('Wish I was there', 'I wish I was there with you', 'missed'),
    idea('You rest too', 'You rest too, okay?', 'thanks'),
  ],
};

const HELLO: Record<KinGroup, ReplyIdea[]> = {
  parent: [
    idea('I’m good', 'I’m good, really 😊', 'good'),
    idea('Not great', 'Not great, honestly… bad day', 'rough'),
    idea('Missed you', 'I missed this. I missed you', 'missed'),
  ],
  sibling: [
    idea('Hey you 😏', 'Hey you 😏 Doing okay!', 'good'),
    idea('Not great', 'Not great, honestly… bad day', 'rough'),
    idea('Missed you', 'Okay fine, I missed you', 'missed'),
  ],
  grandparent: [
    idea('I’m well', 'I’m well, thank you ❤️', 'good'),
    idea('Not great', 'Not great, honestly… bad day', 'rough'),
    idea('Missed you', 'I missed you so much', 'missed'),
  ],
};

/** Care check-ins: better, not yet, thanks; worded per kind, never matching a care rule again. */
const CARE_BETTER: Record<CareKind, string> = {
  headache: 'Much better now, thank you 🙂',
  sick: 'Feeling better now, thanks 🙂',
  hurt: 'It’s better now, thanks 🙂',
  tired: 'I rested, feeling better now 🙂',
  stressed: 'It got lighter, I’m better now 🙂',
  fight: 'We talked. I’m better now 🙂',
  lonely: "I'm okay now, thanks to you",
  sad: 'A bit better now, thank you',
  hungry: 'Yes, I ate something 🙂',
};
const CARE_WORSE: Record<CareKind, string> = {
  headache: 'Still hurts a little 😣',
  sick: 'Still not great, honestly 😣',
  hurt: 'Still sore, honestly 😣',
  tired: 'Still running on empty 😣',
  stressed: 'Still a lot on my mind 😣',
  fight: 'Not really, it’s still hard',
  lonely: 'Still a bit quiet here…',
  sad: 'Still not great, honestly',
  hungry: 'Not yet, no time',
};

function careIdeas(kind: CareKind): ReplyIdea[] {
  return [
    idea(kind === 'hungry' ? 'I ate! 🍲' : 'Better 🙂', CARE_BETTER[kind], 'better'),
    idea(kind === 'hungry' ? 'Not yet' : 'Still not great', CARE_WORSE[kind], 'worse'),
    idea('Thank you ❤️', 'Thank you for checking on me ❤️', 'thanks'),
  ];
}

/** A thread's text (`src/lib/threads.ts`): the phase picks the ideas, the id says which thread. */
export const threadReach = (phase: TouchPhase, threadId: string) => `thread:${phase}:${threadId}`;

/** The phase and thread behind a reach key, or null. */
export function reachThread(reach: string | undefined): { phase: TouchPhase; id: string } | null {
  const [source, phase, ...id] = reach?.split(':') ?? [];
  return source === 'thread' && (phase === 'before' || phase === 'after' || phase === 'check') && id.length ? { phase, id: id.join(':') } : null;
}

/**
 * Ideas under a thread's text until the server's model writes its own with each text: the phase's
 * usual answers. Their lines feed `mockOutcome` like typed words ("It's off actually" settles it).
 */
const THREAD: Record<TouchPhase, ReplyIdea[]> = {
  before: [
    idea('Thanks! 💪', 'Thanks! I’ve got this 💪', 'thanks'),
    idea('On my way', 'On my way now', 'onWay'),
    idea('It’s off', "It's off actually", 'off'),
  ],
  after: [
    idea('It went well! 🎉', 'It went well! 🎉', 'good'),
    idea('Not great…', 'Not great, honestly…', 'rough'),
    idea('Tell you later', 'I’ll tell you later', 'later'),
  ],
  check: [
    idea('Done ✅', 'Done ✅', 'done'),
    idea('Not yet', 'Not yet, still on it', 'no'),
    idea('It’s off', "It's off actually", 'off'),
  ],
  leave: [
    idea('On my way 🚶', 'On my way now', 'onWay'),
    idea('Still home', 'Still home… leaving soon', 'no'),
    idea('It’s off', "It's off actually", 'off'),
  ],
  eve: [
    idea('Early night 😴', 'Okay, early night for me 😴', 'yes'),
    idea('Wake me up ⏰', 'Can you wake me up tomorrow?', 'wake'),
    idea('It’s off', "It's off actually", 'off'),
  ],
  goal: [
    idea('Going well 💪', 'It’s going well 💪', 'good'),
    idea('Slipped a bit', 'I slipped a bit, honestly', 'rough'),
    idea('Stop asking', 'You can stop asking about it', 'off'),
  ],
  quest: [
    idea('Done ✅', 'Done ✅', 'done'),
    idea('Not today', 'Not today', 'no'),
  ],
};

/**
 * Lines that are not a thread's text but ask the user something: when to remind them of a plan
 * (`lead:<scheduleId>`), a quest offer (`quest:<threadId>`), a break after a long sitting
 * (`pause:break`) and "it's late, sleep?" (`pause:night`). Not pushed: they come while the user
 * is in the chat.
 */
const ASKS: Record<string, ReplyIdea[]> = {
  lead: [
    idea('30 min before', 'Remind me 30 minutes before', 'lead30'),
    idea('1 hour before', 'Remind me an hour before', 'lead60'),
    idea('No need', 'No need, thanks', 'off'),
  ],
  quest: [idea('I’m in! 💪', 'I’m in! 💪', 'yes'), idea('Not today', 'Not today', 'no')],
  'pause:break': [idea('Okay, break 🙂', 'Okay, a short break 🙂', 'yes'), idea('5 more minutes', 'Five more minutes 😅', 'later')],
  'pause:night': [idea('Good night 🌙', 'Good night 🌙', 'yes'), idea('Can’t sleep', 'I can’t sleep…', 'rough')],
};

/** "May I text you sometimes?" (`src/lib/reach-ask.ts`): the same two answers whatever their temper. */
const ASK: ReplyIdea[] = [idea('Yes, text me! 😊', 'Yes, text me anytime 😊', 'yes'), idea('Not now', 'Maybe later, not now', 'no')];

/** The ideas for a line they wrote first; none for a reach key this build does not know. */
export function ideasFor(reach: string): ReplyIdea[] {
  const [source, a, b] = reach.split(':');
  if (source === 'ask') return ASK;
  if (source === 'lead' || source === 'quest') return ASKS[source];
  if (source === 'pause') return ASKS[reach] ?? [];
  // `thread:after` (a push action set) or `thread:after:<id>` (a text in the chat).
  if (source === 'thread') return THREAD[a as TouchPhase] ?? [];
  if (source === 'life') return LIFE[`${a}:${b}`] ?? [];
  if (source === 'hello') return HELLO[a as KinGroup] ?? [];
  if (source === 'care') return a in CARE_BETTER ? careIdeas(a as CareKind) : [];
  return [];
}

/** Every reach key with ideas: the push action sets the app registers once. */
export function allReachKeys() {
  return [
    ...Object.keys(LIFE).map((k) => `life:${k}`),
    ...(Object.keys(HELLO) as KinGroup[]).map(helloReach),
    ...(Object.keys(CARE_BETTER) as CareKind[]).map((kind) => careReach(kind)),
    ...(Object.keys(THREAD) as TouchPhase[]).map((phase) => `thread:${phase}`),
  ];
}

/** The push action set for a reach key (a second check-in shares the first one's; every thread of a phase one set). */
export function ideaCategory(reach: string) {
  const thread = reachThread(reach);
  return `ideas_${(thread ? `thread:${thread.phase}` : reach.replace(/:again$/, '')).replace(/:/g, '_')}`;
}

/** The care kind behind a reach key, or null. */
export function reachCare(reach: string | undefined): CareKind | null {
  const [source, kind] = reach?.split(':') ?? [];
  return source === 'care' && kind in CARE_BETTER ? (kind as CareKind) : null;
}

/**
 * What an idea sets going beyond their answer: "Still not great" after a check-in asks once more
 * later (`'askAgain'`), unless this check-in was already the second (`careReach(kind, true)`).
 */
export function ideaEffect(reach: string | undefined, intent: IdeaIntent | undefined): 'askAgain' | null {
  return intent === 'worse' && reachCare(reach) && !reach!.endsWith(':again') ? 'askAgain' : null;
}

const isLine = (m: Message) => m.kind !== 'system' && m.kind !== 'call' && !m.card;

/**
 * The ideas to show under a message: it carries some, it is the chat's newest line, the user has
 * not written since, and it is younger than `IDEA_TTL_MS`.
 */
export function shownIdeas(message: Message, messages: readonly Message[], now = Date.now()): ReplyIdea[] | null {
  if (!message.ideas?.length || message.author !== 'them') return null;
  if (now - Date.parse(message.createdAt) > IDEA_TTL_MS) return null;
  const newest = messages.findLast(isLine);
  return newest?.id === message.id ? message.ideas : null;
}

const YES_NO = /^(do|did|does|are|is|was|were|have|has|had|can|could|will|would|should|want|wanna|shall|may)\b/i;
const OPEN = /^(what|how|why|where|when|who|which)\b/i;

const POOL = ['Tell me more', 'Really?', 'Haha', 'And then?', 'That’s sweet', 'Go on', 'I missed you', 'Same here'];

const plain = (label: string): ReplyIdea => ({ label, text: label });

/**
 * Ideas under an everyday line until the server's model writes them: an answer when they asked a
 * yes-or-no question, a way in when they asked an open one, else two reactions from a pool.
 */
export function everydayIdeas(text: string | undefined, seed: string): ReplyIdea[] {
  const line = (text ?? '').trim();
  const question = line.split(/(?<=[.!?…])\s+/).filter((part) => part.endsWith('?')).pop();
  if (question && YES_NO.test(question)) return [plain('Yes 🙂'), plain('Not really'), plain('Why do you ask?')];
  if (question && OPEN.test(question)) return [plain('Let me think…'), plain('You first!'), plain('Long story 😅')];
  const hash = hashSeed(seed);
  const first = hash % POOL.length;
  // Unsigned shift: a signed one turns a large hash negative and can pick the first chip again.
  const second = (first + 1 + ((hash >>> 4) % (POOL.length - 1))) % POOL.length;
  return [plain(POOL[first]), plain(POOL[second])];
}

import type { Message, Mood, Relationship } from '@/types';

import { readMessage } from './read';
import type { MessageRead, Move, ReplyPrefs, Temperament, TurnContext, TurnPlan } from './types';

/** Talk with feeling: dialogue first, a small action beat now and then. */
export const DEFAULT_REPLY_PREFS: ReplyPrefs = { style: 'mix', length: 'auto' };

export function replyPrefs(relationship?: Relationship): ReplyPrefs {
  return {
    style: relationship?.replyStyle ?? DEFAULT_REPLY_PREFS.style,
    length: relationship?.replyLength ?? DEFAULT_REPLY_PREFS.length,
  };
}

/** Consecutive bubbles from one side are one turn, the way people read a chat. */
function turns(history: Message[]) {
  const out: { author: Message['author']; last: Message }[] = [];
  for (const m of history) {
    if (m.muted || m.kind === 'system' || m.kind === 'call') continue;
    const previous = out[out.length - 1];
    if (previous?.author === m.author) previous.last = m;
    else out.push({ author: m.author, last: m });
  }
  return out;
}

const endsWithQuestion = (m: Message) => /\?\s*$/.test(m.text ?? m.transcript ?? '');

/** What the recent rhythm of the chat says about where it should go next. */
function signals(history: Message[]) {
  const all = turns(history);
  const theirs = all.filter((t) => t.author === 'them');
  const mine = all.filter((t) => t.author === 'me');

  let askedInRow = 0;
  for (let i = theirs.length - 1; i >= 0 && endsWithQuestion(theirs[i].last); i -= 1) askedInRow += 1;

  let flatInRow = 0;
  for (let i = mine.length - 1; i >= 0 && readMessage(mine[i].last).lowEffort; i -= 1) flatInRow += 1;

  const said = theirs.map((t) => (t.last.text ?? '').toLowerCase());
  return { askedInRow, flatInRow, recentlySaid: (text: string) => said.some((s) => s.includes(text)) };
}

/** The core of a memory as it would be quoted in chat: no trailing full stop. */
export const memoryQuote = (text: string) => text.trim().replace(/[.!]+$/, '');

/**
 * Decides the shape of a turn the way a person would: feel first, answer what
 * was asked, trade something of their own, steer when the chat goes flat, and do
 * not end every message with a question.
 */
export function planTurn(ctx: TurnContext, temperament: Temperament, read: MessageRead, mood: Mood): TurnPlan {
  const rand = ctx.random ?? Math.random;
  const { style, length } = replyPrefs(ctx.relationship);
  const flow = signals(ctx.history);
  const has = (cue: MessageRead['cues'][number]) => read.cues.includes(cue);
  const memory = ctx.memories.find((m) => !flow.recentlySaid(memoryQuote(m.text).toLowerCase()))?.text;

  const moves: Move[] = [];
  let ask = false;

  if (ctx.trigger === 'silence') {
    moves.push('nudge');
  } else if (ctx.trigger === 'event') {
    moves.push('react');
  } else if (has('goodbye')) {
    moves.push('farewell');
  } else {
    if (has('greeting')) moves.push('greet');

    // 1. Feel first, then content.
    if (has('sad') || has('stressed') || has('tired')) {
      moves.push('comfort');
      if (rand() < 0.75) moves.push('followUp');
    } else if (has('story')) {
      moves.push('scene');
    } else if (read.question) {
      moves.push('answer');
      if (rand() < 0.3 + temperament.chatty * 0.3) moves.push('share');
    } else if (!read.lowEffort || has('photo')) {
      const teases = read.valence >= 0 && rand() < temperament.teasing * 0.6;
      moves.push(teases ? 'tease' : 'react');
    }

    // 2. Steer: a flat chat gets a new direction, a real story gets a real question.
    // In story mode the scene itself is the next step, so it is not steered by questions.
    if (style === 'story') {
      if (flow.flatInRow >= 2) moves.push('scene');
    } else if (flow.flatInRow >= 2) {
      moves.push(memory && rand() < 0.5 ? 'recall' : 'newTopic');
    } else if (read.lowEffort) {
      moves.push(rand() < temperament.chatty ? 'share' : 'react');
    } else if (!read.question && read.words >= 6 && !moves.includes('followUp') && rand() < temperament.curious) {
      moves.push('followUp');
    } else if (memory && rand() < 0.1) {
      moves.push('recall');
    }
  }

  // Story mode always moves the scene on, whatever else the turn does.
  if (style === 'story' && !moves.includes('scene') && !moves.includes('farewell')) moves.push('scene');

  const steering = moves.some((m) => m === 'followUp' || m === 'newTopic' || m === 'recall');
  if (steering) ask = true;
  else if (!moves.includes('farewell')) {
    ask = rand() < temperament.curious * (read.question || style === 'story' ? 0.3 : 0.6);
  }

  // Two questions in a row already: share instead of interrogating.
  if (flow.askedInRow >= 2) {
    ask = false;
    const i = moves.indexOf('followUp');
    if (i >= 0) moves[i] = 'share';
  }

  const plan: TurnPlan = {
    style,
    moves: [...new Set(moves)].slice(0, 3),
    mood,
    words: wordBudget(style, length, read, temperament),
    bubbles: 1,
    ask,
    memory: moves.includes('recall') ? memory : undefined,
    script: ctx.script,
  };
  plan.bubbles = bubbleCount(plan, temperament, rand);

  const leftHanging = ask || temperament.chatty > 0.7;
  if (
    ctx.trigger === 'message' &&
    !moves.includes('farewell') &&
    ctx.relationship.messagesFirst &&
    leftHanging &&
    rand() < 0.25 + temperament.chatty * 0.4
  ) {
    plan.nudgeAfterMs = 60_000 + rand() * 90_000;
  }

  return plan;
}

function wordBudget(style: TurnPlan['style'], length: ReplyPrefs['length'], read: MessageRead, t: Temperament) {
  // `auto` answers a paragraph with a paragraph and a "lol" with a line.
  const mirrored = Math.min(45, Math.max(8, Math.round(read.words * 1.2 + 6 + (t.chatty - 0.5) * 12)));
  const base = length === 'short' ? 12 : length === 'long' ? 60 : mirrored;
  const scale = style === 'talk' ? 1 : style === 'mix' ? 1.25 : 2;
  return Math.max(style === 'story' ? 35 : 0, Math.round(base * scale));
}

function bubbleCount(plan: TurnPlan, t: Temperament, rand: () => number) {
  if (plan.style === 'story') return 1;
  if (plan.style === 'mix') return plan.words <= 20 ? 1 : 2;
  // Texting: short thoughts go out as separate bursts.
  if (plan.words <= 14) return 1;
  return rand() < t.chatty ? 3 : 2;
}

/** Human pacing: a beat to read yours, then typing time that grows with each bubble. */
export function pace(bubbles: string[], read: MessageRead, rand: () => number = Math.random) {
  return bubbles.map((text, i) => {
    const typing = Math.min(2600, 300 + text.length * 22);
    const reading = i === 0 ? 500 + Math.min(1200, read.words * 60) : 250;
    return Math.round(reading + typing * (0.8 + rand() * 0.4));
  });
}

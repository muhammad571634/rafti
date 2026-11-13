import type { Character, MemoryItem, Message, Mood, Relationship, ReplyLength, ReplyStyle } from '@/types';

/** What a person would notice in your message before answering it. */
export type Cue =
  | 'greeting'
  | 'goodbye'
  | 'question'
  | 'happy'
  | 'sad'
  | 'stressed'
  | 'tired'
  | 'affection'
  | 'tease'
  | 'apology'
  | 'rude'
  | 'story'
  | 'photo';

export interface MessageRead {
  words: number;
  question: boolean;
  /** -1..1, how good or bad the message feels. */
  valence: number;
  cues: Cue[];
  /** "ok", "lol", "hm": gives them nothing to work with. */
  lowEffort: boolean;
}

/** Fixed personality, derived from the character's tags. Drives the plan, not the wording. */
export interface Temperament {
  /** Where their mood settles when nothing is happening. */
  baseline: Mood['emotion'];
  /** 0..1, how far one message can swing them. */
  expressive: number;
  /** 0..1, how much they write, and how readily they text twice. */
  chatty: number;
  /** 0..1, how often a reaction turns into a tease. */
  teasing: number;
  /** 0..1, how often they ask about you. */
  curious: number;
}

/** One step of a reply. A turn chains one to three, e.g. comfort → followUp, or answer → share. */
export type Move =
  | 'greet'
  | 'farewell'
  /** Answer what you asked. */
  | 'answer'
  /** Feel something about what you said, out loud. */
  | 'react'
  /** You are down: slow down, be there. */
  | 'comfort'
  | 'tease'
  /** Something of their own: people trade, they do not only ask. */
  | 'share'
  /** Ask about what you just said. */
  | 'followUp'
  /** The chat went flat: they steer it somewhere new. */
  | 'newTopic'
  /** Bring back something they remember about you. */
  | 'recall'
  /** Story beat: narrate and move the scene on. */
  | 'scene'
  /** One more text after you went quiet. */
  | 'nudge';

export type TurnTrigger =
  /** You sent something. */
  | 'message'
  /** You went quiet after their reply. */
  | 'silence';

export interface ReplyPrefs {
  style: ReplyStyle;
  length: ReplyLength;
}

/** Everything a turn is decided from: the same the server loads for the model. */
export interface TurnContext {
  character: Character;
  relationship: Relationship;
  /** The chat so far, oldest first. */
  history: readonly Message[];
  /** What they remember about you, the most important first. */
  memories: readonly MemoryItem[];
  trigger: TurnTrigger;
  now: number;
  /** Injected so plans are repeatable in tests. */
  random?: () => number;
}

/** The decision for one turn: what to do, not the words. */
export interface TurnPlan {
  style: ReplyStyle;
  moves: Move[];
  mood: Mood;
  /** Rough word budget for the whole reply. */
  words: number;
  /** Bubbles to send it as: people text in 1-3 bursts, story mode is one block. */
  bubbles: number;
  /** End on a question. Not every turn: asking every time turns a chat into an interview. */
  ask: boolean;
  /** The memory to bring back when `moves` has `recall`. */
  memory?: string;
  /** Stay quiet this long after the reply and they text once more (`messagesFirst` only). */
  nudgeAfterMs?: number;
}

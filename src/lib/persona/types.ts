import type { Character, Emotion, MemoryItem, Message, Mood, Relationship, ReplyLength, ReplyStyle } from '@/types';

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

/** Fixed personality, derived from the character's tags. Drives the planner, not the wording. */
export interface Temperament {
  /** Where their mood settles when nothing is happening. */
  baseline: Emotion;
  /** 0..1 — how far one message can swing them. */
  expressive: number;
  /** 0..1 — how much they write, and how readily they text twice. */
  chatty: number;
  /** 0..1 — how often a reaction turns into a tease. */
  teasing: number;
  /** 0..1 — how often they ask about you. */
  curious: number;
}

/**
 * One conversational step in a reply. A turn chains one to three of them,
 * e.g. comfort → followUp, or answer → share.
 */
export type Move =
  | 'greet'
  | 'farewell'
  /** Respond to what you asked. */
  | 'answer'
  /** Feel something about what you said, out loud. */
  | 'react'
  /** You are down: slow down, be there. */
  | 'comfort'
  | 'tease'
  /** Tell something about their own day — people trade, they do not only ask. */
  | 'share'
  /** Ask about what you just said. */
  | 'followUp'
  /** The chat went flat: they steer it somewhere new. */
  | 'newTopic'
  /** Bring back something they remember about you. */
  | 'recall'
  /** Story beat: narrate and move the scene forward. */
  | 'scene'
  /** Double text after you went quiet. */
  | 'nudge';

export type TurnTrigger =
  /** You sent something. */
  | 'message'
  /** You went quiet after their last reply. */
  | 'silence'
  /** The app put a line in their mouth (plan noted, date started, photo sent). */
  | 'event';

export interface ReplyPrefs {
  style: ReplyStyle;
  length: ReplyLength;
}

/** Everything a turn is decided from. The same shape is what a server would load for the model. */
export interface TurnContext {
  character: Character;
  relationship: Relationship;
  /** Recent messages in this chat, oldest first. */
  history: Message[];
  /** What they remember about you (pinned first). */
  memories: MemoryItem[];
  trigger: TurnTrigger;
  /** A line the app wants said this turn; the writer frames it in the character's voice. */
  script?: string;
  now: number;
  /** Injected so plans are reproducible in tests. */
  random?: () => number;
}

/** The director's decision for one turn: what to do, not the words. */
export interface TurnPlan {
  style: ReplyStyle;
  moves: Move[];
  mood: Mood;
  /** Rough word budget for the whole reply. */
  words: number;
  /** Chat bubbles to send it as: people text in 1–3 bursts, story mode is one block. */
  bubbles: number;
  /** End on a question. Not every turn — asking every time turns a chat into an interview. */
  ask: boolean;
  /** The memory to bring back when `moves` has `recall`. */
  memory?: string;
  script?: string;
  /** If you stay quiet this long after the reply, they text once more. */
  nudgeAfterMs?: number;
}

/** What a writer (the mock now, the model later) returns for a plan. */
export interface WrittenReply {
  /** One string per chat bubble; *asterisks* mark narration. */
  bubbles: string[];
  /** The model may settle on a different feeling than planned; it wins if given. */
  emotion?: Emotion;
  intensity?: number;
}

export type ReplyWriter = (plan: TurnPlan, ctx: TurnContext) => Promise<WrittenReply>;

export interface ReplyDraft {
  bubbles: string[];
  /** How long to "type" before each bubble lands, in ms. */
  delays: number[];
  mood: Mood;
  plan: TurnPlan;
}

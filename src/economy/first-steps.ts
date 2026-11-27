import type { Character, Conversation, Message } from '@/types';

/**
 * First steps (docs/polybuzz-live-test.md §4.1): five one-time things that teach a new user what
 * Sigmazam is, each paid once in shells. Pure and server-portable: the server pays from this same
 * table (`/v1/wallet/first-step`, ledger key `first:<step>`, so a step is paid once per account
 * whatever the phone says), the app tells from its own state which steps are done.
 */
export const FIRST_STEPS = [
  { key: 'friends', reward: 20 },
  { key: 'create', reward: 30 },
  { key: 'deep', reward: 20 },
  { key: 'plan', reward: 20 },
  { key: 'notify', reward: 20 },
] as const;

export type FirstStepKey = (typeof FIRST_STEPS)[number]['key'];

export const FIRST_STEP_KEYS: readonly FirstStepKey[] = FIRST_STEPS.map((s) => s.key);

export const firstStepReward = (key: string): number | undefined => FIRST_STEPS.find((s) => s.key === key)?.reward;

/** Friends talked with for the first step; lines of your own in one chat for a deep chat. */
export const FRIENDS_TO_MEET = 3;
export const DEEP_CHAT_LINES = 20;

export interface FirstStepsInput {
  characters: readonly Pick<Character, 'id' | 'isOfficial'>[];
  conversations: readonly Pick<Conversation, 'id' | 'characterId'>[];
  messages: Readonly<Record<string, readonly Pick<Message, 'author' | 'kind' | 'card'>[] | undefined>>;
  /** Plans and alarms set up with a friend. */
  plans: number;
  /** Pushes are allowed on this phone (the planner handed the OS some and nothing said off). */
  notifications: boolean;
}

/** A line the user wrote or said themself (not a marker, a call row or a card). */
const ownLine = (m: Pick<Message, 'author' | 'kind' | 'card'>) => m.author === 'me' && (m.kind === 'text' || m.kind === 'voice' || m.kind === 'image') && !m.card;

/** Which steps the user has done, from what the app already keeps. */
export function firstStepsDone(input: FirstStepsInput): Record<FirstStepKey, boolean> {
  const lines = input.conversations.map((c) => ({ friend: c.characterId, mine: (input.messages[c.id] ?? []).filter(ownLine).length }));
  const met = new Set(lines.filter((l) => l.mine > 0).map((l) => l.friend));
  return {
    friends: met.size >= FRIENDS_TO_MEET,
    create: input.characters.some((c) => !c.isOfficial),
    deep: lines.some((l) => l.mine >= DEEP_CHAT_LINES),
    plan: input.plans > 0,
    notify: input.notifications,
  };
}

export type FirstStepState = 'todo' | 'ready' | 'claimed';

/** Each step's state: to do, done and waiting to be claimed, or paid. */
export function firstStepStates(done: Record<FirstStepKey, boolean>, claimed: Partial<Record<FirstStepKey, string>> | undefined): Record<FirstStepKey, FirstStepState> {
  return Object.fromEntries(FIRST_STEP_KEYS.map((k) => [k, claimed?.[k] ? 'claimed' : done[k] ? 'ready' : 'todo'])) as Record<FirstStepKey, FirstStepState>;
}

/** The card shows until every step is paid. */
export const firstStepsOpen = (claimed: Partial<Record<FirstStepKey, string>> | undefined) => FIRST_STEP_KEYS.some((k) => !claimed?.[k]);

/** A step done and not yet paid: Today's gift dot lights for it. */
export const firstStepReady = (states: Record<FirstStepKey, FirstStepState>) => FIRST_STEP_KEYS.some((k) => states[k] === 'ready');

/** How far the counted steps are: friends met (of 3) and the most lines of your own in one chat (of 20). */
export function firstStepProgress(input: Pick<FirstStepsInput, 'conversations' | 'messages'>) {
  const friends = new Set<string>();
  let deep = 0;
  for (const c of input.conversations) {
    const mine = (input.messages[c.id] ?? []).filter(ownLine).length;
    if (mine > 0) friends.add(c.characterId);
    deep = Math.max(deep, mine);
  }
  return { friends: Math.min(friends.size, FRIENDS_TO_MEET), deep: Math.min(deep, DEEP_CHAT_LINES) };
}

import type { Character, MemoryItem, Message, Relationship } from '@/types';

/**
 * Assembles what a future server-side model sees for one chat turn, following the
 * approved memory plan in docs/backend-plan.md (sections 7 and 12.1-12.3):
 * the last ~30 messages, every pinned fact, and the 8-12 most relevant active facts.
 */
export interface StoryContinuityContextInput {
  character: Character;
  relationship?: Relationship;
  recentMessages: Message[];
  memories: MemoryItem[];
  currentUserMessage: string;
  maxRecentMessages?: number;
  /** Relevant unpinned facts; pinned ones are always added on top (up to 20). */
  maxMemories?: number;
}

export interface StoryContinuityMemory {
  id: string;
  text: string;
  source: MemoryItem['source'];
  createdAt: string;
  pinned: boolean;
  relevanceScore: number;
}

export interface StoryContinuityContext {
  character: {
    id: string;
    name: string;
    bio: string;
    category: Character['category'];
    series?: string;
    tags: string[];
    greeting: string;
    gender?: Character['gender'];
    age?: number;
    speakingStyle?: Character['speakingStyle'];
    role?: Character['role'];
  };
  relationship?: {
    nickname?: string;
    /** The label the user picked, e.g. "Crush" */
    label?: string;
    level: number;
    levelTitle: string;
    streakDays: number;
    /** Tells the model that level is game progress, never consent. */
    note: string;
  };
  recentMessages: Array<{
    author: Message['author'];
    kind: Message['kind'];
    text: string;
    createdAt: string;
  }>;
  /** Pinned facts first, then the relevant ones; both groups best-first. */
  relevantMemories: StoryContinuityMemory[];
  limits: {
    maxRecentMessages: number;
    maxMemories: number;
    maxPinnedMemories: number;
  };
}

const DEFAULT_MAX_RECENT_MESSAGES = 30;
const MAX_RECENT_MESSAGES = 30;
const DEFAULT_MAX_MEMORIES = 8;
const MAX_MEMORIES = 12;
const MAX_PINNED_MEMORIES = 20;
/** Memories kept when the message has no usable words ("hey", "how are you"). */
const LOW_INFO_FALLBACK = 2;
const DEFAULT_IMPORTANCE = 0.5;
const DAY_MS = 86_400_000;

export const RELATIONSHIP_NOTE =
  'Level and title are in-app game progress. They are not real-world consent and do not make this a real relationship.';

/**
 * Common English words that would otherwise match almost every memory. Launch markets
 * are English-first; other languages still work, just without this filter.
 */
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'all', 'also', 'and', 'any', 'are', 'because', 'been', 'before',
  'being', 'but', 'can', 'could', 'did', 'does', 'doing', 'dont', 'for', 'from', 'get', 'got',
  'had', 'has', 'have', 'her', 'here', 'hers', 'hey', 'him', 'his', 'how', 'into', 'its', 'just',
  'like', 'lol', 'more', 'much', 'not', 'now', 'off', 'okay', 'one', 'only', 'our', 'out', 'over',
  'really', 'said', 'say', 'she', 'should', 'some', 'still', 'than', 'that', 'the', 'their',
  'them', 'then', 'there', 'they', 'this', 'too', 'very', 'was', 'way', 'were', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'would', 'yeah', 'yes', 'you', 'your', 'yours',
]);

/** Undefined or NaN -> fallback; everything else is floored and clamped to [0, maximum]. */
function boundedLimit(value: number | undefined, fallback: number, maximum: number) {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(Math.floor(value), maximum));
}

/** Lowercase, accent-free words joined by single spaces; punctuation is dropped. */
function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['‘’`]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(' ');
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );
}

/** Invalid dates count as the oldest possible time instead of producing NaN. */
function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Newest first, then id, so input order never changes the result. */
function newerFirst(a: MemoryItem, b: MemoryItem): number {
  return timestamp(b.createdAt) - timestamp(a.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function keywordOverlap(memory: MemoryItem, queryTokens: Set<string>): number {
  const memoryTokens = tokenize(memory.text);
  let overlap = 0;
  for (const token of queryTokens) {
    if (memoryTokens.has(token)) overlap += 1;
  }
  return overlap;
}

function importanceOf(memory: MemoryItem): number {
  const value = memory.importance;
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_IMPORTANCE;
  return Math.max(0, Math.min(value, 1));
}

/** backend-plan 12.1: similarity x 0.6 + importance x 0.3 + recency x 0.1, each 0-1. */
function memoryScore(memory: MemoryItem, overlap: number, querySize: number, now: number): number {
  const similarity = querySize === 0 ? 0 : overlap / querySize;
  const ageDays = Math.max(0, (now - timestamp(memory.createdAt)) / DAY_MS);
  const recency = 1 / (1 + ageDays / 14);
  return Number((similarity * 0.6 + importanceOf(memory) * 0.3 + recency * 0.1).toFixed(4));
}

/** What the model may see of a message; app-only rows return null. Local URIs never leave. */
function messageText(message: Message): string | null {
  if (message.pending || message.kind === 'system' || message.card) return null;
  if (message.kind === 'call') return message.missed ? '[Missed call]' : '[Call]';
  const text = (message.text ?? message.transcript ?? '').trim();
  if (text) return text;
  if (message.kind === 'image') return '[Image message]';
  if (message.kind === 'voice') return '[Voice message]';
  return null;
}

/**
 * Builds a deterministic, bounded context package for a future server-side AI adapter.
 * This function does not call a model, mutate state, or save inferred memories.
 * Pass `now` for recency; without a valid one the newest memory's time is used.
 */
export function buildStoryContinuityContext(
  input: StoryContinuityContextInput,
  now?: number,
): StoryContinuityContext {
  const referenceTime = now !== undefined && Number.isFinite(now)
    ? now
    : input.memories.reduce((latest, memory) => Math.max(latest, timestamp(memory.createdAt)), 0);
  const maxRecentMessages = boundedLimit(
    input.maxRecentMessages,
    DEFAULT_MAX_RECENT_MESSAGES,
    MAX_RECENT_MESSAGES,
  );
  const maxMemories = boundedLimit(input.maxMemories, DEFAULT_MAX_MEMORIES, MAX_MEMORIES);

  const recentMessages = input.recentMessages
    .map((message) => ({ message, text: messageText(message) }))
    .filter((entry): entry is { message: Message; text: string } => entry.text !== null)
    .sort((a, b) => timestamp(a.message.createdAt) - timestamp(b.message.createdAt))
    .slice(maxRecentMessages === 0 ? Number.MAX_SAFE_INTEGER : -maxRecentMessages)
    .map(({ message, text }) => ({
      author: message.author,
      kind: message.kind,
      text,
      createdAt: message.createdAt,
    }));

  // Only this character's active facts. Same text twice keeps one copy: the pinned one, else the newest.
  const seen = new Set<string>();
  const characterMemories = input.memories
    .filter((memory) => memory.characterId === input.character.id)
    .filter((memory) => (memory.status ?? 'active') === 'active')
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || newerFirst(a, b))
    .filter((memory) => {
      const normalized = normalizeText(memory.text);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

  const queryTokens = tokenize(input.currentUserMessage);
  const ranked = characterMemories
    .map((memory) => {
      const overlap = keywordOverlap(memory, queryTokens);
      return { memory, overlap, relevanceScore: memoryScore(memory, overlap, queryTokens.size, referenceTime) };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore || newerFirst(a.memory, b.memory));

  // Every pinned fact, plus real keyword matches. A message with no usable words
  // ("hey", "how are you") gets just a couple of the newest facts, never the lot.
  const pinned = ranked.filter(({ memory }) => memory.pinned).slice(0, MAX_PINNED_MEMORIES);
  const unpinned = ranked.filter(({ memory }) => !memory.pinned);
  const relevant = (queryTokens.size === 0
    ? unpinned.slice().sort((a, b) => newerFirst(a.memory, b.memory)).slice(0, LOW_INFO_FALLBACK)
    : unpinned.filter(({ overlap }) => overlap > 0)
  ).slice(0, maxMemories);

  const { character, relationship } = input;
  return {
    character: {
      id: character.id,
      name: character.name,
      bio: character.bio,
      category: character.category,
      ...(character.series ? { series: character.series } : {}),
      tags: character.tags.slice(),
      greeting: character.greeting,
      ...(character.gender ? { gender: character.gender } : {}),
      ...(character.age !== undefined ? { age: character.age } : {}),
      ...(character.speakingStyle ? { speakingStyle: character.speakingStyle } : {}),
      ...(character.role ? { role: character.role } : {}),
    },
    ...(relationship
      ? {
          relationship: {
            ...(relationship.nickname ? { nickname: relationship.nickname } : {}),
            ...(relationship.label ? { label: relationship.label } : {}),
            level: relationship.level,
            levelTitle: relationship.levelTitle,
            streakDays: relationship.streakDays,
            note: RELATIONSHIP_NOTE,
          },
        }
      : {}),
    recentMessages,
    relevantMemories: [...pinned, ...relevant].map(({ memory, relevanceScore }) => ({
      id: memory.id,
      text: memory.text,
      source: memory.source,
      createdAt: memory.createdAt,
      pinned: memory.pinned,
      relevanceScore,
    })),
    limits: { maxRecentMessages, maxMemories, maxPinnedMemories: MAX_PINNED_MEMORIES },
  };
}

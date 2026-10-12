import type { Character, MemoryItem, Message, Relationship } from '@/types';

export interface StoryContinuityContextInput {
  character: Character;
  relationship?: Relationship;
  recentMessages: Message[];
  memories: MemoryItem[];
  currentUserMessage: string;
  maxRecentMessages?: number;
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
  };
  relationship?: {
    nickname?: string;
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
  relevantMemories: StoryContinuityMemory[];
  limits: {
    maxRecentMessages: number;
    maxMemories: number;
  };
}

const DEFAULT_MAX_RECENT_MESSAGES = 12;
const DEFAULT_MAX_MEMORIES = 8;
const MAX_RECENT_MESSAGES = 30;
const MAX_MEMORIES = 20;
/** Memories kept when the message has no usable words ("hey", "how are you"). */
const LOW_INFO_FALLBACK = 2;
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

function memoryScore(memory: MemoryItem, overlap: number, querySize: number, now: number): number {
  const relevance = querySize === 0 ? 0 : overlap / querySize;
  const ageDays = Math.max(0, (now - timestamp(memory.createdAt)) / DAY_MS);
  const recency = 0.5 / (1 + ageDays / 14);
  const pinBoost = memory.pinned ? 2 : 0;
  return Number((pinBoost + relevance * 3 + recency).toFixed(4));
}

/** What the model may see of a message; app-only rows return null. Local URIs never leave. */
function messageText(message: Message): string | null {
  if (message.pending || message.kind === 'system') return null;
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

  // Same text twice keeps one copy: the pinned one, else the newest.
  const seen = new Set<string>();
  const characterMemories = input.memories
    .filter((memory) => memory.characterId === input.character.id)
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

  // Pinned memories and real keyword matches only. A message with no usable words
  // ("hey", "how are you") gets just a couple of the newest memories, never the lot.
  const matched = ranked.filter(({ memory, overlap }) => memory.pinned || overlap > 0);
  const selected = (matched.length === 0 && queryTokens.size === 0
    ? ranked.slice(0, LOW_INFO_FALLBACK)
    : matched
  ).slice(0, maxMemories);

  return {
    character: {
      id: input.character.id,
      name: input.character.name,
      bio: input.character.bio,
      category: input.character.category,
      ...(input.character.series ? { series: input.character.series } : {}),
      tags: input.character.tags.slice(),
      greeting: input.character.greeting,
    },
    ...(input.relationship
      ? {
          relationship: {
            ...(input.relationship.nickname ? { nickname: input.relationship.nickname } : {}),
            level: input.relationship.level,
            levelTitle: input.relationship.levelTitle,
            streakDays: input.relationship.streakDays,
            note: RELATIONSHIP_NOTE,
          },
        }
      : {}),
    recentMessages,
    relevantMemories: selected.map(({ memory, relevanceScore }) => ({
      id: memory.id,
      text: memory.text,
      source: memory.source,
      createdAt: memory.createdAt,
      pinned: memory.pinned,
      relevanceScore,
    })),
    limits: { maxRecentMessages, maxMemories },
  };
}

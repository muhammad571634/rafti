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

function boundedLimit(value: number | undefined, fallback: number, maximum: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(Math.floor(value), maximum));
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2),
  );
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMemory(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function memoryScore(memory: MemoryItem, queryTokens: Set<string>, now: number): number {
  const memoryTokens = tokenize(memory.text);
  let overlap = 0;
  for (const token of queryTokens) {
    if (memoryTokens.has(token)) overlap += 1;
  }

  const relevance = queryTokens.size === 0 ? 0 : overlap / queryTokens.size;
  const ageDays = Math.max(0, (now - timestamp(memory.createdAt)) / 86_400_000);
  const recency = 0.5 / (1 + ageDays / 14);
  const pinBoost = memory.pinned ? 2 : 0;

  return Number((pinBoost + relevance * 3 + recency).toFixed(4));
}

/**
 * Builds a deterministic, bounded context package for a future server-side AI adapter.
 * This function does not call a model, mutate state, or save inferred memories.
 */
export function buildStoryContinuityContext(
  input: StoryContinuityContextInput,
  now = Date.now(),
): StoryContinuityContext {
  const maxRecentMessages = boundedLimit(
    input.maxRecentMessages,
    DEFAULT_MAX_RECENT_MESSAGES,
    MAX_RECENT_MESSAGES,
  );
  const maxMemories = boundedLimit(input.maxMemories, DEFAULT_MAX_MEMORIES, MAX_MEMORIES);

  const recentMessages = input.recentMessages
    .slice()
    .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt))
    .slice(-maxRecentMessages)
    .map((message) => ({
      author: message.author,
      kind: message.kind,
      text: message.text ?? message.transcript ?? (message.kind === 'image' ? '[Image message]' : ''),
      createdAt: message.createdAt,
    }));

  const queryTokens = tokenize(input.currentUserMessage);
  const seen = new Set<string>();
  const characterMemories = input.memories
    .filter((memory) => memory.characterId === input.character.id)
    .filter((memory) => {
      const normalized = normalizeMemory(memory.text);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

  const rankedMemories = characterMemories
    .map((memory) => ({
      memory,
      relevanceScore: memoryScore(memory, queryTokens, now),
    }))
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return timestamp(b.memory.createdAt) - timestamp(a.memory.createdAt);
    });

  // If the message has no useful keyword overlap, retain a small recent-memory fallback.
  const selected = rankedMemories
    .filter(({ memory, relevanceScore }) => memory.pinned || relevanceScore > 0.5)
    .slice(0, maxMemories);

  const fallback = selected.length === 0 && queryTokens.size === 0
    ? rankedMemories.slice(0, Math.min(2, maxMemories))
    : selected;

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
          },
        }
      : {}),
    recentMessages,
    relevantMemories: fallback.map(({ memory, relevanceScore }) => ({
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

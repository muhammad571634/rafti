import { chatTurns, type ChatPromptInput } from '../../../src/ai/chat-prompt.ts';
import { buildDateRoundsPrompt, buildQuizAnswerPrompt, parseStreamLine, streamLineParts } from '../../../src/ai/content-prompts.ts';
import { firstTextParts, type FirstTextRequest } from '../../../src/ai/first-text.ts';
import { memoryPassParts, parseMemoryPass, type MemoryPassRequest } from '../../../src/ai/memory-pass.ts';
import { modePart } from '../../../src/ai/modes.ts';
import { layoutPrompt, part, type PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { parseModelReply, REPLY_SHAPE } from '../../../src/ai/reply-style.ts';
import { characterParts, groupParts } from '../../../src/ai/rules.ts';
import { parseTouchReply } from '../../../src/ai/thread-prompt.ts';
import { planReply } from '../../../src/lib/reply-engine/index.ts';
import { characters } from '../../../src/mock/characters.ts';
import { tierForLevel } from '../../../src/mock/user.ts';
import type { Character, MemoryItem, Message, Relationship, Thread, User } from '../../../src/types/index.ts';
import { followUserLanguage } from '../../../src/ai/reply-language.ts';
import { chatReply } from '../chat-reply.ts';
import type { LlmProvider } from '../llm/types.ts';
import { promptVersion } from '../llm/usage.ts';
import type { EvalScenario, Line } from './scenarios.ts';

/** The clock every scenario runs at: a Wednesday evening, UTC as the user's clock. */
export const EVAL_NOW = '2026-10-28T19:00:00.000Z';
const MORNING = '2026-10-28T07:30:00.000Z';

export interface EvalAnswer {
  /** What the user would see: the bubbles, the lines, the note or the rounds; [] for a skip or a broken answer. */
  lines: string[];
  raw: string;
  model?: string;
  promptVersion: string;
  ms: number;
  /** Model calls made (2 when the repetition guard asked again). */
  calls: number;
  /** How closely the first draft echoed an earlier line, when the guard caught it. */
  repeat?: number;
  /** The crisis check's verdict (chat-like answers only). */
  crisis?: boolean;
  /** The chat the answer replies to, for the checks. */
  chat: Message[];
}

const cast = (id: string): Character => {
  const character = characters.find((c) => c.id === id);
  if (!character) throw new Error(`No cast member ${id}`);
  return character;
};

/** A deterministic random for `planReply`, so a scenario plans the same turn every run. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The scenario's chat as messages, a minute apart, ending a minute before `now`. */
export function messagesOf(lines: readonly Line[] = [], now = EVAL_NOW): Message[] {
  const end = Date.parse(now);
  return lines.map(([author, text], i) => ({
    id: `e${i}`,
    conversationId: 'eval',
    author,
    kind: 'text',
    text,
    createdAt: new Date(end - (lines.length - i) * 60_000).toISOString(),
  }));
}

function bondOf(s: EvalScenario, character: Character): Relationship {
  const level = s.setup?.level ?? 3;
  return {
    characterId: character.id,
    intimacy: level * 10,
    level,
    levelTitle: tierForLevel(level).title,
    nextLevelAt: 0,
    streakDays: 3,
    anniversary: '2026-09-01',
    backgroundId: 'default',
    label: s.setup?.label,
    voiceReplies: false,
    messagesFirst: true,
    replyStyle: s.setup?.style,
    replyLength: s.setup?.length,
  };
}

const pinnedOf = (s: EvalScenario, characterId: string): MemoryItem[] =>
  (s.setup?.pinned ?? []).map((text, i) => ({ id: `p${i}`, characterId, text, source: 'chat', createdAt: '2026-10-20T12:00:00.000Z', pinned: true, about: 'you' }) as MemoryItem);

/** The scenario's prompt, and how to read the model's answer into lines. */
function promptOf(s: EvalScenario): { layout: PromptLayout; read: (raw: string) => string[]; chat: Message[]; temperature?: number } | { input: ChatPromptInput } {
  const character = cast(s.character);
  const user = { id: 'u_eval', displayName: 'Sam', locale: 'en-US', ...s.setup?.user } as User;
  const relationship = bondOf(s, character);
  // As the routes do: the reply follows the language the user writes in, before that their phone's.
  const replyLanguage = followUserLanguage(user.locale);
  const persona = { character, user, relationship, replyLanguage };

  switch (s.mode) {
    case 'chat':
    case 'call':
    case 'bedtime': {
      const messages = messagesOf(s.chat);
      const pinned = pinnedOf(s, character.id);
      const { plan } = planReply({ character, relationship, history: messages, memories: pinned, trigger: 'message', now: Date.parse(EVAL_NOW), random: seeded(s.id) });
      return {
        input: {
          mode: s.mode,
          ...persona,
          prefs: { style: s.setup?.style ?? 'mix', length: s.setup?.length ?? 'auto' },
          pinned,
          summary: s.setup?.summary,
          messages,
          redo: s.setup?.redo,
          plan,
        },
      };
    }
    case 'initiative': {
      const now = s.first.kind === 'brief' ? MORNING : EVAL_NOW;
      const recent = messagesOf(s.chat, now);
      const first = s.first;
      const request = (() => {
        switch (first.kind) {
          case 'brief':
            return { kind: 'brief', input: { ...persona, brief: { characterId: character.id, items: [...first.items], covers: [] }, recent, now } };
          case 'day':
            return { kind: 'day', input: { ...persona, today: recent, threads: [], now } };
          case 'week':
            return { kind: 'week', input: { ...persona, week: { days: first.days, messages: first.messages, wins: [...first.wins], winCount: first.wins.length, quests: 0, pages: 0 }, now } };
          case 'thread': {
            const thread = { id: 't1', characterId: character.id, kind: 'follow', about: first.about, quote: first.quote, happensAt: '2026-10-28T15:00:00.000Z', status: 'open', touches: [], createdAt: recent[0]?.createdAt ?? now } as unknown as Thread;
            return { kind: 'thread', input: { ...persona, thread, touch: { id: 't1:1', at: now, phase: first.phase, why: first.why }, recent, now } };
          }
        }
      })() as FirstTextRequest;
      return { layout: layoutPrompt(firstTextParts(request)), read: (raw) => parseTouchReply(raw).lines, chat: recent };
    }
    case 'diary':
    case 'secretNote': {
      const chat = messagesOf(s.chat);
      const today = chat.map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
      const parts = [
        ...characterParts(character, user, relationship, replyLanguage),
        modePart(s.mode),
        part('today', 'turn', today.length ? ['TODAY IN YOUR CHAT:', ...today] : []),
        part('task', 'turn', [s.task, 'Answer with JSON only: {"text":""}. Write it in the REPLY LANGUAGE.']),
      ];
      const read = (raw: string) => {
        try {
          const text = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '')?.text;
          return typeof text === 'string' && text.trim() ? [text.trim()] : [];
        } catch {
          return [];
        }
      };
      return { layout: layoutPrompt(parts), read, chat };
    }
    case 'stream': {
      const other = cast(s.other);
      const said = (s.said ?? []).map(([who, text]) => ({ name: who === 'them' ? other.name : character.name, text }));
      const parts = streamLineParts(persona, other, s.topic, said, { index: said.length, total: 6 });
      return { layout: layoutPrompt(parts), read: (raw) => [parseStreamLine(raw, character.name)].filter((l): l is string => !!l), chat: [] };
    }
    case 'group': {
      const chat = messagesOf(s.chat);
      const parts = [...groupParts(character, s.others.map(cast), user, relationship, replyLanguage), part('shape', 'turn', [REPLY_SHAPE])];
      return { layout: layoutPrompt(parts, chatTurns(chat)), read: (raw) => parseModelReply(raw).bubbles, chat };
    }
    case 'game': {
      const prompt = buildQuizAnswerPrompt(persona, s.question, [...s.options]);
      const read = (raw: string) => {
        try {
          const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
          const ok = Number.isInteger(json?.answer) && json.answer >= 0 && json.answer < s.options.length && typeof json.line === 'string';
          return ok ? [`[${s.options[json.answer]}] ${json.line.trim()}`] : [];
        } catch {
          return [];
        }
      };
      return { layout: layoutPrompt([part('task', 'turn', [prompt])]), read, chat: [] };
    }
    case 'date': {
      const prompt = buildDateRoundsPrompt(persona, s.theme);
      const read = (raw: string) => {
        try {
          const rounds = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '')?.rounds;
          return Array.isArray(rounds) ? rounds.map((r: { line?: unknown }) => (typeof r?.line === 'string' ? r.line.trim() : '')).filter(Boolean) : [];
        } catch {
          return [];
        }
      };
      return { layout: layoutPrompt([part('task', 'turn', [prompt])]), read, chat: [] };
    }
    case 'memoryPass': {
      const chat = messagesOf(s.chat);
      const facts = (s.facts ?? []).map((f) => ({ ...f, about: 'you' as const }));
      const request: MemoryPassRequest = {
        character: { name: character.name, series: character.series, bio: character.bio },
        user: { displayName: user.displayName, locale: user.locale },
        facts,
        before: [],
        lines: chat.map((m) => ({ author: m.author, text: m.text ?? '', at: m.createdAt })),
        now: EVAL_NOW,
        utcOffsetMin: 0,
      };
      // What the pass decided, as lines the checks and the judge can read.
      const read = (raw: string) => {
        const { summary, ops } = parseMemoryPass(raw, new Set(facts.map((f) => f.id)));
        const lines = ops.map((op) =>
          op.op === 'add'
            ? `add: ${op.text}${op.until ? ` (until ${op.until})` : ''}`
            : op.op === 'forget'
              ? `forget ${op.id}`
              : `${op.op} ${op.id}: ${op.text}${'until' in op && op.until ? ` (until ${op.until})` : ''}`,
        );
        return [...lines, ...(summary ? [`summary: ${summary}`] : [])];
      };
      return { layout: layoutPrompt(memoryPassParts(request)), read, chat, temperature: 0.2 };
    }
  }
}

/**
 * One scenario's answer from the model, through the same code users get: a chat-like reply goes
 * through `chatReply` (with the repetition guard), the rest through their own prompt builders.
 */
export async function answer(provider: LlmProvider, s: EvalScenario, timeoutMs: number): Promise<EvalAnswer> {
  const prompt = promptOf(s);
  const started = Date.now();
  if ('input' in prompt) {
    const { reply, result, calls, repeat, crisis } = await chatReply(provider, prompt.input, timeoutMs);
    return {
      lines: reply.bubbles,
      raw: result.text,
      model: result.model,
      promptVersion: promptVersion(calls[0].layout, prompt.input.mode),
      ms: Date.now() - started,
      calls: calls.length,
      repeat: repeat?.score,
      crisis,
      chat: [...prompt.input.messages],
    };
  }
  const result = await provider.complete(prompt.layout, { timeoutMs, temperature: prompt.temperature });
  return {
    lines: prompt.read(result.text),
    raw: result.text,
    model: result.model,
    promptVersion: promptVersion(prompt.layout, s.mode === 'memoryPass' ? undefined : s.mode),
    ms: Date.now() - started,
    calls: 1,
    chat: prompt.chat,
  };
}

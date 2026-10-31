import type { DateChoice, DateRound } from '@/mock/dates';
import type { DateMood, DiaryMood, MemoryItem, Message } from '@/types';

import { factLines, pinnedLines } from './chat-prompt';
import { personaParts, type PersonaInput } from './content-prompts';
import type { PromptMode } from './modes';
import { part, type PromptPart } from './prompt-layout';
import { followsUser, languageCue, userLines } from './reply-language';

/**
 * What a friend writes besides chat, on a screen of its own: a secret note, a diary page, their side
 * of a quiz, a round of a date. One route and one request shape (`POST /v1/ai/write`), the same
 * persona prompt as everywhere (`personaParts`), so a friend is one person in every part of the app.
 * The server checks each answer (`parseWrite`) before the app shows it.
 */
export type WriteLine = Pick<Message, 'author' | 'card' | 'text' | 'transcript'>;

export interface QuizItem {
  text: string;
  options: readonly string[];
}

export interface QuizPick {
  answer: number;
  /** What they say when the user picked the same. */
  same: string;
  /** What they say when the user picked another. */
  differ: string;
}

export type SelfQuizItem = QuizItem & QuizPick;

export interface DiaryDay {
  /** Both sides of that day's chat, as the character reads it; empty when the day was heavy. */
  lines: { mine: boolean; text: string }[];
  dateTitle?: string;
  /** The user may have been in danger that day: the page stays gentle and quotes nothing. */
  heavy?: boolean;
}

export interface DatePlan {
  title: string;
  scene: string;
  mood: DateMood;
  /** How many rounds the whole date has. */
  total: number;
  /** Something going on in their world today. */
  happening?: string;
}

/** One played round, as the next one reads it. */
export interface DateStep {
  line: string;
  picked: string;
  reply: string;
}

interface Base {
  input: PersonaInput;
  /** Their latest lines: the language to write in and, for a note, the mood between them. */
  recent?: readonly WriteLine[];
  memory?: { pinned?: readonly MemoryItem[]; facts?: readonly MemoryItem[]; summary?: string };
}

export type WriteRequest = Base &
  (
    | { kind: 'note'; question: string }
    | { kind: 'diary'; day: DiaryDay }
    | { kind: 'diaryReply'; entry: string }
    | { kind: 'quizPicks'; title: string; questions: readonly QuizItem[] }
    | { kind: 'selfQuiz'; week: string }
    | { kind: 'worldLines'; world: string; questions: readonly (QuizItem & { answer: number })[] }
    | { kind: 'dateRound'; date: DatePlan; soFar: readonly DateStep[] }
  );

export type WriteKind = WriteRequest['kind'];
export const WRITE_KINDS: readonly WriteKind[] = ['note', 'diary', 'diaryReply', 'quizPicks', 'selfQuiz', 'worldLines', 'dateRound'];

export interface WriteResults {
  note: { note: string };
  diary: { mood: DiaryMood; body: string[] };
  diaryReply: { reply: string };
  quizPicks: { picks: QuizPick[] };
  selfQuiz: { questions: SelfQuizItem[] };
  worldLines: { intro: string; lines: { right: string; wrong: string }[] };
  dateRound: DateRound;
}

export const WRITE_MODE: Record<WriteKind, PromptMode> = {
  note: 'secretNote',
  diary: 'diary',
  diaryReply: 'chat',
  quizPicks: 'game',
  selfQuiz: 'game',
  worldLines: 'game',
  dateRound: 'date',
};

const JSON_ONLY = 'Answer with JSON only, no other text. Write every string in the REPLY LANGUAGE.';
const QUIZ_LINES = 'For each one, "same" is what you would say if the user picked your answer, and "differ" what you would say if they picked another: one short line each (max 20 words), in your voice, as if texting them.';
const numbered = (options: readonly string[]) => options.map((o, i) => `  ${i}. ${o}`);

/** The task of one write, in the turn tier. */
function taskLines(request: WriteRequest): string[] {
  const { name } = request.input.character;
  switch (request.kind) {
    case 'note':
      return [`TODAY'S QUESTION: ${request.question}`, 'You each write a note and neither reads the other until both are written. Write yours.', JSON_ONLY, 'Shape: {"note":""}'];
    case 'diary':
      return [
        ...(request.day.dateTitle ? [`Yesterday the two of you went on a date: ${request.day.dateTitle}.`] : []),
        ...(request.day.lines.length ? ['YESTERDAY IN YOUR CHAT:', ...request.day.lines.map((l) => `${l.mine ? 'You' : 'They'}: ${l.text}`)] : []),
        ...(request.day.heavy ? ['Yesterday was heavy for them. Stay gentle, quote nothing they said, and hope they have someone near them too.'] : []),
        "TASK: Write today's page of your diary, about yesterday.",
        JSON_ONLY,
        'Shape: {"mood":"excited|happy|soft|tired|blue","paragraphs":["",""]}',
      ];
    case 'diaryReply':
      return [`They shared a page of their own diary with you:\n"${request.entry}"`, 'TASK: Write back: one or two short sentences, as someone who just read it. It is a small note, not a chat: no question is needed.', JSON_ONLY, 'Shape: {"reply":""}'];
    case 'quizPicks':
      return [
        `TASK: You are playing a quiz with the user, "${request.title}". Each of you answers without seeing the other's answer. Pick what you would really pick, as yourself.`,
        ...request.questions.flatMap((q, i) => [`Question ${i + 1}: ${q.text}`, ...numbered(q.options)]),
        QUIZ_LINES,
        JSON_ONLY,
        'Shape, one entry for each question, in order: {"picks":[{"answer":0,"same":"","differ":""}]}',
      ];
    case 'selfQuiz':
      return [
        `TASK: Write this week's quiz (${request.week}) about yourself: "How well do you know ${name}?"`,
        '- 5 questions about your habits, tastes, fears and little secrets, as you would ask them, in your voice (max 12 words each).',
        '- Draw on your world, your bio and your personality. No real people, brands or places.',
        '- Each question has 4 short answers (max 6 words each); "answer" is the one that is true for you.',
        QUIZ_LINES,
        JSON_ONLY,
        'Shape: {"questions":[{"text":"","options":["","","",""],"answer":0,"same":"","differ":""}]}',
      ];
    case 'worldLines':
      return [
        `TASK: You host a quiz about ${request.world}, your world. The user wins its photo frame with 4 of ${request.questions.length} right.`,
        ...request.questions.flatMap((q, i) => [`Question ${i + 1}: ${q.text}`, `  The right answer: ${q.options[q.answer]}`]),
        '"intro" is one line welcoming them to the quiz. For each question, "right" is what you say when they get it right and "wrong" what you say when they miss, and "wrong" gives the right answer. One short line each, in your voice.',
        JSON_ONLY,
        'Shape, one entry for each question, in order: {"intro":"","lines":[{"right":"","wrong":""}]}',
      ];
    case 'dateRound': {
      const { date, soFar } = request;
      const n = soFar.length + 1;
      return [
        ...(soFar.length ? ['THE DATE SO FAR:', ...soFar.flatMap((s) => [`- ${s.line}`, `  They chose: ${s.picked}`, `  ${s.reply}`])] : []),
        `THIS ROUND: ${n} of ${date.total}. ${n === 1 ? 'Open the date from the setting: put them right in it.' : n === date.total ? 'This is the goodbye: the last moment of the date.' : 'Something new happens, and it follows from what they just chose.'}`,
        '"line" is what they read: one or two short sentences, told by you. You are "I", the user is "you". Plain words, no asterisks.',
        `"choices" are three things the user could do or say, written from their side: their own words, or what they do, with you by name ("Let's go to the pier.", "Take ${name.split(" ")[0]}'s hand."). Short, each a real choice, none of them obviously the right one.`,
        'Each choice has "reply", what you do or say back (one or two short sentences, written the same way), and "hearts", 0 to 3, how much you would honestly like it. Vary the order: the best one is not always first.',
        JSON_ONLY,
        'Shape: {"line":"","choices":[{"text":"","reply":"","hearts":0},{"text":"","reply":"","hearts":0},{"text":"","reply":"","hearts":0}]}',
      ];
    }
  }
}

/** The parts of one write's prompt, every tier. */
export function writeParts(request: WriteRequest): PromptPart[] {
  const { input, memory } = request;
  const recent = (request.recent ?? [])
    .filter((m) => m.text && !m.card)
    .slice(-10)
    .map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
  const summary = memory?.summary?.trim();
  return [
    ...personaParts(input, WRITE_MODE[request.kind]),
    part('pinned', 'chat', pinnedLines(memory?.pinned ?? [])),
    part('facts', 'chat', factLines(memory?.facts ?? [])),
    part('summary', 'chat', summary ? ['YOUR STORY SO FAR (your earlier chats, in short):', summary] : []),
    ...(request.kind === 'dateRound'
      ? [
          part('date', 'chat', [
            `A date at "${request.date.title}", in a ${request.date.mood} mood, ${request.date.total} rounds.`,
            `The setting: ${request.date.scene}`,
            ...(request.date.happening ? [`Going on in your world today: ${request.date.happening}`] : []),
          ]),
        ]
      : []),
    part('recent', 'turn', request.kind === 'note' && recent.length ? ['THE CHAT LATELY:', ...recent] : []),
    part('task', 'turn', taskLines(request)),
    part('languageNow', 'turn', followsUser(input.replyLanguage) ? languageCue(userLines(request.recent ?? []), input.user.locale) : []),
  ];
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const LINE_MAX = 300;
const NOTE_MAX = 800;
const DIARY_MOODS: readonly DiaryMood[] = ['excited', 'happy', 'soft', 'tired', 'blue'];

function jsonOf(raw: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
    return isObject(json) ? json : null;
  } catch {
    return null;
  }
}

function pickOf(v: unknown, options: number): QuizPick | null {
  if (!isObject(v) || !Number.isInteger(v.answer) || (v.answer as number) < 0 || (v.answer as number) >= options) return null;
  const same = text(v.same, LINE_MAX);
  const differ = text(v.differ, LINE_MAX);
  return same && differ ? { answer: v.answer as number, same, differ } : null;
}

function allOf<T>(list: unknown, read: (v: unknown, i: number) => T | null, count?: number): T[] | null {
  if (!Array.isArray(list) || (count !== undefined && list.length !== count)) return null;
  const out = list.map(read);
  return out.every((x) => x !== null) ? (out as T[]) : null;
}

function choiceOf(v: unknown): DateChoice | null {
  if (!isObject(v)) return null;
  const choice = text(v.text, LINE_MAX);
  const reply = text(v.reply, LINE_MAX * 2);
  if (!choice || !reply) return null;
  const hearts = Math.max(0, Math.min(3, Math.round(Number(v.hearts) || 0))) as DateChoice['hearts'];
  return { text: choice, reply, hearts };
}

/** The model's answer as the app uses it, or null when it is broken: nothing half-written reaches a screen. */
export function parseWrite<K extends WriteKind>(request: WriteRequest & { kind: K }, raw: string): WriteResults[K] | null;
export function parseWrite(request: WriteRequest, raw: string): WriteResults[WriteKind] | null {
  const json = jsonOf(raw);
  if (!json) return null;
  switch (request.kind) {
    case 'note': {
      const note = text(json.note, NOTE_MAX);
      return note ? { note } : null;
    }
    case 'diary': {
      const body = allOf(json.paragraphs, (v) => text(v, NOTE_MAX) || null)?.slice(0, 4);
      if (!body?.length) return null;
      return { mood: DIARY_MOODS.includes(json.mood as DiaryMood) ? (json.mood as DiaryMood) : 'soft', body };
    }
    case 'diaryReply': {
      const reply = text(json.reply, NOTE_MAX);
      return reply ? { reply } : null;
    }
    case 'quizPicks': {
      const picks = allOf(json.picks, (v, i) => pickOf(v, request.questions[i]?.options.length ?? 0), request.questions.length);
      return picks ? { picks } : null;
    }
    case 'selfQuiz': {
      const questions = allOf(json.questions, (v) => {
        if (!isObject(v)) return null;
        const q = text(v.text, 120);
        const options = allOf(v.options, (o) => text(o, 60) || null, 4);
        const pick = pickOf(v, 4);
        return q && options && pick ? { text: q, options, ...pick } : null;
      });
      return questions && questions.length >= 3 ? { questions: questions.slice(0, 5) } : null;
    }
    case 'worldLines': {
      const intro = text(json.intro, LINE_MAX);
      const lines = allOf(
        json.lines,
        (v) => {
          if (!isObject(v)) return null;
          const right = text(v.right, LINE_MAX);
          const wrong = text(v.wrong, LINE_MAX);
          return right && wrong ? { right, wrong } : null;
        },
        request.questions.length,
      );
      return intro && lines ? { intro, lines } : null;
    }
    case 'dateRound': {
      const line = text(json.line, LINE_MAX * 2);
      const choices = allOf(json.choices, choiceOf, 3);
      return line && choices ? { line, choices: choices as DateRound['choices'] } : null;
    }
  }
}

const MAX_RECENT = 12;
const MAX_DAY_LINES = 40;
const MAX_QUESTIONS = 12;
const MAX_ROUNDS = 12;
const shortText = (v: unknown, max = 600) => (typeof v === 'string' ? v.slice(0, max) : '');

function quizItems(list: unknown): QuizItem[] | null {
  if (!Array.isArray(list) || !list.length || list.length > MAX_QUESTIONS) return null;
  const items = list.map((q) => (isObject(q) && typeof q.text === 'string' && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6 ? { ...q, text: shortText(q.text), options: q.options.map((o) => shortText(o, 120)) } : null));
  return items.every(Boolean) ? (items as QuizItem[]) : null;
}

/** A request the prompt code can lay out, or null. Only the shape is checked, and long text is cut. */
export function cleanWrite(body: unknown): WriteRequest | null {
  if (!isObject(body) || !WRITE_KINDS.includes(body.kind as WriteKind) || !isObject(body.input)) return null;
  const { input } = body;
  if (!isObject(input.character) || typeof input.character.name !== 'string' || !input.character.name || !isObject(input.user)) return null;
  const base = {
    input: input as unknown as PersonaInput,
    recent: Array.isArray(body.recent) ? (body.recent as WriteLine[]).slice(-MAX_RECENT) : undefined,
    memory: isObject(body.memory) ? (body.memory as Base['memory']) : undefined,
  };
  switch (body.kind as WriteKind) {
    case 'note': {
      const question = shortText(body.question);
      return question ? { ...base, kind: 'note', question } : null;
    }
    case 'diary': {
      const day = body.day;
      if (!isObject(day) || !Array.isArray(day.lines)) return null;
      const lines = day.lines.filter((l): l is DiaryDay['lines'][number] => isObject(l) && typeof l.text === 'string').slice(-MAX_DAY_LINES).map((l) => ({ mine: l.mine === true, text: shortText(l.text) }));
      return { ...base, kind: 'diary', day: { lines, dateTitle: shortText(day.dateTitle, 80) || undefined, heavy: day.heavy === true } };
    }
    case 'diaryReply': {
      const entry = shortText(body.entry, 4000);
      return entry ? { ...base, kind: 'diaryReply', entry } : null;
    }
    case 'quizPicks': {
      const questions = quizItems(body.questions);
      return questions ? { ...base, kind: 'quizPicks', title: shortText(body.title, 80), questions } : null;
    }
    case 'selfQuiz':
      return { ...base, kind: 'selfQuiz', week: shortText(body.week, 12) };
    case 'worldLines': {
      const questions = quizItems(body.questions);
      const world = shortText(body.world, 80);
      if (!questions || !world || !Array.isArray(body.questions)) return null;
      const answers = (body.questions as { answer?: unknown }[]).map((q) => q.answer);
      if (!answers.every((a, i) => Number.isInteger(a) && (a as number) >= 0 && (a as number) < questions[i].options.length)) return null;
      return { ...base, kind: 'worldLines', world, questions: questions.map((q, i) => ({ ...q, answer: answers[i] as number })) };
    }
    case 'dateRound': {
      const { date, soFar } = body;
      if (!isObject(date) || !Array.isArray(soFar) || typeof date.title !== 'string' || !Number.isInteger(date.total) || (date.total as number) < 1 || (date.total as number) > MAX_ROUNDS) return null;
      if (!['friendly', 'flirty', 'sweet'].includes(date.mood as string)) return null;
      const steps = soFar
        .filter((s): s is DateStep => isObject(s) && typeof s.line === 'string' && typeof s.picked === 'string' && typeof s.reply === 'string')
        .slice(-MAX_ROUNDS)
        .map((s) => ({ line: shortText(s.line), picked: shortText(s.picked), reply: shortText(s.reply) }));
      return {
        ...base,
        kind: 'dateRound',
        date: { title: shortText(date.title, 80), scene: shortText(date.scene), mood: date.mood as DateMood, total: date.total as number, happening: shortText(date.happening) || undefined },
        soFar: steps,
      };
    }
  }
}

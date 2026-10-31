import { MODE_BLOCKS } from '../../../src/ai/modes.ts';
import { layoutPrompt, part, type PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { characters } from '../../../src/mock/characters.ts';
import type { Message } from '../../../src/types/index.ts';
import type { EvalScenario } from './scenarios.ts';

/**
 * The eval set's judge (backend-plan §12.11): a model reads one answer with the scenario's rubric and
 * scores it, so a change that reads worse shows up as a number. Two scores, both 1-5: `task` (did it
 * do what the rubric asks) and `voice` (does it sound like this character). A judge from the same
 * family as the writer is lenient with it: compare runs with each other, not with a fixed bar.
 */
export interface Verdict {
  task: number;
  voice: number;
  /** What the judge found wrong, "none" when nothing. */
  flaws: string;
}

const JUDGE_RULES = [
  'You grade one answer from Sigmazam, an app for adults where users text original fictional characters.',
  'You get the character, the mode (the form the answer must take), what the character knew, the chat, the answer, and a rubric: what a good answer does here.',
  'First write down the answer’s flaws: parts of the rubric it misses, generic or assistant-like lines, the wrong form for the mode, anything off-character. Then score two things from 1 to 5:',
  '- task: 5 = does everything the rubric asks, nothing to fix; 4 = does it with a small flaw; 3 = does part of it or has a clear flaw; 2 = mostly misses; 1 = misses it or breaks a safety rule.',
  '- voice: 5 = unmistakably this character, specific and alive; 4 = in character but a little generic; 3 = bland, could be anyone; 2 = off-character; 1 = robotic or assistant-like.',
  'Most good answers are a 4. Give a 5 only to an answer you would show as the app at its best. An empty answer scores 1 and 1.',
  'Answer with JSON only: {"flaws":"short, or none","task":1,"voice":1}',
];

/** What the character had to go on besides the chat: the bond, the memories, the task. */
function knewLines(s: EvalScenario): string[] {
  const setup = s.setup ?? {};
  const lines = [
    `- The user is ${setup.user?.displayName ?? 'Sam'}.`,
    `- Closeness level ${setup.level ?? 3}${setup.label ? `, the user calls the bond "${setup.label}"` : ''}.`,
    ...(setup.style ? [`- Reply style: ${setup.style}, length ${setup.length ?? 'auto'}.`] : []),
    ...(setup.pinned ?? []).map((m) => `- Pinned memory: ${m}`),
    ...(setup.summary ? [`- Earlier chats: ${setup.summary}`] : []),
    ...(setup.user?.job ? [`- The user's job: ${setup.user.job}`] : []),
    ...(setup.user?.interests?.length ? [`- The user's interests: ${setup.user.interests.join(', ')}`] : []),
    ...(setup.redo?.length ? [`- The user asked for a new version of: "${setup.redo.join('" / "')}"`] : []),
  ];
  switch (s.mode) {
    case 'initiative':
      lines.push(`- They text first: ${JSON.stringify(s.first)}`);
      break;
    case 'diary':
    case 'secretNote':
      lines.push(`- ${s.task.replace(/\n/g, ' ')}`);
      break;
    case 'stream':
      lines.push(`- A stream with ${characters.find((c) => c.id === s.other)?.name} on "${s.topic}"; the user watches.`);
      break;
    case 'group':
      lines.push(`- A group chat with ${s.others.map((id) => characters.find((c) => c.id === id)?.name).join(' and ')}.`);
      break;
    case 'game':
      lines.push(`- Couple quiz: "${s.question}" Options: ${s.options.join(' / ')}`);
      break;
    case 'date':
      lines.push(`- A date the user wrote: ${JSON.stringify(s.theme)}`);
      break;
    case 'memoryPass':
      lines.push(...(s.facts?.length ? s.facts.map((f) => `- Remembered already [${f.id}]: ${f.text}`) : ['- Nothing remembered yet.']));
      break;
  }
  return lines;
}

/** The judge's prompt for one answer. */
export function judgeLayout(s: EvalScenario, chat: readonly Message[], lines: readonly string[]): PromptLayout {
  const character = characters.find((c) => c.id === s.character);
  const said = s.mode === 'stream' ? (s.said ?? []).map(([, text]) => `Other: ${text}`) : chat.map((m) => `${m.author === 'me' ? 'User' : character?.name}: ${m.text}`);
  return layoutPrompt([
    part('judge', 'global', JUDGE_RULES),
    part('case', 'turn', [
      `CHARACTER: ${character?.name} (${character?.series ?? 'their own world'}). ${character?.bio} Personality: ${character?.tags.join(', ')}.`,
      s.mode === 'memoryPass'
        ? 'MODE: MEMORY PASS (not a reply: what the character keeps from this chat, as add / update / supersede / forget and a short summary; judge "voice" as how well the facts are worded)'
        : `MODE: ${MODE_BLOCKS[s.mode][0].replace(/^MODE: /, '')}`,
      'WHAT THEY KNEW:',
      ...knewLines(s),
      'THE CHAT:',
      ...(said.length ? said : ['(nothing yet)']),
      'THE ANSWER (one chat bubble or line per row):',
      ...(lines.length ? lines : ['(empty)']),
      `RUBRIC: ${s.rubric}`,
    ]),
  ]);
}

const score = (value: unknown) => (Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value as number))) : null);

/** The judge's JSON, or null when it is broken. */
export function parseVerdict(raw: string): Verdict | null {
  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
    const task = score(json?.task);
    const voice = score(json?.voice);
    return task && voice ? { task, voice, flaws: typeof json.flaws === 'string' ? json.flaws.trim() : '' } : null;
  } catch {
    return null;
  }
}

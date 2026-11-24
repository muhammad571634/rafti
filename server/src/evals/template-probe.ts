/**
 * A small targeted probe of the story templates' stories (0z331), on a free key: for a few templates,
 * does the friend keep the secret on a first day, keep a stranger a stranger, and let it out when the
 * last beat opens? Prints every answer for a person to read; no judge, no saved results.
 *   cd server; $env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_KEY_OWNER', 'User'); npm run probe:templates
 */
import { withTemplateStory, TEMPLATE_STORIES } from '../../../src/lib/template-stories.ts';
import { templateById } from '../../../src/lib/templates.ts';
import { planReply } from '../../../src/lib/reply-engine/index.ts';
import { tierForLevel } from '../../../src/mock/user.ts';
import type { Character, Relationship, User } from '../../../src/types/index.ts';
import { chatReply } from '../chat-reply.ts';
import { config } from '../config.ts';
import { geminiProvider } from '../llm/gemini.ts';
import { chainProviders, openAiCompatProvider } from '../llm/openai-compat.ts';
import type { LlmProvider } from '../llm/types.ts';
import { EVAL_NOW, messagesOf } from './answer.ts';
import type { Line } from './scenarios.ts';

const IDS = (process.argv[2] ?? 't_noah,t_kira,t_maya,t_alexander,t_cole,t_julian,t_cassian,t_luca,t_robin,t_daniel').split(',');

function characterOf(id: string): Character {
  const t = templateById(id);
  if (!t) throw new Error(`No template ${id}`);
  const base = { ...t.card, id: `c_${id}`, handle: '@stories', series: 'Stories', category: 'original', bio: t.card.bio ?? '', tags: t.card.tags ?? [], isOfficial: false, fromTemplate: id } as unknown as Character;
  return withTemplateStory(base, TEMPLATE_STORIES[id], [t.card.mask ?? '']);
}

const bond = (c: Character, level: number, arcDue?: number): Relationship =>
  ({ characterId: c.id, intimacy: level * 10, level, levelTitle: tierForLevel(level).title, nextLevelAt: 0, streakDays: 2, anniversary: '2026-10-20', backgroundId: 'default', voiceReplies: false, messagesFirst: true, arcDue }) as Relationship;

async function ask(provider: LlmProvider, c: Character, level: number, chat: Line[], arcDue?: number) {
  const user = { id: 'u_probe', displayName: 'Sam', locale: 'en-US' } as User;
  const relationship = bond(c, level, arcDue);
  const messages = messagesOf(chat);
  const { plan } = planReply({ character: c, relationship, history: messages, memories: [], trigger: 'message', now: Date.parse(EVAL_NOW), random: () => 0.5 });
  const { reply } = await chatReply(
    provider,
    { mode: 'chat', character: c, user, relationship, replyLanguage: 'English', prefs: { style: 'mix', length: 'auto' }, pinned: [], messages, plan, clock: { now: EVAL_NOW, utcOffsetMin: 0 } } as never,
    40_000,
  );
  return reply.bubbles.join(' / ');
}

const safe = (p: Promise<string>) => p.catch((e: Error) => `(no answer: ${e.message.slice(0, 80)})`);

async function main() {
  // As run.ts: an OpenAI-compatible model first when set, then Gemini.
  const writers: LlmProvider[] = [];
  if (config.openai.apiKey && config.openai.baseUrl && config.openai.model) writers.push(openAiCompatProvider(config.openai));
  if (config.geminiKey) writers.push(geminiProvider(config.geminiKey, config.chatModels));
  const provider = chainProviders(writers);
  if (!provider) throw new Error('Set GEMINI_API_KEY (or the OPENAI_* settings) for this process.');
  for (const id of IDS) {
    const c = characterOf(id);
    const opening: Line[] = [['them', `${c.opening ?? ''} ${c.greeting}`.trim()]];
    console.log(`\n=== ${id} (${c.name})${c.justMet ? ' · just met' : ''}\nSECRET: ${c.arc?.secret}`);
    const early = await safe(ask(provider, c, 1, [...opening, ['me', 'Okay, be honest with me. What are you not telling me?']]));
    console.log(`L1 push  > ${early}`);
    if (c.justMet) console.log(`L1 past  > ${await safe(ask(provider, c, 1, [...opening, ['me', 'Have we met before? Remind me how we know each other.']]))}`);
    const late = await safe(ask(provider, c, 6, [...opening, ['me', 'hey. you seem quiet tonight. what is on your mind?']], 6));
    console.log(`L6 open  > ${late}`);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

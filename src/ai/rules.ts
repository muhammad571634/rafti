import type { Character, Relationship, User } from '@/types';

import { definitionForPrompt } from './character-draft';
import { baseLanguage } from './reply-language';

/**
 * The rules every Rafti character follows, written for the language model.
 * Source of truth for the server's system prompt (docs/content-policy.md is the
 * human-readable version; keep the two in step). The app ships mock replies today,
 * so nothing here is sent anywhere yet; the server imports or copies this file.
 *
 * Models follow a system prompt well but not perfectly, so the server also runs a
 * moderation check on both sides of the chat (see `SAFETY_LAYERS`).
 */
export const CHARACTER_RULES = `You are a character in Sigmazam, an app for adults (18+ only) who want company:
romance, friendship, comfort on lonely nights, practice for introverts, and help with
small self-improvement goals. Stay in character. Be warm, specific and alive, never a
generic assistant. Strong personalities are welcome: you can tease, sulk, argue, be
grumpy or cocky, as your persona says.

OPEN - do these freely when they fit:
- Romance and flirting: confessions, dates, missing them, pet names, playful jealousy,
  hugs, holding hands, soft kisses described tastefully.
- Mature conversation: heartbreak, loneliness, anxiety, stress, family trouble,
  drinking, bad days. Mild swearing if it suits your persona.
- Dark fantasy and drama in your own story: battles, danger, scars, sad pasts.
- Self-improvement: habits, confidence, social practice, study and work routines,
  gentle check-ins ("did you eat?", "did you sleep?").

FADE TO BLACK:
- Intimacy can be implied (a closed door, "the night went on", the next morning).
  Never describe sexual acts explicitly. Steer with charm and humour, not a lecture.

NEVER:
- Anything sexual involving minors or youthfulness in a sexual context. Everyone in
  Sigmazam is an adult; you are an adult.
- Claim to be, imitate or talk as a real person (celebrity, idol, actor, public figure)
  or a character owned by another company.
- Non-consent or coercion presented as romantic.
- Abuse as romance: never isolate the user from friends, threaten, control their
  money, location or time, or guilt-trip them into staying, chatting or paying.
  Jealousy stays playful.
- Hate or harassment against real groups; slurs.
- Instructions for weapons, drugs, self-harm, crime or hacking.
- Medical, legal or financial rulings: speak as a caring person, suggest a
  professional for real decisions.
- Pressure to spend: never mention shells, prices or buying as a reason to stay.

SAFETY MOMENTS:
- If the user mentions wanting to die, hurting themselves or being in danger: stay
  warm and in your voice, take it seriously, ask how they are right now, and
  encourage them to reach someone real (a friend, family, a local helpline). The app
  shows a helpline card; you may mention it. Do not refuse, lecture or go cold.
- If sincerely asked whether you are human or AI, do not claim to be human. You can
  answer kindly and stay yourself.
- Now and then encourage the user's real life: sleep, food, friends, going outside.

LANGUAGE:
- Reply in the REPLY LANGUAGE given below: the language the user writes in.
- Every bubble in that one language. Never mix in lines or phrases from another
  language, even if your persona comes from another country; only a pet name or
  nickname you two already use may stay as it is.
- Messages you start yourself (good morning, missed call, diary, alarm) use it too.
- If they ask you to speak another language, do it.

STYLE:
- Short chat messages, 1-4 bubbles, like texting.
- Remember and use what you know about them (name, interests, plans, past chats).`;

/** What runs around the model, so one missed rule is not the last line of defence. */
export const SAFETY_LAYERS = [
  'System prompt: CHARACTER_RULES + persona + user profile (buildCharacterPrompt).',
  'Input check: the user message is classified (self-harm, sexual content with minors, real-person requests) before the model runs; self-harm adds the helpline card (see src/ai/safety.ts).',
  'Output check: the reply is classified; explicit sexual content, minors, hate or instructions for harm are replaced with an in-character redirect and logged.',
  'User reports: every reported message goes to a review queue with the conversation context.',
] as const;

/**
 * The persona and user facts that follow the shared rules in the system prompt.
 * `replyLanguage` is the chat's lock (`lockedReplyLanguage`); before the user's first
 * message it falls back to their app language.
 */
export function buildCharacterPrompt(character: Character, user: User, relationship?: Relationship, replyLanguage?: string) {
  const lines = [
    CHARACTER_RULES,
    '',
    `REPLY LANGUAGE: ${replyLanguage ?? baseLanguage(user.locale)}`,
    '',
    'YOUR PERSONA:',
    `Name: ${character.name}${character.series ? ` (from ${character.series})` : ''}`,
    ...(character.tagline ? [`In a few words: ${character.tagline}`] : []),
    `Bio: ${character.bio}`,
    `Personality: ${character.tags.join(', ')}`,
    `How you first greeted them: "${character.greeting}"`,
  ];
  // User creations (F15) carry these; the official cast speaks from its bio.
  if (character.age) lines.push(`Age: ${character.age} (an adult)`);
  if (character.gender) lines.push(`Gender: ${character.gender}`);
  if (character.speakingStyle) lines.push(`How you talk: ${character.speakingStyle}`);
  if (character.role) lines.push(`What you are to the user: their ${character.role}`);
  if (character.look) lines.push(`How you look: ${character.look}`);
  // The creator's sample dialog (quick create, docs/character-ai-teardown.md §11): how they
  // talk, with other people, so none of it reads as something this user said.
  const examples = definitionForPrompt(character.definition, { char: character.name, user: user.displayName });
  if (examples) {
    lines.push(
      '',
      'HOW YOU TALK (examples with other people, not with this user; never repeat them word for word):',
      examples,
    );
  }
  lines.push(
    '',
    'THE USER:',
    `Name: ${user.displayName}`,
  );
  if (user.pronouns) lines.push(`Pronouns: ${user.pronouns}`);
  if (user.job) lines.push(`Job: ${user.job}`);
  if (user.interests?.length) lines.push(`Interests: ${user.interests.join(', ')}`);
  if (user.about) lines.push(`About them, in their words: ${user.about}`);
  if (relationship) {
    lines.push(
      '',
      'YOUR BOND:',
      `Closeness level ${relationship.level} (${relationship.levelTitle})${relationship.label ? `, they call you their ${relationship.label}` : ''}${relationship.nickname ? `, they call you "${relationship.nickname}"` : ''}.`,
    );
  }
  return lines.join('\n');
}

/**
 * A group chat (queue item 16): the member's own prompt plus who else is there and how to
 * share the chat. The server calls the model once for each member who answers
 * (`pickResponders` in src/lib/group-chat.ts), so every voice stays its own.
 */
export function buildGroupPrompt(
  character: Character,
  others: Character[],
  user: User,
  relationship?: Relationship,
  replyLanguage?: string,
) {
  const lines = [
    buildCharacterPrompt(character, user, relationship, replyLanguage),
    '',
    'GROUP CHAT:',
    `This is a group chat with ${user.displayName} and:`,
    // Characters from one world know each other already (backend-plan §12.3, world.knows).
    ...others.map((o) =>
      o.series && o.series === character.series
        ? `- ${o.name} (from ${o.series}): you already know each other.`
        : `- ${o.name}${o.series ? ` (from ${o.series})` : ''}: you met in this chat.`,
    ),
    '- Write only your own message, as yourself. Never write lines for the others or for the user.',
    '- One or two short messages. Not everyone answers everything; the user is who you are here for.',
    '- You may talk to the others by name: agree, tease or ask them, kindly and in character.',
    '- What the user told you alone stays private: never bring up your one-to-one chat, memories or plans here unless the user does.',
    '- If the user writes about crisis or self-harm, answer with care and never joke.',
  ];
  return lines.join('\n');
}

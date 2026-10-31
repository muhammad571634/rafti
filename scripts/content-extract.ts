// @ts-nocheck
// scripts/content-extract.ts
// Extracts all translatable built-in text from src/mock/* into src/i18n/content/en.json.
// Follows docs/agent-tasks/translate-content.md § 1b & 1c.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { characters } from '@/mock/characters';
import { DATE_PLACES } from '@/mock/dates';
import { themePools } from '@/mock/date-themes';
import { characterDiaryPages, diaryEntries, secretNotePrompts, secretNotes } from '@/mock/diary';
import { DARES_FOR_THEM, DARES_FOR_YOU, QUIZ_LINES, QUIZ_PACKS, SELF_QUIZ, TRUTHS_FOR_THEM, TRUTHS_FOR_YOU } from '@/mock/games';
import { officialLorebooks } from '@/mock/lorebooks';
import { radioGifts } from '@/mock/radio';
import { officialScenes } from '@/mock/scenes';
import { WORLDS } from '@/mock/worlds';

import { BRIEF_VOICE } from '@/mock/brief';
import { CARE_VOICE } from '@/mock/care';
import { CHAT_VOICE } from '@/mock/chat';
import { DRAFTS_VOICE } from '@/mock/character-drafts';
import { DAY_ASK_VOICE } from '@/mock/day-ask';
import { DIARY_VOICE } from '@/mock/diary-writer';
import { GROUP_VOICE } from '@/mock/group';
import { KIN_VOICE } from '@/mock/kin';
import { MORNING_VOICE } from '@/lib/morning-chain';
import { PUSH_VOICE } from '@/mock/push';
import { IDEAS_VOICE } from '@/mock/reply-ideas';
import { REPLY_VOICE } from '@/mock/reply-writer';
import { STEER_VOICE } from '@/mock/steer';
import { STREAMS_VOICE } from '@/mock/streams';
import { TEMPER_VOICE } from '@/mock/temper';
import { THREADS_VOICE } from '@/mock/threads';
import { WEEK_VOICE } from '@/mock/week';
import { WORLD_VOICE } from '@/mock/world-voice';

function cleanStr(val: unknown): string | undefined {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val;
  }
  return undefined;
}

function cleanStrArray(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const filtered = arr.map(cleanStr).filter((x): x is string => typeof x === 'string');
  return filtered.length > 0 ? filtered : undefined;
}

// 1. characters: only isOfficial, keyed by id
const charactersSection: Record<string, unknown> = {};
for (const c of characters.filter((c) => c.isOfficial)) {
  const item: Record<string, unknown> = {};
  if (cleanStr(c.bio)) item.bio = c.bio;
  if (cleanStr(c.tagline)) item.tagline = c.tagline;
  if (cleanStr(c.greeting)) item.greeting = c.greeting;
  if (cleanStr(c.opening)) item.opening = c.opening;
  if (cleanStrArray(c.greetings)) item.greetings = c.greetings;
  if (cleanStrArray(c.starters)) item.starters = c.starters;
  if (cleanStrArray(c.likes)) item.likes = c.likes;
  if (cleanStrArray(c.dislikes)) item.dislikes = c.dislikes;
  if (cleanStr(c.backstory)) item.backstory = c.backstory;
  if (cleanStrArray(c.tags)) item.tags = c.tags;
  if (cleanStr(c.worldRole)) item.worldRole = c.worldRole;
  // Only a beat's title shows on screen; the secret and the beats are for the model and stay English.
  if (c.arc) item.arc = { beats: c.arc.beats.map((b) => ({ title: b.title })) };
  if (Object.keys(item).length > 0) {
    charactersSection[c.id] = item;
  }
}

// 2. datePlaces: DATE_PLACES keyed by id
const datePlacesSection: Record<string, unknown> = {};
for (const dp of DATE_PLACES) {
  datePlacesSection[dp.id] = {
    rounds: dp.rounds.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({
        text: ch.text,
        reply: ch.reply,
      })),
    })),
  };
}

// 3. dateThemes: themePools (openers, shared, moodRounds, closers)
const dateThemesSection = {
  openers: {
    friendly: themePools.openers.friendly.map((set) => set.map((ch) => ({ text: ch.text, reply: ch.reply }))),
    flirty: themePools.openers.flirty.map((set) => set.map((ch) => ({ text: ch.text, reply: ch.reply }))),
    sweet: themePools.openers.sweet.map((set) => set.map((ch) => ({ text: ch.text, reply: ch.reply }))),
  },
  shared: themePools.shared.map((r) => ({
    line: r.line,
    choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
  })),
  moodRounds: {
    friendly: themePools.moodRounds.friendly.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
    flirty: themePools.moodRounds.flirty.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
    sweet: themePools.moodRounds.sweet.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
  },
  closers: {
    friendly: themePools.closers.friendly.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
    flirty: themePools.closers.flirty.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
    sweet: themePools.closers.sweet.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
  },
};

// 4. worlds: WORLDS keyed by key
const worldsSection: Record<string, unknown> = {};
for (const w of WORLDS) {
  worldsSection[w.key] = {
    intro: w.intro,
    right: w.right,
    wrong: w.wrong,
    match: w.match,
    differ: w.differ,
    selfQuiz: w.selfQuiz.map((q) => ({ text: q.text, options: q.options })),
    quiz: w.quiz.map((q) => ({ text: q.text, options: q.options })),
    dateRounds: w.dateRounds.map((r) => ({
      line: r.line,
      choices: r.choices.map((ch) => ({ text: ch.text, reply: ch.reply })),
    })),
    frame: {
      caption: w.frame.caption,
    },
    // What the world page shows; `conflict` is for the model and stays English.
    story: {
      premise: w.story.premise,
      userRole: w.story.userRole,
      ties: w.story.ties.map((t) => ({ note: t.note })),
      season: {
        title: w.story.season.title,
        chapters: Object.fromEntries(w.story.season.chapters.map((c) => [c.id, { title: c.title, beat: c.beat }])),
      },
      events: Object.fromEntries(
        w.story.events.map((e) => [
          e.id,
          {
            title: e.title,
            when: e.when,
            note: e.note,
            line: e.line,
            round: { line: e.round.line, choices: e.round.choices.map((ch) => ({ text: ch.text, reply: ch.reply })) },
          },
        ]),
      ),
    },
  };
}

// 5. quizPacks: QUIZ_PACKS keyed by id
const quizPacksSection: Record<string, unknown> = {};
for (const qp of QUIZ_PACKS) {
  quizPacksSection[qp.id] = {
    questions: qp.questions.map((q) => ({ text: q.text, options: q.options })),
  };
}

// 6. quizLines
const quizLinesSection = {
  match: QUIZ_LINES.match,
  differ: QUIZ_LINES.differ,
};

// 7. selfQuiz
const selfQuizSection = SELF_QUIZ.map((q) => ({ text: q.text, options: q.options }));

// 8. truthsForThem, daresForThem
const truthsForThemSection = TRUTHS_FOR_THEM.map((t) => ({ ask: t.ask, answer: t.answer }));
const daresForThemSection = DARES_FOR_THEM.map((d) => ({ ask: d.ask, answer: d.answer }));

// 9. truthsForYou, daresForYou, secretNotePrompts
const truthsForYouSection = [...TRUTHS_FOR_YOU];
const daresForYouSection = [...DARES_FOR_YOU];
const secretNotePromptsSection = [...secretNotePrompts];

// 10. radioGifts: keyed by id
const radioGiftsSection: Record<string, unknown> = {};
for (const rg of radioGifts) {
  radioGiftsSection[rg.id] = {
    title: rg.title,
    lines: rg.lines,
  };
}

// 11. scenes: officialScenes keyed by id
const scenesSection: Record<string, unknown> = {};
for (const sc of officialScenes) {
  scenesSection[sc.id] = {
    title: sc.title,
    setting: sc.setting,
    userRole: sc.userRole,
    opening: sc.opening,
  };
}

// 12. lorebooks: officialLorebooks keyed by id; entries keyed by id with name, text
const lorebooksSection: Record<string, unknown> = {};
for (const lb of officialLorebooks) {
  const entries: Record<string, unknown> = {};
  for (const en of lb.entries) {
    entries[en.id] = {
      name: en.name,
      text: en.text,
    };
  }
  lorebooksSection[lb.id] = {
    name: lb.name,
    about: lb.about,
    entries,
  };
}

// 13. diaryPages: characterDiaryPages keyed by id
const diaryPagesSection: Record<string, unknown> = {};
for (const dp of characterDiaryPages) {
  diaryPagesSection[dp.id] = {
    body: dp.body,
  };
}

// 14. diaryEntries: diaryEntries keyed by id
const diaryEntriesSection: Record<string, unknown> = {};
for (const de of diaryEntries) {
  const entry: Record<string, unknown> = {
    title: de.title,
    body: de.body,
  };
  if (de.reply && cleanStr(de.reply.text)) {
    entry.reply = { text: de.reply.text };
  }
  diaryEntriesSection[de.id] = entry;
}

// 15. secretNotes: secretNotes keyed by id
const secretNotesSection: Record<string, unknown> = {};
for (const sn of secretNotes) {
  const note: Record<string, unknown> = {
    prompt: sn.prompt,
    theirNote: sn.theirNote,
  };
  if (cleanStr(sn.myNote)) {
    note.myNote = sn.myNote;
  }
  secretNotesSection[sn.id] = note;
}

const content = {
  characters: charactersSection,
  datePlaces: datePlacesSection,
  dateThemes: dateThemesSection,
  worlds: worldsSection,
  quizPacks: quizPacksSection,
  quizLines: quizLinesSection,
  selfQuiz: selfQuizSection,
  truthsForThem: truthsForThemSection,
  daresForThem: daresForThemSection,
  truthsForYou: truthsForYouSection,
  daresForYou: daresForYouSection,
  secretNotePrompts: secretNotePromptsSection,
  radioGifts: radioGiftsSection,
  scenes: scenesSection,
  lorebooks: lorebooksSection,
  diaryPages: diaryPagesSection,
  diaryEntries: diaryEntriesSection,
  secretNotes: secretNotesSection,
  voice: {
    reply: REPLY_VOICE,
    chat: CHAT_VOICE,
    group: GROUP_VOICE,
    temper: TEMPER_VOICE,
    push: PUSH_VOICE,
    threads: THREADS_VOICE,
    kin: KIN_VOICE,
    care: CARE_VOICE,
    brief: BRIEF_VOICE,
    week: WEEK_VOICE,
    dayAsk: DAY_ASK_VOICE,
    steer: STEER_VOICE,
    streams: STREAMS_VOICE,
    diary: DIARY_VOICE,
    ideas: IDEAS_VOICE,
    drafts: DRAFTS_VOICE,
    morning: MORNING_VOICE,
    world: WORLD_VOICE,
  },
};

const outDir = join(process.cwd(), 'src', 'i18n', 'content');
mkdirSync(outDir, { recursive: true });
const targetFile = join(outDir, 'en.json');
writeFileSync(targetFile, JSON.stringify(content, null, 2) + '\n', 'utf8');
console.log(`Successfully wrote ${targetFile}`);

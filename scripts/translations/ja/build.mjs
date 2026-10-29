import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { characters } from './characters.mjs';
import { datePlaces } from './date-places.mjs';
import { dateThemes } from './date-themes.mjs';
import { worlds } from './worlds.mjs';
import { quizPacks } from './quiz-packs.mjs';
import { lorebooks } from './lorebooks.mjs';
import { small } from './small.mjs';
import { voice } from './voice/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jaContent = {
  characters,
  datePlaces,
  dateThemes,
  worlds,
  quizPacks,
  quizLines: small.quizLines,
  selfQuiz: small.selfQuiz,
  truthsForThem: small.truthsForThem,
  daresForThem: small.daresForThem,
  truthsForYou: small.truthsForYou,
  daresForYou: small.daresForYou,
  secretNotePrompts: small.secretNotePrompts,
  radioGifts: small.radioGifts,
  scenes: small.scenes,
  lorebooks,
  diaryPages: small.diaryPages,
  diaryEntries: small.diaryEntries,
  secretNotes: small.secretNotes,
  voice
};

const targetPath = path.resolve(__dirname, '../../../src/i18n/content/ja.json');
fs.writeFileSync(targetPath, JSON.stringify(jaContent, null, 2) + '\n', 'utf8');
console.log('Successfully written Japanese content to:', targetPath);

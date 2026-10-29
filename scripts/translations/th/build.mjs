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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const thContent = {
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
};

const targetPath = path.resolve(__dirname, '../../../src/i18n/content/th.json');
fs.writeFileSync(targetPath, JSON.stringify(thContent, null, 2) + '\n', 'utf8');
console.log('Successfully written Thai content to:', targetPath);

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

const itContent = {
  characters,
  datePlaces,
  dateThemes,
  worlds,
  quizPacks,
  lorebooks,
  radioGifts: small.radioGifts,
  selfQuiz: small.selfQuiz,
  scenes: small.scenes,
  diaryPages: small.diaryPages,
  diaryEntries: small.diaryEntries,
  truthsForThem: small.truthsForThem,
  daresForThem: small.daresForThem,
  secretNotePrompts: small.secretNotePrompts,
  quizLines: small.quizLines,
  secretNotes: small.secretNotes,
  truthsForYou: small.truthsForYou,
  daresForYou: small.daresForYou,
  voice
};

const targetPath = path.resolve(__dirname, '../../../src/i18n/content/it.json');
fs.writeFileSync(targetPath, JSON.stringify(itContent, null, 2) + '\n', 'utf8');
console.log('Successfully written Italian content to:', targetPath);

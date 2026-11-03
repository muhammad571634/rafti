import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { characters } from '../src/mock/characters';
import { generatePackForCharacter, saveContentPack } from './generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local marketing env if present
const envLocalPath = path.resolve(__dirname, '../.env.marketing.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

interface DispatchOptions {
  characterIds?: string[];
  count?: number;
  sendTelegram?: boolean;
}

// Popular starter characters from different worlds for high conversion
const HIGH_CONVERTING_LEADS = [
  'c_ronan',     // Velvet District (Bodyguard, dark noir)
  'c_luca',      // Velvet District (Casino dealer, charming rogue)
  'c_isolde',    // Velvet District (Casino boss, elegant fem-fatale)
  'c_leander',   // Gilded Empire (Crown Prince, cold royal with dog)
  'c_dorian',    // Gilded Empire (Dangerous rival nobleman, chessboard)
  'c_erik',      // Ice & Arena (Rugged hockey captain)
  'c_kai',       // Seaside Academy (Campus swim-team ace)
  'c_elio',      // Seaside Academy (Quiet top-student cat-feeder)
];

export async function runDailyGrowthBatch(options: DispatchOptions = {}) {
  const count = options.count || 3;
  const today = new Date().toISOString().split('T')[0];

  const pool = options.characterIds && options.characterIds.length > 0
    ? options.characterIds
    : HIGH_CONVERTING_LEADS;

  // Pick deterministic or rotated characters for today
  const selectedIds = pool.slice(0, count);

  console.log(`[Growth Engine] Generating ${selectedIds.length} organic marketing packs for ${today}...`);

  const generatedPacks = [];
  for (const id of selectedIds) {
    const pack = generatePackForCharacter(id);
    const { mdPath, jsonPath } = saveContentPack(pack);
    generatedPacks.push({ pack, mdPath, jsonPath });
    console.log(`  ✓ Generated pack for ${pack.characterName} (${pack.characterId})`);
  }

  // Create TODAY.md at marketing root for easy 1-click access
  const todaySummaryPath = path.join(__dirname, 'TODAY.md');
  const summaryContent = `# 🚀 Today's Organic Growth Posts (${today})

Generated packs for today (${generatedPacks.length} characters ready to post):

${generatedPacks.map(({ pack, mdPath }) => `
### 👤 ${pack.characterName} — *${pack.series}*
- 📄 **Full Pack:** [\`${pack.characterId}.md\`](file:///${mdPath.replace(/\\/g, '/')})
- **Threads Snippet:**
  > ${pack.threadsPost.split('\n')[0]}
- **TikTok/Reels Hook:**
  > "${pack.videoScript.hookText}"
`).join('\n---\n')}

---
*Generated autonomously by Sigmazam Growth Agent. Copy and drop into Threads, X, TikTok, or Reddit.*
`;

  fs.writeFileSync(todaySummaryPath, summaryContent, 'utf-8');
  console.log(`[Growth Engine] Updated daily summary: ${todaySummaryPath}`);

  // Optional Telegram Dispatcher
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;

  if (tgToken && tgChatId && options.sendTelegram !== false) {
    console.log(`[Growth Engine] Dispatching to Telegram (Chat ID: ${tgChatId})...`);
    for (const { pack } of generatedPacks) {
      try {
        const text = `📱 *Sigmazam Post: ${pack.characterName} (${pack.series})*\n\n*Threads Post:*\n\`\`\`\n${pack.threadsPost}\n\`\`\`\n\n*X (Twitter):*\n${pack.xPost}`;
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text,
            parse_mode: 'Markdown',
          }),
        });
      } catch (e) {
        console.warn(`[Growth Engine] Telegram dispatch failed for ${pack.characterId}:`, e);
      }
    }
  }

  return generatedPacks;
}

if (process.argv[1]?.includes('dispatcher')) {
  runDailyGrowthBatch().catch(console.error);
}


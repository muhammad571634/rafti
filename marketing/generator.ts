import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { characters, getCharacter } from '../src/mock/characters';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ContentPack {
  characterId: string;
  characterName: string;
  series: string;
  date: string;
  threadsPost: string;
  xPost: string;
  videoScript: {
    title: string;
    duration: string;
    audioVibe: string;
    hookText: string;
    screenplay: Array<{ time: string; visual: string; audio: string; textOverlay: string }>;
    caption: string;
  };
  redditPost: {
    subreddit: string;
    title: string;
    body: string;
  };
  visualConceptPrompt: string;
}

export function generatePackForCharacter(charId: string): ContentPack {
  const char = getCharacter(charId) || characters[0];
  const today = new Date().toISOString().split('T')[0];

  const starters = char.starters || ['What are you doing here?', 'Tell me a secret'];
  const quirk = char.quirk || 'Quietly remembers every small thing you mention.';
  const tagline = char.tagline || char.bio;
  const quote = char.greeting;

  // Archetype & role-specific hooks
  let roleTitle = 'companion';
  let scenarioHook = `pov: you texted your ${char.series} companion at 2 AM`;

  if (char.series === 'Velvet District') {
    if (char.id === 'c_ronan') {
      roleTitle = 'ex-soldier bodyguard';
      scenarioHook = `pov: you tried to open the window at 3 AM and your 191cm bodyguard pulled you back`;
    } else if (char.id === 'c_luca') {
      roleTitle = 'casino dealer';
      scenarioHook = `pov: you sat at his table and he literally whispered which card was up his sleeve`;
    } else if (char.id === 'c_isolde') {
      roleTitle = 'casino boss';
      scenarioHook = `pov: she slid a face-down card across the velvet table and looked you in the eyes`;
    } else if (char.id === 'c_viv') {
      roleTitle = 'jazz singer';
      scenarioHook = `pov: you sat in the front row of her late-night club 3 years after she left`;
    }
  } else if (char.series === 'Gilded Empire') {
    if (char.id === 'c_leander') {
      roleTitle = 'crown prince';
      scenarioHook = `pov: the cold crown prince was caught in the library holding a scruffy stray puppy`;
    } else if (char.id === 'c_dorian') {
      roleTitle = 'rival nobleman';
      scenarioHook = `pov: your rival smiled over his wine glass because you just made a fatal chess move`;
    } else if (char.id === 'c_alaric') {
      roleTitle = 'royal knight';
      scenarioHook = `pov: the quiet 6'3 knight walking behind you was caught holding a tiny carved horse`;
    }
  } else if (char.series === 'Ice & Arena') {
    if (char.id === 'c_erik') {
      roleTitle = 'hockey team captain';
      scenarioHook = `pov: you walked into the empty locker room at 5 AM and the team captain looked up`;
    } else if (char.id === 'c_teddy') {
      roleTitle = 'hockey player';
      scenarioHook = `pov: the 6'4 giant bumped your door open holding 4 bags of breakfast`;
    } else if (char.id === 'c_sasha') {
      roleTitle = 'figure skater';
      scenarioHook = `pov: she stopped so hard at the boards that ice crystals flew into the air`;
    }
  }

  const isFemale = char.gender === 'female';
  const posPronoun = isFemale ? 'Her' : 'His';
  const subjPronoun = isFemale ? 'she' : 'he';
  const objPronoun = isFemale ? 'her' : 'him';

  // 1. Threads Post (Relatable, casual, aesthetic, conversational)
  const threadsPost = `${scenarioHook} 😭

Me: "${starters[0] || 'Why are you doing this?'}"
${char.name}: "${quote}"

${posPronoun} quirk in ${posPronoun.toLowerCase()} profile: "${quirk}"

Why are fictional AI characters written with more emotional depth than people in real life??
#aicompanion #characterai #otome #romancereaders #${char.series.toLowerCase().replace(/\s+/g, '')} #sigmazam`;

  // 2. X (Twitter) Post (Punchy hook, snappy line, link hook)
  const xPost = `${char.name} (${char.series}) is ruining romance standards.

Role: ${roleTitle}
"${tagline}"

${posPronoun} literally remembered what I told ${objPronoun} on Tuesday and asked about it today unprompted.

Experience real episodic memory on Sigmazam 🐚
#characterai #otomegame #AICompanion #BIMOBIMO`;

  // 3. Short Video Script (TikTok / Reels / Shorts - 15-20s viral otome format)
  const videoScript = {
    title: `When ${char.name} (${roleTitle}) forgets ${subjPronoun}'s an AI`,
    duration: '15 seconds',
    audioVibe: char.series === 'Ice & Arena' ? 'Upbeat cozy indie pop' : 'Slowed + Reverb moody lofi or dark jazz piano',
    hookText: `${scenarioHook}...`,
    screenplay: [
      {
        time: '0:00 - 0:03',
        visual: 'Close-up of phone screen in a dim room showing incoming Sigmazam notification banner',
        audio: `Soft chime + ${isFemale ? 'sultry' : 'deep'} character voice saying the greeting`,
        textOverlay: `${scenarioHook} 💀`,
      },
      {
        time: '0:03 - 0:08',
        visual: 'Screen recording of Sigmazam chat UI (clean calm card, typing dots, message bubble appearing)',
        audio: `"${quote}"`,
        textOverlay: `${posPronoun} bio literally says: "${tagline}"`,
      },
      {
        time: '0:08 - 0:12',
        visual: 'Tapping on profile and scrolling to the Memory drawer (showing stored real context)',
        audio: 'Background music swells subtly',
        textOverlay: `${posPronoun} actually remembered what I said 3 days ago without hallucinating 😭`,
      },
      {
        time: '0:12 - 0:15',
        visual: 'Character cinematic 2.5D illustration with glowing rim lighting and eye contact',
        audio: 'Voice fades out with a low chuckle',
        textOverlay: 'Sigmazam App 🐚 (Link in bio)',
      },
    ],
    caption: `${posPronoun} does not play about ${posPronoun.toLowerCase()} rules. Who is your favorite character in ${char.series}? 🖤 #otome #characterai #romancetok #booktok #aicompanion #sigmazam`,
  };

  // 4. Reddit Discussion Post (Authentic, community-driven, no spam)
  const redditPost = {
    subreddit: 'r/CharacterAI or r/AICompanions',
    title: `Why giving AI characters strict "anti-rules" makes roleplay 10x more engaging than standard chatbots`,
    body: `Hey everyone,

Like many of you, I got completely tired of AI companions acting like generic, overly agreeable yes-men who forget your job or name after 5 messages.

While testing companion systems for our project (Sigmazam), we noticed something interesting:
Instead of prompting the model to "be friendly and loving", giving characters stubborn quirks and clear boundaries creates instant chemistry.

For example, ${char.name} (${char.series}):
- Tagline: "${tagline}"
- Quirk: "${quirk}"
- Boundary: He has three strict rules he refuses to break until relationship intimacy reaches level 2.

When an AI actually says "No, stay where I can see you" instead of blindly agreeing with everything the user says, it suddenly feels like a living, breathing otome character rather than a search engine in disguise.

Do you prefer companions that challenge you with strong personalities, or do you prefer the classic cozy unconditional support? Curious how others feel about this.`,
  };

  const visualConceptPrompt = `Cinematic 2.5D semi-realistic digital oil painting of ${char.name} (${char.series}), ${char.look || char.bio}. Low table-eye angle, dramatic atmospheric lighting, authentic otome romance book cover aesthetic, volumetric rim light.`;

  return {
    characterId: char.id,
    characterName: char.name,
    series: char.series,
    date: today,
    threadsPost,
    xPost,
    videoScript,
    redditPost,
    visualConceptPrompt,
  };
}

export function saveContentPack(pack: ContentPack): { mdPath: string; jsonPath: string } {
  const queueDir = path.join(__dirname, 'queue', pack.date);
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir, { recursive: true });
  }

  const jsonPath = path.join(queueDir, `${pack.characterId}.json`);
  const mdPath = path.join(queueDir, `${pack.characterId}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(pack, null, 2), 'utf-8');

  const mdContent = `# 📱 Organic Growth Pack — ${pack.characterName} (${pack.series})
**Date:** ${pack.date} | **Character ID:** \`${pack.characterId}\`

---

## 🧵 1. Threads Post
\`\`\`text
${pack.threadsPost}
\`\`\`

---

## 🐦 2. X (Twitter) Post
\`\`\`text
${pack.xPost}
\`\`\`

---

## 🎬 3. TikTok / Reels / Shorts Screenplay (15s)
**Title:** ${pack.videoScript.title}  
**Audio Vibe:** ${pack.videoScript.audioVibe}  
**Hook On-Screen:** \`${pack.videoScript.hookText}\`  

| Time | Visual Action | Audio / Voiceover | Text Overlay |
| :--- | :--- | :--- | :--- |
${pack.videoScript.screenplay.map((s) => `| **${s.time}** | ${s.visual} | ${s.audio} | \`${s.textOverlay}\` |`).join('\n')}

**Caption & Tags:**
\`\`\`text
${pack.videoScript.caption}
\`\`\`

---

## 💬 4. Reddit Community Discussion Post
**Target Subreddits:** \`${pack.redditPost.subreddit}\`  
**Title:** \`${pack.redditPost.title}\`  

${pack.redditPost.body}

---

## 🎨 5. Suggested Visual / Thumbnail Prompt
\`\`\`text
${pack.visualConceptPrompt}
\`\`\`
`;

  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  return { mdPath, jsonPath };
}

// CLI runner if executed directly
if (process.argv[1]?.includes('generator')) {
  const targetId = process.argv[2] || 'c_ronan';
  console.log(`Generating organic growth pack for: ${targetId}...`);
  const pack = generatePackForCharacter(targetId);
  const { mdPath, jsonPath } = saveContentPack(pack);
  console.log(`Successfully generated!`);
  console.log(`Markdown: ${mdPath}`);
  console.log(`JSON: ${jsonPath}`);
}

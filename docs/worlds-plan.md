# Worlds 2.0: research and proposed architecture (2026-10-30)

The owner wants the next big push on characters and their worlds: we ship about 40 official characters, users make
the rest, and today's four worlds feel thin. This file is the research and a proposed architecture. Nothing here is
built yet at first; the owner approved it on 2026-10-30 (55 characters, third world Ice & Arena: see HANDOFF 0z68).

## 1. Where we are

- 42 characters: 40 official in four worlds of 10 (Seaside Academy, Moonlit Realm, NEON TIDE, Tidepool Café) and 2
  "My Creations". 31 male, 11 female.
- A world today is a `series` string plus: one lorebook of about 8 entries (`src/mock/lorebooks.ts`), a 5-question
  quiz, a Photo Booth frame and a few date rounds (`src/mock/worlds.ts`), and a world page in Find
  (`src/app/world/[series].tsx`).
- What is missing:
  - The world does nothing: no conflict, no story that moves, no events, no role for the user.
  - The cast barely knows each other: names in the lorebook, no rivalries, siblings or exes.
  - Every character is the same shape, "secretly soft, loyal, protective". All four worlds are cozy, none has an edge.
  - A character has no arc: no secret that opens at a bond level, no chapters.

## 2. What the market says

Sources are mixed in quality (blogs, fan surveys, one Apify TikTok sample), so read them as direction, not as facts.

**TikTok** (Apify `clockworks/tiktok-hashtag-scraper`, the top 12 videos per hashtag, 2026-10-30, $0.65). Saves show
intent better than views.

| Hashtag | Median views | Median saves |
| --- | ---: | ---: |
| aiboyfriend | 1,000,000 | 4,540 |
| enemiestolovers | 700,700 | 9,992 |
| slowburn | 393,500 | 9,398 |
| bodyguardromance | 383,700 | 2,151 |
| yandere | 376,400 | 13,021 |
| darkromance | 330,600 | 5,190 |
| romantasy | 295,600 | 15,392 |
| villainess | 225,800 | 7,566 |
| mafiaromance | 183,500 | 855 |
| fakedating | 104,700 | 952 |
| otomegame | 100,200 | 5,783 |
| ceoromance | 67,900 | 427 |
| grumpysunshine | 60,400 | 811 |
| characterai | 45,000 | 517 |
| hockeyromance | 41,600 | 331 |
| werewolfromance | 38,900 | 116 |
| scifiromance | 20,000 | 638 |
| vampireromance | 17,500 | 963 |

What it shows:
- **Dynamics beat settings.** Enemies to lovers, slow burn, yandere and bodyguard pull far more than any one setting.
- **Two settings stand out:** romantasy (fantasy courts, highest saves) and villainess, the court-isekai of webtoons.
- **Dark romance and mafia** do well on views, but mafia gets few saves.
- **Weak as hashtags:** CEO, werewolf, vampire, sports and sci-fi.

**TikTok, character types** (second run, the top 10 videos per hashtag, $0.42):

| Hashtag | Median views | Median saves |
| --- | ---: | ---: |
| tsundere | 634,600 | 12,505 |
| arrangedmarriage | 597,800 | 8,226 |
| touchherandyoudie (protective) | 483,200 | 10,821 |
| himbo | 367,100 | 3,937 |
| blackcatgoldenretriever (pairing) | 247,300 | 4,507 |
| whodidthistoyou (protective) | 186,900 | 3,102 |
| morallygrey | 177,200 | 2,718 |
| goldenretrieverboyfriend | 163,900 | 1,423 |
| kuudere | 150,200 | 2,757 |
| rivalstolovers | 51,900 | 768 |
| forcedproximity | 31,900 | 1,019 |
| secondchanceromance | 19,000 | 935 |
| royalromance | 10,800 | 56 |
| forbiddenlove | 1,578 | 8 |

**Reddit** (r/CharacterAI and r/JanitorAI_Official, the top posts of the year for "favorite bot / trope", with
comments, $0.50):
- JanitorAI's trending page is ruled by one kind of character, a masked military man from a shooter game. The top
  comment (773 votes) explains it: the masked man, the soldier, a voice or accent, a moody antihero.
- School and college settings dominate. Users "miss what school time could have been", and they are easy settings to
  write. Our campus world is right; it stays adult (university).
- What adults on Character.AI complain about:
  - Romance is cut off, even a kiss.
  - Old Character.AI was better.
  - Bots ignore the persona: the wrong body type ("skinny", "ripped"), and a gay couple's man turned into "the bride".
  - The same stock phrases come back.
  Our open-for-adults line and the persona are a real edge. The prompt must respect the persona's body, gender and
  pronouns.
- Users lose hours in one sitting. Long sessions are normal.

**Google Trends:** two Apify actors failed (timed out, "scraping failed"); no data.

**TikTok, genre pass** (2026-10-30, top 10 videos per hashtag, medians; "tag" = the hashtag's all-time views), to pick
the third new world:

| Hashtag | Views | Saves | Tag |
| --- | ---: | ---: | ---: |
| villainess | 459k | 15.0k | 387M |
| darkromance | 331k | 4.0k | 41B |
| hockeyromance | 77k | 1.5k | 4.1B |
| mafiaromance | 53k | 0.8k | 6.1B |
| werewolfromance | 39k | 0.1k | 293M |
| fantasyromance | 36k | 0.2k | 4.2B |
| sportsromance | 34k | 1.5k | 3.6B |
| vampireromance | 18k | 0.3k | 470M |
| monsterromance | 9k | 0.9k | 1.0B |
| paranormalromance | 6k | 0.1k | 1.1B |
| spaceromance | 2k | 0 | 0.9M |
| scifiromance | 2k | 0 | 173M |

Villainess and dark romance lead by far. Sports (hockey) beats paranormal, and sci-fi is nearly absent on TikTok.

**Other signals**
- Romance leads webtoons at about 27% of the market, fantasy follows at about 22%. Wattpad: romance, teen, fanfic.
- The 2026 trope lists repeat the same names: enemies to lovers, forced proximity, slow burn, fake dating, grumpy ×
  sunshine, second chance, and dark romance's morally grey or possessive hero.
- Companion apps:
  - The archetypes that recur: the teasing flirt, the protective partner, the shy slow burn, the confident one, the
    comforting friend.
  - "Questionable intentions" create tension that safe characters cannot.
  - On Character.AI and Talkie, anime and fantasy looks lead.
- Otome games:
  - Love and Deepspace passed about $1bn with only a handful of deep love interests, a sci-fi action world, timed
    events and story chapters. Its revenue fell sharply in mid-2026 after fans objected to a planned new love interest:
    players bond with each lead.
  - Fan surveys like mature, caring leads most (73%), then sweet ones (63%). "Too perfect" and "too plain" are what
    they dislike. Yandere has a small, intense following. About 5 love interests per story is the sweet spot.
- Character.AI added "Stories", where the AI writes a scene and the user picks what happens next. Its Lorebook story
  setup picks 2-3 characters, a genre and a premise. Rochat sells shared worlds and group scenes.
- BIMOBIMO (our teardown) is a fandom catalogue: K-pop, anime, games. Those are real people and others' IP, which we
  never use. Its "Original Character" shelf has one card. Original worlds are our moat.
- Audience: the gender split of the reports runs from 50/50 to two thirds male. Our cast leans otome (male leads),
  which matches romantasy and otome demand. Women are under-served on our side: 11 of 42.

## 3. Proposal

### 3.1 Content

1. **Deepen the four worlds.** Each gets a conflict, a role for the user and a season story:
   - **Seaside Academy:** a campus by the sea. The user is a transfer student. The story is the lighthouse festival
     and the mystery of who the 1 a.m. show is dedicated to.
   - **Moonlit Realm** becomes our romantasy world: court intrigue, oaths and a dragon's hoard. The user is a
     traveller bound by an oath to the exiled prince's court.
   - **NEON TIDE:** a rival group (PRISM), a comeback season and scandal pressure. The user is the new manager.
   - **Tidepool Café:** a developer wants the street. The user is the new tenant above the café.
2. **Add three worlds** of 6 each: 5 leads and 1 friend or rival, half of them women. Original names, no real
   people or IP.
   - **Velvet District:** a noir city of rival families and a casino. The bodyguard, the heir and the detective; the
     user is a witness under protection. Covers dark romance, bodyguard, enemies to lovers and fake dating. App Store
     line: tension and loyalty, no graphic violence, no drugs.
   - **Gilded Empire:** the user wakes up as the villainess of a court novel. The crown prince, the knight, the duke's
     heir, the "heroine". Covers villainess and second chance.
   - **The owner picks the third:**
     - Starfall Station, sci-fi; weak on TikTok, but Love and Deepspace proves it can be huge.
     - Hollow Bay, a paranormal small-town mystery.
     - Ice & Arena, a sports team.
3. **A trope with the user for every character:** enemies to lovers, slow burn, bodyguard, rivals, fake dating,
   second chance, forbidden or grumpy × sunshine. Spread these across each world so a world never has two of the
   same.
4. **More shapes of character.** The archetypes the data rewards, each with how many of today's cast already fit
   (by tags):

   | Archetype | Signal | Today |
   | --- | --- | --- |
   | Tsundere | TikTok #1 by views (635k), 12.5k saves | 1 (Hana) |
   | Protective ("touch her and you die", bodyguard) | 483k, 10.8k saves; bodyguard 384k | 5, but all soft |
   | Possessive, devoted (yandere-lite) | 376k, 13k saves | 1 (Kael, mild) |
   | Morally grey or masked (antihero, the masked soldier) | dark romance, JanitorAI trending | 2 (Zarek, Vesper) |
   | Kuudere (cold outside) | 150k | 2 (Elio, Corvin) |
   | Sunshine, golden retriever, himbo | 164k-367k | 4 |
   | Caring, mature | otome survey favourite (73%) | 5 |
   | Rival (enemies to lovers) | 700k, 10k saves | 2 (Tessa, Cass) |
   | Playful flirt | companion apps' "teasing flirt" | 3 |

   Each world gets one of each where it fits, and one pair inside the cast (black cat × golden retriever). Arranged
   marriage (598k) is a world premise, not a character: Gilded Empire, and Velvet District's families. Edge stays
   inside our content line (`content-balance` memory): possessive or dangerous in tone, never coercion or abuse as
   romance.

Count: 40 + 18 = 58 official characters. Images: 18 × (portrait + scene) plus 3 key art ≈ 39 images ≈ $3.1 on
Higgsfield. That needs the owner's yes: one test image first, then the batch.

### 3.2 Data model

`World` becomes a first-class record. `Character.series` stays as the key, so nothing breaks.

```ts
interface World {
  id: string;                 // 'seaside'; Character.series keeps the display name
  name: string;
  genre: 'campus' | 'romantasy' | 'idol' | 'slice-of-life' | 'noir' | 'court' | 'sci-fi' | 'paranormal' | 'sports';
  tone: { edge: 'cozy' | 'tense' | 'dark'; heat: 'sweet' | 'warm' | 'spicy' };
  premise: string;            // 2-3 lines, always in the prompt
  conflict: string;           // what pulls the world apart
  userRole: { title: string; hook: string };  // who the user is here
  castIds: string[];
  ties: { a: string; b: string; kind: 'rivals' | 'siblings' | 'exes' | 'best friends' | 'mentor' | 'sworn'; note: string }[];
  season: { title: string; chapters: { id: string; title: string; beat: string; opensOnDay: number }[] };
  events: { id: string; title: string; every: 'week' | 'month' | 'year'; when: string; lines: string[] }[];
  look: { tint: string; frame: FrameLook; keyArt?: string };
  quiz: WorldQuestion[]; dateRounds: DateRound[];  // as today
}
// On Character:
worldRole?: string;           // 'Captain of the Silver Guard'
trope?: Trope;                // the dynamic with the user
archetype?: Archetype;
arc?: { secret: string; beats: { atLevel: number; beat: string }[] };  // opens with the bond level
```

The lorebook stays the place for facts (places, things, groups, rules). A world's book is written from the record
above, so the two never disagree.

### 3.3 How a world comes alive (mostly features we already have)

| Mechanic | What it does | Built on |
| --- | --- | --- |
| Your role | The world page shows who you are here; the first chat starts from the world's entry scene | world page, Scenes |
| Arcs | At bond levels 2/4/6 a character brings up the next beat or reveals the secret, and the moment lands in Us and the diary | levels, threads, moments |
| Season chapters | One world story beat a week, which every friend there knows | lorebook "event", push plan |
| Ties | Rivals tease, siblings argue, exes are awkward, in chats and groups | group chats, streams, temper |
| World events | Exam week, full moon, comeback stage, night market, the empire's ball: a date place, a frame, push lines, a quiz round | dates, frames, notifications |
| World group | A ready group chat per world ("The crew") | groups |
| User worlds | A user's lorebook with a premise and a role becomes a world; create-character can pick it | lorebooks, create |

### 3.4 Prompt (server, `src/ai/chat-prompt.ts` order)

rules → **world** (premise, conflict, the user's role; high priority) → character → persona → memory → **now** (this
week's chapter beat, an active event, the speaker's next arc beat; medium) → **ties** of the speaker (low) → triggered
lore → history. The world block changes only when the user changes world, so the prompt cache keeps working.

### 3.5 Order of work (one at a time)

1. `World` type and data for the four worlds: premise, conflict, role, ties, one arc per character, two events. Code
   and prompt parts. Pilot one world first (Moonlit Realm), the owner checks it on the phone, then the other three.
2. Arcs and season chapters in the app: moments, push and diary.
3. New world pilot: Velvet District, text first, then one test image, then the batch.
4. Gilded Empire and the owner's third world.
5. User-made worlds.
6. Translations of the new text: a Gemini brief per batch, as before.

## 4. Open questions for the owner

1. The three new worlds: Velvet District and Gilded Empire, and which third one (sci-fi, paranormal or sports)?
2. Deepen the four worlds first (recommended), or start with a new one?
3. Art budget: about $3 for 39 images on Higgsfield, after one test image.

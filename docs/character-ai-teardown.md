# Character.AI teardown (2026-10-24)

Owner's ask: study how Character.AI builds chat, character creation and its character
architecture, and report what Sigmazam can use. Sources: the owner's Android phone (Galaxy A51,
app `ai.character.app` 1.17.4, versionCode 162) over adb, the app's JS bundle, and Character.AI's
own public blog and Prompt Poet repo.

Rules, as for BIMOBIMO (`AGENTS.md`): take structure and logic only, never their code, text,
names (the "Squeak" model names), icons or images. Their discovery feed is full of characters of
real people (pop idols); Sigmazam keeps its no-real-people rule. Nothing was created, saved, sent
or generated on the owner's account; the create flow was left before the photo step. Work files
(APK set, decoded strings, screenshots) are in `C:\Users\joray\rea-work\cai\`, outside every repo;
never commit them.

## 1. Client stack

- React Native, new architecture, Hermes bytecode v98 (`assets/index.android.bundle`, 38 MB,
  ~204k strings, 82k functions). Reanimated + worklets, Skia, react-native-screens, MMKV, Nitro
  modules (player), WebRTC (`libjingle`, voice calls), an enriched-markdown text renderer.
- SDKs: Sentry, Amplitude (session replay), Braze, AppsFlyer, AppLovin + Meta Audience Network
  ads, Google Play integrity (PairIP).
- UI strings are i18n keys (`CreateCharacter.Screen.tagline` …); English copy is not in the bundle,
  so it is likely fetched at runtime. Phone locale was Russian.
- Hermes v98 note for later teardowns: function headers are 12 bytes, not the 16 of older
  versions; parse the string table from the end of the overflow table backwards.

## 2. Feature map (from i18n namespaces and screens)

Create menu (the "+" tab): Character, Persona, Lorebook (beta, editor web-only), Scene, Group
chat, Video, Voice, Stream, Comic. Other areas: Feed and social posts, Library ((c.ai) series and
books with an episode player), Charms (a soft currency earned by claiming, spent on Imagine, an
ad-free pass), Character Boost (creators promote a character in discovery and see impressions,
clicks, chats started, messages sent), parental controls, age verification, self-harm support,
muted words.

## 3. Character creation

- **Guided create**, one question per screen: "What's your character's name?" → "What do they
  look like?" (describe → generate an avatar, or upload; Next stays off until there is a photo) →
  details. Bundle keys for the later steps: tagline ("in a few words, how would you describe
  {name}"), description, definition (with placeholder and help text), greeting, tags (counter,
  "all tags"), visibility rows (public / unlisted / private), link or create a Lorebook.
- **Vibe create**: describe a character in a sentence, pick or shuffle "personality" pills, the
  server generates the character and its avatar (`/character/v1/generate_character`); quota-limited
  with a paywall when exceeded.
- **Per-field AI help**: `chat/character/generate/field`, `generate_greeting`,
  `generate-avatar-options`.
- **Remix**: fork an existing character with chosen personalities (`/character/v1/remix_character`).
- **Greetings**: a main greeting plus additional greetings (reorder, delete, constraints), and
  "allow dynamic greetings" (the model varies the opening).
- **Editor extras**: definition visibility (`definition_visibility`), chat wallpaper presets
  generated per character, archive (blocked for popular characters), safety errors on create/edit.
- **Persona** (who the user plays): avatar required, name 0/20, description 0/750 ("backstory
  details you want characters to remember about you"; c.ai+ triples it), topic chips (gender,
  appearance, species, likes, dislikes, personality, backstory, clothing, eyes, hair, skin),
  "default for all chats", and a per-chat persona switch.

## 4. Chat

- **Turn / candidate model.** A chat is turns; an AI turn holds candidates (`candidates`,
  `primary_candidate_id`, `update_primary_candidate`, `swipe_candidate`). Regenerate (↻ under the
  last reply) adds a candidate; swiping moves between them. Calls seen: `create_and_generate_turn`,
  `generate_turn_candidate`, `edit_turn_candidate`, `remove_turns` (delete / rewind), `/turn/pin`.
- **Long-press a reply**: Copy, Play voice, New chat from here (branch), Edit, Pin (to memory),
  Delete, Report. Rewind to a point and duplicate chat exist too.
- **Long-press the send-area "»" button**: Continue (generate the next reply without a user
  message), Reply in <language> (the phone's language), Time skip (move the story forward).
- **Header**: Memory, voice replies on/off, voice call. Tapping the name opens a sheet: tagline,
  chats and likes, created / updated, like, share, character profile, creator profile, away
  messages switch, refresh chat, start new chat.
- **Omni menu** (the persona button left of the input), a tile grid: Memory, History (past chats
  by day), Voice, Layout, Wallpaper, Chat style, Persona, Imagine.
- **Chat style = model picker.** Premium (c.ai+): DeepSqueak ("deeper memory, richer roleplay"),
  LongSqueak ("Memory 4x", longer narration). Free: PipSqueak 3 (general roleplay), ShortSqueak
  (texting style). Legacy models behind a row. "Personalization" per style (c.ai+): response length
  (short / normal / long) and response style (+dialogue / default / +narration).
- Rendering: roleplay prose, actions in italics, speech in quotes (markdown). A voice chip sits on
  each reply; "imagine" under the last reply draws the scene. Suggested replies are a paid tray.
  Under the input: "This is AI, not a real person. Treat everything it says as fiction."
- **Group chat** ("rooms"): several characters and humans, invoke a named or random character,
  reset the AI conversation.

## 5. Memory (shipped 2026-05-21, "Smarter Memory for Smarter Chats")

- Memory screen per chat with three tabs: Story (key moments; written by the user or pinned from a
  message), the Character, and You (facts about the persona). Side characters get facts too.
- **Facts** are extracted automatically while chatting, grouped in categories (hairstyle, eye
  colour …); the user can add, edit, disable, restore or delete them. Facts are c.ai+ only. A new
  chat can copy facts over or start fresh.
- **Memory usage bar**: the context budget split into Always remembered (story memories + facts),
  Chat history, My persona and Character information, with a warning when space runs low; free
  users see a simplified bar.
- **Auto-compaction**: long chats condense older context in the background (c.ai+ perk).
- What the user wrote or pinned "stays put regardless of how full the bar gets", so pinned and
  story memories have the top truncation priority.

## 6. Lorebook (beta, 2026-07-24)

World knowledge as entries (side characters, places, items, events, factions, rules) with
keywords. When a keyword comes up, the character gets that entry for its reply; lore stays out of
the prompt until then. One Lorebook links to many characters so they share a canon (a +Lore tag on
discovery). An in-chat viewer lets users browse entries mid-scene. Subscribers first; bundle keys
show a metered "lorebook chat" allowance with an upgrade prompt.

## 7. Server architecture (public sources)

- **Prompt as ordered parts** (Prompt Poet, their open-source templating: YAML + Jinja2). Each part
  has a name, role, content and `truncation_priority`; the chat history is a loop of message parts.
  When over the token limit, the lowest-priority parts are cut oldest first.
- **Cache-aware truncation**: cut to a fixed point that moves only every k turns (for example a
  128k limit with a 4k step), so the prompt prefix stays the same between turns and the GPU prefix
  cache is reused. A bigger step means more cache hits but more history dropped.
- Likely prompt order, combining the above with the memory bar: rules → character definition →
  persona → always-remembered (story memories, pins, facts) → triggered lore → compacted summary →
  recent turns → reply cue.
- Their models (the "Squeak" family) are in-house; the app lets the user pick one.

## 8. Plans (blog 2026-09-28)

Free: PipSqueak 3 and ShortSqueak unlimited, with ads. (c.ai) lite, $4.99/month or $2.49/week: a
daily allowance on premium styles, fewer ads, customisation, extra pins and the memory bar. c.ai+:
unlimited premium styles, no ads, the full memory suite, style control, Lorebook.

## 9. Company status

Character.AI's blog (2026-10-12, "An Update on Character.ai") says it started a voluntary
Chapter 11 process to support a court-supervised sale. The app may change hands or change course.

## 10. What Sigmazam can take (proposal, owner to choose)

Ordered by value to the owner's companion app, with what exists today:

1. **Regenerate, swipe and edit replies** (chat; done 2026-10-24, flows.md D68): keep candidates per AI message; ↻ under the last
   reply, swipe between versions, edit your own last message and resend, rewind to a point, "new
   chat from here". Works with the mock provider now; backend: `turns` + `candidates` tables.
2. **Memory in three scopes** (done 2026-10-25, flows.md D69; `character/[id]/memories.tsx`, backend-plan §7, §12.1–12.2): Story /
   them / you tabs, Pin in the message long-press menu (`message-menu.tsx`), fact categories, and a
   memory-left bar as a Pro perk. Our plan already has extraction, importance and lifecycle.
3. **Quick create** (`create-character.tsx`): describe the character in a sentence → the server
   fills name, tagline, bio, greeting, sample lines and draws the avatar; keep the current form as
   "advanced". Add a tagline (card line) separate from the bio, a private "sample lines" field
   (`persona.sampleLines`, backend-plan §12.3), more than one greeting, per-field "write it for me".
4. **World book** for our worlds (Seaside Academy, Moonlit Realm …): keyword-triggered entries
   shared by every character of a world (`persona.world`, backend-plan §12.3). Server-side.
5. **Continue and time skip** in the chat "+" or long-press of send; reply language already exists
   (`src/ai/reply-language.ts`).
6. **Personalization**: reply length and "more talk / more story". Note: backend-plan §13.6 keeps the
   model invisible; length and style controls fit that rule, a visible model picker does not.
7. **Prompt layout for caching**: build the server prompt as ordered parts with priorities, stable
   parts first, history last, and truncate in steps so the provider's prompt cache hits.

Skip: ads and ad passes (owner: no ads), real-person characters, a public creator economy (boosts,
charms) until there is an audience, video and streams.

Sources: [blog index](https://blog.character.ai/), [memory](https://blog.character.ai/memory/),
[Lorebook](https://blog.character.ai/lorebook/), [styles and plans](https://blog.character.ai/new-styles-new-plan/),
[April update](https://blog.character.ai/pipsqueak2-and-more/), [Prompt Poet](https://github.com/character-ai/prompt-poet),
[Character Book: attributes](https://book.character.ai/character-book/character-attributes).

# Creator ecosystem: private pictures, drawn pictures, trope shelves, seed cast, creator rewards

Owner, 2026-11-19 (after the PolyBuzz Explore screenshot): "the user makes a character on any theme they
like, with any picture: one taken on the phone, one from the internet, half or fully naked too, like
PolyBuzz, but a character they made shows only to them, not to others. We open the app: backend, logic,
architecture and frontend must be excellent; the rest is up to the user." Plus the five proposals from
the same talk (drawn picture in Create, trope shelves on Find, ~100 seed characters, creator rewards),
all approved. "Work out how first, then code."

Product position: official cast = the showcase (first five minutes, marketing, depth); user-made
characters = endless supply. We do not win on numbers against Character.AI / PolyBuzz on day one; we
win on depth (memory, the friend writes first, plans and alarms, voice, no ads) and get people in with
a situation hook and a face.

## 0. Two worlds, one rule each

| | Private (only the maker sees it) | Shared (Find, the community shelf) |
| --- | --- | --- |
| Picture | anything from the phone: camera, gallery, saved from the internet; no check, no scan | only a picture **we drew** (phase 2); an uploaded photo never leaves the phone |
| Theme | anything the chat rules allow | the community review (`src/lib/community.ts`) as built |
| Where it lives | the phone only (as today: `avatarUri` is a local file, never synced) | the server row (card) + the drawn picture in storage |

This split is what makes the owner's ask safe to ship:
- An uploaded picture is the user's own file on their own phone, like a contact photo or a wallpaper.
  We never upload it, never show it to anyone else, never send it to a model, never print it on a
  Sigmazam poster. So we host nothing we have not seen, and the store build carries no nude content
  made or served by us.
- What stays strict in every world (law, App Store 1.1.4, our content policy): the character is an
  adult (age field, `MIN_AGE`, already enforced); the chat itself stays as built (romance and flirting
  open, explicit sex fades to black, the minors / crisis / illegal-harm lines); our own drawing never
  makes nudity or a real person; the store listing and screenshots never advertise nude characters.

## Phase 1: private pictures open (code only, no cost)

- Create: for a private character drop the "I made this image or may use it, and it is not a real
  person" switch (`photoRights`, `validateCreate` in `src/lib/create-character.ts`, the toggle in
  `src/app/create-character.tsx`). The picture is the user's business while it stays private.
- Picker: keep crop 4:5; raise `MAX_IMAGE_BYTES` handling by downscaling with
  `expo-image-manipulator` (already in the APK since 0z80) instead of refusing "too large"; copy the file
  into the app's own folder so a gallery clean-up never blanks the character (check how `avatarUri` is
  kept today; fix if it points into the picker cache).
- Camera as a second source ("Take photo"), same crop.
- Never out: share posters (`src/components/share/*`) draw an uploaded photo as the initials monogram
  instead (a drawn picture is fine); the community card already carries no picture (keep it so until
  phase 2); the chat photo / vision path never receives the avatar (it does not today; add a test).
- Share in Find with an uploaded photo: allowed, but the shared card shows no picture until the maker
  draws one (phase 2) — a line under the switch says so.
- 14 locales for the new strings. Tests: validation without `photoRights` for private, poster fallback.

## Phase 2: "Draw a picture" in Create (needs money: the owner's yes)

**Done in phase 1 (2026-11-19, `3e1c5d13`)**: the switch is gone, the photo menu (Choose / Take / Remove) is in, pictures are shrunk and kept (`src/lib/character-picture.ts`), posters show initials for uploads (`src/lib/poster-picture.ts`, `Character.pictureDrawn`).

**Already in the app for phase 2**: `PORTRAITS_AVAILABLE` + `requestPortrait` (`src/ai/character-studio.ts`, off, returns null), the price and the plan's free pictures (`portraitPrice`, `consumePortrait`, `PLAN_PORTRAITS` in `src/economy/quick-create.ts`), the `portrait` spend reason on the server, and Create already draws one when there is no photo and the looks are filled. Phase 2 is mostly the server route, the flag, `pictureDrawn: true` on a drawn picture, and "Draw again".

- Button in Create's picture area: draws a portrait from the character's looks (`look`), gender, age
  and tagline, in our style (semi-realistic scene framed like a phone photo, the Cast 2.0 look:
  `docs/nano-banana-cast-2.md`). Three variants to pick from? Start with one, "Again" for another.
- Server route `POST /v1/image/character` (signed in): builds the prompt server-side (our style block +
  the user's look words, cleaned), calls Gemini 2.5 Flash Image ("Nano Banana"), returns a JPEG. The
  safety words in the prompt: adult, clothed or swimwear at most, no real person, no franchise art; the
  provider's own filter refuses the rest. A refusal answers "try other words", never a stock picture.
- Cost: about $0.039 per picture (Gemini 2.5 Flash Image list price; measure on the first calls and
  write it into `docs/cost-ledger.md`). Limits: 3 free drawings a day per account, then shells
  (price set with the wallet, server-side, `src/lib/wallet` rules); a server cap per day as a fuse.
- The free keys do not cover image output: the key needs billing on. Owner decides the key and the
  monthly cap before this phase runs.
- A drawn picture is kept on the phone like any picture; when the character is shared, the app uploads
  it to Supabase storage (`community-pictures` bucket, public read, write only by the server) and the
  card carries its URL. Unpublish deletes it.

## Phase 3: Find, trope shelves with faces (code; after phase 2 so cards have faces)

- The community shelf grows into Find's "For you" + trope chips, the PolyBuzz pattern in our look:
  First love, Slow burn, Ex, Roommate, Boss, Enemies to lovers, Comfort, Dark romance (names from our
  Cast 2.0 relations; the list lives in one file, 14 locales).
- A card: picture (4:5), name, the hook line (one sentence: who they are to you and the knot), 2-3
  chips, the chat count. Two columns, endless scroll (`?offset=`, the route already pages).
- Server: `community_characters.tropes text[]` (migration; the review prompt picks 1-2 tropes from
  the fixed list), `GET /v1/community?trope=` and sort popular / new.

## Phase 4: seed library (~100 characters, ours)

- The shelves must not open empty. We write ~100 characters across the tropes (model-written cards,
  checked by us, original only), with pictures drawn the phase-2 way (≈ $4 at list price) or by the
  owner in Nano Banana. Shown with a small "Sigmazam" mark; they are ours, so they follow every
  official-content rule (no fan characters, no real people).
- Gemini batch brief in `docs/agent-tasks/` when phase 3 is in.

## Phase 5: creator rewards (money: second reader before deploy)

- When another account says hi to your shared character for the first time (`community_add`, already
  counted once per user), the maker gets shells (e.g. 5), with a daily cap (e.g. 100) — paid by the
  server wallet, never the phone. A creator line on Profile: shared characters, total chats, shells
  earned. Fraud guard: only accounts older than a day and with a real chat count.

## Order and gates

1. Phase 1 now (no cost, no deploy unless a test needs it).
2. Phase 2 after the owner's yes on the key, the monthly cap and the free drawings per day.
3. Phases 3 → 4 → 5. Community stays off in production (`COMMUNITY_OPEN`) until a second reader has
   read phases 2-5 and the owner switches it on.

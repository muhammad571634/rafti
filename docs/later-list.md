# Later list: everything postponed, by what it waits for

Collected 2026-11-10 from `HANDOFF.md` (0z153-0z190), `docs/road-to-launch.md` and `docs/scale-plan.md`.
When the thing in a heading arrives, tell the owner this section and start at its first item.
Tick items off here as they land; add new postponed items under the right heading.

## 1. Waits for the paid model key

1. Put it on the server: one secret (`GEMINI_API_KEY`, `CHAT_MODELS`), owner runs the deploy. Pick the ship model first.
2. Friends' own lines come back: hellos, comebacks, check-ins written ahead for pushes (with the free key spent or
   busy they stay unsent by the model-first rule; today the free key answered 503 "high demand").
3. The full eval with the judge and `--save` (~106 scenarios), plus the groups the quota cut: `safety`, `human`,
   `memory`, `mode`. `JUDGE_GEMINI_KEY` is invalid (401): the paid key judges too.
4. Language checks on the A51: Hana in Turkish after English and back; the first English line after an Uzbek one
   (0z180, 0z188); `wrote=` in the Fly log.
5. Open quality items: question endings, how often replies use the user's name, `memory-profile-job`, Kai's
   vagueness, Hana's repeated confession, photo replies on the paid model (0z187).
6. Telegram-style in-app banner with our sound (owner paused it "until the paid API, maybe on an iPhone").
7. Explicit prompt caching (cost ledger row 1) once traffic is real.

## 2. Waits for a few days of real traffic (from 2026-11-10)

1. Read `[allowance]` and `[stats]` in the Fly log (~2026-11-13), then `ENFORCE_WALLET=1` and the app's
   "no shells" sheet on 402. Money: a second agent reads the allowance code first.
2. Phase 2 of `docs/scale-plan.md`: `shared_lines`, streams written once, weekly quiz / world lines / world news
   cached, generic hellos from a pool, memory pass every 8 lines (Claude 1 started this as 0z191).

## 3. Waits for the ElevenLabs grant + `sigmazam.app` domain (then the next APK)

1. Support mail (`support@sigmazam.app`), the account-deletion web page, Privacy and Terms pages (`LEGAL_URLS`).
2. The next APK, with its native items: black native splash (0z162), cream under the Android nav bar (0z153),
   Android share-chooser callback (0z159), a Save button for share posters (media-library), the nav bar after a
   theme switch during a call.
3. Server push (Firebase on Android, APNs with the Apple account): pushes when the app has been closed for days.
   Today the phone plans about three days ahead; past that a user who never opens the app gets nothing.

## 4. Waits for payments and accounts (owner)

1. Google Play account, then Apple Developer + an iPhone: Sign in with Apple, StoreKit, the App Store build.
2. RevenueCat writes `subscriptions`; remove `TEST_SUBSCRIBERS` from `server/fly.toml` and `/v1/subscription/test`.
3. Launch switches: Supabase Pro, two machines, `MODEL_BUDGET_USD_PER_DAY`.
4. Age gate, report, block, moderation of user-made characters; a lawyer reads the terms.
5. 12 testers opted in for 14 days on Google Play before production.

## 5. Waits for art (Cast 2.0 replaced the 55 old characters, 2026-11-10)

1. The owner draws the twelve of Cast 2.0 (`docs/nano-banana-cast-2.md`, Milo first as the test), the agent wires
   them and deletes the old cast's art from the bundle.

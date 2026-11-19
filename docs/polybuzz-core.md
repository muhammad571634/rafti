# PolyBuzz core: how it works and what Sigmazam takes (2026-11-19, Claude 1)

Owner's ask: open PolyBuzz's core with REA (the owner first called it "Whispy AI"), find where we
are behind, what architecture and logic we can take, and what we can do better.

Second pass on top of Gemini 4 Argon's `docs/polybuzz-teardown.md` (2026-11-18, screens and
route names). This pass reads the client's own contracts: every request model in the native code
(373 endpoints with their input and output fields), the stream chunk, the push scheduler, and the
English strings of both web bundles. Structure and logic only; no PolyBuzz code, text or art comes
into the repo (`AGENTS.md`).

Target: `ai.socialapps.speakmaster` 2.3.0 (versionCode 353), base APK SHA-256 `ad216904…53d40`,
pulled from the A51. Raw material stays in `C:\Users\joray\rea-work\polybuzz\`:
`api-contract.txt` (every endpoint, in/out fields), `h5-api.txt` (516 web routes),
`h5-en-strings.txt`, `smali-out/` (all 19 DEX). Tools: REA (JADX class search, resources),
apktool smali, string mining. Nothing was run against their servers and no message was sent.

Side note: a Whispy AI XAPK (`com.nexbase.whispy` 1.7.9, Flutter, Riverpod, clean
feature folders) sits in the phone's Downloads, not installed; its asset names show intimacy
stages (first meet → flirting → crushing → falling → soulmate), whisper letters, inner thoughts,
reply inspiration, custom memory, memory reel videos, three chat modes (companion / immersive /
story). Not studied further.

---

## 1. Architecture in one picture

**A thin client over a fat server.** The phone sends almost nothing but the user's words and ids;
the server owns the conversation, the context window, the memory, the prompt and every decision
about what to show next.

- **Backend-for-frontend per area**: `speakbffchat` (chat), `speakbffhome`, `speakbffmy`,
  `speakbffscene` (fiction, songs, voices), `speakbff` (phone, bond, moments), `speakvip`
  (money), `speakcommunity`, plus the older `speakmaster` service still serving half the chat.
- **One turn** (`/speakbffchat/conversation/lcsstream`, HTTP `stream` as fallback): in goes
  `speechText` (or audio), `sid` (session), `currentChatStyleId` (the model), `selectId`,
  `msgFlag`, `isRetry`, `inspirationId` (a tapped suggestion), `isMemFinshed` (memory job done),
  feature support bits (`supportMemoryReel`, `supportPhone`, `supportWriteSong`,
  `supportCompactStream`) and **the user's experiment cohorts on every call** (`sagaAb`,
  `stateBarAb`, `sovereignAb`, `sovListAb`, `reelTabAb`, `ruab`, `srnla`). No history, no
  memory, no persona travels with it.
- **Chat open** (`conversation/init`, ~200 output fields) hands the client the whole screen
  state: model and its free rounds, memory state, state bar, inner-thought price, regenerate
  limits, ad slots, marketing message, age checks, dating stage, relax/sovereign mode.
- **Transport**: a long-lived socket (`lib_lcs.so`) with chunked HTTP as fallback, gzip and a
  "compact stream" option; messages cached on the phone (Room tables) and re-synced by checksum
  (`checklocalrecordnew msgChecksum`).

## 2. The stream chunk is the engine

Each streamed piece (`GetResultsByStream$ChatStream`) carries the text plus:

- **Narration as its own object** (`narrateId`, `supportNarrate`, `narratePws`): scene lines are
  not part of the spoken reply, so voice skips them ("no audio for scene descriptions").
- **Candidates**: every reply has a `selectId`; regenerate adds one, the user swipes; the init
  returns `lastMsgSelectList`.
- **End-of-turn triggers chosen by the server**: `canMemoryReel`, `canPhoneHeartNote`,
  `canPhonePlog`, `canGroupPhoto`, `canMemoryMoment`, `canGuideOpenPush`, `canFanStudio2`,
  `usableChatRound`, `datingRight`, a bond event (`bj`: bond number, stage, invite state).
  After every reply the server decides the single next thing to offer (a keepsake, a push
  permission ask, a paywall). This is their retention engine, and it lives server-side so it can
  be tuned per cohort without a release.
- **Safety per turn**: `hitCompliance`, `dangerousWords`, and on the way in `useSafeModel`,
  `useMinorSafeModel`, `filterLevel`, `msgMinorCheck`, `useChatRestrict` (minors and flagged
  users get a different model and filter).
- `totalScore`: a running score per chat (feeds intimacy / ranking).

## 3. Logic by area

| Area | How it works |
| --- | --- |
| **Models as the product ladder** | The model list comes from the server (`chatstylelist`, `setchatstyle`). Tiers are memory tiers: Standard, Long Memory, "Standard+ = 2× memory", "Super = permanent memory", plus style models (Passion, Tale, Saga, Spark, Long-Response 800+ chars) and Opal models. Every premium model is handed out as N free rounds first, then rounds are bought (`buychatround`, `chatstylebuymsground`). |
| **Context depth for sale** | Sovereign mode: a slider for how many past rounds the model carries (`sovereignModeMaxRound`), priced per round in a separate currency (Opals). |
| **Memory** | Async server job per chat (`membermemory/create` → `finished` → `notify` returns a short "I'll remember" line). Cards: important events (who/what/when/where), agreements and tasks (who proposed, who, what, where), important items (owner, what, why it matters), the character's relation and attitude to the user and affection level, the user card. Up to 5 pins the model reads first. Persona sync overwrites only name/gender/key facts. Permanent memory is a top-tier perk; every row is locked for free users. |
| **Rounds gate depth** | A "round" is the unit of everything: story twist needs N more turns, live plot ≥ 5 rounds, fiction needs N rounds, song needs "a bit more chat", the phone's diary note every ~40 rounds and photo blog every ~50 (`triggerRound`), memory reel after enough chat (800 coins, first free, 3 at a time). Auto-unlock spends credits by itself when the round count is met. |
| **Intimacy and bonds** | Intimacy unlocks profile photos and "Dating Mode" topics (`rights_lock_toast`). Bond Journey: a time-limited event with one character; others can buy that character's Bond Pass and the creator earns. Nickname + intimacy badge + permanent memory come with the bond. |
| **Story control** | Relax mode compass: story twist (editable, `customStoryTwistPrompt`), scene jump, plant a memory now (`customMemory`), personality shift (beta, only on cheap models), invite one more character. Branch archive keeps old timelines (`brancharchive` → `newSessionId`). Edit, delete-from-here (`delassignmsg` returns the round count and the candidates of the new last reply). |
| **Feedback flywheel** | Pairwise choice ("pick the better reply": `genpkmsg` / `choosepkmsg`) and per-message stars with labels (`feedback`: stars, labelIds, target = reply or narration). Free preference data for tuning their models. |
| **Suggestions** | Inspiration replies (`conversation/inspiration`): a few ready user lines, paid after a member's daily quota; a 3-day / 30-reply free trial is the hook. In relax mode the server can write the user's next line (`relax/genusermsg`). |
| **Pushes** | Server returns a task list (`/speakbffmy/push/tasklist`: title, content, image, delay, task id); the app schedules them on the phone with AlarmManager, so they arrive even with no FCM. `user/proactivereach` is the opt-in for characters writing first. Daily check-in push warns that skipping loses coins. |
| **Money** | Coins (features), Opals (sovereign / top models, gifted ones expire in 30 days, refunded on failed generation), Diamonds (creator income, cash-out). Six subscription tiers. Twelve ad networks plus rewarded-ad messages in chat. Sales lines are dropped into the chat as if the character said them (`marketingMsg`, "upgrade and try new models"). |
| **Age** | Minor checks per message, Ondato and Korean ID verification, kid auth, parental controls bound by e-mail, a separate minor-safe model. |
| **Observability** | Analytics on every screen, crash and ANR monitors, network diagnostics, server-side cohorts on every request. |

## 4. Corrections to the 2026-11-18 teardown

Checked against our code: three of its "gaps" are already built.
- Swipe between reply versions: we have it (`showReplyVersion`, `VersionSwipe`, ‹ ›).
- Typed memory with promises and events: our memory pass already keeps `promise`, `event`,
  `schedule`, `milestone` facts (`src/ai/memory-pass.ts`) and pins, and plans / alarms are tied to
  the friend. What we lack is only showing promises as their own group.
- Locally scheduled pushes: our push planner already hands the OS a list (`src/notifications/`).

## 5. Where Sigmazam is behind (ranked by what it costs us)

1. **We cannot measure behaviour.** The server logs each model call's cost per user
   (`usage_events` / `usage_daily`), but there is no product analytics (screens, taps, funnels),
   no experiments, no cohorts. PolyBuzz
   tunes every hook per cohort from the server. Before launch we need event tracking (first 5
   minutes, D1/D7 return, messages per day, paywall views → buys) and a server-side flag per user.
2. **No end-of-turn "next best moment" decided by the server.** Our levels, arc beats and
   keepsakes fire from client rules. One server field in the reply (`nudge`: diary page, photo,
   ask for push, plan suggestion, nothing) would let us tune timing without an app release.
3. **No preference data.** We keep reply versions but never record which one the user kept, and
   there is no light thumbs on a reply. That signal is what makes characters better per model
   and per prompt change (our evals today are synthetic).
4. **No branching.** Rewind and edit drop the old future. "Branch from here" that keeps the old
   timeline under the chat's history protects long stories.
5. **Few story steering tools.** We have time skip; a twist / next scene / "remember this now"
   in the + panel is cheap (one prompt line each) and feeds the arc beats.
6. **Age assurance is thin.** We ask age in onboarding; for an 18+ romance app on the App Store a
   minor-safe path (stricter model settings when age is unclear) is worth having before launch.
7. **Narration is text inside the reply.** Making scene lines their own part of the reply object
   (as PolyBuzz does) lets voice skip them and the bubble style them, with no parsing guesses.

## 6. What we take (structure only) and do better

| Take | Our better version |
| --- | --- |
| Server-chosen end-of-turn trigger | One `nudge` from the reply call, at most one per session hour, never a paywall inside the chat, always in the friend's voice and tied to what was just said. |
| Pairwise / thumbs feedback | Silent signal first: which version was kept, a long-press heart on a reply. No star forms. Feeds `docs/cost-ledger.md`-style eval tables per model. |
| Rounds as the clock for keepsakes | We already have levels; make diary pages / photos land on real conversation depth (rounds and what was said), free, never auto-spending shells. |
| Branch archive | "Branch from here" on rewind and edit; branches listed in the chat's history, the memory pass runs only on the live branch. |
| Memory cards | Show promises / plans as their own group on the Memories screen and link each to its alarm or plan. Memory stays free (their best feature is behind the top tier; ours is a promise of the product). |
| Experiments on every request | A cohort id sent with each server call and logged with the cost line, so a prompt change is measured, not guessed. |

## 7. What we must not copy

Ads in a companion app, three currencies, sales lines spoken by the character, fake countdown
discounts, auto-unlock that spends money by itself, memory locked behind the top tier, a model
picker of acronyms in the chat header, scanning which competitor apps the user has installed,
GPS on the profile tab. Each one trades trust for short-term money; our position is the opposite.

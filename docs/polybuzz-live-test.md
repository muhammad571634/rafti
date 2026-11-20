# PolyBuzz live test: how it holds users, and what Sigmazam builds (2026-11-19, Claude 1)

Owner's ask: use PolyBuzz on the phone end to end (characters, chat, the LLM's answers, creating a
character, everything that keeps users) and say what Sigmazam must do to hold users the same way,
with conversations at a real-person level. Third pass after `docs/polybuzz-teardown.md` (Gemini,
screens and routes) and `docs/polybuzz-core.md` (Claude, the client's contracts read with REA). This
pass is behaviour: the app driven on the A51 (Russian UI, the owner's account, nothing bought, the
location prompt denied), plus the same chat replayed through our own prompt. Structure and logic
only; no PolyBuzz text, art or code comes into the product (`AGENTS.md`).

## 1. What the user meets, in order

| Step | PolyBuzz | Note for us |
| --- | --- | --- |
| Home | Two-column feed of user-made characters; each card is a photo, a chat count (6.9M, 3.2M), a one-line relation hook ("your mom's friend's daughter; loves you, scared to say it") and three trait chips. Tabs by trope (For you, Redemption, Slow burn, Classmates…). The search box rotates trending searches. | The hook line is the product: a relation with a knot in it, the same idea as our Cast 2.0. Many cards are photos of real-looking people and trending searches name real creators and a franchise: their exposure, not a model for us. |
| Card tap | Straight into the chat; no profile step. | Zero friction. |
| Chat open | Creator credit, an AI + "everyone is 18+" notice, an "Introduction" card (the hook), then a scenario card that fills in the user's name, both ages and a SCENE line ("she and her mom came over"). | Our intro card shows the scene art, name and tagline; it does not set the scene with the user in it. |
| Header | Model chip (S, P…), memory (brain), report, settings. | |
| Under each reply | Inner thought (paid in coins), rate (5 stars + reasons), regenerate. | We have thoughts (3 free a day), 👎 with reasons, versions. |
| Grid | Restart, History (branches), Delete. | We have rewind + branches. |
| Settings | Persona, background (paid), decoration (paid), custom voice, auto voice (paid), "Forward" button (new: go on without writing). | We have personas, wallpapers, Continue. |

## 2. The LLM, tested

Same scene, same nine user lines (nervous visit, a sick dog named Biscuit, "why did you really
come", a failed driving test, a confession with a held hand, "what now", a memory check).

| | PolyBuzz free (S) | PolyBuzz Passion (P, 15 free rounds) | Sigmazam prompt, free `gemini-3.1-flash-lite` |
| --- | --- | --- | --- |
| Speed | under 3 s | ~10-20 s | 1.3-1.9 s |
| Language | Russian whatever the user wrote (follows the app / creator) | same | the user's language |
| Form | One bubble: third-person narration in grey italics, then one line of speech | same, a little longer | 1-2 bubbles, first-person *actions*, speech |
| Character | Keeps the secret for many turns (lies, deflects): good slow burn | Adds outside conflict (the moms), says her fear, pushes back at the user ("you never showed you cared") | Warm, takes initiative ("I'll stay with you"), disagrees ("don't rush it to prove a point"), big reaction to the confession; dropped the mask a turn early |
| Errors | Grammar slips ("Февр?", "нужна антибиотик"), generic comfort ("try again, you'll pass") | none seen | none; one mixed lower-case "i" |
| Memory (9 turns) | Recalled the dog and the test exactly | – | Recalled the dog, vague on the test |

Verdict: our prompt on the free model already writes better than their free model and close to
their paid Passion model. Two things to tighten: hold the character's mask / secret longer (slow
burn) for user-made characters too, and name concrete facts when the user asks "do you remember".

Memory: PolyBuzz's "Permanent memory" page showed 0 cards in every group after the whole chat, and
every row is locked behind the top plan. Ours is free and visible. That is a selling point to say
out loud (store page, onboarding), not to hide.

## 3. How they hold users

- **Content supply**: thousands of user-made characters with chat counts; the creator's greeting
  carries the first minute (a long, sensory scene that ends "your move"). The create form has a
  live quality coach for the greeting and an exposure boost when it is good, several greetings,
  "visual greetings" for coins, a voice blend of up to five tones.
- **Daily loop**: a 7-day check-in ladder (10, 10, 10, 20, 20, 30, 100 coins), newcomer tasks
  (search +30, create a character +50, a deep chat +30, notifications on for 3 days +40), daily
  tasks worth 350 coins, rewarded ads up to 100 coins each, 15 a day.
- **Model ladder**: ten named models with a personality each and a radar chart (romance, memory,
  empathy, detail, plot, consistency); premium ones start with 15 free rounds, then 400 coins per
  20 rounds or a plan. The taste of a better model is the upsell.
- **Money pressure** (not for us): a coin store behind the sparkle button with a "-82%" countdown,
  an "85% coupon" popup the moment you close it, a second 20-minute countdown, an ad on opening the
  profile, a location prompt, memory and thoughts paid.

## 4. What Sigmazam builds, ranked by what it holds

1. **Newcomer path and a visible 7-day ladder** (D1-D7 retention, no ads): a short list of first
   steps that teach the app (talk to 3 friends, make your own character, a deep chat, a plan or an
   alarm with a friend, notifications on) and a 7-day check-in row, paid in shells. We already have
   the check-in and streaks; they are not shown as a ladder and there are no first steps.
2. **Fan characters, user-made** (owner's decision, see §6): a user's own character may play a
   fictional character from a film, anime or game; our cast and marketing stay original.
3. **A community library**: public user-made characters on Find with a hook line, chips and a chat
   count, a report button on each, takedown on notice. Content supply is their biggest moat;
   needs server tables, moderation and the report queue we already have.
4. **Create quality coach**: a strength meter on the greeting and the hook line with one tip at a
   time ("set the scene", "end with their move"), several greetings.
5. **Scene card at the start**: the first message of a user-made character sets the scene with the
   user in it (their name, where, what just happened), as the creator wrote it.
6. **Prompt tightening** (small, measurable): hold the mask / secret for user-made characters
   (their arc is written by `ensureStory`); answer "do you remember" with the concrete facts.
   **Measured 2026-11-19 (0z299): no change needed.** On the free model, recall in an emotional
   moment 3/3 (Biscuit's fever and the driving test named), a straight "do you have a crush on me?"
   kept the secret 3/3, a user confessing first got a warm answer 2/2 (one call timed out). The
   vague recall in §2 was a one-off; a new rule would add tokens to every reply for no gain.
7. **Named reply styles later**: when the paid key comes, present models / styles by what they are
   good at, with a free taste, instead of one hidden model.

## 5. What we do not copy

Fake countdown discounts and exit coupons, ads in a companion app, a location prompt, memory and
thoughts behind a paywall, replies in the creator's language instead of the user's, photos of real
people as characters, real creators and franchises in trending searches.

## 6. Open question for the owner: fan characters and real people

Character.AI, PolyBuzz and BIMOBIMO let users make characters from films, anime and games under a
user-generated-content model: the user makes it, the platform hosts it, keeps report and block
tools (App Store guideline 1.2) and takes a character down when a rights holder writes (DMCA-style
notice and takedown; Character.AI removed Disney characters after such a letter in 2025). Today our
rule tells every character never to talk as a character owned by another company, so a user's
own fan character cannot work at all. Proposal: open fan characters for user-made characters, keep
our cast and promotion original, add notice-and-takedown and a list of rights holders who asked.
Real people (actors, idols, creators) stay closed: likeness and publicity laws, sexual content with
a real person, and App Store review all point the same way. Not legal advice; the owner decides.

## 7. Live side-by-side on the A51, 2026-11-20 (Claude 1)

Same three English lines typed into PolyBuzz (Angelina, model "P") and Sigmazam (Milo), timed by polling the screen (about 1.5-3 s resolution).

| | PolyBuzz | Sigmazam |
| --- | --- | --- |
| Reply on screen | 5-6 s, all three turns | 27 s, then Not Delivered |
| Language | Russian to English lines (follows the creator) | - |
| Fit | Ignored "I had a really hard day"; met "my boss yelled at me" with "what did you do to make him mad?" | - |

- Sigmazam's failure was the free Gemini tier: `gemini-3.1-flash-lite` returned 503 "high demand", then each fallback model was aborted after ~5 s and the reply ended `busy`. Owner, 2026-11-20: free-tier speed is not worth tuning; judge speed again on the paid key.
- PolyBuzz voice calls were not offered on this user-made character (no call button in chat, menu or profile).
- Our call chain (from code): 1.2 s of silence ends the turn, then two model round trips in a row (the clip is written out by the model, then the reply is written), then ElevenLabs Flash per line, all lines asked at once. The biggest cut available is one model call that hears the clip and answers (saves a full round trip); worth doing with the paid key.

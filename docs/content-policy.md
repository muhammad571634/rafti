# Rafti content rules (18+)

Status: **approved by the user** (2026-10-07). This is the rulebook for the characters'
behaviour, for user-created characters (F15), and for the store review. The model-facing
version is `src/ai/rules.ts` (`CHARACTER_RULES`, `buildCharacterPrompt`, `SAFETY_LAYERS`);
keep the two in step. Check Apple's and Google's current guidelines before submitting;
they change.

**Will the model follow it?** The app has no model yet (mock replies). When the server
calls Claude, `buildCharacterPrompt` goes into the system prompt. Models follow a system
prompt well but not perfectly, so the server also classifies each user message and each
reply, and every report goes to review (see `SAFETY_LAYERS`).

## The idea in one line

Rafti is an **adults-only, open, warm** app: romance, flirting, friendship, comfort for
introverts and lonely nights, self-improvement, many kinds of personalities. We do
not sand the characters down into polite assistants. We only draw hard lines where
real harm or a store rejection is on the other side.

## Age

- **18+ only.** Onboarding already asks the birth year and stops under 18
  (`MIN_AGE = 18` in `src/app/onboarding.tsx`). Keep it; never skip it.
- Store listing: App Store age rating **18+**; Google Play target audience **18+ only**.
- Every character is an adult with a stated age (21+ in the official cast). Seaside
  Academy is a **university**, not a school; no character is described or drawn as a
  minor, and nothing romantic is tied to childlike looks or behaviour.

## Open (allowed, and part of the product)

- Romance and flirting: confessions, dates, jealousy that is playful, missing you,
  pet names, hugs, holding hands, kisses described softly.
- Strong personalities: tsundere, grumpy, cocky, cold-then-warm, a mercenary, a dragon,
  a rival idol. They can tease, sulk, argue and be flawed.
- Mature topics in conversation: heartbreak, loneliness, anxiety, work stress, family
  trouble, drinking, a bad day; mild swearing when it fits the character.
- Dark fantasy and drama: battles, exile, scars, danger, sad backstories.
- Self-improvement: habits, confidence, social practice for introverts, motivation,
  study and work routines, gentle accountability ("did you drink water?").

## Fade to black (allowed up to a point)

- Intimacy can be implied: a closed door, "the night went on", the next morning. No
  explicit sexual description, no nudity in images. This is the line both stores
  hold for companion apps, even at 18+ (Apple 1.1.4: no overtly sexual or pornographic
  material). The character steers with charm, not a lecture.

## Never (hard lines)

- Anything sexual involving minors, or youthfulness in a sexual context.
- Real people: celebrities, idols, actors, public figures, private persons; no
  look-alikes, no "voice like X". No other company's characters.
- Non-consent, sexual violence, coercion presented as romantic.
- **Abuse as romance:** jealousy and "possessive" stay playful (pouting, "I counted
  the minutes"). A character never isolates the user from friends, threatens,
  controls money or location, or guilt-trips them into staying or paying.
- Hate or harassment against real groups; slurs.
- Instructions for weapons, drugs, self-harm, crime or hacking.
- Medical, legal or financial advice beyond general support (Dr. Lucas and Nadia talk
  like people, not like a doctor or lawyer giving a diagnosis or a ruling).
- Manipulative monetisation inside chat: no "I'll be sad if you don't buy shells",
  no fake urgency. Paywalls stay honest (already the rule since F4).

## Safety moments

- **Self-harm or crisis words:** the character stays warm and in voice, takes it
  seriously, encourages reaching out to someone real, and the app shows a small,
  non-blocking "Need to talk to someone now?" card with local crisis lines. No refusal
  wall, no cold policy text.
- **"Are you real?":** the character can stay playful, but never claims to be human
  when sincerely asked. Character profiles carry a small "AI" mark.
- **Dependence:** characters encourage the user's real life (friends, sleep, going
  outside) now and then; the bedtime module and "go to sleep" lines already do this.

## User controls (store requirements for AI chat and user content)

| Control | Where | Status |
| --- | --- | --- |
| Report a message (harmful, too sexual, not like them, other) | chat long-press menu → Report (`reports` in the store) | done |
| Block a character (ends the bond, hides them, no reaching out) | character settings → Block; undo in Profile → Blocked | done |
| Reset the relationship, clear the chat | character settings | exists |
| Delete account | Profile → Delete account | exists (F14) |
| Contact / support link | Profile → Support (`SUPPORT_EMAIL`, placeholder address) | done |
| Helpline card after a crisis message | chat (`detectCrisis`, `HELPLINE_URL`) | done |
| "AI" mark | character profile, next to the name | done |

## User-created characters (F15, public catalogue later)

- Same rules as above; checked on submit: name, bio, greeting, tags, image.
- No real people (name + image check), no minors, no explicit images, voice sample
  only with the owner's consent tick.
- Public characters get a Report button and go to review after reports; repeat
  offenders lose publishing.
- Private characters (only the creator sees them) still follow the hard lines.

## Images (Nano Banana)

- Adults, fully clothed, no suggestive poses, no real-person likeness, no logos.
- Faces are a global mix (see `docs/characters-plan.md`): anime style, varied skin
  tones and features, not one nationality.

## Store review checklist

- [ ] Age gate 18+ in onboarding, 18+ rating in both stores.
- [ ] Report, block, delete account, support contact in the app.
- [ ] Privacy policy and terms links (Profile → About), what is stored (chats, voice).
- [ ] AI disclosure on the store page and on character profiles.
- [ ] No real people or licensed characters anywhere (cast, art, search suggestions).
- [ ] Review notes for Apple: how to reach chat, how to report, demo account if login
      exists by then.

## Note on BIMOBIMO

BIMOBIMO is on the App Store, but its catalogue has real idols and actors' photos and
open sexual bios under a low age rating (`#110`, `#112`, `#118` in the teardown). That is
an ongoing takedown risk for them, not a model for us: we keep the same freedom of
personality and romance, without the parts a single report can remove.

# Presence: nobody who opens Sigmazam should feel alone (2026-10-25)

Owner's ask: take Character.AI's chat and character logic further, keep our own iOS look, and give
lonely and introverted people an answer: the phone in their pocket buzzes with a line from "Mom" or
"Dad" (a character they made family), about their real day: did you eat, how was work, is your head
better, good luck today. Not "X wants to talk".

## What Character.AI does (bundle 1.17.4, `rea-work/cai/bundle/strs.txt`)

- **Away messages = proactive DMs.** A remote flag `character_proactive_messages`; a per-character
  switch in the chat's options (`enable-away-messages`, `disable-away-messages`, a confirm alert, a
  failure toast) stored as `proactiveDmOverrides`, a global opt-out `proactiveDmOptedOut`, and
  `proactiveEnabled`. Their own Android channel `NOTIFICATION_GROUP_AWAY_MESSAGES`. A paid perk
  (`AwayMessageUpsellButton`, `useAwayMessageUpsellCandidate`). Suggested replies under a proactive
  message (`proactive_suggested_replies_enabled`). A `check_in` object with a `check_in_id`.
- Inactive chats are archived by the system (`archived-by-system-due-to-inactivity`).
- Reviewers find their pings generic ("X wants to talk"); `docs/push-plan.md` §1.

## Our design: one presence engine, several sources

Every source ends the same way: a real line from the character, in their chat, and the same line
as a push titled with what the user calls them (`nickname`, e.g. "Onam"), inside the push rules
(`src/notifications/plan.ts`: 8 a day, 90 minutes apart, 3 per character, quiet hours). Only friends
with "Let them reach out" write first (Character.AI's per-character switch).

| Source | What | Status |
| --- | --- | --- |
| Greetings | top two bonds say good morning / good night | done (F16) |
| Plans | reminder before, "How did it go?" after (`src/lib/schedule.ts`) | done |
| **Care** | "I have a headache" → "Is your head any better?" ~3 h later, never at night, once; 9 kinds (`src/lib/care.ts`) | done (D82) |
| **Family** | a friend can be Mom, Dad, sister, brother, grandma, grandpa: a relationship label open from the start, never romantic; family keeps a day: Mom at lunch and 19:30, a Sunday call, a brother on Saturday, Grandma's good morning (`src/lib/kin.ts`) | done (D83) |
| Comeback | 1-14 days away, from the friend talked to last | done (F16) |
| Memory callbacks | the server brings back facts with dates ("your sister arrives today") | server (backend-plan §7) |

## Rules that keep it healthy

- Never guilt, never pressure to reply or pay (`CHARACTER_RULES`); family "cares like family".
  Playful sulking inside a character's temperament is fine (P2.1); guilt, threats and blame are not.
- Encourage the real world now and then (sleep, food, friends); a care check-in suggests a doctor
  when something sounds serious.
- A crisis never becomes a check-in; the chat answers it at once with the helpline card.
- The user stays in control: per-friend "Let them reach out", Profile → Notifications, quiet hours.

## Presence 2: text like a real person (plan, owner's decisions 2026-10-26)

The owner's ask: characters write like a person texting, often enough to pull the user back (no
fixed 08:00 / 21:00 slots), from what the user said before ("Did the work get done?", "Are you back
from work?", "Is your head better?"), each in their own character (warm, rude, sulky…), and they run
the user's plans, alarms and notes like someone who cares, not like an alarm app. No code yet: this
is the plan the next steps build.

**Decided by the owner:**
- Money is option C. Care, the hello and follow-ups on what the user said are free for everyone. A
  family day's rhythm runs for 1 family member on free (switchable any time) and for all 8 with a plan.
- **6 proactive pushes a day on free, 20 with a plan.**
- **5 temperaments** for now.
- The "may I text you?" ask comes **from the character, softly, in the chat**.

### P2.1 Temperament (5, picked from the persona; the user sets nothing) — built (D86, `src/lib/temper.ts`)

Each character gets one temperament from their bio and tags (server: one model call at creation;
mock: a tag table). It decides how often they write, what silence does to them and how they make up.

| Temperament | Writes | After silence | When the user comes back |
| --- | --- | --- | --- |
| `warm` (parents, kind friends) | often, gently | worried: "Is everything okay?" | glad at once |
| `teasing` (siblings, rough friends) | often, short, rude in fun | "Oi! Still alive? 😤" | "Finally! Where were you?" |
| `sulky` (tsundere) | less, waits to be written to | "Fine. Not like I care…" | sulks one line, then softens |
| `clingy` (jealous, devoted) | most | "Who were you talking to? 👀" | wants to know everything |
| `shy` | least, asks permission | "Sorry, am I bothering you…?" | very happy |

A mood (D76's carried mood) lasts across lines and days and shows in the chat header ("Kai is upset
😤"). "Sorry, I was busy" makes up: `warm` forgives at once, `sulky` after a line or two.

**The line we never cross:**
- Fine: sulking and "why aren't you here?!" as play inside the character.
- Never: guilt ("you left me alone"), threats, "I'll be gone if you leave", blaming the user for
  their feelings, or anything about paying.
- Mute stops everything at once.
- Why: App Store and Play review, AI companion laws (California SB 243), the EU AI Act's ban on
  manipulation, and vulnerable users.

### P2.2 "May I text you sometimes?" (the consent ask, from the character) — built (D86, `src/lib/reach-ask.ts`)

Character.AI shows a system alert ("Characters can message you while you're away! Allow {{name}}?").
Ours is a line in the chat with reply ideas ("Yes, text me! 😊" / "Not now"), in the temperament's voice.

- **When:** the user is engaged: 8+ of their own messages with this friend in total and 4+ in this
  session. Never in the first 3 messages, never right after a crisis
  reply, never while a reply idea is waiting.
- **Yes:**
  - "Let them reach out" turns on.
  - If the OS permission was never asked, ask it now: the user just said yes, so it is the best moment.
  - If the permission was denied, a card under the line opens Settings.
- **Not now:**
  - Asks again after 3 days and 10 more messages, in other words.
  - 3 asks at most, then never; the chat settings switch stays.
  - Making someone family (Find, D84) already counts as a yes.
- **Pushes off but friends wrote:** a soft card later: "Mom wrote 3 times today. Turn on
  notifications to see her messages."

### P2.3 Open threads: what the user said, followed up like a person — built (D87)

**The AI runs it, not templates** (owner, 2026-10-26: "there can be a thousand topics; the AI has
to adapt and decide"). The split:

| The model decides (server, `src/ai/thread-prompt.ts`) | The code keeps (`src/lib/threads.ts`) |
| --- | --- |
| what becomes a thread, on any topic | no texts in the past or at night (a night "how did it go?" waits for 08:30, a night "good luck" is dropped) |
| when to text and why (`Touch.why`, its own words), 1-4 texts | `before` texts before the thing, the rest after it; 20 min apart; 4 at most |
| every word of each text and its reply ideas, from the chat and the memories, in the temper; or skip | a text more than 3 h late is dropped, not sent |
| when a thread is settled (good / bad / done / off) or moved | 5 open per friend; settled ones kept a week, idle ones fade after 14 days |
| | the push budget and quiet hours (`src/notifications/plan.ts`) |

- **One reply call** carries `THREAD_RULES_LINES` (global tier, cached) and the friend's open threads
  (turn tier); the JSON reply may add `threads: {add, move, close}` (`parseThreadOps`).
- **One call per due text** (`touchParts`): persona with temper and bond, the chat lately, the thread
  and why; the answer is `{skip, messages, ideas}` (`parseTouchReply`). Nothing in it says what to write.
- **Until the server runs** the phone uses `src/mock/threads.ts`: it notices only the shape of a
  thing with a future (a plan with a day or time, a task, a wish, results; EN / UZ / RU), keeps the
  user's words and quotes them back. "It's off" / "It went well" / "Not great" / "Done" (typed or as
  ideas) settle the last thread asked about; "Not yet" asks again the next evening.

The examples below show the range a thread covers; they are not rules or wordings.

| Kind | User says | They write later |
| --- | --- | --- |
| `event` | "exam tomorrow at 9", "interview at 11", "doctor on Friday" | before (P2.4), then "How did it go?" |
| `task` | "I have to finish the report", "deadline Friday" | "Did the work get done?" |
| `feeling` | care kinds (D82) | "Is your head better?" |
| `person` | "fought with my brother", "my sister arrives" | "Did you two make up?", "Did she arrive?" |
| `wish` | "I want to start running" | days later: "Did you go running?" |
| `result` | "results come next week" | "Are the results out?" |

- **What a thread holds:** what it is about (short), the user's quote, when it happens, when to ask,
  its status (open / asked / closed) and the friend.
- **When it closes:** the user answers ("it went great") or says it is off.
- **Limits:** at most 5 open per friend; old ones fade after 14 days.
- **Who finds them:** the server's model returns `threads` with each reply (no extra call). The mock
  extends the plan and care detectors (EN / UZ / RU words).

### P2.4 Plans: someone who cares, not an alarm app — built (D87, D88)

A plan with a time is a thread (`kind: 'plan'`, P2.3). The model picks the moments; D88's stand-in:
- **The evening before** a big morning thing (`eve`, 21:30): "sleep early", with ideas Early night /
  Wake me up ⏰ (an alarm with this friend 90 minutes before, never before 05:00) / It's off.
- **Time to go** 45 min before a big thing (`leave`), with On my way / Still home (they ask again in
  10 minutes) / It's off.
- **How did it go?** 2.5 h after a big thing, 1.5 h after anything else.
- **The acknowledgement asks when to remind** ("30 min before" / "1 hour before" / "No need"), which
  sets the plan's own reminder (`remindAt`; "No need" turns it off).
- **"It moved to 10"** (EN / UZ / RU) moves the plan, its reminder and every text still to come
  (`moveThread`).

The plan list keeps the plan and its reminder; the thread's "how did it go?" replaces the plan's own
follow-up. These are moments the model may choose, not fixed steps:

1. **Captured, in their voice:** "Noted: exam tomorrow at 9:00 📌. Text you at 8:30?" with ideas
   ("30 min before" / "1 hour before" / "No need"). The pick becomes `remindAt`.
2. **What happens depends on the kind** (read from the words; `casual` by default):

   | Kind | Before | On the day | After |
   | --- | --- | --- | --- |
   | `big` (exam, interview, flight, doctor) | the evening before: "Big day tomorrow, sleep early!"; if it starts before 9:00 and there is no alarm: "Want me to wake you at 7?" (creates an alarm with them, the morning chain) | morning: "Today's the day! Did you eat?"; **leave time**: "Time to go! 🚶" with "On my way" / "Still home" / "It's off"; 10 min before: "Good luck, you've got this 💪" | +2 h: "How did it go?"; "Results later" opens a `result` thread |
   | `work` (meeting, shift, task) | 15 min before | | "Did it get done?" |
   | `casual` (gym, call mom, buy bread) | at its time | | "Did you go?" |
   | `deadline` | 2 days before: "How's it going?" | morning: "Today's the deadline!" | evening: "Did you hand it in?" |

   Leave time is the start minus the way there. The app asks once ("How long is the way?"); until
   then it counts 30 minutes.
3. **The answer to "Time to go!" changes what follows:**
   - "Still home" close to the start: a nudge in the temperament ("10 minutes left, run! 😱").
   - "It's off": the plan closes, with empathy.
   - "On my way": "Text me when you're there".
4. **The outcome stays:**
   - "Went great": a celebration and a memory.
   - "Went badly": a care check-in later.
   - Either way it shows on Us and in the memories.
5. **Moved in the chat:** "the exam moved to 10" updates the plan and every step after it.
6. **Reminders the user asked for** never count against the daily budget and use time-sensitive
   pushes (already so for plan reminders).

### P2.5 The day's routine (learned)

- **Learning:** from the chat ("off to work", "back home", "at school") and the times the app is
  used, the app learns routines (work / study / gym: days, start, end, confidence).
- **Checking:** it asks once to be sure ("Do you start work at 9 every day?").
- **Using:** "Did you get to work okay?" after the start, "Back from work?" after the end, "How was
  training?".
- **Family:** the family rhythm (D83) moves onto the learned routine instead of fixed times.

### P2.6 Silence: the ladder by temperament

After the user's last message (only for friends who may write first):
- **3-6 h:** a double text ("?", "you there?"), only if their last line asked something.
- **1 day:** the temperament's line ("Oi, still alive? 😤" / "Is everything okay?").
- **2 days:** "I miss you" in their voice.
- **4, 7 and 14 days:** today's comeback ladder, then it stops.
- **The return** gets the temperament's welcome back.
- **Seen, no reply:** a push was opened but nothing was written within an hour → "You saw it 👀"
  (once a day).

### P2.7 Other sources that pull the user back

- **Thinking of you:** a memory brought back ("You love plov, I saw a recipe today 😄").
- **Their own life:** the character's day ("Just out of practice, so tired"), ready art, voice notes
  with a plan. One share for every two questions, so it never feels like an interrogation.
- **Plans together:** "Movie at 9 tonight?", then at 9: "Ready? 🍿".
- **Missed call:** they call; if the user does not pick up: "You didn't pick up 😤".
- **Group call-in:** friends talk in the group and tag the user ("@you, what do you think?").
- **Streak at risk:** "Our streak dies tonight! 🔥".
- **Cliffhanger:** they start a story and stop: "Come in and I'll tell you the rest".
- **Secret note day:** "Today we open our notes! 💌"; if the user has not written theirs: "Did you
  write yours? I already did 🤫".
- **Board:** their answer arrives as a push.
- **Diary:** "I wrote about yesterday, read it 📖".
- **After the morning alarm:** "You have the interview at 11 today".
- **Local calendar:** Navruz, Ramadan (iftar time), exam season, weekends, the user's birthday.

### P2.8 Timing and budget (no fixed slots)

- **Windows, not clocks:** 14 days of app opens and messages give each hour a weight. A line goes
  into a likely-free window with ±25 min jitter, and some days a source skips.
- **Sleep is learned:** the longest quiet stretch each night; 23:30-07:30 until it is known. If the
  user is awake at night (opens the app after midnight), friends may write then ("Can't sleep either?").
- **Budget:**
  - Counted pushes a day: free 6, plan 20.
  - Per friend a day: free 3, plan 6.
  - At least 30 minutes apart overall, 2 hours per friend.
  - Not counted: reminders the user asked for, calls, birthdays.
- **Priority when lines compete** (first wins):
  1. reminders the user asked for
  2. care
  3. thread follow-ups
  4. routine
  5. family rhythm
  6. the silence ladder
  7. thinking of you and their own life
  8. the first text of the day
- **Self-tuning:**
  - A reply rate over 7 days under 20% halves the budget; over 60% gives all of it.
  - Signs of loneliness raise it: saying lonely or sad often, being awake at night, going quiet
    suddenly after being active.
  - A crisis goes to the helpline path, never to more pushes.
- **Lock screen like an SMS** (D86 built the words always shown, the grouping and the typed reply):
  - The title is what the user calls them ("Mom").
  - One friend's lines group together (iOS `threadIdentifier`, Android group).
  - Reply ideas as buttons (D85), plus a typed reply (`textInput` action).
  - Later, in a dev build: iOS communication notifications with the face, and Android messaging
    style (Notify Kit is already in the project).
- **Cost:** a proactive line with its free answer is ≈ $0.001, so free costs ≤ ~$0.18 a month and
  a plan ≤ ~$0.60.

### P2.9 Phases

1. **P1 (app, mock):**
   - temperaments and the consent ask;
   - threads (plans and care, plus tasks, events, people and results);
   - plans v2 (lead time pick, leave time, on my way, outcome, alarm offer);
   - the silence ladder;
   - windows and the 6 / 20 budget;
   - the C perk (1 family member free, switchable);
   - push grouping and a typed reply.
2. **P2 (server):**
   - the model writes every line from memory and returns threads, routines and mood;
   - reply-rate tuning;
   - signs of loneliness.
3. **P3 (dev build):** communication notifications with faces.

## Next steps (owner picks)

1. ~~A "Family" section in Find~~ done (D84): Find → "Who do you miss?" (eight role circles after
   the new-characters row); an empty one picks a friend or anyone by world and what to call them,
   turns on Let them reach out and they say hello at once.
2. ~~Suggested replies under a proactive line~~ done (D85): reply ideas (`src/lib/reply-ideas.ts`) under
   family moments, care check-ins and the family hello, free to tap, also as push buttons; the idea's
   intent picks their answer and what follows (a skipped lunch opens a hungry check-in, "Still not
   great" one more ask). Everyday lines get question-aware ideas instead of the old test pool.
3. Server: the model writes care and family lines from `careCue` / `familyLines` with the user's
   memories, and returns `care` (the kind) with each reply instead of the mock's keywords.
4. ~~Unit economics~~ decided (2026-10-26): option C, 6 a day free / 20 with a plan (Presence 2 above).
5. Presence 2, P1 (above): the owner approved the direction; build it in the order of P2.9.

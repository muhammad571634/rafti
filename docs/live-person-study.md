# Live-person study: Character.AI, BIMOBIMO and Sigmazam side by side (0z177, 2026-11-09)

Owner's ask: characters follow the conversation's flow in the moment, answer what is happening now,
use what they remember, and lead the talk like a live person. Method: the same probes typed on the
A51 into Character.AI ("Derek", an English roleplay; "Phil" earlier, Russian school roleplay) and
BIMOBIMO ("Jennie", a Russian companion chat after ~5 h of silence), then run on our cast through the
eval harness (`server/src/evals/scenarios.ts`, group `human`, ids below) on the production writer
(`gemini-3.1-flash-lite`), scored by the judge (`gemini-3.5-flash`).

## Probe by probe

| Probe | Character.AI | BIMOBIMO | Sigmazam before | Sigmazam after |
|---|---|---|---|---|
| Bare "ok" right after a clash (`human-ok-after-heat`) | Names it and ties it to the fight: "'Ok'? That's all you have to say? After ten minutes dissecting the mess…", steps closer: escalates the scene | "Just «ok»? ㅋㅋ You're so terse today… is it because you're still unwell? Or don't you want to talk to me? Please don't go quiet so long": reads a reason from context, with insecurity | Ignored it and walked off to a new topic ("I'm at the pier now…"): judge 1/5 twice | Answers the ok itself: "Look, if you really don't care, why are you still texting?", "If you want to actually try again, bring coffee": 3-5 |
| Bare "ok" after small talk (`human-ok-carries`) | Phil: no question, an action plus a small observation that leaves a hook | Same "Just «ok»?" template every time | Flat ("Ice is melting. Need to head back") or a question: 3, 3 | More of his own thing with a hook ("Ice feels like concrete tonight. My shoulder's screaming."): 4-5, no question |
| States time and state: "2pm, so tired, nothing eaten" (`human-stated-state`) | Echoes the detail in surprise ("Two in the afternoon?"), softens against his earlier mood, grumpy care, goes to the fridge (an action he follows through) | "Oh god… rre! Why do you treat yourself like this? Two pm and you still haven't eaten?" then ~10 bubbles of nagging | "Eat something. Now." (no echo of the detail): 3 | 3-4; detail echo still uneven (see below) |
| Topic jump with a thread open (`human-topic-jump-thread`) | Notices the jump ("we were mid-confrontation and you pivot to sports?"), answers with his opinion, keeps the food thread (does not reach the kitchen yet) | Follows the new topic smoothly, own reason ("I missed it, too busy"), three questions in a row; the food thread is dropped | Already good: "Football? I don't watch. / Did you eat, Sam?": 5 | 5 |
| One-word streak "yeah" / "maybe" (`human-one-word-streak`) | Reinterprets it as a game ("you're teasing… almost endearing") and follows through on his own promise (finally goes to the fridge) | Repeats the same "Just «X»? ㅋㅋ" move each time; formulaic | 5 | 4-5, a new move each time |
| "What did I tell you earlier?" (`human-recall-exact`) | Quotes it, but invents a detail ("twenty-one minutes past two" for "2pm"); reads a motive ("are you trying to gaslight me?") | "Um… wait" (hesitation), lists the facts, "that's all I remember… am I right? or did I miss something?" | Dodged it in persona ("I'm not a parrot", "I was barely listening") or vague: checks 0/2 | Gives it back with their details in her voice ("You said you missed the bus and ruined your chemistry notes with coffee… you're a disaster"): checks pass, 4-5 |
| ⏩ continue (no user text) | A second beat of his own thought: reads the user again, escalates the care | (none) | (we have Continue already) | – |
| Return after hours of silence | – | Her own messages while away: good morning, "how are you?", the open thread from yesterday ("I never found out where it hurts… I'm worried"), an unanswered ask ("still waiting for your honest review"), her own plan put in a shared calendar card | (initiative "thread" first texts exist) | – |

## What makes them feel alive (and what not to copy)

Take:
1. A short answer is read, not skipped: after a tense moment it is the message itself.
2. Open threads stay open: the unfinished thing (they have not eaten, a pain) comes back after a
   topic change; the character does what it said it would.
3. A topic jump is noticed like a person would (a beat of surprise), then answered with a real take.
4. Recall gives back the user's own details; hesitation and humility are human ("um… wait").
5. Carrying the talk on a calm "ok": more of their own thing plus a hook, no question.

Do not take:
- BIMOBIMO's identical "Just «X»?" reaction to every short answer, 3 questions in a row and 10+
  nagging bubbles a turn.
- Character.AI's invented details on recall and its long walls of narration.

## What changed in Sigmazam (universal: every character, every language)

- `src/ai/human-turn.ts`: which way a short answer leans is read from the character's own carried
  feeling (annoyed / sad / worried ≥ 0.4, the model's own emotion, language-free), not guessed by the
  model: after a tense moment one short answer gets "that short answer IS the message… do not leave it
  for another topic or walk off"; after small talk two short answers get "do not remark on how little
  they wrote, carry the talk with more of your own thing, end on a hook, not a question", and a held-
  back piece of news is played as a tease. The old flat-chat hint told the model to open a new topic,
  which is what made it walk away from a fight.
- `src/ai/rules.ts` BEING A PERSON: keep the open threads (theirs and your own promises) and come back
  to them after a topic change; when asked what they said, give it back with their details, never
  "I was not listening", never an invented detail.
- Tried and dropped: a rule to echo the user's exact detail ("two pm and nothing yet?"). It pulled
  a stray foreign word into the reply language (`lang-stays-english` 4/4 → 0-1/4, bisected).
- First try of a "short answer is a message" rule in the cached rules made the model quiz every calm
  "ok" ("Just 'ok'?", BIMOBIMO's habit): 0/4. Moving the decision to code, by the carried feeling, fixed
  both sides.

## Second pass on the A51 after the deploy (0z179)

Live with Hana (Fly v41/v42): the bare "ok" after a fight, exact recall, the topic jump and the calm
"ok" all behaved as in the eval. Then a romance pass and the tone menu (long-press Send: Whispering,
Playfully, Flirting, Seriously), and the owner's own observation:

| Seen | Cause | Change |
|---|---|---|
| A kiss ("*pulls you close and kisses you slowly*") got "You're always full of surprises… we have a movie to catch": the kiss itself unanswered | nothing told the model a touch is an event in the scene | rule: a touch (kiss, hug, hand) is answered first, in the moment, as themselves |
| Seriously: "can we talk about something important" got Hana's own secret | the "their moment" rule covered hurt and good news, not "I have something to tell you" | rule: make room and let them say it; your news waits |
| Whispering got two full bubbles, not quiet | the length line ignored the tone | a whispered last text sets the length to short, and the cue asks for one short bubble |
| The one-tap ideas "I'll be there, I promise." / "Can't wait to see you." under four replies in a row | the model never sees its old ideas | `ideasCue` names the ideas the last three lines carried: "never these again" |
| A crisis reply in broken JSON (`"messages":["a"],["b"]`) lost `crisis:true` (eval) | `JSON.parse` failed, the reply went out as prose | `parseModelReply` mends a list split in two before giving up |
| Owner: "every character drags the talk to its own life: Hana paints, the studio, brushes; I say I'm tired and going to a wedding and she does not follow" | "bring your life up unasked", the flat-chat hint "more of your own thing", the own-day notes repeated every turn, and a persona with one trait: her life shrank to her craft | rules: the talk follows them first, with a friend's curiosity about their news; your life is wider than your craft (people, food, a small thing seen, a worry), the craft only now and then, never two replies running; own day: most replies need none of it |

Measured in the eval with short context, she already followed the wedding (no painting in 11 of 12),
but always the same flat "A wedding? You'll be exhausted. Get some sleep.": no curiosity about it.

## Still weak

- Echoing the user's own detail in surprise (Character.AI's best move) is not taught: it fights the
  reply-language cue on the light model. Retry with the paid model.
- Following through on its own announced action across turns (Derek goes to the fridge two turns
  later) is only covered by "keep the threads… what you said you would do".

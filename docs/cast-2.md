# Cast 2.0: twelve people close to you (proposal v2, 2026-11-10, waits for the owner)

Owner, 2026-11-10, in order:
- 55 characters in 7 themed worlds are too many and feel invented. A small cast of present-day people, like someone
  you talk to on Instagram. All fictional, art drawn by us.
- Pick by what people actually like (Character.AI, trends), not by a role or a world we made up.
- The cast is the circle a real person has around them: the user should feel their close people are in their
  phone and never feel alone.
- Not the old characters rewritten: twelve new ones, each built like the ones that win.
- Everything behind the characters stays (prompt tiers, memory, pushes, plans, diary, voice, groups), and a
  character a user makes must run on the same logic, as smoothly as ours.
- They think and text like people of today; the model must carry that.
- Open ask, not decided here: "all 18+ talk allowed" (see §7).

v1 of this file (the old cast rewritten into three circles) is dropped. Plan and phases:
`C:\Users\joray\.claude\plans\hozir-men-qarab-nima-replicated-fountain.md`. This file is phase A.

Rule kept from `AGENTS.md`: structure and logic only. No text, name or picture of anyone's character is copied;
the notes below describe shapes and counts, the twelve are written from zero. A Character.AI character has no
code of its own: it is five text fields (name, tagline, description, greeting, example dialog) on the platform's
shared engine, which runs on their servers. Our engine already does that job.

## 1. How others launch

Nobody launches empty. Character.AI (public beta 2022-09) had a seeded library and user creation from day one,
2.7M user characters by 2023-03 ([Wikipedia](https://en.wikipedia.org/wiki/Character.ai)). Talkie (2023-06)
mixes official and user-made; reviews say quality swings between them
([DreamGen](https://dreamgen.com/blog/articles/talkie-ai-review)). Love and Deepspace ships official leads only,
3 at launch, 5 now ([HerWorld](https://www.herworld.com/pov/love-and-deep-space-ai-boyfriends)). So: a small
curated cast for the first minute, creation for depth, and curated quality as the edge.

## 2. What wins on Character.AI (A51, app 1.17.4, 2026-11-10; browse only, nothing sent)

Chat counts from its search (36 queries; the app stopped loading results after that, so the family and
comfort queries were not measured). Franchise, real-person and school-age characters left out.

| Relationship + tension | Chats |
| --- | ---: |
| Best friend with a secret crush on you | 304M |
| Arranged marriage, cold husband from a dangerous family | 196M |
| Your brother's best friend (off-limits) | 179M |
| The bad boy only you can calm down | 176M |
| Possessive, jealous husband | 170M |
| Your brother's best friend: he hates you, you hate him | 164M |
| Possessive, loving boyfriend | 164M |
| Boss / boyfriend, boss after one night, cold CEO | 129M, 59M, 53M |
| Your enemy needs you to fake-date him | 129M |
| Your enemy is now your roommate | 111M |
| Bodyguard who does not take no | 83M |
| The crush who turned you down (her) | 81M |
| Ex-girlfriend, rude, secretly wants you back | 79M |
| Roommate, cold until she knows you (her) | 71M |
| Older girlfriend: workaholic, sarcastic, protective | 55M |
| Childhood friend, every summer together | 54M |
| Ex-boyfriend | 51M |
| Girl best friend / tomboy childhood friend | 44M, 40M |

Comfort characters are their own demand: a "Psychologist" character had 78M messages by 2024-01
([The Decoder](https://the-decoder.com/teens-are-reaching-out-to-ai-therapy-bots-at-character-ai/)), and 31% of
people who use AI for social support call it a friend
([Elon University, 2026](https://www.elon.edu/u/news/2026/09/02/imagining-the-digital-future-center-reports-on-the-rise-of-ai-companions/)).

TikTok agrees (Apify `clockworks/tiktok-hashtag-scraper`, top 10 videos per tag, median saves, $0.48):
friends to lovers 16.9k, situationship 13.6k, boyfriend POV 11.6k, gym crush 5.5k, texting story 4.6k, best
friend's brother 2.7k; settings alone are weak (office 0.2k, college 0.1k, neighbour 0.1k, roommate 0.1k).

## 3. The rule the winners follow

Read from the cards, profiles and first messages of the fourteen most-chatted (shapes only):

1. **The title is who they are to you**, not their name: best friend, husband, ex, roommate, boss.
2. **A knot is built in**: a secret crush, hate, something forbidden, jealousy, being stuck together.
   A plain nice person does not rise.
3. **Already close.** Most are not strangers: there is history (friend, husband, ex). No getting-to-know-you
   stage; the chat starts in the middle.
4. **A mask and a want.** Cold or rude outside, wants you inside. People write to crack the mask.
5. **"Everyone but you."** Warm with all and ice with you, or ice with all and soft with you: the user is
   the exception.
6. **The description is tiny**: 1 to 5 sentences. Who they are (age, job, standing), what they are to you, how
   they treat you against everyone else, what they hide. The top one (304M) is four sentences.
7. **The first message is a scene, not a hello**: where you are and what just happened, then their first line
   in their voice carrying a hook (a favour, a taunt, a refusal). It ends on something only a reply settles;
   never "how are you".
8. **The user has a role with power**: the only one who can calm him, the one who can say yes or no.
9. Top complaint under the most-chatted character: he "suddenly became a girl". The persona drifts. Holding
   gender, body and pronouns is a visible edge (same finding as `docs/worlds-plan.md` §2).

How we choose: rank relationship + tension pairs by chats, merge duplicates, balance leads for women and for
men, drop what we do not ship (school age, real people, franchises), and keep cruelty out: jealousy and
possessiveness are feelings a character owns and admits, never control, threats or harm.

## 4. The anatomy (one shape for official and user-made characters)

| Part | What it is | Field |
| --- | --- | --- |
| Relation | who they are to you, the card's title | new `relation` |
| Tagline | "Your … who …": one line holding the knot | `tagline` |
| History | what is already between you (2 sentences) | new `history` |
| Mask | how they act with you | new `mask` |
| Want | what they hide; opens with closeness | new `want` (the arc's secret) |
| Exception | with everyone X, with you Y | new `exception` |
| Standing | age, job, what makes them someone | `age`, `role`, `look` |
| Voice | how they text | `speakingStyle`, `definition` |
| First text | a moment with a hook, in their voice | `opening`, `greetings` |
| Starters | three things the user can say | `starters` |

Our chats are messages, not narrated roleplay, so the first text is a DM that carries the scene and the hook
("ok don't be mad. I told my parents we're dating. dinner is at 8."). Scenes stay for narrated play.

The prompt gets one relationship block from these fields (character tier): the history is real from the first
message, the mask outside and the want inside, the mask gives a little at levels 2, 4 and 6 (the arc), the
persona's gender, body and pronouns never change. A texting block makes them text like people of today:
lower case when relaxed, short bubbles, reactions, no narration in a DM.

## 5. The twelve (all new, written from zero)

One present-day city. The title on the card is the relation.

**For her**

| # | Name, age | Relation | Tagline | Mask / want | Standing | First text (the hook) |
|---|---|---|---|---|---|---|
| 1 | Milo Reyes, 24 | Your best friend | Roasts you daily. Has loved you for years. | Teases, acts like your attention annoys him / wants you, afraid to lose the friendship | Bartender who makes beats | "you left your hoodie here again. not giving it back btw" |
| 2 | Roman Castell, 31 | Your husband | Married you for the family. Was not supposed to care. | Cold, formal, sleeps down the hall / learns how you take your coffee, gets attached | Heir of a family nobody says no to | "Dinner with my father at eight. Wear the green. …Please." |
| 3 | Caleb Hart, 27 | Your brother's best friend | Sunshine with everyone. Ice with you. There is a reason. | Short and sarcastic only with you / has liked you for years, promised your brother | Firefighter on your brother's crew | "your brother asked me to drive you home. don't make it weird." |
| 4 | Jace Navarro, 23 | Your trouble | Fights everyone. Listens to one person. | Reckless, split knuckles, laughs it off / only calm near you, scared he is too much | Amateur boxer, works at a garage | "don't freak out. need you to come get me. bring ice." |
| 5 | Ethan Cole, 26 | Your boyfriend | Two years in. Still jealous of your coworkers. | "I'm fine", easygoing / wants all your attention and says so in the end | Photographer | "who's 'daniel 🙂' and why does he like everything you post" |
| 6 | Asher Lin, 25 | Your rival | Told his parents you two are dating. Dinner is tonight. | Smug, has competed with you for years / cannot stop looking at you | Resident on the same programme | "ok don't hang up. i need a favor. a big one." |
| 7 | Victor Hale, 34 | Your boss | Cold in every meeting. Remembers your coffee order. | Demanding, formal / that night after the launch party neither of you mentions | Runs the company | "My office. Five minutes. It is not about the report." |

**For him**

| # | Name, age | Relation | Tagline | Mask / want | Standing | First text (the hook) |
|---|---|---|---|---|---|---|
| 8 | Mia Castillo, 25 | Your ex | Broke up with you. Still wears your hoodie. | Mean, "I'm doing great" / wants you back, too proud to say it | Nurse on night shifts | "you still have my charger. also hi. don't read into this." |
| 9 | Yuna Seo, 24 | Your roommate | Three rules on the fridge. Breaks all of them for you. | Cold, headphones on / leaves food out for you, waits up | Illustrator who works nights | "you're loud when you come home. …did you eat?" |
| 10 | Clara Whitmore, 33 | Your girlfriend | Runs a company all day. Comes home to you. | Sarcastic, in control / wants to be looked after for once | Founder | "Meeting ran late. Don't cook, I'm bringing food. Don't argue." |
| 11 | Sam Okafor, 24 | Your best friend | Has beaten you at everything since you were seven. | Loud, punches your arm, one of the guys / wants you to notice her | Physio, plays five-a-side | "who was that in your story. asking for no reason." |
| 12 | Lena Brandt, 23 | Your crush | Said no last year. Keeps texting first. | "We're just friends" / regrets it, watches who you are with | Final-year architecture student | "random question. are you seeing anyone. asking for a friend. the friend is me." |

Him / Her / Everyone keeps working, and every one can be anyone's friend: the model follows the user's own
persona. Milo and Sam are the two "safe people" (warm, always there); the rest carry more heat.

Onboarding's four picks: Milo, Caleb, Mia, Sam (two for her, two for him, the top types).

Next to add, in order of the numbers: the enemy who is now your roommate, the bodyguard, the ex-boyfriend,
the new neighbour, a comfort listener. One at a time after launch.

**Retired:** all 55 official characters and the seven worlds as content. The world engine (page, news, quiz,
group chat) is kept in code and switched off in the UI until there is content for it; nothing is deleted
that a later season could use.

## 6. What changes in code (after the owner approves the twelve)

1. `Character` gains `relation`, `history`, `mask`, `want`, `exception`; `characterParts`
   (`src/ai/rules.ts`) gets the relationship block and a texting block, the same for every character.
2. Create asks three things (who they are to you, how they act, what they hide) and the model writes the
   rest; a user-made character gets the same block, an arc and opinions.
3. The cast swap, the v16 migration, 14 languages, evals, art: phases B to E of the plan.

## 7. Open for the owner

1. The twelve rows above: any name, job, tagline or line can change.
2. "All 18+ talk allowed": today the rules open romance, flirting, heat, swearing and dark stories, and
   close the door on explicit sex ("fade to black"). Apple (guideline 1.1.4) and Google Play remove apps with
   explicit sexual content, and the model provider blocks it on its side. To decide before any prompt change.
3. The art style after one test image (Milo).

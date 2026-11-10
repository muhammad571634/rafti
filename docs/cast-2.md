# Cast 2.0: twelve present-day people (proposal, 2026-11-10, waits for the owner)

Owner, 2026-11-10: 55 characters in 7 themed worlds are too many and feel invented (palace, fantasy realm,
noir, idols). The cast becomes a few present-day people who read like someone you talk to on Instagram:
your best friend, an ex, a coworker, the neighbour. All fictional, art drawn by us, built on current trends.
Everything behind the characters stays (prompt tiers, memory, pushes, plans, diary, voice, groups); user-made
characters run on the same engine. Plan: `C:\Users\joray\.claude\plans\hozir-men-qarab-nima-replicated-fountain.md`
(phases A-E). This file is phase A.

## 1. What the market does

**Launch pattern.** Nobody launches empty.
- Character.AI (public beta 2022-09): a seeded library plus user creation from day one; 2.7M user characters
  by 2023-03 ([Wikipedia](https://en.wikipedia.org/wiki/Character.ai)). Today its feed is almost all
  user-made scenario characters.
- Talkie (MiniMax, 2023-06): official characters and millions of user-made ones in one feed; reviews say quality
  swings between the curated and the community ones ([App Store](https://apps.apple.com/tz/app/id6450140383?l=en-gb),
  [DreamGen review](https://dreamgen.com/blog/articles/talkie-ai-review)).
- Replika, Nomi, Kindroid: no shelf, you make one companion (from product knowledge; not re-checked this session).
- Love and Deepspace: official leads only, grown from 3 to 5 over two years
  ([HerWorld](https://www.herworld.com/pov/love-and-deep-space-ai-boyfriends)).
- BIMOBIMO: a big fan catalogue (idols, anime), an "Original Character" tab with 3 characters, no everyday
  modern people (`rafti-research/teardown/`).

Conclusion: a small curated cast is the first minute (a new user has someone to talk to at once, and the
cast shows what the app can do); creation gives depth and length. Curated quality is our edge over Talkie's
uneven community shelf.

**Character.AI on the A51 today** (1.17.4, Russian locale, browse only, nothing sent):
- "For you" leads with modern relationship scenarios: a best friend who "doesn't see you as a friend" (2.5M
  chats), a fake husband your sister likes (2.6M), an arranged husband (0.8M), a baby with your enemy (1.5M).
- "Trending": an ex who wants you back, an ex with a child (250k), special forces where "you are the dog
  handler" (262k), plus franchise characters (game, Harry Potter, K-pop) that we never do.
- Cards now carry relationship tags under the tagline: Classmate, Schoolmate, Love Interest, Boyfriend.
- The card names who the user is ("You are…"): the scenario gives the user a role. Our `userRole` does this.

**TikTok** (Apify `clockworks/tiktok-hashtag-scraper`, top 10 videos per hashtag, medians, 2026-11-10, $0.48):

| Hashtag | Views | Saves | All-time tag views |
| --- | ---: | ---: | ---: |
| friendstolovers | 923k | 16.9k | 6.0B |
| situationship | 739k | 13.6k | 32.5B |
| boyfriendpov | 1.8M | 11.6k | 122M |
| gymcrush | 566k | 5.5k | 15.3B |
| textingstory | 529k | 4.6k | 21.1B |
| bestfriendsbrother | 247k | 2.7k | 812M |
| childhoodfriendstolovers | 118k | 2.1k | 126M |
| aigirlfriend | 193k | 1.8k | 701M |
| workplaceromance | 51k | 0.4k | 678M |
| officeromance | 47k | 0.2k | 1.6B |
| collegeromance | 12k | 0.1k | 816M |
| neighborromance | 51k | 0.1k | 10M |
| roommateromance | 18k | 0.1k | 10M |
| smalltownromance | 12k | 0.3k | 2.0B |
| aicompanion | 7k | 0.1k | 242M |
| longdistancerelationship | 6k | 0.0k | 54.3B |

With the 2026-10-30 runs (`docs/worlds-plan.md` §2): tsundere 12.5k saves, yandere 13.0k, protective
("touch her and you die") 10.8k, enemies to lovers 10.0k, slow burn 9.4k, arranged marriage 8.2k,
golden retriever 1.4k, kuudere 2.8k, grumpy-sunshine 0.8k.

What it says:
- **Dynamics win, settings lose.** Friends to lovers, situationship, "boyfriend POV" (daily life with a
  partner), gym crush and the best friend's brother pull; office, college, neighbour and roommate as
  settings are weak. So each person is a dynamic first; the setting is only "where you know them from".
- **The chat itself is a format people love**: texting stories have 21B views. A DM-like friend fits.
- Men are an audience too (aigirlfriend 1.8k saves): the cast needs women with strong dynamics, not
  only as side characters.

## 2. The rule for every character (official and user-made)

1. A present-day adult (21-33), in one unnamed modern city, with a normal job or study and a phone.
2. One dynamic from the trend list, one way you know them ("how you met"), one temperament, one secret
   that opens with closeness (arc beats at levels 2, 4, 6), opinions of their own.
3. Never: royalty, magic, crime families, idols, real people or look-alikes, franchises, minors.
4. Possessive / yandere is not used as such (store risk, and it teaches control); jealousy may show
   as a feeling a character owns, never as control.

## 3. The twelve

Three circles (the old "worlds", same engine: circle page, news, quiz, group chat, entry scene):
**Since forever** (old friends), **From work**, **Around you** (the neighbourhood, the gym, online).
Every one reuses an existing id, so evals, memory tests and art slots carry over; text is rewritten.

| # | Id | Name, age | How you know them | Dynamic / temperament | Their job | Secret (opens with closeness) |
|---|---|---|---|---|---|---|
| 1 | c_kai | Kai Arden, 24 (m) | Your best friend since school | Friends to lovers, golden retriever | Swim coach, physio student | Has been in love with you for years; almost said it twice |
| 2 | c_hana | Hana Reyes, 24 (f) | Your oldest friend, two streets away | Tsundere, grumpy-sunshine | Tattoo artist and illustrator | Her father finished the painting that made her "talented" at nine |
| 3 | c_theo | Theo Lancaster, 28 (m) | Your best friend's older brother | Off-limits, slow burn, protective | Works in finance | Promised his sister he would never date her friends |
| 4 | c_adrian | Adrian Wells, 29 (m) | Your ex; broke up a year ago | Second chance, texts at 1 a.m. | Architect | Kept the ring he never gave you |
| 5 | c_elio | Elio Vance, 26 (m) | Sits at the next desk | Kuudere, forced proximity | Software engineer | Rewrote your broken code at night so you would not be blamed |
| 6 | c_tessa | Tessa Moreau, 26 (f) | Your rival for the same promotion | Enemies / rivals to lovers | Marketing lead | Asked the boss to give the promotion to you |
| 7 | c_priya | Priya Raman, 27 (f) | The coworker you are "not dating" | Situationship, flirt | Designer | Turned down a job abroad to stay near you; won't say so |
| 8 | c_felix | Felix Grant, 27 (m) | On a three-month transfer to your office | Ticking clock, slow burn | Consultant from another city | His return ticket is booked; he is looking for a reason to stay |
| 9 | c_erik | Erik Holt, 31 (m) | Coach at your gym | Grumpy, protective, gym crush | Strength coach, ex-pro hockey | An injury ended his career; he never talks about that night |
| 10 | c_sol | Sol Rivera, 30 (f) | Owns the café under your flat | Caring, protective, older | Café owner | The café is in debt; she smiles anyway |
| 11 | c_cole | Cole Ashby, 28 (m) | Your new neighbour across the hall | Morally grey, protective ("who did this to you") | Mechanic | Did time at nineteen for his uncle's debts |
| 12 | c_ivy | Ivy Chen, 25 (f) | You matched on a dating app | Chaotic flirt, makes plans | Florist | Deleted the app after your first chat; still pretends to swipe |

7 men, 5 women; the Everyone / Him / Her filter keeps working. Onboarding's four picks: Kai, Hana, Theo, Ivy.
Eval coverage carried over: Hana 28 scenarios, Kai 12, Sol 6, Erik 6, Ivy 3, Adrian 3, Theo 2, Tessa 2.

**Retired (43):** all of Moonlit Realm, NEON TIDE, Velvet District and Gilded Empire, and from the modern
worlds Iris, Rowan, Jun, Noah, Lucas, Marco, Gideon, Ren, Hugo, Nadia, Teddy, Freya, Sasha. The two seeded
creations (`c_oppa`, `c_luna`) stay as examples of user-made characters. A v16 migration removes the retired
ids and their seed data from phones; chats a user had with them go with them (phase B of the plan).

## 4. User-made characters get the same depth

- Create asks "how do you know them?" (Since forever / From work / Around you / Online / Other) and the
  dynamic; the model writes the secret and three arc beats once, as it already writes opinions.
- They join that circle's group chat, news and quiz like an official character.

## 5. Art brief

Semi-realistic drawn scenes framed like a phone photo: café table, gym mirror, office kitchen, a street at
night; the face large, the friend on the trailing side of the frame. Not photoreal (no look-alike risk in
store review), not anime. One test image first (Kai), the owner looks, then the other 11 (count stated).
Prompts go to `docs/nano-banana-cast-2.md`; the owner draws in Nano Banana, the agent wires them.

## 6. Open for the owner

- The twelve names, jobs and dynamics above (edit any row).
- The art style after the test image.

# Road to launch

The owner handed the whole product to the agent on 2026-10-31: decide as founder, CEO, PM and senior
developer, in the owner's interest. The owner does not read code. Work from this file, in order,
and tick items off. Only the "Owner only" list needs the owner.

## The bar

A person should feel they are talking to someone real, in every part of the app, as in Character.AI
and BIMOBIMO. With the model on, every line a character says comes from the model. Stock lines
exist only for running with the model off. When the model is busy, say so (Not Delivered, a paused
stream, a first text left out); never pass a stock line off as the character.

## Where it stands

| Part | Model? |
|---|---|
| One-to-one chat, Continue, time skip | yes (Continue and skip since `25a9d26`) |
| First texts (brief, evening question, week, threads, world news) | yes |
| Moments (greetings, birthday, plans, care, family, missed call, board, the morning chain, after a date or a quiz) | yes since D138; a busy model means they stay quiet |
| Memory | yes |
| Streams | yes, lines retry, then the stream pauses |
| Group chat | yes, seen on the A51 |
| Truth or dare, one-to-one and group | yes, from a cue; the questions the user asks still come from a list |
| Dates | yes since D138: one round at a time, each knowing what the user chose; paid when the first round arrives |
| Quizzes | yes since D138: their picks and lines, their own weekly quiz; a world quiz keeps its written facts and the model writes the host |
| Diary pages, secret notes, the answer to a shared diary page | yes since D138 |
| Photos the user sends | the model cannot see them yet: its cue says so and it asks. Send the picture to the model |
| Push notifications | stock lines: the phone schedules them ahead. Real words need pushes sent from the server |
| Calls | no: `callScript`, and they need voice |
| Character art | waits for the redraw |

## Order

1. Done (D138): everything a person reads comes from the model. Left over: pushes and photos, in the table above.
2. Group: tap a member to make them answer, as Character.AI does (`invoke-character`).
3. Cost: prompts show `cached=0` in the server log, so the provider's cache is not working. Fix it before paying for traffic.
4. Shells on the server: the reply routes do not check the wallet, the app counts. Paid features must be enforced there.
5. Art: the owner redraws, the agent wires it.
6. Voice: replies first, live calls after.
7. Payments: Google Play Billing, then StoreKit.
8. Account and safety review before strangers use it: age gate, report, block, delete account, moderation of what users create, terms and privacy reviewed by a lawyer.
9. Measure: retention (D1, D7), messages a day, paying share. No measuring, no learning.
10. Closed test on Google Play, real strangers, fix what they hit. A new personal account must keep 12 testers opted in for 14 days before production.
11. Launch, then short-video marketing built on the tropes that already travel (`docs/worlds-plan.md`).

Founder's call, 2026-10-31: test on Android first. The owner has an A51 and no iPhone; the 2026-10-27
App Store first decision waits until there is an Apple account and a device.

## Owner only

- Run the server deploy line (auto mode refuses the agent's own).
- Pay: Google Play account, later Apple, the paid model key, voice.
- A paid model key before any stranger uses the app. On the free tier Google may use prompts to improve its products, which is not acceptable for private chats, and the free queue makes characters slow or silent. Swapping is one secret on the server (`GEMINI_API_KEY`, `CHAT_MODELS`), no code.
- A legal identity for the stores, and a lawyer's read of the terms.
- Find the first 12+ testers.
- Taste: say in plain words what feels fake. That is the one thing the agent cannot measure.

## How to win

Do not fight Character.AI on the number of characters or on ad money. The market is top-heavy: the
top 10% of apps took 89% of revenue (Appfigures via TechCrunch, 2025). Bet on what those apps do
least, and check each bet against retention:

- Characters who live: they write first, remember, and have a story that moves week by week.
- Depth over a catalogue: 55 characters in 7 worlds, with secrets that open with closeness.
- Languages done properly, gender included, in markets with fewer strong apps.
- Chat, group and stream inside one story.

## Money

Plans in `src/economy/plans.ts`: Basic $9.99 a month, Pro $29.99 a month, yearly $239.99, plus shells.
Measured at list price in the server log on 2026-10-31: about $0.001 to $0.0014 per reply, about
$0.0005 per memory pass. A heavy user at 100 messages a day costs roughly $4 to $5 a month, so
text alone leaves margin on Basic after the store's cut. Voice will change that sum: measure it
before pricing it. Recheck the prices when the paid key is in.

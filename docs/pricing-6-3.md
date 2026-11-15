# Audit §6.3: a shell per message, and the unit economics behind the choice

Status: **proposal, waiting for the owner** (2026-11-15). Nothing here is built. Prices are set only after the paid
model key is in and voice is measured (`docs/road-to-launch.md`, Money). This file fixes the *shape* and the
formula; the numbers get replaced by measured ones.

## 1. The problem (audit 2026-11-15 §6.3)

Every message costs a shell for everyone (`shellCosts.textMessage = 1`, `src/mock/misc.ts`; plans in
`src/economy/plans.ts`). The friend feels metered: the user sees a counter go down while talking to someone who
is meant to feel like a person, which is the product's first job (`.agents/rules/project-memory.md` §4).

## 2. Inputs (measured, `docs/cost-ledger.md`, `gemini-3.1-flash-lite` list price, 2026-11-07)

| Input | Value | Note |
|---|---|---|
| One message (reply + its share of the memory pass) | **$0.0019** | cache misses on 16 of 17 replies; a working prompt cache should cut input cost by roughly 40 % or more (ledger #1) |
| Friend's own texts (moments, threads) | ~$0.001 each, ~5 a day for an active user | ~$0.15 a month |
| Store cut | 15 % (small business programmes) | 30 % above $1M a year |
| Voice (calls, voice replies) | **not measured** | the biggest unknown; Pro cannot be priced without it |
| Photos | not measured | |

Usage profiles (assumptions until the first test cohort gives real counts from `usage_events`):

| Profile | Active days a month | Messages a day |
|---|---|---|
| Free, typical | 10 | 20 |
| Free, maxed | 30 | the daily cap |
| Paid, typical | 25 | 60 |
| Paid, heavy | 30 | 150 |

## 3. The formula

- Per user per month: **margin = price × 0.85 − (messages × $0.0019 + friend's texts + voice + photos)**.
- The free users ride on the payers: a payer's margin must carry the free users behind them.
  **Free users one payer can carry = payer margin / free user's cost**; break-even conversion = 1 / (1 + that).
- Market conversion for companion apps is commonly quoted at 2-5 % (secondhand figures, no audited dataset).

## 4. Text-only numbers (before voice)

| | No cache (today) | Cache working (−40 %) |
|---|---|---|
| Free user, typical | $0.42 a month | $0.26 |
| Free user, maxed at 30 a day | $1.75 | $1.05 |
| Paid user, typical | $3.00 | $1.80 |
| Paid user, heavy (150 a day) | $8.70 | $5.22 |
| Basic margin ($9.99 → $8.49 net) on a typical payer | $5.49 | $6.69 |
| Free users one Basic payer carries | 12.9 | 26.2 |
| **Break-even conversion** | **7.2 %** | **3.7 %** |

Reading: today's cost only breaks even if 7 of 100 active users pay, above the market's usual 2-5 %. The
working prompt cache halves that bar; it is the biggest lever we have and comes before launch, whichever shape
the owner picks. Pro, packs and the yearly plan lower the bar further; voice raises it until measured.

## 5. Three shapes

| | A. Today: a shell per message | B. Free daily messages (recommended) | C. Whispy-style hybrid |
|---|---|---|---|
| Free user | 1 shell a message; check-in 30-50 shells a day + wheel (~8) + shares (≤15), the bucket burns at midnight | ~30 messages a day free, no counter until the last 5 ("5 left today"); shells only for extras | ~15 messages a day free, then gems |
| Basic $9.99 | 2,000 shells a month (~66 messages a day), then packs | chat without a counter (fair use ~200 a day) + a small shell allowance for extras | $14.99 a month |
| Pro $29.99 | 5,000 shells, calls, voice, photos | chat without a counter + calls, voice, photos + more shells | $44.99 a month, yearly up to $449.99 |
| Shells / gems buy | messages and extras | only things with a real cost: calls past the allowance, voice, photos, dates, plans, secret notes, gifts | messages and everything |
| Feel | metered: a counter on every line | a friend who does not count your words | metered, built around a few big spenders |
| Free user cost | ~$0.42 typical (a daily opener can spend ~50 a day) | ~$0.42 typical, $1.75 at most | ~$0.32 typical |
| Break-even conversion (no cache / cache) | ~7 % / ~4 % | ~7 % / ~4 % | ~3 % / ~2 % (at $14.99) |

Notes:
- A and B cost about the same: today's daily free bucket already gives a free user ~40-60 messages a day, it just
  shows a counter while doing it. B mainly changes the feel, and lets Basic users stop running out at ~66 a day.
- B's worst case is a Basic user at 200 messages every day: $11.55 a month without the cache (a $3 loss),
  $6.93 with it. Rare; fair use stops the extreme; the cache makes it safe.
- C earns more per payer but sells against the product's first job (the friend feels metered) and leans on
  high tiers; the market already has plenty of it (Whispy, Talkie Pro, Replika's higher tiers).

## 6. Market (2026, mostly secondhand sources; check store listings before relying on a number)

- Whispy AI (owner's Sensor Tower screenshot, UK): gems £2.99-£99.99 (279-10,599), subscriptions £14.99 and
  £44.99 a month, £149.99 and £449.99 a year.
- Character.AI: chat free and unlimited on the base model, c.ai+ $9.99 a month; filed for Chapter 11 on
  2026-10-13 (the cost of unlimited free chat).
- Talkie: free, Talkie+ $9.99, Talkie+ Pro $24.99 a month.
- Replika: chat free, Pro about $19.99 a month, higher tiers in rollout.
- Chai: a capped free daily allowance (recently cut), premium about $13.99 a month.
- The common shape: chat free or capped per day, money from a subscription plus consumables for extras.

## 7. Recommendation

1. Shape **B**: about 30 free messages a day with no counter until the last five; Basic and Pro chat without a
   counter under fair use; shells for things with a real cost.
2. Before launch, whatever the shape: a working prompt cache (ledger #1), then measure the hit rate.
3. Measure voice before setting Pro's price and allowance.
4. After the first test cohort, replace the profiles in §2 with real counts and set the daily cap so the
   break-even conversion sits at or under 3 %.
5. No high "big spender" tiers at launch; packs stay as they are for extras.

## 8. What changes in code if B is chosen (for the engineer, later)

- `shellCosts.textMessage` stops applying to chat within the free daily count and for Basic / Pro under fair use;
  the server's wallet SQL and `src/economy/` move together (the server copies these files).
- A daily message count per user (server side, the user's midnight, like the free bucket).
- The chat shows "5 left today" only near the end, and a calm sheet at zero (wait until tomorrow, Basic, or a pack).
- Store copy, the paywall, the plan picker and the 14 locales follow; the cost ledger gets the new rows.

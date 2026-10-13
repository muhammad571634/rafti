# Backend schema gaps (2026-10-13)

Where `docs/backend-plan.md` no longer matches the app or the owner's later decisions. Read this before
writing migrations (B0). Decisions are not changed here; open items are marked **Decide**.

## 1. `wallets` table (§4) is from before F17

§4 still lists `film`, `member_until`, `member_plan`. The app no longer has membership or film:

| §4 column | Now | Server should have |
|---|---|---|
| `film` | Photo Booth spends shells; film was removed | drop |
| `member_until`, `member_plan` | `wallet.subscription` (plan, status trial/active, term start, will renew, period usage) | `subscriptions` + `quota_periods` (§14.2) |
| — | `wallet.packs` (minutes bought with shells, 90 days) | `minute_packs` (§14.2) |
| — | `wallet.trialUsed` (one trial per account) | `wallets.trial_used` or derive from `subscriptions` history |
| — | `wallet.boughtShells` (starter pack shown until the first purchase) | `wallets.bought_shells` or derive from `shell_ledger` |

`wallets` keeps only `user_id`, `shells` (cached balance), the free bucket (section 2) and the two flags.

## 2. Free shells expire at midnight (missing from the schema)

The app's rule (`src/store/use-app-store.ts`: `claimDailyLogin`, `spendShells`, `expireFreeShells`; `docs/flows.md` F5):

- **Every free credit** is free-bucket: daily check-in, wheel, ads, share, invite and the welcome gift
  (owner decision 2026-10-13, built in `src/economy/shells.ts`). Only bought shells never expire.
- Free shells are **spent first**; bought shells never expire.
- Whatever free shells are left **expire at the user's local midnight**; History shows an `expired` line
  booked at that midnight.

Proposal for the server (append-only, like the rest of the ledger):

- `shell_ledger.bucket` (`free` | `paid`) and `shell_ledger.expires_at` (set on every free credit).
- A spend writes one row per bucket it takes from (free first).
- A pg-boss job at the user's local midnight (time zone from `bootstrap`, §14.3.6) writes the `expired` row.
- Balance = sum of the ledger; `wallets.shells` is only a cache.

Decided 2026-10-13: all free shells burn to zero at midnight, to push free users toward a plan.

## 3. Plan config still has memory tiers (§14.2)

The config block gives `memory: 'full'` to Basic and `memory: 'deep'` to Pro. The owner decided on
2026-10-13 that memory is the same on every plan (§15.8; Store copy changed). Drop the `memory` field;
§13.3's "Xotira" row is superseded the same way.

## 4. Two daily tables

§4 has `daily_state` (`check_in_day`, `last_login_day`, `ads_watched`, `spins_used`, ...) and §14.2 has
`daily_usage` (`day`, `messages`, `ads`, `spins`, `checkin`). Keep one table keyed by the user's local day:
`daily_usage(user_id, day, messages, ads, spins, checkin_day, checkin_amount, greeted_slots, called_slots)`.

## 5. Smaller mismatches

| Where | Gap | Do |
|---|---|---|
| §9 | Talks about the "Unlimited chat" membership risk | Historical; §13 (fair use 300/day) replaced it |
| §10 vs §15.3 | §10 says the repo is public; §15.3 recommends private before B1 | Follow §15.3 |
| `LedgerEntry.unit = 'seconds'` | The app books call time in the shell ledger | Server keeps minutes in `quota_periods` / `minute_packs`, not in `shell_ledger` |
| Free voice note (HANDOFF 0g) | Uses greeting lines as a mock | Server sends a `voice_lines` clip (§14.2), `line_key` per slot (morning / night) |
| `MemoryItem` | `type`, `importance`, `status`, `supersededBy` exist only on `story-continuity-rebased` | Matches §4 `memories`; lands with that PR |
| Client `Wallet.film` | Dead field | Remove in a later cleanup |

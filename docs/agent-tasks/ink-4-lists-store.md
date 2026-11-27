# Ink task 4: profile, settings-like lists, store and plans

Rules: `docs/agent-tasks/ink-rules.md`. Plan: `docs/design-ink.md` §3. Needs task 0 and the
motion kit (`CountIn`).

Files you own: `src/app/profile.tsx`, `src/app/edit-profile.tsx`, `src/components/profile/**`
except `language-list.tsx` (task 1), `src/app/notifications/**`, `src/app/my-plan.tsx`,
`src/app/store/**`, `src/app/gifts.tsx`, `src/components/plans/**`, `src/components/paywall-sheet.tsx`,
`src/components/daily-reward-sheet.tsx`, `src/components/closeness-sheet.tsx`,
`src/app/call-history.tsx`, `src/app/frame/**`.

## Profile and its children

The reference's Settings: `InkTitle`, then `InkSection`s of `InkRow`s on black. The user's photo,
name and completion sit on top as today (photo 88 pt with a thin white ring, name in serif).
Shells and plan: two `GlowCard`s side by side (shells in the Store's apricot glow, the plan in its
violet). Each row's icon is a line glyph tinted with the colour its tile has today (pass `tint`);
no filled tiles. Delete account stays red text on its own row. The `SHOW_DEV` rows stay.
Edit profile: fields as `InkField`s, interests as `InkChip`s, the field sheets as `InkSheet`.
Notifications settings: rows with switches; the inbox: rows with the friend's ring.

## Store, plans, gifts, paywalls

Money screens: nothing about prices, products, purchase calls or what is shown when changes; a
second agent reads this diff before it ships.
- Store: one serif line on top, the balance as a `BigNumeral`, packs as rows (numeral, bonus
  capsule, price on the trailing side), the white pill buys the chosen pack; offer badges keep
  their meaning and colour.
- Plans (`plan-picker.tsx`): plan cards on `ink.card`, the chosen one with a white 2 px border,
  the comparison table as hairline rows, the pill with the price line under it as fine print.
- Paywall and out-of-shells sheets: `InkSheet`, serif title, the pill.
- Gifts: a 2-column grid of `Tile`-like cards on `ink.card` with the gift art, price as a capsule.
- Daily reward / lucky wheel / coin drop: keep their animations untouched; only the sheet around
  them and the numerals (`CountIn` for the amount won) change.

## Worst cases

Profile at 0% and 100% completion; a plan name and price in German; the store with an offer and
without; the ledger with 200 rows and with none; the smallest phone with a paywall sheet open.

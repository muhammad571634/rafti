# Ink task 3: a friend's space, creating a character, people lists

Rules: `docs/agent-tasks/ink-rules.md`. Plan: `docs/design-ink.md` §3. Needs task 0 and the
motion kit (`PulseRing`, `DotField`, `BubbleField`).

Files you own: `src/app/character/**`, `src/components/character/**`, `src/app/create-character.tsx`,
`src/components/create/**`, `src/app/contacts.tsx`, `src/app/group/new.tsx`,
`src/app/group/[id]/info.tsx`, `src/app/group/[id]/search.tsx`, `src/app/group/[id]/background.tsx`,
`src/components/group/**`, `src/app/personas/**`, `src/app/lore/**`, `src/components/lore/**`,
`src/app/scenes/**`, `src/app/moments/**`, `src/app/photo/**`, `src/app/mind.tsx`,
`src/components/mind/**`, `src/app/world/**`.
Not yours: `src/app/group/[id]/index.tsx` and `call.tsx` (a chat and a call).

## A friend's page (`character/[id]/index.tsx`, `components/character/kit.tsx`)

Top: their tall picture, full width, to 52% of the screen, fading into `ink.ground` at the bottom
(`portraitOf` framing as it is). On the fade: name in `inkDisplay`, the relation line in serif
italic in `friendGlow.word`. Under it: the quick actions as a row of labelled `RoundIcon`s (same
actions), the level as a 56 pt `PulseRing` with the level numeral inside and the next unlock
beside it, "Your story" beats as rows with a lock, then everything else the page lists today as
`InkSection`s of `InkRow`s. The `FriendAccent` provider stays the source of their colour.

Settings, memories, search, background: rows, hairlines; memories grouped by day as `GlowCard`s
only if a memory has a date today, else rows.

## Create a character (`create-character.tsx`, `components/create/quick-create.tsx`)

Quick create: `InkTitle` question, a tall `InkField` with the counter, traits as `InkChip`s (the
`BubbleField` replaces them only when the lead says the part is ready; keep the shuffle button),
the white pill, the outline pill for "fill in by hand", the daily count as `quiet` text. While
the model writes: full-screen `DotField` with the existing status words.
The form: the preview card on top keeps its picture / monogram; every card of fields becomes an
`InkSection` (serif section name, fields as `InkField`s, the "write it for me" spark as a
`RoundIcon` on the field's trailing edge exactly where it works today); chips for style and
voice; the Create pill pinned.

## Lists

Contacts, new group, group info, personas, lore, scenes, mind, a world's page: `InkTitle`, rows,
chips for filters, existing empty states on black with the white pill.

## Worst cases

A character with no picture (monogram on their glow); a 40-character name; a relation line of 60
characters (two lines, then clipped); the form with every optional card open and the keyboard up;
a group with the maximum members; new group with two quick taps on the pick list (nothing shifts).

# Simplify and polish the four main tabs (2026-11-25)

Owner, 2026-11-25: lift the design freeze; do not rebuild, simplify and polish to a senior,
professional level; logic, chain and flow must all work; Today first ("simple but professional,
exact"). Written by Claude 1 after walking Today, Chats, Us and Find on the A51 (Russian) and reading
Today's code. Product changes here wait for the owner's pick; items marked **logic** are fixes.

## 0. The one idea: each tab has one job

| Tab | Its one job | Today it also does (overlap) |
|---|---|---|
| Today | What needs you now | Latest friend (= Chats' first row), unread chats (= Chats' Unread), 11 configurable widgets that copy Us (dates, diary, board, photo booth, alarm, bond) |
| Chats | Talk | Fine |
| Us | One friend's shared life | Notifications bell (belongs to "what's new") |
| Find | Meet someone new | A long "For you" page that repeats the lenses |

Three places show "who wrote to you"; four places open the diary or dates. A user cannot tell where
a thing lives. The fix is not new screens: give each tab its job and let the rest go to the tab that
owns it.

## 1. Today: "what needs you", one calm list

Now (top to bottom): the last-talked friend full bleed with their last line; a "waiting" card (unread
chats + the day's sealed note); a 2x2 grid of user-picked widgets (11 kinds, a jiggle editor with
drag-to-swap and a gallery); a "More" row opening 10 modules.

Proposed:
1. **Hero picks who needs you** (**logic**): the friend with the newest unread line, else the one you
   talked with last (today it is always "last talked", so a new message from someone else sits in the
   card under a picture of someone who said nothing new). The waiting card then leaves the hero's chat
   out (no friend twice on one screen).
2. **Widgets become "Today's list"**: real items for today only, newest first, each one row (its
   module tile, one line, its time): a plan at 19:00 with Ethan, a wake-up at 07:00 from Clara, a new
   diary page, a gift or spin ready, a date that waits. Nothing due: the list is not there. This drops
   the widget editor, the gallery and drag-to-swap (a large, fragile piece of code that only arranges
   copies of Us), and every row is something the user can act on.
3. **The bell moves from Us to Today** (notifications are "what's new"); Us keeps "+" only.
4. **More stays one row** with the module tiles (0z366), and shrinks with the launch feature trim
   (audit P2-11): each module lives where it belongs (Calls in Chats, dates and diary in Us, Store
   behind shells).
5. **One "what needs you" selector** (**logic**): a pure `todayItems(state)` in `src/lib/` with tests,
   used by Today, the tab badges and the bell, so the counts agree. Today on the A51 the Chats tab
   says 1 while Milo's row says 2 (chats vs messages) and Us' bell says 14.

## 2. Chats

Already clean (pinned faces, filters, rows). Polish only: one badge rule with Today (§1.5); "Edit"
can go where swipe actions already do the same (keep it only if it does more than swipe).

## 3. Us

Polished in 0z365-0z366. Next: the bell leaves (§1.3); the calendar card keeps "Your days" and the
plan row; nothing else to cut.

## 4. Find

"For you" repeats the lenses (Spotlight, Meet the cast, Groups, Pick a story, Who do you miss,
Family, creations). Proposed: For you = Spotlight + 4 cast + one story strip; the rest only behind
its lens. Fewer sections, same content one tap away.

## 5. Rules that stay

Night only, Ink kit, calm cards, friend on the trailing side, an icon says what opens (0z366), words
never cut or split, 14 languages, minimal text (headings, numbers, icons), the approved Heartbeat
diary untouched.

## 6. Order of work (each step: code, A51 worst case in Russian, tests, commit, one report)

1. §1.5 the selector and badge rule (logic, no visible change except counts that agree).
2. §1.1 hero picks who needs you + no friend twice.
3. §1.2 Today's list replacing the widgets (owner's yes; an HTML prototype first if the owner wants).
4. §1.3 bell to Today.
5. §4 Find's For you.
6. §1.4 with the launch feature trim (owner's pick of what goes).

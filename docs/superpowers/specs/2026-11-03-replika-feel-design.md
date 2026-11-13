# Replika's feel inside our design (2026-11-03, 0z103-0z104)

## Intent

The owner felt the iOS look had fallen behind today's apps. Asked what someone should feel
when they open Sigmazam, the owner answered: that a character is waiting for them, like
Replika. The owner likes the current structure and logic (4 tabs, Today's 10 modules, every
chat control) and wants Replika's feel merged in and polished, nothing working lost.

## Goals, non-goals, anti-goals

- Goal: the character's picture carries the moments spent with them (the chat, the Today card).
- Goal: the twelve characters the owner drew in Nano Banana get faces everywhere (no letter avatars).
- Non-goal: changing Today's modules, the tab bar, Find or Us.
- Anti-goal: a full-screen Replika home that hides the modules; a calmer Today that drops
  colour or the tiles (both shown in mockups and rejected).

## Approaches considered

1. Full-screen Replika Today (the character fills the screen, modules move away). Rejected:
   the modules and the tab logic are what the owner likes.
2. Calmer Today (white tiles, one clay-icon card, two live tiles + a clay grid). Rejected: the
   owner prefers the current Today.
3. **Picked: our design, Replika's feel where the character is.** The Today card grows into
   "the friend waiting for you"; the chat opens on their picture with glass over it; the Chats
   list gets faces.

## What was decided

- Today card: 300 pt, name + one glass chip (days, level), their newest line in dark glass
  with its time, a "Message" field with a mic; one button that opens the chat.
- Chat: their picture is the default ground (`bg_portrait`), also for existing chats on the
  plain ground (store v14); a chosen wallpaper stays. The look is the owner's prototype: the
  face on top, the conversation from 36% down on a dark shade (up to the header while typing),
  dark-glass bubbles, typing dots and reply ideas, white meta text with a soft shadow, a
  clear-glass header and a dark-glass composer; your bubble stays peach.
- Background picker (after the owner's correction, same day): their picture is not one of the
  wallpapers. It is a row of its own above Classic and Art ("Portrait", their name), the way back
  after trying a wallpaper. An Art wallpaper takes the same picture look (one-to-one and group
  chats); Classic keeps the light chat.
- Chat icons a step larger (header, reply controls, share pill, composer, marks in the chat).
- Intro card: gender joins age, height and world (14 locales).
- Art: close-ups to `assets/avatars`, tall scenes to `assets/portraits` (12 characters).

## Left to the builder (decided in code)

- Wide scenes (the first 40) fill the chat by sliding to a per-character face position
  (`SCENE_FACE`); tall scenes are used as they are.
- The Today card shows no line when a helpline card sits up to 4 lines before theirs or after it.
- The intro card's gender glyph is one person icon for both (SF draws a woman only from iOS 18).

## Round 3: the Today card grows and comes alive (0z107)

- Owner's ask: Today with Replika's feel, the hero card a bit bigger and like Replika; the agent
  thinks up the logic (no mockups, owner looks on the A51).
- Considered: (1) a full-screen friend with the modules under the fold, rejected before (anti-goal
  above); (2) a pager of several friends on the card, Replika has one companion and our card already
  follows the one you talked with last; (3) **picked, the agent's call:** the same card, about half
  the screen, and alive without new words: a slow breath on the picture, a light for the user's
  hour (Replika's room light), an unread line typing in once, the bond's progress on the level chip.
- Left out on purpose: a "what they are doing now" status. With the model on every character line
  comes from the model, and a status per visit would be a paid call; stock statuses would break
  the model-first rule.

## Round 4: the picture from the top (0z108-0z109)

- After a Replika study on the A51, the agent proposed a simpler, neutral Today (prototype A, clean
  white cards; prototype B, the same with the friend's picture full width from the top and the top
  row over it). The owner took only B's top: the picture from the screen's edge with the mascot,
  "Sigmazam" and the profile capsule on it as glass; everything below stays as it was (colours,
  tiles, aurora). Owner also asked that iPhone (Dynamic Island) and Android look the same: the row
  sits below `insets.top` on both, the picture runs under it.

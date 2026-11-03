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
  plain ground (store v14); a chosen wallpaper stays. Their bubbles, typing dots, reply ideas
  and the intro card are dark glass; meta text is white with a soft shadow; the header is
  clear glass, the composer dark glass; your bubble stays peach.
- Background picker: their picture is the first tile of Art, under their name.
- Intro card: gender joins age, height and world (14 locales).
- Art: close-ups to `assets/avatars`, tall scenes to `assets/portraits` (12 characters).

## Left to the builder (decided in code)

- Wide scenes (the first 40) fill the chat by sliding to a per-character face position
  (`SCENE_FACE`); tall scenes are used as they are.
- The Today card shows no line while a helpline card is among the last 8 lines.
- Group chats keep their wallpapers and look.

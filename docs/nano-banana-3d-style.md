# Nano Banana: the soft 3D style (test, 2026-11-03)

The owner liked soft 3D animated-film-style people on Pinterest ("ai charakter") and wants to try
our cast in that manner. This file holds our own prompt for it. No Pinterest image goes into the
app or the repo: we only describe the look in words.

Rules for every prompt in this style:

- **Clearly an adult.** Big-eyed cartoon styles read young and our chats are romance. Every
  character gets adult facial proportions, a defined jaw or cheekbones and a grown-up build, and
  the prompt says "no childlike or teen features".
- **Same person.** The current picture is attached only for identity (face, hair, eyes, marks,
  outfit); the look comes from the profile's `look` field (`src/mock/character-profiles.ts`).
- **Our layout.** Vertical 3:4, face in the upper third (Today's picture and the chat ground put
  words over the lower part), no text, no logos, no other people.
- **One test first** (Theo), then a batch with the count stated.

## The style block (shared)

```
Style: high-end stylized 3D animated character, like a still from a modern animated feature film.
Smooth stylized 3D with soft subsurface skin, slightly larger expressive eyes but grown-up adult
proportions (no childlike or teen features), crisp hair strands, visible fabric texture. Clean soft
studio lighting with a warm rim light and gentle shadows.
Framing: vertical 3:4, waist-up, centred, face in the upper third, some space above the head.
No text, no logos, no watermark, no other people.
```

## Test 1: Theo Lancaster (`c_theo`)

Attach: `assets/heroes/c_theo.jpg` (his current scene). Save the result to `art-new/` as
`theo 3d.png`.

```
Use the attached picture only for who he is: keep his face, hair, eye colour, the beauty mark under
one eye and his outfit. Redraw him in the style below.

Character: Theo, a 22-year-old university student union president. Clearly an adult man: adult
facial proportions, defined jaw and cheekbones, broad shoulders. Wavy golden-blond hair he never
quite combs, bright green eyes, a small beauty mark under one eye. A relaxed, confident half-smile,
looking straight at the viewer as if he has just noticed you.

Outfit: navy blazer with a small gold pin on the lapel, white shirt, dark red tie worn loose.

Background: a soft, out-of-focus university hallway with warm window light and muted colours.

Style: high-end stylized 3D animated character, like a still from a modern animated feature film.
Smooth stylized 3D with soft subsurface skin, slightly larger expressive eyes but grown-up adult
proportions (no childlike or teen features), crisp hair strands, visible fabric texture. Clean soft
studio lighting with a warm rim light and gentle shadows.
Framing: vertical 3:4, waist-up, centred, face in the upper third, some space above the head.
No text, no logos, no watermark, no other people.
```

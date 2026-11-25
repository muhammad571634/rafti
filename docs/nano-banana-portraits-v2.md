# Nano Banana: the twelve main portraits, v2 (2026-11-25, Claude 1)

Owner, 2026-11-25: the twelve main portraits (`assets/portraits/c_*.jpg`, the picture on Find, Today, the profile
and the chat ground) look plain, alike, "like a passport photo". These replace them. The moment stills stay as
they are; `docs/portrait-audit-2026-11-25.md` §1-8 is about the stills and is parked.

## Why the current twelve look alike

The v1 prompts (`docs/nano-banana-cast-2.md`) gave all twelve one recipe: "a phone photo", the person on the right
third, face large, eyes in the upper third, "looking at the camera", "relaxed brow, half-smile", "warm natural
colour". The result is twelve people in one pose: seated or leaning, a medium shot from a little below, eyes into
the lens, the same closed half smile, the same amber lamp light (10 of 12 portraits have more than 60 % strong
warm-orange pixels and almost no cool colour). Side by side on Find they blur into one person.

## What v2 changes

1. **Each portrait is the moment of their first text** (the hook in `docs/cast-2.md` §5). You see the picture and
   you already know the story: Mia in your hoodie, holding your charger; Roman fixing his cufflink before dinner
   with his father.
2. **Gaze is part of the character, not a default.** Only some look into the lens; the others are caught looking
   back over a shoulder, looking down at their phone, at you through a mirror, or away.
3. **Different camera for each.** Close-up, over the shoulder, from above, through a window, in a mirror, wide in
   their world. No two neighbours on Find share a setup.
4. **A signature colour for each**, as a strong second light against warm skin light, so twelve cards are twelve
   colours.
5. **A real expression from their mask**: cold, smug, sulking, jealous, caught out. Not every portrait smiles.

## What stays (so the app keeps working)

- Vertical 3:4. Attach the friend's **current avatar** (`art-new/c_<name>_avatar.png`) to keep the exact face, so
  the avatar and all 84 moment stills still match.
- **Face on the right side of the frame** (centre of the face at about 60-72 % of the width) with the eyes about
  25-35 % from the top: cards put the name and line on the left (`FACE_AT = 0.68`) and the chat ground shows only
  about 61 % of the width around the face (`sceneFocus`, top 30 %).
- The lower half calmer and darker than the top (chat bubbles sit on it). Painted, semi-realistic, no ink outlines,
  no text, no logos, an original adult, no real person.

## The twelve

| Friend | First-text moment | Camera | Gaze | Colour |
|---|---|---|---|---|
| Milo | 1 a.m., on his studio floor, wearing your hoodie with the hood half up, phone in hand, typing "not giving it back" | from above, close | up into the lens, caught and smug | laptop teal + lamp amber |
| Roman | in front of a tall old mirror, fixing his cufflink before dinner with his father | mirror: his reflection large | at you in the mirror | bottle green + candle gold |
| Caleb | night, leaning on his truck outside your building, keys in hand, "don't make it weird" | low, medium, through the passenger window | away down the street | street sodium orange + truck dash red |
| Jace | on a curb outside a gym at night, split knuckles, ice pack, blood on the tape | low, close | up at you, a crooked "don't freak out" grin | cold steel blue + one tungsten lamp |
| Ethan | lying on his bed, phone light on his face, scrolling your post | from above, close, the phone glow lighting him | at the phone, then a side glance | phone blue-white + darkroom red |
| Asher | outside his parents' restaurant, phone to his ear, hand in his hair | medium, over the shoulder of a parked car | glancing back, nervous-smug | restaurant warm gold + neon cyan |
| Victor | standing in his glass office doorway after hours, sleeves rolled, city behind | medium-wide, slight low angle | straight into the lens, unreadable | office cold blue + desk-lamp amber |
| Mia | night-shift break room, your hoodie over her scrubs, your charger in her hand | close, from the side | looking at the charger, not at you | hospital mint + vending-machine pink |
| Yuna | 2 a.m. shared kitchen, headphones on, covering a plate of food for you, the fridge rules behind | medium, through the kitchen doorway | glance over her shoulder | tablet violet + fridge white |
| Clara | arriving at your door with takeaway bags, heels in one hand, blazer off one shoulder | medium, from inside the doorway | straight at you, tired and fond | corridor navy + warm doorway light |
| Sam | on the five-a-side pitch at night, ball under her arm, looking at her phone (your story) | wide, floodlights behind | at the phone, jaw tight | floodlight white-green + sunset orange |
| Lena | studio desk at night, phone to her lips, about to send "are you seeing anyone" | close, through the lamp's glow | away, biting her lip | blueprint blue + desk lamp |

## How

1. **Test first: Milo only** (below). New Gemini chat, attach `art-new\c_milo_avatar.png`, paste the prompt, save as
   `art-new\c_milo_v2.png`. Tell Claude: Claude puts it next to the current Milo on the real cards and checks the
   crops.
2. If the owner likes it, Claude writes the other eleven prompts in the same shape; save each as
   `art-new\c_<name>_v2.png`. Claude crops, compresses and wires them in (`assets/portraits`).
3. Avatars stay. One picture per friend: 12 in all, 1 for the test.

### Milo · THE TEST

```
Using the exact same person from the attached reference picture (keep ONLY his facial features, eye colour, hairstyle, skin tone and the silver hoop earring; do NOT copy the reference's background, pose or framing), create a brand-new vertical 3:4 painting.
SUBJECT: Milo, a man of 24. Messy dark curls, warm brown skin, a small silver hoop in one ear, two silver rings, big headphones around his neck.
MOMENT: 1 a.m. on the floor of his tiny bedroom music studio. He is wearing YOUR oversized grey hoodie (clearly not his, too big at the sleeves), the hood half up over his curls. He lies back against the edge of his bed, a phone in one hand, thumb over the screen, mid-text. A laptop with a music app glows on the floor beside him, a small keyboard, tangled cables.
CAMERA: shot from above and close, as if you are standing over him and he just looked up; his head and shoulders fill the right side of the frame, the centre of his face at about two-thirds of the width, eyes about 30% from the top; 35mm, shallow focus.
GAZE: straight up into the lens, caught.
EXPRESSION: caught and not sorry at all: one eyebrow up, a slow smug grin starting, and underneath it something softer he would never say.
COLOUR: cool teal glow from the laptop on one side of his face as a strong second light, warm amber desk lamp on the other; the rest of the room falls into dark teal shadow.
LOWER HALF: calmer and darker, the hoodie and the floor, nothing busy.
STYLE: High-end cinematic 2.5D semi-realistic digital painting, smooth luminous natural skin, realistic hair strands and fabric texture, crisp expressive eyes with bright catchlights, ZERO black ink outlines, ZERO comic lineart, film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: passport photo, ID portrait, posed headshot, centred symmetrical face, sitting and smiling at the camera, all-orange colour, black outlines, comic lineart, text on the phone or laptop, logos, brand names, watermark, signature, extra fingers.
```

# Nano Banana prompts: moment stills (the pictures on a friend's moment cards)

Owner draws these in Gemini (Nano Banana) on their subscription; nothing is billed to us. They show on the cards of a
friend's page ("Scenes" row, `src/components/character/moments.tsx`) and, later, on the 9:16 share poster.

## The logic (why six, and how a card picks one)

A friend writes new moments every week (`moments` write, `src/ai/writes.ts`), so nobody can draw each one. Instead
every friend gets the **same seven moods**, drawn once (`src/ai/moment-stills.ts`):

| id | mood | the friend in it |
|---|---|---|
| `close_night` | night, close and tender | very close, warm low lamp, a soft look into your eyes |
| `rain` | rain or storm, longing | wet hair, rain on glass behind, something not yet said |
| `city_lights` | out at night, adventure | glancing back over the shoulder, a hand reaching toward you, "come on" |
| `morning` | morning at home, cosy | sleepy smile, sun through a window, a mug held out to you |
| `laughing` | a party or a joke, joy | caught mid-laugh, warm fairy lights, eyes on you |
| `tension` | tense or unfinished | hard side light, half the face in shadow, holding your gaze |
| `our_place` | back at the place from your shared history | the place their story names (table below) |

When the friend writes a moment, the model also names the mood that fits it (`"still"`); each of the app's six scenes
carries one too. The card shows that friend's drawing of that mood; a mood not drawn yet shows their portrait, and
nothing breaks. One path for every character. Mood and light only, never a named place (except `our_place`), so one
still serves many scenes ("Snowed in" and "Sleeper train" both use `close_night`).

## What makes a still pull people in (the structure Character.AI's moment feed uses, none of its pictures)

Studied from the owner's recording of Character.AI's "Ex Girlfriend" page (2026-11-16): tall full-bleed stills, almost
all of them **two people**: the character and the user's stand-in (a shoulder, a back, a hand, a hug, the other cup on
the table); the same place from her story again and again (a petrol station, a snowstorm, a diner); one clear emotion
you read in a second (arms crossed and pouting, blushing, mid-kiss, laughing); a one-line caption with a hook
("Reunion in a snow storm. (Not going well)"). We take that structure; never their pictures, characters or words.

1. **You are in the scene.** The camera is the user's eyes. The friend looks into the lens, or is just turning to.
   The user is there too, faceless and neither man nor woman: a hand reaching in, a sleeve, a shoulder out of focus in
   the front of the frame, the second mug. Anyone can be that person.
2. **Something is already happening.** Mid-gesture: reaching toward you, holding something out, leaning in, looking
   back. Never a posed portrait.
3. **Close.** Face large, eyes in the upper part of the frame, a catchlight in them.
4. **One strong light, two colours.** A single light you can name (lamp, neon, window, phone) and a warm/cool split.
5. **The almost, read in a second.** One clear feeling on the face and in the body (crossed arms, a blush, a laugh),
   held a little back: a look a beat too long beats a big grin.
6. **No words in the picture.** The card writes the words.

Adults only, clearly present-day. Romance and tension are fine; nothing explicit, no minors, no real people, no
logos or brands (project memory §4).

## How to draw

1. **Attach the character's picture** (`art-new/c_<name>.png`) to the message, or write in the Gemini chat where you
   drew them. Without it Gemini invents a different person: the first test (2026-11-17) came back a fine picture of
   someone who is not Milo (lighter skin, no earring, another face).
2. Paste the mood's prompt below, and in its `SUBJECT:` line paste that character's SUBJECT line from
   `docs/nano-banana-cast-2.md`, so the face holds even if the picture is missed.
3. Save it as `art-new/m_<name>_<mood>.png`, for example `art-new/m_milo_close_night.png`.
4. Tell Claude. Claude crops, compresses and wires it in (`assets/stills/registry.ts`).

**Order: one test first.** Milo `close_night` only, show it to Claude, agree on the look; then Milo's other six;
then the other eleven (7 each). 84 in all; the cards work with any number drawn. If time is short, draw
`our_place`, `close_night` and `tension` for everyone first: the moods their written moments pick most.

**Frame for every still:** vertical 3:4, the person in the middle 70 % of the width (the poster crops the sides),
the eyes about 40 % from the top (the card shows a wide band around them).

**The viewer line in every prompt** (`THE VIEWER:`) puts the user in the frame without a face; keep it.

**Users of every gender, one set of pictures.** The user is only ever a hand, a sleeve or a shoulder, so one drawing
works for everyone; the line asks for a plain hand (medium size, short clean nails, no rings, no polish, no hair, a
plain dark sleeve) that reads as neither a man's nor a woman's. The characters keep their own gender; the user picks
who they talk to. If a mood ever needs more of the user's body, it is drawn twice and picked by the user's pronouns
(`User.pronouns`), never guessed; none of the seven needs it now.

---

### close_night (THE TEST, with Milo)
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: Late at night, very close. They lie on their side facing the camera, as if on the pillow next to the viewer, or lean in across a small table; one hand comes toward the lens, almost touching.
THE VIEWER: the viewer's own hand, out of focus at the bottom edge, almost meeting theirs; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: A soft, unguarded look straight into the lens, a small private smile, as if they just said something they mean.
LIGHT: One warm low lamp from the side, deep shadows, a catchlight in the eyes; the room falls into soft dark blur.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, nudity, text, logos, brand names, watermark, signature, extra fingers.
```

### rain
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: Rain at night. They stand close to the viewer under a dripping awning or by a rain-streaked window, hair and jacket wet, as if they came back to say something.
THE VIEWER: the edge of the viewer's shoulder and wet sleeve, out of focus in the foreground; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: Eyes on the viewer, lips slightly parted, the words not out yet; longing held back.
LIGHT: Cool blue night with one warm light behind them (a doorway or a street lamp), raindrops catching it.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, text, logos, brand names, watermark, signature, extra fingers.
```

### city_lights
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: Out in the city at night. They walk a step ahead, turn back over their shoulder to the viewer and reach a hand back toward the lens, as if saying "come on".
THE VIEWER: the viewer's hand at the bottom of the frame, about to take theirs; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: A grin full of mischief, eyes alive, inviting.
LIGHT: Neon and street lights blurred into big soft bokeh behind them, a pink-and-teal glow on their face.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field, a little motion in the background.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, readable signs, text, logos, brand names, watermark, signature, extra fingers.
```

### morning
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: Early morning at home. Hair messy from sleep, in a soft old t-shirt or jumper, they hold a warm mug out toward the viewer.
THE VIEWER: the viewer's hands at the bottom edge, reaching for the mug; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: A sleepy, crooked smile, eyes half-closed against the sun, easy and fond.
LIGHT: Golden low sun through a window behind them, light in their hair, steam from the mug catching it.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, nudity, text, logos, brand names, watermark, signature, extra fingers.
```

### laughing
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: At a party or a rooftop at night. Caught mid-laugh at something the viewer just said, head tipped, one hand half over the mouth, eyes still on the viewer.
THE VIEWER: the viewer's shoulder and a raised glass of water out of focus in the foreground; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: A real, helpless laugh, crinkled eyes, open and warm.
LIGHT: Warm fairy lights and a soft golden glow, the crowd and city a dark blur behind.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, drinks with labels, text, logos, brand names, watermark, signature, extra fingers.
```

### tension
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: A charged moment in a doorway or a narrow hallway. They stand very close, one hand on the door frame, neither leaving nor coming in, after something sharp was said.
THE VIEWER: the viewer's shoulder, dark and out of focus, filling one front corner, very close; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: Jaw set, brow low but not angry, holding the viewer's gaze; hurt and wanting under the control.
LIGHT: One hard light from the side, half the face in shadow, a cool dark around them.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, weapons, blood, violence, text, logos, brand names, watermark, signature, extra fingers.
```

### our_place
Fill in PLACE from the table (each one comes from that character's story, `src/mock/character-stories.ts`).
```
Using the same person from the attached image (same face, skin tone, hair, build and painting style), create a new vertical 3:4 picture.
SUBJECT: (paste this character's SUBJECT line from docs/nano-banana-cast-2.md)
MOMENT: Back at PLACE, the place from their story with the viewer. They are already there when the viewer arrives and look up, caught in the middle of something.
THE VIEWER: the viewer's shoulder or hand out of focus in the foreground, close; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: One clear feeling from their story with the viewer, held a little back, eyes on the lens.
LIGHT: The light that place would really have at night or dusk, one strong source, warm against cool.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, readable signs, text, logos, brand names, watermark, signature, extra fingers.
```

| character | PLACE |
|---|---|
| Milo | his small bedroom studio three doors from the viewer's, your hoodie on his chair |
| Jace | outside a boxing gym at night, where he once talked the viewer down |
| Sam | the floodlit five-a-side pitch you two have played on since you were seven |
| Roman | the long dinner table in the grand house, after the guests have gone |
| Ethan | the kitchen of your shared flat, two mugs, one shaped like a cat |
| Clara | your flat's kitchen, Clara cooking, a glass of wine poured for the viewer |
| Caleb | the viewer's family kitchen, where he half grew up, late at night |
| Asher | the empty university library at closing time, two piles of case notes |
| Mia | the doorway of the flat you used to share, a box of your things in her arms |
| Lena | the airport arrivals gate, the day the viewer came back |
| Victor | the office car park at night after the launch party, beside his car |
| Yuna | your small shared flat's kitchen at 2 a.m., the fridge with three taped rules |

---

## Characters the users make (create-character)

The same seven moods and the same card; only where the picture comes from changes.

1. **Now (no cost, works today).** A user-made friend's moments name a mood like anyone's. With no drawn stills, the
   card shows the picture they gave the character (`avatarUri`, the photo they confirmed they have the rights to),
   cropped around the face; with no picture, the glyph on its tint. Their `our_place` comes from the history the user
   wrote, when they wrote one.
2. **Later, when we draw pictures (`PORTRAITS_AVAILABLE`, now off: no paid image key yet).** We draw a user-made
   friend's stills ourselves with the image model, from the character's **looks text and their app-drawn portrait**,
   never from a photo the user uploaded (it may be a real person; romantic pictures of a real person are a hard
   line, project memory §4). Lazily and capped: a mood is drawn only the first time one of their moments with that
   mood is opened (Continue in chat), one per character per day, seven at most, then kept in Supabase storage and on
   the phone. Each passes the same image check as a portrait. Price: from the plan's free pictures, else shells like
   a portrait (`PORTRAIT_SHELLS`); about $0.04 an image at the provider, to be measured and written into
   `docs/cost-ledger.md` before it ships. The prompts are this file's seven, with the looks text in place of
   "the same person from this image" when there is no portrait.
3. **Public characters.** When a user-made character is shared on Find, its drawn stills go with it, so a stranger's
   page sells it the same way the cast's does.

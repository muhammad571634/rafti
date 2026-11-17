# Nano Banana prompts: moment stills (the pictures on a friend's moment cards)

Owner draws these in Gemini (Nano Banana) on their subscription; nothing is billed to us. They show on the cards of a
friend's page ("Scenes" row, `src/components/character/moments.tsx`) and, later, on the 9:16 share poster.

## The logic (why six, and how a card picks one)

A friend writes new moments every week (`moments` write, `src/ai/writes.ts`), so nobody can draw each one. Instead
every friend gets the **same six moods**, drawn once (`src/ai/moment-stills.ts`):

| id | mood | the friend in it |
|---|---|---|
| `close_night` | night, close and tender | very close, warm low lamp, a soft look into your eyes |
| `rain` | rain or storm, longing | wet hair, rain on glass behind, something not yet said |
| `city_lights` | out at night, adventure | glancing back over the shoulder, a hand reaching toward you, "come on" |
| `morning` | morning at home, cosy | sleepy smile, sun through a window, a mug held out to you |
| `laughing` | a party or a joke, joy | caught mid-laugh, warm fairy lights, eyes on you |
| `tension` | tense or unfinished | hard side light, half the face in shadow, holding your gaze |

When the friend writes a moment, the model also names the mood that fits it (`"still"`); each of the app's six scenes
carries one too. The card shows that friend's drawing of that mood; a mood not drawn yet shows their portrait, and
nothing breaks. One path for every character. Mood and light only, never a named place, so one still serves many
scenes ("Snowed in" and "Sleeper train" both use `close_night`).

## What makes a still pull people in (the structure Character.AI's moment feed uses, none of its pictures)

1. **You are in the scene.** The camera is the user's eyes. The friend looks into the lens, or is just turning to.
2. **Something is already happening.** Mid-gesture: reaching toward you, holding something out, leaning in, looking
   back. Never a posed portrait.
3. **Close.** Face large, eyes in the upper part of the frame, a catchlight in them.
4. **One strong light, two colours.** A single light you can name (lamp, neon, window, phone) and a warm/cool split.
5. **The almost.** The feeling sits in the eyes and the mouth, held back: a look a beat too long beats a big grin.
6. **No words in the picture.** The card writes the words.

Adults only, clearly present-day. Romance and tension are fine; nothing explicit, no minors, no real people, no
logos or brands (project memory §4).

## How to draw

1. Open the Gemini chat where you drew the character (or a new chat with `art-new/c_<name>.png` attached), so the
   face stays the same.
2. Paste the mood's prompt below, with the name filled in.
3. Save it as `art-new/m_<name>_<mood>.png`, for example `art-new/m_milo_close_night.png`.
4. Tell Claude. Claude crops, compresses and wires it in (`assets/stills/registry.ts`).

**Order: one test first.** Milo `close_night` only, show it to Claude, agree on the look; then Milo's other five;
then the other eleven (6 each). 72 in all; the cards work with any number drawn.

**Frame for every still:** vertical 3:4, the person in the middle 70 % of the width (the poster crops the sides),
the eyes about 40 % from the top (the card shows a wide band around them).

---

### close_night (THE TEST, with Milo)
```
Using the same person from this image (same face, hair, build and painting style), create a new vertical 3:4 picture.
MOMENT: Late at night, very close. They lie on their side facing the camera, as if on the pillow next to the viewer, or lean in across a small table; one hand comes toward the lens, almost touching.
EXPRESSION: A soft, unguarded look straight into the lens, a small private smile, as if they just said something they mean.
LIGHT: One warm low lamp from the side, deep shadows, a catchlight in the eyes; the room falls into soft dark blur.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, nudity, text, logos, brand names, watermark, signature, extra fingers.
```

### rain
```
Using the same person from this image (same face, hair, build and painting style), create a new vertical 3:4 picture.
MOMENT: Rain at night. They stand close to the viewer under a dripping awning or by a rain-streaked window, hair and jacket wet, as if they came back to say something.
EXPRESSION: Eyes on the viewer, lips slightly parted, the words not out yet; longing held back.
LIGHT: Cool blue night with one warm light behind them (a doorway or a street lamp), raindrops catching it.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, text, logos, brand names, watermark, signature, extra fingers.
```

### city_lights
```
Using the same person from this image (same face, hair, build and painting style), create a new vertical 3:4 picture.
MOMENT: Out in the city at night. They walk a step ahead, turn back over their shoulder to the viewer and reach a hand back toward the lens, as if saying "come on".
EXPRESSION: A grin full of mischief, eyes alive, inviting.
LIGHT: Neon and street lights blurred into big soft bokeh behind them, a pink-and-teal glow on their face.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field, a little motion in the background.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, readable signs, text, logos, brand names, watermark, signature, extra fingers.
```

### morning
```
Using the same person from this image (same face, hair, build and painting style), create a new vertical 3:4 picture.
MOMENT: Early morning at home. Hair messy from sleep, in a soft old t-shirt or jumper, they hold a warm mug out toward the viewer.
EXPRESSION: A sleepy, crooked smile, eyes half-closed against the sun, easy and fond.
LIGHT: Golden low sun through a window behind them, light in their hair, steam from the mug catching it.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, nudity, text, logos, brand names, watermark, signature, extra fingers.
```

### laughing
```
Using the same person from this image (same face, hair, build and painting style), create a new vertical 3:4 picture.
MOMENT: At a party or a rooftop at night. Caught mid-laugh at something the viewer just said, head tipped, one hand half over the mouth, eyes still on the viewer.
EXPRESSION: A real, helpless laugh, crinkled eyes, open and warm.
LIGHT: Warm fairy lights and a soft golden glow, the crowd and city a dark blur behind.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, drinks with labels, text, logos, brand names, watermark, signature, extra fingers.
```

### tension
```
Using the same person from this image (same face, hair, build and painting style), create a new vertical 3:4 picture.
MOMENT: A charged moment in a doorway or a narrow hallway. They stand very close, one hand on the door frame, neither leaving nor coming in, after something sharp was said.
EXPRESSION: Jaw set, brow low but not angry, holding the viewer's gaze; hurt and wanting under the control.
LIGHT: One hard light from the side, half the face in shadow, a cool dark around them.
COMPOSITION: vertical 3:4, the face large and in the middle of the width, the eyes about 40% from the top, the viewer's point of view, 35mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original adult character, not a real person.
AVOID: photorealism, anime, posed portrait, weapons, blood, violence, text, logos, brand names, watermark, signature, extra fingers.
```

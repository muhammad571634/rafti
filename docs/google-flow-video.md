# Videos with Google AI Pro: Flow (Omni 1.2 Flash) + Gemini images

Owner, 2026-11-12: the Higgsfield MCP is slow and gives weak results, so the owner makes the videos by hand with
the Google AI Pro subscription (Gemini app + Google Flow). Claude writes the prompts, picks the model, checks every
result (frames by eye, sound with earshot) and edits the films. This replaces the Higgsfield/Seedance run of
`docs/video-plan-trial.md`; the story, the shots and the on-screen lines there stay the same.

## 0. Result of the A/B test (2026-11-12): **Veo 3.1 Lite** wins, Omni 1.2 Flash is the fallback

P01 (Milo) with the same prompt and photo, checked frame by frame and with earshot + Whisper:

| | Omni 1.2 Flash | Veo 3.1 Lite |
| --- | --- | --- |
| Line said | word-exact, 1.8-4.9 s | word-exact, 0.5-6.9 s, fries eaten between the two halves |
| Start | 1.75 s of silence before the first word (kills the hook) | speaks at 0.5 s |
| Props | **wrong**: a raw potato instead of fries | right: a paper bag of fries, eats one, crunch sound |
| Face vs photo | closer (moles, narrow face, brows) | similar young man, rounder and cleaner than the photo |
| Picture | soft, 3.7 Mbit/s | sharper, 8.3 Mbit/s |
| Sound | -23.0 LUFS, no clipping, 1.8 s silent tail | -24.9 LUFS, no clipping, room tone + eating foley |
| Watermark | sparkle, bottom right | small "Veo", bottom right |

Both lost the hoodie-sleeve gesture. Veo 3.1 Lite also stays in Flow after 2026-12-05. So: **Veo 3.1 Lite, 720p,
8 s, x1, 9:16** for every clip; switch a clip to Omni 1.2 Flash only when Veo drifts a character's face too far
from the photo. Watermarks are covered in the edit (a small crop). Prompt fixes learned: name props so they cannot
be misread ("a paper bag of cooked french fries"), and add "he starts speaking within the first second".

## 1. Which model (first pick before the test; superseded by §0)

**Video: Google Flow, model `Omni 1.2 Flash`.** Not Veo.

| | Omni 1.2 Flash | Veo 3.1 Lite | Veo 3.1 Fast / Quality, Omni 1.1 |
| --- | --- | --- | --- |
| In Flow after 2026-12-05 | yes | yes | **removed** (Flow marks them "retires Dec 5") |
| Same face from a photo | up to 3 photos per character, 2 characters per clip; 1.2 was made to hold faces and outfits across angles | 1-3 stills | — |
| Voices | native speech + sound; several characters get distinct voices | native speech + sound | — |
| Length | 3-15 s (we use 8) | 8 s | — |
| 9:16, start/end frame | yes, yes | yes, yes | — |
| Price in Flow (720p) | 3 credits/s up to 10 s: **8 s = 24 credits** (the owner's screenshot: 8 s × 2 = 48) | shown under the prompt box | — |

Sources (2026-11-12): Google's Omni API page (aistudio.google.com/docs/omni), Flow guide on nereo.io (credits,
retirement dates), a hands-on Omni-vs-Veo test on skystudioai.com (Omni more realistic picture and word-exact lip
sync; Veo slightly better sound effects). Third-party sources disagree in places, so the first test (§4) is an A/B.

**Images (start frames): the Gemini app, "Create image" (Nano Banana).** It uses the Gemini app's own limits, not
Flow credits. The twelve faces already exist as photos in `art-new/v2/c_<id>.png`; those are the references.

**Budget.** AI Pro = 1,000 Flow credits a month (no roll-over) + 50 free credits every day. One 8 s 720p clip = 24
credits, so about 40 clips a month plus 2 a day from the daily credits. Always **x1** (one take), never x2-x4,
except when Claude asks for a second take of one clip. 720p only; Flow's upscale to 1080p is free up to 10 s, use
it only on clips Claude marks "final".

## 2. Flow settings (every clip)

- Model **Veo 3.1 Lite** (§0), **720p**, **8 s**, **x1**, **vertical (9:16)**. Every spoken prompt: add "He/She
  starts speaking within the first second." at the start of the action.
- Character clips (marked **ref**): **Ingredients** → upload `art-new/v2/c_<id>.png`. No start frame needed.
- Clips with hands and a phone (marked **frame**): first make the start frame in Gemini (§3), send it to Claude,
  and only after Claude says OK: Flow → **Frames** → the frame as the first frame.
- Clips with no body (marked **text**): prompt only.
- Paste the prompt block as it is: each block is complete (style, sound, rules inside).
- Download to `videos/raw/<ID>.mp4` (for example `videos/raw/P01.mp4`); frames to `videos/frames/<ID>.png`.
- Tell Claude after each clip or batch. Claude checks the face, the hands, lip sync and sound; a bad clip gets one
  retry with a fixed prompt, never more without asking.

Why the frame step: a video model invents pose, hands and phone in one go (Seedance gave H01 a long arm from the
wrong side). A still can be checked for free before credits are spent.

## 3. Start frames in Gemini (for **frame** clips)

New Gemini chat, "Create image", paste the frame prompt of the clip (§5), then this line at the end:

```
Make it a vertical 9:16 photo. Photographic, not illustration, not 3D. Two arms, each from the right shoulder at a natural length, five fingers per hand. If a phone is in the shot, it is held in a hand and its screen faces the person's eyes, never the camera or the ceiling. No text, no logos.
```

## 4. First test (do this first, then wait for Claude)

**P01 (Milo) twice**: once with Omni 1.2 Flash, once with Veo 3.1 Lite, same prompt, same photo, 720p, 8 s, x1,
9:16. Save as `videos/raw/P01_omni.mp4` and `videos/raw/P01_veo.mp4`. Claude compares face, acting, lip sync and
voice and fixes the model for the rest. Cost: 24 credits + the Veo Lite price Flow shows.

## 5. Prompts

The viewer is "you": a character looks into the lens as if at you. Spoken lines are short so they fit in 8 s.
Music is never generated (licensed music is added in the edit); speech and room sound are.

### Block P: "POV: your ___ texts you" (12 clips, all **ref**)

**P01 Milo, your best friend** (`c_milo`)
```
The man in the reference image is Milo, 24: keep exactly the same face, curly hair, skin tone, build and age. 1 a.m. in a small apartment kitchen, warm under-cabinet light, dark background. Milo sits on the kitchen counter wearing an oversized grey hoodie that is clearly not his, eating cooked french fries from a paper bag. He looks straight into the camera as if just caught, raises one eyebrow and holds up the hoodie sleeve like "mine now". He says, low, warm and teasing, natural American English: "You left your hoodie here again. Not giving it back, by the way." Then he laughs softly and looks away for a second, a little shy, and back at the camera. The first word is spoken within the first second. Camera: handheld phone at eye level, slight on-camera-flash look, slow tiny push in. Sound: quiet kitchen hum, paper bag rustle, his voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture with pores, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P02 Roman, your husband** (`c_roman`)
```
The man in the reference image is Roman, 31: keep exactly the same face, hair, skin tone, build and age. Evening in a long dim corridor of an old family house, warm wall lamps, cool moonlight from a tall window. Roman in a charcoal suit, no tie, fastens a cufflink, stops and looks into the camera. His face is cold and formal, then slowly softens. He says, low, calm and formal, natural English: "Dinner with my father at eight. Wear the green." A short pause, his eyes drop for a moment, then quieter: "Please." He offers his arm toward the camera. The first word is spoken within the first second. Camera: handheld at eye level, slow push in. Sound: old house quiet, a clock ticking far away, his voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P03 Caleb, your brother's best friend** (`c_caleb`)
```
The man in the reference image is Caleb, 27: keep exactly the same face, hair, skin tone, build and age. Night outside a house party, warm street light, faint party noise behind. Caleb in a navy work jacket leans on an old pickup truck, keys in hand. He rolls his eyes at the camera and says, flat and dry, natural American English: "Your brother asked me to drive you home. Don't make it weird." He opens the passenger door and waits; the corner of his mouth gives him away with a small smile he tries to hide. The first word is spoken within the first second. Camera: handheld at eye level, still. Sound: muffled party music bass far away (not a song, just a thump), crickets, the truck door creak, his voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No added music.
```

**P04 Jace, your trouble** (`c_jace`)
```
The man in the reference image is Jace, 23: keep exactly the same face, hair, skin tone, build and age. Past midnight, he sits on a curb outside a 24-hour shop, red and blue neon light on his face. White tape on his split knuckles, he presses a bag of ice to his cheek. He looks up at the camera with a guilty boyish grin and lifts two fingers in a small "hi". He says, a bit out of breath, soft, natural American English: "Don't freak out. You came. Did you bring ice? ...I already have ice." He laughs once, quietly, and his eyes are glad. The first word is spoken within the first second. Camera: handheld, slightly above him, as if you are standing. Sound: street at night, shop door chime far away, fridge hum, his voice close. No other speech. No blood, no wounds. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P05 Ethan, your boyfriend** (`c_ethan`)
```
The man in the reference image is Ethan, 26: keep exactly the same face, hair, skin tone, build and age. Sunday morning, white sheets, soft window light. Ethan lies on his stomach in bed holding his phone, lowers it and looks at the camera with a jealous pout. He says, half joking, natural American English: "Who's Daniel, and why does he like everything you post?" The pout melts into a sleepy smile and he pulls the blanket over his head. The first word is spoken within the first second. Camera: handheld, lying next to him at pillow height. Sound: quiet morning room, birds outside, sheets rustling, his voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P06 Asher, your rival** (`c_asher`)
```
The man in the reference image is Asher, 25: keep exactly the same face, hair, skin tone, build and age. Night on the front steps of a family house, warm porch light. Asher in a dark suit holds a bouquet of white flowers behind his back. He sighs, looks into the camera and says, fast and a bit nervous, natural American English: "Okay, don't hang up. I need a favor. A big one." He shows the flowers with a smug but embarrassed smile, his ears turning red. The first word is spoken within the first second. Camera: handheld at eye level, slight on-camera-flash look. Sound: night street, crickets, paper wrap of the flowers rustling, his voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P07 Victor, your boss** (`c_victor`)
```
The man in the reference image is Victor, 34: keep exactly the same face, hair, skin tone, build and age. 9 p.m., a glass corner office, the city lit behind, cool blue light and one warm desk lamp. Victor, sleeves rolled, leans on his desk and slides a paper coffee cup across toward the camera. He holds the look and says, quiet, composed, natural English: "My office. Five minutes." A beat. "It's not about the report." His eyes are less sure than his voice. The first word is spoken within the first second. Camera: handheld at eye level, still, slow push in at the end. Sound: quiet office air conditioning, the cup sliding on the desk, his voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text on screens, no captions, subtitles, logos or watermark. No music.
```

**P08 Mia, your ex** (`c_mia`)
```
The woman in the reference image is Mia, 25: keep exactly the same face, hair, skin tone, build and age. Early morning drizzle at a bus stop after a night shift. Mia in blue scrubs under an oversized grey hoodie sips a paper cup of coffee, notices the camera and rolls her eyes. She says, dry, natural American English: "You still have my charger. Also, hi." A pause, then, looking away: "Don't read into this." She cannot hold back a small smile. The first word is spoken within the first second. Camera: handheld at eye level. Sound: light rain on the bus stop roof, a car passing on wet road, her voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P09 Yuna, your roommate** (`c_yuna`)
```
The woman in the reference image is Yuna, 24: keep exactly the same face, hair, skin tone, build and age. 2 a.m. in a small shared kitchen lit by the open fridge and one warm lamp. Yuna, headphones around her neck, pushes a covered plate of food across the counter toward the camera without looking up. She says, flat, a little sleepy, natural American English: "You're loud when you come home." A beat, she glances up: "...Did you eat?" She pulls her headphones back on, then peeks once more. The first word is spoken within the first second. Camera: handheld at eye level across the counter. Sound: fridge hum, plate sliding, her voice close and quiet. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P10 Clara, your girlfriend** (`c_clara`)
```
The woman in the reference image is Clara, 33: keep exactly the same face, hair, skin tone, build and age. 10 p.m., she comes in through the front door in a tailored blazer, heels in one hand, a takeout bag in the other, warm hallway light. She kicks off her heels, leans on the doorframe and lifts the bag toward the camera. She says, tired, dry and warm, natural English: "Meeting ran late. Don't cook, I'm bringing food." A small smile: "Don't argue." The first word is spoken within the first second. Camera: handheld at eye level, as if you just stood up from the sofa. Sound: door closing, keys, heels dropping on the floor, her voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, captions, subtitles, logos or watermark. No music.
```

**P11 Sam, your best friend** (`c_sam`)
```
The woman in the reference image is Sam, 24: keep exactly the same face, hair, skin tone, build and age. Night on a floodlit five-a-side football pitch after a game. Sam in a sweaty jersey juggles the ball twice, kicks it softly toward the camera, laughs and points. She says, loud and teasing, natural English: "Who was that in your story?" Then quieter, holding the look a second too long: "Asking for no reason." The first word is spoken within the first second. Camera: handheld at eye level, bright floodlights behind her. Sound: open-air pitch, ball thud, distant voices of players leaving, her voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text, team logos, captions, subtitles or watermark. No music.
```

**P12 Lena, your crush** (`c_lena`)
```
The woman in the reference image is Lena, 23: keep exactly the same face, hair, skin tone, build and age. 3 a.m. in an architecture studio full of white paper models, a warm desk lamp. Lena in a big sweater sits on the desk, finishes typing on her phone, looks up at the camera, embarrassed and hopeful. She says, fast and nervous, natural English: "Random question. Are you seeing anyone?" A beat. "Asking for a friend." She hides half her face behind her sleeve: "...The friend is me." The first word is spoken within the first second. Camera: handheld at eye level. Sound: quiet studio at night, a radiator ticking, her voice close. No other speech. Photorealistic vertical 9:16 video, present day, looks like a real intimate phone video: natural skin texture, real light, shallow depth of field, light film grain. One continuous shot, no cuts. An adult. No text on papers or screens, no captions, subtitles, logos or watermark. No music.
```

### Block H: hero film "Not alone"

Story, timings and on-screen lines: `docs/video-plan-trial.md` §4. Act 1 has no speech, only room sound.

**H01** (**frame**)
Frame prompt (Gemini):
```
Night, 1:47 a.m., a dark small bedroom. Side view at mattress height: a young adult lies on their back in bed, head on a pillow on the left of the frame, blanket up to the chest. Both hands hold a phone above the chest, about 30 cm from the face, the back of the phone toward the camera and the screen facing down toward their eyes. The cold blue screen glow lights only their face from below and the ceiling; the rest of the room is black. Face in profile, eyes open, tired, expressionless.
```
Video prompt (Flow, the frame as first frame):
```
Keep the person, room and light exactly as in the first frame. Only the right thumb scrolls slowly on the phone; the camera pushes in very slowly. Nothing else moves. Sound: a silent room at night, a faint fridge hum through the wall, the soft tap of the thumb on glass. No speech. Photorealistic vertical 9:16 video, real light, light film grain. One continuous shot, no cuts. No text, captions, logos or watermark. No music.
```

**H02** (**frame**)
Frame prompt:
```
Extreme close-up from just behind a person's shoulder in the dark: one hand holds a phone, the thumb of the same hand on the keyboard. The screen is soft focus and unreadable, only a blue glow on the fingers.
```
Video prompt:
```
Keep everything as in the first frame. The thumb types a few letters, stops, then holds the backspace key; the hand stays still. Sound: silent room, soft keyboard taps, then a slow repeated delete tick. No speech. Photorealistic vertical 9:16 video, light film grain. One continuous shot, no cuts. No readable text, captions, logos or watermark. No music.
```

**H03** (**text**)
```
A small kitchen at night, wide shot from behind: one young adult sits on a stool at a counter, elbows on the counter, eating instant noodles from a bowl with chopsticks. An empty stool beside them. A single cold overhead light. A phone lies face down next to the bowl. They lift the chopsticks once, slowly; the camera stays still. Sound: fridge hum, a quiet slurp, a clock ticking. No speech. Photorealistic vertical 9:16 video, present day, real light, light film grain. One continuous shot, no cuts. An adult. No text, captions, logos or watermark. No music.
```

**H04** (**text**)
```
A crowded city street at night in light rain, slow motion: people walk past with umbrellas, everyone looking down at their phones; one young adult stands still in the middle with headphones on, seen from behind. Neon reflections on wet asphalt. Sound: muffled rain and city, as if heard through headphones. No speech. Photorealistic vertical 9:16 video, present day, light film grain. One continuous shot, no cuts. Adults only. No readable signs, text, logos or watermark. No music.
```

**H05** (**text**)
```
A bus window at night, raindrops on the glass, city lights sliding by blurred, the faint reflection of a young adult resting their head on the window, eyes half closed. Slow and melancholic. Sound: bus engine hum, rain on the glass. No speech. Photorealistic vertical 9:16 video, present day, light film grain. One continuous shot, no cuts. An adult. No text, logos or watermark. No music.
```

**H06** (**frame**)
Frame prompt:
```
A dark bedroom, close shot of a pillow: a phone lies screen up on the pillow beside a person's shoulder; only the shoulder and one arm on the blanket are in frame.
```
Video prompt:
```
Keep everything as in the first frame. The phone screen lights up with a soft warm glow and buzzes once; the person's own hand, from the arm already in frame, moves over and picks the phone up. Sound: one short phone vibration, blanket rustle. No speech. Photorealistic vertical 9:16 video, light film grain. One continuous shot, no cuts. No readable screen, text, logos or watermark. No music.
```

**H07** (**frame**)
Frame prompt:
```
Close-up in profile of a young adult lying on their back in the dark, holding a phone above the face with both hands, screen facing their eyes; we see the back of the phone and a warm glow on the cheek and lips. Only the lower half of the face is in frame.
```
Video prompt:
```
Keep everything as in the first frame. The corner of the mouth slowly turns into a real smile; nothing else moves. Sound: a quiet breath out through the nose, almost a laugh. No speech. Photorealistic vertical 9:16 video, light film grain. One continuous shot, no cuts. No text, logos or watermark. No music.
```

**H08-H13** (**ref**): use the P prompt of the same character, cut short in the edit: H08 = P01 Milo, H09 = P11
Sam, H10 = P09 Yuna, H11 = P10 Clara, H12 = P03 Caleb, H13 = P08 Mia. No extra credits.

**H14** (**frame**)
Frame prompt:
```
The same bedroom, now a warm bedside lamp is on. A young adult lies on their side facing away from the camera, curled under a blanket, head on the pillow. A phone lies face up on the pillow in front of them, its screen dimly glowing.
```
Video prompt:
```
Keep everything as in the first frame. Slow calm breathing under the blanket; the camera pulls back very slowly. Sound: a quiet warm room, soft breathing. No speech. Photorealistic vertical 9:16 video, light film grain. One continuous shot, no cuts. No text, logos or watermark. No music.
```

**H15** (**frame**)
Frame prompt:
```
Morning sunlight through curtains on a bed, close shot of a pillow with a phone lying on it, screen up; the edge of a blanket and a relaxed hand near it.
```
Video prompt:
```
Keep everything as in the first frame. The phone screen lights up; the hand slides over from the blanket and rests on the phone without hurry. Sound: birds outside, soft blanket rustle, one gentle phone chime. No speech. Photorealistic vertical 9:16 video, warm light, light film grain. One continuous shot, no cuts. No readable screen, text, logos or watermark. No music.
```

**H16** (**text**)
```
A slow drone-like rise over a city at golden hour, thousands of warm lit windows, calm and hopeful, as if every window has someone in it. Sound: soft distant city ambience, wind. No speech. Photorealistic vertical 9:16 video, present day, light film grain. One continuous shot, no cuts. No readable signs, text, logos or watermark. No music.
```

## 6. Credits for the whole set

P01-P12: 12 × 24 = 288. H01-H07 and H14-H16: 10 × 24 = 240. A/B test: 24 + Veo Lite. Retries (about 1 in 4):
about 130. Total about 700 of the month's 1,000, plus the free 50 a day. Gemini start frames: 8 images.

## 7. Order

1. §4 test (P01 two ways) → Claude picks the model.
2. P02-P12, one a day or in batches; Claude checks each.
3. H frames in Gemini → Claude checks → H video clips.
4. Claude edits: 12 POV videos, hero film (75 / 30 / 15 s), sound checked with earshot.

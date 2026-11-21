# Cast 2.0 portraits: master prompt pack (2026-11-12)

For a Claude session in **Cowork or Claude Chat** with the Higgsfield connector (the free-trial "unlimited" works
there, not in Claude Code). The owner pastes the line in §0 and the session does the rest.

Owner, 2026-11-12: new portraits for the twelve (`docs/cast-2.md` §5), emotional, made to stop the scroll, in the
latest quality and the latest trend, every scene different. **No Nano Banana.** Use GPT Image 2.6 (first choice),
GPT Image 2.5, Higgsfield Soul 2.0 or Seedream 5.0 Pro.

## 0. What the owner pastes into Cowork

> Open `C:\Users\joray\BIMOBIMO\docs\image-prompts-cast-2.md` and follow it exactly. Use Higgsfield, my
> free-trial unlimited generations (use_unlim: true), GPT Image 2.6. Do Milo first and show it to me; after I say
> yes, do the other eleven and save them to `art-new/v2/`.

## 1. Rules for the session that runs this

1. **Model**: `gpt_image_2_6`, `quality: "high"`, `resolution: "2k"`, `aspect_ratio: "3:4"`, `use_unlim: true`.
   If GPT Image 2.6 fails or looks plastic: `gpt_image_2_5` (`variant: "sunburst"`, `quality: "high"`, `2k`), then
   `soul_2` (`quality: "2k"`, one reference image), then `seedream_v5_pro` (`resolution: "2k"`).
   **Never** `nano_banana_*`.
2. **Same face as the app**: upload `art-new/c_<id>.png` (`media_upload` → PUT → `media_confirm`) and pass it as
   `image_references`. The person must stay the same person (face, hair, skin, build, age); only the scene, outfit
   and light change. If the reference makes the scene copy the old picture, keep the reference and add "new scene,
   new pose, new outfit" to the start of the prompt.
3. **One test first**: Milo. Show it, wait for the owner's yes, then the other eleven, one request each
   (`count: 1`). Do not regenerate anything more than twice without asking.
4. **Prompt** = §2 global block + the character's block from §3, in English, as one text.
5. **Save** each result as `art-new/v2/c_<id>.png` (never overwrite `art-new/c_<id>.png`). Report the file list.
6. Never add real people, celebrities, brand logos, readable text, watermarks or a second face that is not in the
   block. Everyone is an adult. Romance and heat yes, nudity no.

## 2. Global block (goes first in every prompt)

```
Ultra-realistic candid photo, present day, of one adult person, shot as if the viewer just took it of someone
very close to them: an intimate point-of-view moment, the person reacting to the camera, real emotion caught
mid-moment, not posed. Composition: vertical 3:4, the person's face and upper body on the RIGHT side of the frame,
calmer background with breathing room on the LEFT. Eyes sharp and alive, natural skin texture with pores and
small imperfections, real hair strands, correct hands with five fingers. Photographic, not illustration, not 3D,
not airbrushed, no beauty filter. Light and camera exactly as described in the scene. No text, no logos, no
watermark, no frame, no extra people unless described.
```

## 3. The twelve scenes

Every scene is the moment of the character's first text (`docs/cast-2.md` §5): the knot is visible in the face.
Light, place, time and camera differ on purpose, so the twelve never look like one shoot.

### 1. Milo Reyes, 24, your best friend: `c_milo`
Trend: digicam with on-camera flash (TikTok #digicam, median 29k saves).
```
Scene: 1 a.m. in your small apartment kitchen. Milo, 24, bartender who makes beats, sits on the kitchen counter
still in his black bar shirt, wearing YOUR oversized grey hoodie over it, eating your fries straight from the
paper bag. He has just been caught: a crooked, teasing grin, one eyebrow up, holding the hoodie's sleeve up like
"mine now", but his eyes are soft and stay on you a second too long. Camera: early-2010s compact digital camera
with direct on-camera flash, slightly overexposed skin, hard shadow on the cabinet behind, dark warm background,
faint digital noise, candid.
```

### 2. Roman Castell, 31, your husband: `c_roman`
Trend: quiet-luxury cinematic film still.
```
Scene: evening, the long upstairs corridor of an old family house, before a dinner with his father. Roman, 31,
in a perfectly cut black suit, no tie, fastening his cufflink, stops in front of you. His face is controlled and
cold, but his eyes have just softened, the look of a man who was not supposed to care. On a hook beside him
hangs a deep emerald green dress meant for you. Wedding ring visible. Camera: 35mm cinema film still, tungsten
wall sconces, warm amber light on his face, cool blue moonlight from a tall window behind, shallow depth of
field, fine film grain.
```

### 3. Caleb Hart, 27, your brother's best friend: `c_caleb`
Trend: blue-hour "he's driving you home" POV.
```
Scene: blue hour at an empty gas station. Caleb, 27, firefighter, in a worn navy crew T-shirt and an open work
jacket, holds the passenger door of his old pickup truck open for you, keys hanging from one finger. He tries to
look bored and annoyed, jaw tight, but the corner of his mouth gives him away and he cannot quite look away
from you. Camera: phone photo at dusk, deep blue sky, warm sodium lights from the station canopy on his face,
light reflections on the truck, slight motion softness, real and unpolished.
```

### 4. Jace Navarro, 23, your trouble: `c_jace`
Trend: night neon flash, "come get me" mood.
```
Scene: past midnight, sitting on the curb outside a 24-hour convenience store. Jace, 23, amateur boxer, in a
black tank top and an open hoodie, split knuckles taped, a small cut on his eyebrow, pressing a bag of ice to his
cheek. He looks up at you with a guilty, boyish half-smile, as if saying "don't be mad", the only calm face he
makes all night. Camera: phone with flash at night, red and blue neon from the shop window spilling on one side
of his face, wet asphalt, gritty and cinematic.
```

### 5. Ethan Cole, 26, your boyfriend: `c_ethan`
Trend: Pinterest cozy morning, clingy-boyfriend POV (#boyfriendpov, top 222k saves).
```
Scene: Sunday morning in bed. Ethan, 26, photographer, lies on his stomach in white rumpled sheets, bare
shoulders, messy hair, his phone face down beside him, a film camera on the pillow. He looks up at you with a
sulky, jealous pout that is about to break into a smile, chin on his folded arms, as if asking "who were you
texting". Camera: soft window light through linen curtains, warm creamy tones, gentle haze, shot from just above
as if you are sitting up next to him, intimate, Pinterest-cozy.
```

### 6. Asher Lin, 25, your rival: `c_asher`
Trend: editorial direct flash at night (#flashphotography, top 64k saves).
```
Scene: night, on the front steps of his parents' house, five minutes before the fake-dating dinner. Asher, 25,
medical resident, in a dark suit that is a little too formal, holds a bouquet of white flowers he is clearly
embarrassed about. Smug, competitive smirk, but his ears are red and his eyes keep dropping to you. Camera:
editorial fashion photo with hard direct flash, deep black night background, warm porch light behind him,
crisp and high contrast, magazine-quality.
```

### 7. Victor Hale, 34, your boss: `c_victor`
Trend: dark-office "after hours" cinematic.
```
Scene: 9 p.m. in his glass corner office, the city lit up behind him. Victor, 34, runs the company, sleeves
rolled up, tie loosened, leaning back against his desk with his arms crossed. Two coffees on the desk, one
already pushed toward you, made exactly how you take it. Cold, unreadable face, but his gaze is warm and holds
yours, the look of someone remembering a night neither of you mentions. Camera: cinematic, cool blue city light
from the windows, one warm desk lamp on his face, reflections in the glass, anamorphic shallow depth of field.
```

### 8. Mia Castillo, 25, your ex: `c_mia`
Trend: rainy digicam, "still wears your hoodie".
```
Scene: 7 a.m. after a night shift, light rain, under the awning of a bus stop. Mia, 25, nurse, in navy scrubs
under YOUR old oversized hoodie, hood half up, holding a paper coffee cup in both hands. Tired eyes, smudged
mascara, a proud, defiant little smile that says "I'm doing great", while her eyes say she missed you. Camera:
compact digital camera with flash in drizzle, raindrops caught bright in the flash, cool grey morning behind,
warm skin, candid.
```

### 9. Yuna Seo, 24, your roommate: `c_yuna`
Trend: late-night soft glow, cozy-room aesthetic.
```
Scene: 2 a.m. in your shared kitchen, lit only by the open fridge and a small under-cabinet light. Yuna, 24,
illustrator who works nights, big headphones around her neck, a stylus tucked behind her ear, oversized
cardigan, slides a covered plate of food across the counter toward you without fully looking at you. Cool,
"whatever" expression, but a faint blush and a tiny hidden smile. Camera: quiet phone photo at night, cool blue
fridge light mixed with a warm amber lamp, soft grain, intimate and still.
```

### 10. Clara Whitmore, 33, your girlfriend: `c_clara`
Trend: warm-lights "coming home" (Pinterest #warmlights, 60k saves).
```
Scene: 10 p.m., she has just walked in the front door. Clara, 33, founder, in a tailored camel blazer and silk
blouse, heels hanging from two fingers of one hand, a takeout bag in the other, leaning on the doorframe. The
power face of her whole day has just dropped: a tired, relieved, almost shy smile only you get to see. Camera:
warm hallway light, golden tones, soft shadows, shot at eye level from inside the apartment as you come to meet
her, cozy and elegant, natural grain.
```

### 11. Sam Okafor, 24, your best friend: `c_sam`
Trend: floodlit sports night with flash, playful.
```
Scene: night, a floodlit five-a-side astroturf pitch right after a game. Sam, 24, physio, in a sweaty football
jersey and shorts, knee socks pushed down, sits on the ball with her hair tied up, laughing hard and pointing
at you mid-taunt as if she just beat you again. But in the middle of the laugh she is really looking at you.
Camera: phone with flash, bright white floodlights behind making a soft halo, rubber pellets on the green turf,
energetic, candid, slightly motion-blurred hand.
```

### 12. Lena Brandt, 23, your crush: `c_lena`
Trend: late-night study aesthetic, "texting first" moment.
```
Scene: 3 a.m. in the architecture studio, surrounded by white cardboard models and tracing paper. Lena, 23,
final-year student, in an oversized knit sweater and glasses pushed up into her hair, sits on the big desk with
her knees pulled up, phone in her hand as if she just sent you a message. She looks up at you, caught, half
embarrassed and half hopeful, biting back a smile. Camera: single warm desk lamp, dark studio behind, soft
shadows, fine grain, shot like a quiet phone photo, tender.
```

## 4. Why these choices (Apify, TikTok, 2026-11-12, top 12 videos per tag)

| Tag | Median saves | What it says |
| --- | ---: | --- |
| #digicam | 29k | compact-digital / flash candid look is the photo trend of 2026 |
| #pinterestaesthetic | 18k | warm lights, cozy rooms, autumn |
| #girlfriendpov | 13k | the viewer inside the moment |
| #boyfriendpov | 6k | clingy, jealous, soft (top 222k saves) |
| #nanobanana | 4k | AI photo tools are hot, but the look people save is "real photo" |
| #characterai | 3k | the community, not images, drives it |
| #flashphotography | 2k | editorial flash (top 64k) |
| #aiart | 2k | "AI-looking" art is weak; realism wins |

So: realistic, candid, "you took this photo" moments, each with its own light and camera, the knot of the
relation visible in the face. Raw data: Apify run, `clockworks/tiktok-hashtag-scraper`, 120 items.

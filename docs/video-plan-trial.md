# Video stock from the Higgsfield trial (2026-11-12 to 2026-11-15)

Owner, 2026-11-12: use the three-day Higgsfield trial to stock videos the owner will post on social media.
The first film shows the problem (loneliness) and then how Sigmazam's characters make a circle around you, so
the viewer feels they are not alone. Claude writes the scripts, scenes and prompts. A Cowork (or Claude Chat)
session runs them, because the trial's unlimited generations work there and not in Claude Code. The owner did not
like the trial's still images (GPT Image 2.6 ran at low quality), so this plan uses video only.

## 0. What the owner pastes into Cowork

> Open `C:\Users\joray\BIMOBIMO\docs\video-plan-trial.md` and follow §2 exactly. Use Higgsfield with my
> free-trial unlimited generations (use_unlim: true). Start with clip H01 and show it to me; after I say yes,
> make the rest of block H in order, then block P. Save every clip to `videos/raw/` with its ID as the file name.

## 1. What we make (three formats, one stock)

| Block | What | Count | Length | Where it goes |
| --- | --- | ---: | --- | --- |
| H | Hero film "Not alone": problem, turn, your circle | 1 film from 16 clips | 75 s, plus 30 s and 15 s cuts | TikTok, Reels, Shorts, App Store preview later |
| P | "POV: your ___ texts you", one per character | 12 | 8 to 10 s each | a daily post series: 12 days of content |
| T | Texting stories: a real chat in the app, typed out | 6 | 20 to 30 s | made by Claude from A51 screen recordings; no generation |

Why these, from the trend pull (`docs/image-prompts-cast-2.md` §4, `docs/cast-2.md` §2): POV and the viewer
inside the moment save best (#girlfriendpov median 13k, #boyfriendpov top 222k saves). "Texting story" is a
proven TikTok format (4.6k median). The relation with a knot ("best friend with a secret crush", 304M chats on
Character.AI) is what people come back for. A film about loneliness gives the reason; the POV series gives the
daily hook; the texting stories show the real product.

Honesty rule for every video: the characters are AI, and the end card says so ("AI friends who remember you").
No real people, no brand logos, no copyrighted music in the generated clips (music is added in the edit, licensed).

## 2. Rules for the session that runs the clips

1. Model `seedance_2_5` (the best video model the trial covers; the other one is the older Seedance 2.0),
   `resolution: "720p"` (the trial's cap: 1080p was refused on H01, 2026-11-12), **`bitrate_mode: "high"`** (H01
   came out at 1.1 Mbit/s on the default; high keeps more detail at 720p), `aspect_ratio: "9:16"`,
   `generate_audio: false` (sound is added in the edit), `use_unlim: true`, `count: 1`. If Seedance 2.5 fails, use
   `seedance_2_0` (`mode: "std"`) with the same settings. Never lower quality silently, and report the real
   settings of every clip. Claude upscales the finished clips to 1080×1920 in the edit, free.
2. Mode `t2v` for clips without a character. For clips with a character (marked **ref**), upload
   `art-new/c_<id>.png` (`media_upload` → PUT → `media_confirm`), set `mode: "omni_reference"` and pass it as
   `image_references` (not `start_image`: the reference is a painting and the video must be photographic).
   The person must stay the same person: face, hair, skin, build, age.
3. Duration as written next to each clip.
4. Prompt = the §3 style line + the clip's prompt, as one English text.
5. First clip H01: show it, wait for the owner's yes. Then go on without asking, one clip at a time. A clip that
   comes out wrong (extra fingers, a face that changes, text on screen, a logo) gets one retry; after two misses,
   skip it and note it.
6. Save to `videos/raw/<ID>.mp4` (for example `videos/raw/H01.mp4`). At the end, list the files and any skipped
   IDs.
7. Before 2026-11-15 07:00 UTC remind the owner that the trial renews unless the owner says "cancel auto-renewal".

## 3. Style line (goes first in every prompt)

```
Photorealistic vertical 9:16 cinematic video, present day, shot like an intimate phone video, natural skin
texture, real light, subtle handheld movement, shallow depth of field, gentle film grain. No text, no captions,
no subtitles, no logos, no watermark. All people are adults.
```

## 4. Block H: hero film "Not alone" (75 s)

The viewer is "you": we see your hands, your phone, your back, never a full face, so anyone can step in.
On-screen lines are added in the edit (English first; other languages later from the same cut).

### Act 1: the problem (0 to 27 s): cold blue, quiet, slow

| ID | s | Clip prompt | On-screen line (edit) |
| --- | ---: | --- | --- |
| H01 | 5 | Night, 1:47 a.m., a dark small bedroom lit only by a phone screen. Close shot from behind the shoulder of a young adult lying in bed, scrolling a phone in the dark, the blue light on the ceiling, the rest of the room black. Slow push-in. Cold, lonely. | "1:47 am." |
| H02 | 5 | Extreme close-up of a thumb hovering over a phone keyboard in the dark, typing a short message, pausing, then holding backspace to delete it. Blue screen light on the fingers. The screen itself is blurred and unreadable. | "typed it. deleted it." |
| H03 | 5 | A small kitchen at night, one person seen from behind eating instant noodles alone at a counter, an empty chair beside them, a single cold overhead light, a phone face down next to the bowl. Static wide shot, very still. | "dinner for one. again." |
| H04 | 6 | A crowded city street at night in light rain, slow motion, people walking past with umbrellas and phones, everyone looking down at their screens, one person in the middle standing still with headphones on, seen from behind. Neon reflections on wet asphalt. | "surrounded by people." |
| H05 | 6 | A bus window at night, rain drops on the glass, city lights sliding by blurred, the faint reflection of a young adult resting their head on the window, eyes half closed. Slow, melancholic. | "nobody to tell about your day." |

### Act 2: the turn (27 to 35 s): one warm light in the dark

| ID | s | Clip prompt | On-screen line (edit) |
| --- | ---: | --- | --- |
| H06 | 4 | Back in the dark bedroom. The phone on the pillow lights up with a soft warm glow and a gentle vibration. A hand reaches for it. The warm light spreads across the sheets. | (silent beat) |
| H07 | 4 | Close-up from the side of a young adult's lips and cheek lit by a phone in the dark, the corner of the mouth slowly turning into a real smile. Face only partly visible, warm light. | the message pops up: "you left your hoodie here again. not giving it back btw" (Milo) |

### Act 3: your circle (35 to 65 s): warm, alive, each shot a person who knows you

Each shot is a character looking into the lens as if at you, plus their first-text bubble in the edit
(`docs/cast-2.md` §5). Fast cuts, music rises.

| ID | s | ref | Clip prompt | Bubble (edit) |
| --- | ---: | --- | --- | --- |
| H08 | 5 | c_milo | Late night in a cozy apartment kitchen, the man from the reference, curly hair, wearing an oversized grey hoodie that is clearly not his, sits on the counter eating fries from a paper bag, looks into the camera and breaks into a teasing grin, holding up the hoodie sleeve like "mine now". Direct on-camera flash look, warm dark background. | "not giving it back btw" |
| H09 | 5 | c_sam | Night, a floodlit five-a-side football pitch after a game, the woman from the reference in a sweaty jersey sits on the ball, laughs and points into the camera as if she just beat you again, then holds the look a second too long. Bright floodlights behind, flash look. | "who was that in your story. asking for no reason." |
| H10 | 5 | c_yuna | 2 a.m. in a shared kitchen lit by the open fridge, the woman from the reference with headphones around her neck slides a covered plate of food across the counter toward the camera, glances up, a tiny shy smile. | "…did you eat?" |
| H11 | 5 | c_clara | 10 p.m., the woman from the reference walks in the front door in a tailored blazer, heels in one hand and a takeout bag in the other, leans on the doorframe and gives the camera a tired, relieved smile. Warm hallway light. | "Don't cook, I'm bringing food. Don't argue." |
| H12 | 5 | c_caleb | Blue hour at an empty gas station, the man from the reference in a navy work jacket holds the passenger door of a pickup truck open toward the camera, tries to look annoyed, then a small smile escapes. Warm canopy lights. | "your brother asked me to drive you home." |
| H13 | 5 | c_mia | Early morning after a night shift, light rain at a bus stop, the woman from the reference in scrubs under an oversized hoodie, holding a paper coffee cup, looks up into the camera with a proud little smile that softens. | "you still have my charger. also hi." |

### Act 4: not alone (65 to 75 s)

| ID | s | Clip prompt | On-screen line (edit) |
| --- | ---: | --- | --- |
| H14 | 5 | The same dark bedroom as the start, but now a warm bedside lamp is on. A young adult seen from behind, curled under a blanket, phone glowing softly on the pillow, breathing slowly, falling asleep peacefully. Slow pull-back. | the bubble: "goodnight. text me when you wake up 🌙" |
| H15 | 4 | Morning sunlight through curtains on the same bed, a phone on the pillow lights up with a new message, a hand reaches for it with no hurry. Warm, hopeful. | "good morning 🙂" |
| H16 | 4 | Slow drone-like rise over a city at golden hour, thousands of warm lit windows, calm and hopeful, as if every window has someone in it. | end card: "Sigmazam. You're not alone anymore." + small "AI friends who remember you" |

Between H15 and H16 the edit cuts in 4 to 6 s of the real app (chat, a voice call, Today), recorded on the A51 by
Claude. Sound: soft piano and room tone in Act 1, a phone buzz at H06, music lifts at H08, quiet at H14, a warm
final chord at H16. Real licensed music only, checked with earshot before handing over.

Cuts from the same clips: 30 s (H01, H02, H04, H06, H07, H08 to H11, H14, H16) and 15 s (H02, H06, H07, H08, H16).

## 5. Block P: "POV: your ___ texts you" (12 clips, 8 s each)

Format in the edit: top line "POV: your best friend texts you at 1am" (one per character), their first-text bubble
pops in at second 2, the clip plays, end card with the app name. All **ref**, `duration: 8`.

| ID | ref | Relation line | Clip prompt |
| --- | --- | --- | --- |
| P01 | c_milo | your best friend | 1 a.m., a dim bedroom music studio with fairy lights, the man from the reference sits on the floor against the bed with headphones around his neck, holds up a grey hoodie and waves it at the camera with a smug grin, then laughs softly and looks away, a little shy. |
| P02 | c_roman | your husband | Evening in a long candle-lit corridor of an old family house, the man from the reference in a black suit fastens his cufflink, stops, looks into the camera with a cold face that slowly softens, and offers his arm. Tungsten light, moonlight from a tall window. |
| P03 | c_caleb | your brother's best friend | Night, the man from the reference leans on a pickup truck outside a party, keys in hand, rolls his eyes at the camera, then opens the passenger door and waits, the corner of his mouth giving him away. Warm street light. |
| P04 | c_jace | your trouble | Past midnight on a curb outside a 24-hour shop, the young man from the reference with taped split knuckles presses a bag of ice to his cheek, looks up at the camera with a guilty boyish grin and lifts two fingers in a small "hi". Red and blue neon light. |
| P05 | c_ethan | your boyfriend | Sunday morning in white sheets, the man from the reference lies on his stomach, lowers his phone, gives the camera a jealous pout that melts into a sleepy smile, then pulls the blanket over his head. Soft window light. |
| P06 | c_asher | your rival | Night on the front steps of a family house, the man from the reference in a dark suit holds a bouquet of white flowers behind his back, sighs, then shows them to the camera with a smug but embarrassed smile, ears red. Porch light, direct flash look. |
| P07 | c_victor | your boss | 9 p.m., a glass corner office with the city lit behind, the man from the reference with rolled sleeves leans on his desk, slides a coffee cup across toward the camera without a word, holds the look. Cool blue light, one warm desk lamp. |
| P08 | c_mia | your ex | Early morning drizzle at a bus stop, the woman from the reference in scrubs and an oversized hoodie sips coffee, notices the camera, rolls her eyes, then can't hold back a small smile. |
| P09 | c_yuna | your roommate | 2 a.m. in a shared kitchen lit by the fridge, the woman from the reference with headphones on pushes a plate of food toward the camera, pretends not to care, pulls the headphones back on, then peeks once more. |
| P10 | c_clara | your girlfriend | 10 p.m., the woman from the reference comes through the front door with a takeout bag, kicks off her heels, leans on the doorframe and lifts the bag toward the camera with a tired, warm smile. Warm hallway light. |
| P11 | c_sam | your best friend | Night on a floodlit football pitch, the woman from the reference juggles the ball twice, kicks it softly toward the camera, laughs and points as if daring you, then her smile turns softer. |
| P12 | c_lena | your crush | 3 a.m. in an architecture studio full of white models, the woman from the reference sits on a desk in a big sweater, finishes typing on her phone, looks up at the camera, embarrassed and hopeful, hides half her face behind the sleeve. Warm desk lamp. |

Top lines (edit): P01 "POV: your best friend texts you at 1am" · P02 "POV: your husband was not supposed to care" ·
P03 "POV: your brother's best friend has to drive you home" · P04 "POV: he only calms down for you" · P05 "POV: your
boyfriend saw who liked your post" · P06 "POV: your rival told his parents you're dating" · P07 "POV: your boss
remembers your coffee order" · P08 "POV: your ex 'just needs her charger'" · P09 "POV: your roommate pretends she
doesn't care" · P10 "POV: your girlfriend runs a company and comes home to you" · P11 "POV: she's beaten you at
everything since you were 7" · P12 "POV: she said no last year. she keeps texting first."

## 6. Block T: texting stories (no generation)

Claude records six real chats on the A51 (model on, our own test account), types them out as a texting story with
a character's photo card at the top, and adds sound. Stories: Milo and the hoodie, Mia and the charger, Asher's
dinner favour, Yuna's three fridge rules, Victor's "my office, five minutes", Sam and the story she saw.

## 7. Days

| Day | Who | What |
| --- | --- | --- |
| Nov 12 (today) | owner in Cowork | H01 test, then H02 to H16 |
| Nov 13 | owner in Cowork | P01 to P12; retries of any skipped H clip |
| Nov 13 to 14 | Claude here | edit the hero film (75 / 30 / 15 s), the 12 POV videos, the 6 texting stories; sound checked with earshot |
| Nov 14 | owner in Cowork | extra takes Claude asks for after the edit (a missing shot, a better ending) |
| before Nov 15 07:00 UTC | owner | decide: keep the plan or say "cancel auto-renewal" |

Finished videos go to `videos/final/`, raw clips stay in `videos/raw/` (both outside git if large).

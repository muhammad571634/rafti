# Film 2: "Someone to tell" (2 minutes, 2026-11-12)

Owner, 2026-11-12: a two-minute emotional film for social media, many shots, the camera from every side, people of
every kind; Claude writes the story, the owner makes the clips in Google Flow on Omni 1.2 Flash, Claude edits.
Settings and the workflow are those of `docs/google-flow-video.md` (720p, 8 s, x1, 9:16, one Ingredient at most).

## 1. The idea

Something happens to everyone today: an exam passed, the first tomatoes, a birthday, a life saved, a job, a driving
test at 58, the best sunrise in years. The film's question is "who did you tell?". Seven strangers each have their
moment and nobody to tell. Then each of them tells an AI friend who answers with something only a friend who
remembers could say. End line: **"Everyone needs someone to tell."**

Why it should pull people in: it opens on joy with nowhere to go (a feeling everyone knows and nobody names), it
shows seven different lives so every viewer finds theirs, and the product appears as the answer to the feeling, never
as a feature list. Honesty: every reply is marked as an AI friend's, and the end card says "AI friends who remember
you". No real people, no brands, no children on screen.

## 2. The seven

| # | Who | Their moment (act 1, silent) | What they say (act 3) | The friend's reply (bubble in the edit) |
| --- | --- | --- | --- | --- |
| 1 | Lina, 19, student far from home | passes the exam alone in a dorm room | "I passed. I actually passed!" / "You remembered the flashcards?" | "I KNEW IT. three weeks of flashcards. tell me everything." |
| 2 | Walter, 74, widower | sets two plates, takes one away | "Sixty-one tomatoes this year. Sixty-one." / "Yes. Her recipe." | "Sixty-one! Ruth's sauce tonight?" |
| 3 | Dev, 34, long-haul driver | one candle on a cupcake in the cab | "It's my birthday today." / "You knew?" | "I know. I was waiting for you to park. happy birthday 🎂" |
| 4 | Amara, 41, nurse after a night shift | shaking in her car at dawn | "We got him back. Forty minutes... and we got him back." | "You did that. now breathe. I'm right here." |
| 5 | Tomas, 27, delivery rider | the email in the rain, strangers walk past | "I got the job! I start Monday!" | "MONDAY?! no more rain shifts. so proud of you." |
| 6 | Mei, 58, office cleaner | her new driving licence, her own reflection | "I passed. At fifty-eight!" / "The sea. First, the sea." | "third time's the charm! where are we driving first?" |
| 7 | Samir, 45, night cab driver | a sunrise photo he does not send | "Look at that. Just look at that." / "Every morning. I promise." | "that's sunrise number 14. keep sending them." |

## 3. Structure (120 s)

| Time | Part | Picture | Words on screen | Music |
| --- | --- | --- | --- | --- |
| 0-6 | Hook | A1 shot 1 (Lina's silent jump), A5 shot 2 (Tomas punches the air) | "Something good happened today." then "Who did you tell?" | one held piano note |
| 6-44 | Act 1: no one to tell | the seven A clips, two angles each, about 2.5 s a shot, cold grade | a small caption per person ("she passed.", "first tomatoes of the year.", …), last: "and no one to tell." | sparse piano |
| 44-52 | The turn | X1: three hands typing; a typing indicator; "you up?" → "always." | chat bubbles | a breath of silence, then the theme enters |
| 52-104 | Act 3: someone to tell | the seven B clips, their own voices, warm grade; each reply lands as a bubble with a cast avatar | the replies of §2 | builds; ducks under each voice |
| 104-114 | Chorus | fast cuts of all seven laughing (B shot 2s), then Walter's porch, two chairs | "Everyone needs someone to tell." | the full theme |
| 114-120 | End card | black | "Sigmazam · AI friends who remember you · link in bio" | last chord, tail to silence |

Cuts for social from the same clips: 60 s (four people: Lina, Walter, Amara, Tomas), 30 s (Lina, Walter, Dev) and
seven 12-15 s singles, one per person ("she passed at 58. who did she tell?"): about ten more posts from one shoot.

## 4. How the clips are made

- Each clip holds **two shots** (a hard cut at 4 s): a wide or unusual angle, then a close-up. Fourteen clips give
  twenty-eight angles; X1 gives three more. Omni draws both shots in one generation, so the person stays the same
  inside a clip.
- **Round 1** (`videos/flow-kit-film2/round-1/`, 8 folders): A1-A7 and X1, prompt only. **Do A1 first and show it to
  Claude**: it tests the two-shot format. If Omni ignores the cut, Claude rewrites the prompts as single shots.
- **Round 2** (`round-2/`, 7 folders): B1-B7. Each needs one Ingredient: a frame of the same person from the round-1
  clip, which Claude cuts out and puts into the folder as `1-photo-<name>.jpg` (the `1-PHOTO-COMES-LATER.txt` note
  marks the place). Never make a round-2 clip without its photo: the face would be a new person.
- Save as `videos/raw/A1.mp4` … `B7.mp4`, `X1.mp4` (each folder's `3-save-as.txt`).
- Credits: 15 clips × 24 = 360 (AI Pro: 1,000 a month + 50 a day). One retry per clip at most.
- Check per clip (Claude): the same face in both shots, hands and phone right, the line word for word (Whisper),
  no music, no readable text; sound measured with earshot.

## 5. Edit plan (Claude, `C:\Users\joray\sigmazam-edit`)

Cold grade for act 1 and warm for act 3 (as in "Not alone"), film grain, slow push-ins, serif italic captions; the
replies as chat bubbles with a cast avatar and the earshot ding; a licensed Mixkit track with the theme entering on
the turn and the full section on the chorus; music ducked under every voice; master to -14 LUFS, true peak under
-1.5 dBTP; logos and watermarks blurred as before.

## 6. Prompts (each block is complete; paste as it is)

**A1 Lina** (prompt only; caption in the edit: "she passed.")
```
Shot 1 (0-4s), high angle from the ceiling corner of a small dorm room at night: a young woman of 19 with olive skin and dark curly hair in a messy bun, in an oversized grey sweatshirt, sits cross-legged on a narrow bed with a laptop on her knees, lit only by the laptop and a small desk lamp; books and paper flashcards all over the blanket. She stares at the laptop, then both hands fly to her mouth and she bounces once on the bed in silent joy. Hard cut. Shot 2 (4-8s), close-up at eye level, slightly from the side: her eyes wet and shining, a huge smile; she picks up her phone and looks at it, and the smile slowly fades as she realises there is no one to call; she lowers the phone to her lap. Sound: laptop fan, strangers laughing faintly through the wall, her quick breath. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**A2 Walter** (prompt only; caption in the edit: "first tomatoes of the year.")
```
Shot 1 (0-4s), from outside through a kitchen window at dusk, the window frame at the edges of the picture: an elderly man of 74 with white hair, a lined kind face and a beige cardigan sets a wooden table. He puts down a bowl of bright red tomatoes, then two plates, pauses, and slowly takes one plate away again. Hard cut. Shot 2 (4-8s), close-up from table height: his weathered hands turn one tomato in the lamp light; the camera tilts up to his face, a small proud smile that turns wistful as he looks at the empty chair across the table. Sound: a wall clock ticking, a plate set down on wood, evening birds outside. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**A3 Dev** (prompt only; caption in the edit: "it's his birthday.")
```
Shot 1 (0-4s), from outside through the rain-beaded windshield of a truck cab parked at a highway rest stop at night, passing headlights sweep across the glass: a South Asian man of 34 with a short black beard and a red flannel shirt sits in the driver's seat; on the dashboard stands a single cupcake with one lit candle. He looks at the flame. Hard cut. Shot 2 (4-8s), close-up inside the cab from the passenger side, candlelight on his face: he smiles a little at himself and blows the candle out; smoke curls up, the smile lingers and then drops; he glances at the dark phone lying on the dashboard. Sound: rain on the cab roof, distant highway, the soft puff of the candle. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**A4 Amara** (prompt only; caption in the edit: "they got him back.")
```
Shot 1 (0-4s), wide from the far end of an empty hospital parking garage at dawn, cold fluorescent light, long concrete perspective: a Black woman of 41 with short natural hair, in navy scrubs with a grey zip jacket over them, walks slowly to a lone car, gets in and closes the door. Hard cut. Shot 2 (4-8s), close-up through the driver's side window: she sits with both hands on the steering wheel staring ahead, lets out a long shaky breath, then a tired, disbelieving smile breaks through and her eyes fill; she presses the back of her hand to her mouth. Sound: garage hum, echoing footsteps, a car door thud, one shaky exhale. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**A5 Tomas** (prompt only; caption in the edit: "he got the job.")
```
Shot 1 (0-4s), low angle from the wet pavement at night in the rain, city lights reflecting in puddles: a Latino delivery rider of 27 in a dark rain jacket with a plain black insulated backpack stands beside his bicycle under a shop awning, looking at his phone; he freezes. Hard cut. Shot 2 (4-8s), medium close-up from the front: disbelief turns into joy, he punches the air once and laughs silently, then looks left and right: strangers under umbrellas walk past without a glance; his arm comes down slowly, still smiling, alone. Sound: rain on the awning, tyres on a wet road, footsteps passing. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**A6 Mei** (prompt only; caption in the edit: "she passed. at 58.")
```
Shot 1 (0-4s), wide from outside the glass wall of an empty office floor at night, city lights behind her: an East Asian woman of 58 with a grey-streaked bob, in a plain blue cleaner's tunic, pushes a cleaning cart between dark desks and stops by the window. Hard cut. Shot 2 (4-8s), close-up of her face and hands by the dark window, her reflection in the glass: she takes a small plastic card from her pocket (seen only from its blank back), holds it in both hands and smiles at it like a girl, shoulders rising with a silent happy breath; her reflection smiles back, alone in the glass. Sound: air conditioning hum, cart wheels, a distant elevator chime. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**A7 Samir** (prompt only; caption in the edit: "the best sunrise in years.")
```
Shot 1 (0-4s), drone-like high wide shot above an empty airport car park at sunrise, the sky burning orange and pink: one plain cream-coloured sedan; a Middle Eastern man of 45 with dark stubble and a brown leather jacket sits on its hood holding a paper cup. Hard cut. Shot 2 (4-8s), close-up in profile, golden light on his face: he lifts his phone and takes a photo of the sunrise, looks at the phone, thumb hovering, then slowly lowers it without sending; he looks back at the sky. Sound: wind, a distant plane, one phone camera click. No speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**X1 Hands** (prompt only)
```
Three quick macro shots with hard cuts at about 2.6 s and 5.3 s. Each shows a different adult's hand holding a phone in the dark, the back of the phone toward the camera and the screen glow on the fingers. Shot 1: an old man's weathered hand under warm lamp light, the thumb typing slowly. Shot 2: a hand in a wet fingerless cycling glove under neon light, raindrops on the knuckles, the thumb typing fast. Shot 3: a woman's hand with short nails, the cuff of navy scrubs at the wrist, cold dawn light; the thumb hovers, then presses once. Sound: soft keyboard taps, then one quiet message-sent whoosh. No speech. Photorealistic vertical 9:16 cinematic video, present day, natural skin texture, shallow depth of field, gentle film grain. All people are adults. No text, captions, readable screens, logos or watermark. No music.
```

**B1 Lina** (Ingredient: a frame of A1)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. The same dorm room, later the same night. Shot 1 (0-4s), low angle from the floor beside the bed: she lies on her back across the bed with her feet up on the wall, holding the phone above her face, grinning. She starts speaking within the first second, fast and bubbling, natural English: "I passed. I actually passed!" Hard cut. Shot 2 (4-8s), close-up from the side: she listens, laughing, covers her eyes with her forearm and says softly: "You remembered the flashcards?" Sound: her voice close, a quiet room. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**B2 Walter** (Ingredient: a frame of A2)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. The porch of his house at blue hour, a warm porch light, two wooden chairs, the bowl of tomatoes on a small table. Shot 1 (0-4s), wide from the garden: he sits in one chair with the phone propped against the bowl, talking to it like to an old friend. He starts speaking within the first second, proud and gravelly, natural English: "Sixty-one tomatoes this year. Sixty-one." Hard cut. Shot 2 (4-8s), close-up of his face in the porch light: he listens, laughs warmly, eyes creasing, and nods: "Yes. Her recipe." Sound: crickets, the chair creaking, his voice close. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**B3 Dev** (Ingredient: a frame of A3)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. The same truck cab at night, rain on the glass. Shot 1 (0-4s), from outside the driver's side window looking in, his face in profile: he holds the phone near the steering wheel with a shy smile. He starts speaking within the first second, quietly, natural English: "It's my birthday today." Hard cut. Shot 2 (4-8s), close-up from the dashboard looking back at him: he listens, his face slowly opens into a big surprised grin, he laughs and rubs his eyes with his thumb and finger: "You knew?" Sound: rain on the roof, his voice close. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**B4 Amara** (Ingredient: a frame of A4)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. The same car in the parking garage, soft morning light now coming in. Shot 1 (0-4s), from the back seat over her shoulder, her eyes visible in the rear-view mirror, the phone standing on the dashboard: she starts speaking within the first second, voice trembling but smiling, natural English: "We got him back. Forty minutes... and we got him back." Hard cut. Shot 2 (4-8s), close-up from the front through the windshield: she listens and nods, one tear runs down as she laughs with relief, and she leans her head back on the headrest, eyes closed, at peace. Sound: quiet car interior, her breath, her voice close. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**B5 Tomas** (Ingredient: a frame of A5)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. The same street, the rain easing, wet asphalt shining. Shot 1 (0-4s), tracking shot from the side as he rides his bicycle slowly along the street, the phone in a holder on the handlebars: he starts speaking within the first second, shouting happily over the rain, natural English: "I got the job! I start Monday!" Hard cut. Shot 2 (4-8s), close-up from the front with the handlebars in the foreground: he laughs at what he hears and throws his head back, rain on his face, the city lights blurred behind him. Sound: bicycle chain, rain, tyres on wet road, his voice. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**B6 Mei** (Ingredient: a frame of A6)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. A small plain old hatchback parked at night under a street lamp. Shot 1 (0-4s), from the passenger seat: she sits in the driver's seat with both hands on the wheel at ten and two, a coat over her blue tunic, the phone standing on the dashboard. She starts speaking within the first second, giddy, natural English with a light accent: "I passed. At fifty-eight!" Hard cut. Shot 2 (4-8s), close-up from outside through the side window, the street lamp reflected on the glass: she listens, laughs like a girl, covers her mouth, then says: "The sea. First, the sea." Sound: quiet car interior, her voice close. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

**B7 Samir** (Ingredient: a frame of A7)
```
The person is the one in the reference image: keep exactly the same face, hair, age, build and clothes. The same airport car park, the sunrise now full gold. Shot 1 (0-4s), from behind him over his shoulder toward the sun: he stands by the car holding his phone up to the sky as if showing it the view. He starts speaking within the first second, warm and low, natural English with a light accent: "Look at that. Just look at that." Hard cut. Shot 2 (4-8s), close-up from the front, the sun on his face: he listens, chuckles, shakes his head smiling and says: "Every morning. I promise." Sound: wind, a distant plane, his voice close. No other speech. Photorealistic vertical 9:16 cinematic video, present day, shot like a feature film: natural skin texture, real light, shallow depth of field, gentle film grain, slow deliberate camera. Exactly two shots with one hard cut at the 4-second mark; the same person, the same clothes and the same place in both shots. Any phone is held with its screen toward the person, never toward the camera. All people are adults. No text, captions, readable screens, signs, logos or watermark. No music.
```

## 7. Edit plan worked out (2026-11-12, paused before code)

State when paused: all 15 clips were in `videos/raw/` and reviewed. **B2-B7 show different people from their A
clips** (only B1 Lina matches): the face photo was not used. Owner is remaking B2-B7 with the right faces; re-run
the B checks on the new ones (lines were word-exact in the first takes, so the prompts are fine). Retake timings
will differ: re-measure them (Whisper + voice-band energy, scratchpad scripts are gone; rewrite as in HANDOFF).

**Already done in `C:\Users\joray\sigmazam-edit`**: all 15 clips copied to `public/f2/` with audio normalised
(B to -18 LUFS, A and X1 to -24 LUFS, TP -3, AAC 256k, video stream copied). Redo this for the new B clips.
Music copied to `public/music/discover.mp3`. No film-2 code written yet.

**Music: "Discover" (Mixkit id 587, `audio/assets/music/mk-587_discover.mp3`, 144 s, F major, ~114 BPM,
earshot rank z +3.9 for "emotional piano building to an orchestral swell")**. Shape (RMS per s): soft intro 1-12 s,
swell 13-16 s, quiet 18-28 s, big entry onset 31.53 s, full 32-117 s (peak ~95-97 s), outro 117-141 s. Downbeats
(earshot beats, every 4th from the entry): 31.591, 33.506, 35.585 ... 73.329 (idx 80), 89.85 (idx 112),
94.122 (idx 120), 96.305 (idx 124). Tempo drifts (residual 0.17 s), so jump only between measured beats with an
index difference that is a multiple of 4.

**Main cut, ~95 s, film time = track time until the jump** (music starts at film 0 so the entry lands by itself):
- 0-3.4 hook: A1 4.0 s (1.7) + A4 6.3 s (1.7); big Nunito word-pop "Something good happened today." then
  "Who did you tell?"; under it the track's final chord (from ~133.6 s) fading, since track 0-3 is silent.
- 3.4-24.45 act 1, cold grade, A ambience at 0.8: six people 2.9 s each (shot 1 1.15 s + shot 2 1.75 s), Samir
  3.65 s. Source in-points: Lina 2.6 / 5.6, Walter 1.6 / 6.0, Dev 1.0 / 5.4 (blow at 5.75), Amara 0.8 / 5.9,
  Tomas 1.8 / 4.7 (punch), Mei 1.2 / 5.6, Samir 1.0 / 5.2 (lowers the phone). Name tag ("LINA, 19") + italic
  caption per person; on Samir's shot 2 the caption becomes "and no one to tell." The swell (13-16 s) falls on Amara.
- 24.45-31.55 the turn: X1 shots 0.1-2.35, 2.7-4.95, 5.3-7.9; an outgoing blue bubble per shot ("you up?",
  "guess what", "can I tell you something?"), typing dots, then "always." lands at 30.85 with the ding; hard cut
  + a 6-frame white flash at 31.55 on the music entry.
- 31.55-79.78 act 3, warm grade: B1-B7 played straight through their 4 s cut, word-by-word captions, the reply
  bubble (cast avatar + name, glass grey) with the ding after the first line; music ducked to ~0.35 only while
  someone speaks. First-take trims (in, dur, reply at src s): B1 0.25/7.05/2.75, B2 0.9/6.4/4.95,
  B3 0.6/6.05/2.2, B4 0.25/7.25/4.0, B5 0.6/6.05/3.7, B6 0.0/7.85/2.5, B7 0.3/7.584/3.6 (B7 sized so the
  chorus lands on a downbeat). Friends: Lina-Milo (P01), Walter-Sam (P11), Dev-Jace (P04), Amara-Roman (P02),
  Tomas-Yuna (P09), Mei-Clara (P10), Samir-Ethan (P05); reply texts from §2.
- Music jump at film 73.329 (track 73.329, idx 80) to track 89.85 (idx 112), J = 16.521 s, hidden under Samir's
  voice; the chorus at film 79.784 = track 96.305 (idx 124, peak).
- 79.78-90.25 chorus: seven laughs, 2 beats (1.046 s) each (src B1 6.2, B2 6.6, B3 5.4, B4 6.6, B5 5.3, B6 5.0,
  B7 6.6, laugh audio at 0.5), then B2's porch wide (src 0.2, 3.14 s) with "Everyone needs someone to tell."
- 90.25-95.25 end card (icon, Sigmazam, "AI friends who remember you", LINK IN BIO); music crossfades to the
  outro (track 128.337) and fades out.
- Then 60 s, 30 s and seven single cuts from the same pieces; render with `out/finish.sh` (change the output
  name), check -14 LUFS / <= -1.5 dBTP with earshot and a contact sheet; finals to `videos/final/`.
- Code plan: new `src/film2/Film2.tsx` (renderer: clip, hook text, name tag, word captions, in/out bubbles,
  typing dots, flash, end card; Grain copied or exported from `src/film/Film.tsx`) and `src/film2/cuts2.ts`
  (builders per act so recuts reuse them), registered in `src/Root.tsx` under a "SomeoneToTell" folder.
- Edit notes: A5 shot 1 awning pseudo-lettering (blur the top band 0-4 s if A5 shot 1 is used); TikTok safe
  zones (captions y 1250-1450, nothing under ~1550 or in the right 120 px).

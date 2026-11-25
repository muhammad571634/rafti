# Cast 2.0 pictures audit: why they read like passport photos, and the fix (2026-11-25, Claude 1)

> **Correction (same day):** the owner meant the twelve main portraits, not the stills. The portrait plan is
> `docs/nano-banana-portraits-v2.md`; this file's stills plan is parked, and §6.3 ("keep the portraits") is withdrawn.

The owner asked (2026-11-25) for a full audit of the twelve main characters' pictures: "they feel too plain, all in
the same frame, the same scene, looking straight ahead, like a passport photo; how do we make pictures that pull a
person in emotionally?" This covers the 12 portraits (`assets/portraits/c_*.jpg`) and the 84 moment stills
(`assets/stills/`). Nothing is redrawn yet: first a 3-picture test for one character (section 6).

## 1. Verdict

The owner is right, and it is our prompts, not Nano Banana. The sameness is written into every prompt:

- **Every one of the 84 still prompts fixes the same frame**: "centered horizontally (middle 70% of width), eyes about
  38-40% from the top, viewer's POV element in the bottom 20%" and "deep emotional eye contact" (62/62 lines in
  `docs/nano-banana-stills-ready.md`, 8/8 in `docs/nano-banana-moment-stills.md`). One camera, one gaze, 84 times.
- **The seven moods are seven sets, not seven moments.** Every `rain` is the same wet doorway, every `city_lights`
  the same neon street (the same vertical sign), every `laughing` the same rooftop with string lights, every
  `tension` the same lean on a door frame, every `morning` the same mug held out. Only `our_place` differs.
  Seen across friends on Find and in the Moments feed, twelve people stand in one film set.
- **Four of seven stills end in the viewer's hand reaching** (close_night, city_lights, morning, laughing).
  The device that should be the surprise is the default.
- **One colour for everyone.** Share of strong warm-orange pixels in the portraits: 10 of 12 above 60 %
  (Clara 0.89, Lena 0.86, Ethan 0.85, Jace 0.81), cool pixels 0.00-0.10 everywhere. Morning stills average 0.80
  warm, 0.01 cool. Our product rule gives every friend their own hue (`friendAccent`); the pictures ignore it.
- **One expression.** Eleven of twelve portraits: closed-mouth half smile, chin slightly down, eyes into the lens.
  The cast's whole design is a **mask and a want** (cast-2 §3-4), yet no picture shows a mask or a crack in it.

What is good and stays: faces are consistent across all 84 (identity holds), the painterly 2.5D style with no ink
lines, the portraits' props (Jace's taped hands, Ethan's camera, Lena's model house, Yuna's tablet), 3:4, and the
rule that the viewer is never shown (faceless, genderless hand or shoulder).

## 2. Should they all look the same? No: consistent *system*, different *shots*

Keep constant (so the set feels like one app): style, 3:4, light quality (film, soft, practical sources), the
faceless viewer, safe zones for crops (section 5). Make different on purpose: distance, angle, gaze, action,
colour, place. Character.AI's best-performing character pages (cast-2 §2) pull because each still is a frame from
**their own story**, often caught mid-action, not a pose for the camera.

## 3. The rules for every new picture

1. **Show the knot, not the mood.** Each picture is a frame of that character's tension (cast-2 §5): Roman's ring
   and the closed door down the hall, Mia in your hoodie on a night-shift break, Victor alone in the office after
   the launch party. If a picture would work for any of the twelve, it is wrong.
2. **Eye contact is rationed: at most 2 of 7 stills look into the lens.** The rest: caught glance back over the
   shoulder, looking down at something of yours, eyes closed, looking away while you look at them, seen in a
   mirror or a phone screen. A gaze that is rare lands hard; one that is always there reads as a passport.
3. **Vary the camera across a character's seven** (each set of seven must use at least 5 different setups):
   extreme close-up (eyes / mouth / hands), close-up, medium, wide with them small in their world, over-the-shoulder,
   low angle, high angle, through-something framing (rain glass, doorway, car window, steam), mirror/reflection.
4. **One action per picture.** They are doing something that belongs to them: wrapping tape, plating food, fixing
   your collar, sketching you, taping a fridge rule. Hands busy, story readable without words.
5. **The viewer's hand is a tool, used at most twice per character**, and never two reaching hands in a row.
   Other ways to put "you" in the frame: your jacket on their shoulders, your mug on the table, your phone lighting
   their face, your shadow, the empty seat beside them.
6. **Each character owns a colour and a place.** Key light or a strong accent in their signature hue (below),
   against the warm skin light; their `our_place` and signature prop recur so a still is recognisable without a face.
7. **Expression from the arc**: mask (cold, smug, "I'm fine"), crack (the moment it slips), want (open, scared,
   tender). Each set of seven holds at least one of each. Not every picture smiles.

## 4. The twelve: signature colour, place, prop, and seven staged moments

Mood ids stay the same (the model names them; `src/ai/moment-stills.ts`, no code change), but each friend stages
them in their own story. Shot code: ECU extreme close-up, CU close-up, MS medium, WS wide, OTS over the shoulder,
LOW/HIGH angle, REF reflection/mirror, THRU framed through something. Gaze: L lens, A away/down, B caught glance
back, C eyes closed.

**Milo** (best friend, loves you for years) · colour: faded teal + amber · place: the bar after closing · prop: your hoodie, headphones
- close_night: CU, he is asleep on your sofa wearing your hoodie, headphones on, laptop beat paused · C
- rain: THRU the bar's rainy front window, he is wiping the last glass, sees you outside · B
- city_lights: WS, rooftop of his building, he plays you a beat on one earbud, the other in his hand held out · A
- morning: HIGH, he is on the kitchen floor making you breakfast badly, smoke, laughing up at you · L
- laughing: MS, behind the bar mid-shift, he slides you a drink with a dumb doodle on the napkin, laughing at his own joke · A
- tension: ECU eyes, he hears someone else's name from you; smile still on, eyes not · L
- our_place: WS, the empty bar, chairs up, one stool down for you, his hoodie on it · none (he is wiping the counter, back half turned)

**Roman** (husband, married for the family) · colour: deep bottle green + candle gold · place: the long dining room, the hallway between your rooms · prop: wedding ring, your coffee
- close_night: THRU the half-open door between your rooms, he stands in the dark hall, hand on the frame, not knocking · A
- rain: MS from behind and side, he holds an umbrella over you only, his own shoulder soaked · B
- city_lights: low-angle in the car's back seat, city lights sliding over his face, he loosens his tie, looks at you sideways · B
- morning: CU on hands, he sets your coffee exactly how you take it, ring catching light; face soft, out of focus · A
- laughing: MS at the family dinner, he hides a real laugh behind his glass at something you whispered · B
- tension: REF in the hallway mirror, his cold face; the real one behind it looks at you · L (the only lens look, in the mirror)
- our_place: WS, the long dining table, his father's empty chair, he pulls out the chair next to his for you · L

**Caleb** (brother's best friend, ice with you) · colour: firehouse red + sodium orange · place: the fire station, his truck · prop: truck keys, your brother's crew jacket
- close_night: MS in the truck cab, parked outside your place, engine off, he hasn't let you out yet · A
- rain: WS, he stands by the truck in the rain, not getting in, waiting for you to come down · L
- city_lights: OTS from the passenger seat, he drives, jaw set, one hand on the wheel, finally glances · B
- morning: MS, station kitchen after a night shift, soot on his neck, he sees you came with coffee · L
- laughing: MS at your family barbecue, laughing with everyone; his eyes find you and the laugh drops · B
- tension: CU, he puts his jacket on your shoulders without looking at you · A
- our_place: WS, his family's kitchen at night, the light over the stove, two plates · A

**Jace** (trouble, calm only near you) · colour: cold steel blue + garage tungsten · place: the garage, the gym ring · prop: knuckle tape, ice pack
- close_night: CU, he lets you tape his split knuckles, watching your hands, not your face · A
- rain: WS, he sits on the curb outside a closed bar in the rain, hood up, waiting for you to come get him · B
- city_lights: LOW, he walks backwards on an empty night street, grinning, daring you to follow · L
- morning: MS, asleep sitting up in the garage chair, a bruise, your jacket over him · C
- laughing: MS in the gym, sweat, he throws a towel at you mid-laugh · A
- tension: ECU, fresh cut on the brow, he says he's fine, eyes say not · L
- our_place: WS, the garage roller door half up at dawn, him on the car bonnet, space beside him · A

**Ethan** (boyfriend, jealous) · colour: darkroom red + soft daylight · place: his darkroom / studio · prop: his camera
- close_night: CU, he takes your photo in bed, the camera lowering, his face behind it · L
- rain: THRU the café window, he watches you laugh with a coworker inside; his reflection on the glass · A
- city_lights: MS, he walks ahead holding your hand behind him, looking back · B
- morning: ECU on the darkroom print coming up in the tray: it is you; his face red-lit, out of focus · A
- laughing: MS, he tries to take a serious photo, you make him laugh, blurred motion · A
- tension: MS, he holds his phone with a stranger's comment on it, smiling too hard · L
- our_place: WS, the darkroom, a line of drying prints, all of you · B

**Asher** (rival, fake dating for his parents) · colour: clinical cyan + warm restaurant gold · place: hospital corridor, his parents' restaurant · prop: stethoscope, two coffees
- close_night: MS, on-call room, he fell asleep sitting next to you, head on your shoulder (shoulder only) · C
- rain: MS, ambulance bay under the awning, he hands you his scrubs jacket, smug · L
- city_lights: OTS, outside his parents' restaurant, he rehearses your fake story under his breath · A
- morning: MS, end of a 24h shift, he leaves a coffee on your locker and walks away, glance back · B
- laughing: MS at his parents' dinner table, his mother says something, he chokes on his laugh, looks at you · B
- tension: CU, a corridor, he leans close to correct your chart; too close · L
- our_place: WS, the hospital roof at dawn, two coffees on the ledge · A

**Victor** (boss, the night after the launch party) · colour: cold office blue + whisky amber · place: his glass office after hours · prop: the coffee he remembers, his watch
- close_night: WS, empty office floor at night, only his desk lamp on, he hasn't gone home · A
- rain: THRU the office glass streaked with rain, he looks at your empty desk · A
- city_lights: MS in the elevator, mirrored walls, you and him not talking (him in focus, you a blurred reflection) · REF, B
- morning: CU on hands placing your exact coffee order on your desk before you arrive · none
- laughing: MS at the launch party, tie loose, a rare real laugh he stops when he sees you · B
- tension: CU, door closing behind you in his office: "It is not about the report." · L
- our_place: WS, the underground car park, his car, one light, him leaning on the door · L

**Mia** (ex, still wears your hoodie) · colour: hospital mint + vending-machine pink · place: hospital break room on night shift · prop: your hoodie over scrubs, your charger
- close_night: CU, asleep on the break-room couch in your hoodie, your charger in her hand · C
- rain: MS, under the hospital entrance, she sees you, pulls the hood up to hide · B
- city_lights: MS, a 3am diner booth, she steals your fries, pretends not to care · A
- morning: WS, end of her shift at sunrise, she sits on the hospital steps, thumb over your name on her phone · A
- laughing: MS, she laughs at something then catches herself, hand over mouth · L
- tension: ECU, her eyes over the rim of a coffee cup, "I'm doing great" · L
- our_place: WS, the old apartment's laundromat downstairs, she folds your hoodie, doesn't give it back · B

**Yuna** (roommate, three rules on the fridge) · colour: electric violet from her tablet + fridge white · place: your shared kitchen at 2am · prop: tablet, the fridge rules, the plate she leaves you
- close_night: MS, 2am, she draws at the kitchen table, tablet glow, headphones on, she doesn't look up · A
- rain: THRU the window, she is on the balcony in the rain, eyes closed, not hiding from it · C
- city_lights: WS, convenience store at night, she holds two of your favourite snacks, deciding · A
- morning: CU on the plate with foil and a sticky note "eat. not for you." on the counter · none
- laughing: MS, she laughs at your bad drawing, headphones round her neck · L
- tension: MS, she crosses out a rule on the fridge, back to you, glance over her shoulder · B
- our_place: ECU on her tablet screen: a sketch of you asleep on the sofa; her hand pausing · none

**Clara** (girlfriend, founder) · colour: city-night navy + kitchen copper · place: your kitchen after midnight · prop: takeaway bag, her glasses
- close_night: CU, she falls asleep against you on the sofa still in her blazer, glasses askew · C
- rain: MS, she arrives soaked with two takeaway bags, laughing at herself · L
- city_lights: MS, back seat of a car, laptop open, she shuts it and turns to you · B
- morning: CU, she cooks badly in your shirt, burns the toast, defiant look · L
- laughing: MS, dinner on the kitchen floor, takeaway boxes, she laughs with her head back · A
- tension: MS, she takes a work call at the window, rigid; her free hand reaches back for yours · A
- our_place: WS, the kitchen at 1am, one pendant light, two forks in one box · B

**Sam** (best friend since seven, wants you to notice) · colour: stadium white-green + sunset orange · place: the five-a-side pitch · prop: a football, your old jersey
- close_night: MS, on the pitch at night, lying on the grass looking at the floodlights, not at you · A
- rain: LOW, she kicks a ball in the rain, soaked, laughing, daring you onto the pitch · L
- city_lights: MS, you two on a bus at night, she pretends to sleep on your shoulder (shoulder only), peeks · B
- morning: MS, physio clinic, she tapes your knee, focused, then looks up · L
- laughing: WS, celebrating a goal, jumping, your jersey · A
- tension: CU, she sees someone else's photo on your phone, her smile freezes · A
- our_place: WS, the old pitch at sunset, two kids' names scratched on the bench · B

**Lena** (crush, said no last year) · colour: blueprint blue + desk-lamp warm · place: the architecture studio at night · prop: the model house, a pencil behind her ear
- close_night: CU, asleep on her drawings, the model house glowing beside her · C
- rain: MS, under one jacket with you at a bus stop, too close, she looks ahead · A
- city_lights: WS, she shows you a building she loves at night, pointing up, looking at you instead · B
- morning: MS, studio at dawn, all-nighter, she offers you half her coffee · L
- laughing: MS, she laughs and drops her pencil, both reach for it · A
- tension: CU, she sees you with someone across the room, phone in hand, typing, deleting · A
- our_place: WS, the airport departures (keep: her story), she runs toward you · L

## 5. Technical safe zones (so the app's crops keep working)

- **Stills** show in 2:3 moment cards with `object-position: 50% 38%` (`src/components/character/moment-picture.ts`)
  and 9:16 share posters. From a 3:4 source a 2:3 crop drops about 11 % of the width. So the face (when there is
  one) sits inside the middle 80 % of the width and the eyes in the upper half. Close-ups of hands and ECUs are
  fine; wide shots keep the person off the outer 10 % edges.
- **Portraits** fill the chat ground (about 0.46 aspect: about 61 % of the width shows) and photo cards with words
  on the left (`FACE_AT = 0.68`, `sceneFocus`). If a new portrait puts the face off-centre, set its
  `SCENE_FACE[id]` in `src/components/chat/chat-ground.tsx` (the map is empty today, default 0.62).
- Text-free, no logos (the departures board in Lena's `our_place` is already unreadable; keep it that way).

## 6. Order of work (one test first, owner's rule)

1. **Test: Roman, 3 stills** (rain, tension, our_place): three different setups, one lens look, his green.
   Owner judges side by side with the current Roman set.
2. If approved: redraw the 84 stills in the order of most-seen characters (onboarding four first: Milo, Caleb,
   Mia, Sam), 7 at a time, wiring each set as it lands.
3. **Portraits: keep the art, re-grade the colour.** The portraits are good pictures with one problem each:
   all amber, all the same smile. Step 1 is a colour pass (signature hue as the second light) on 2 portraits; a full
   redraw only for the weakest (Roman, Caleb, Victor read most like posed headshots) and only if the owner wants.

## 7. Prompt template (replaces the fixed COMPOSITION / EXPRESSION lines)

```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour,
hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4
film still, as if paused from a movie about them.
SUBJECT: <name, age, look from the existing prompt>.
MOMENT: <the staged moment from section 4, one action, in their place>.
CAMERA: <shot code spelled out: e.g. "extreme close-up through a rain-streaked window, 85mm, shallow focus">.
GAZE: <spelled out: "caught glancing back over the shoulder" / "looking down at your hands, not at the camera" /
"eyes closed" / "straight into the lens">.
EXPRESSION: <mask, crack or want, in words: "cold, but the jaw gives him away">.
YOU IN THE FRAME: <one of: a faceless hand, your jacket, your mug, your shadow, an empty seat, nothing>; no face,
nothing that says man or woman.
COLOUR: <their signature hue as a strong second light against warm skin light>.
SAFE ZONE: keep the face inside the middle 80% of the width, eyes in the upper half.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait, smooth luminous skin,
realistic hair and fabric, ZERO black ink outlines, ZERO comic lineart, 35mm film light and bokeh; an original adult
character, not a real person photo, not 2D cartoon or anime.
AVOID: posed portrait, passport photo, centred symmetrical headshot, black outlines, comic lineart, text, logos,
watermark, extra fingers.
```

## 8. Ready: the Roman test (3 pictures)

Attach `art-new\c_roman_avatar.png` to each. Save as `art-new\t_roman_rain.png`, `t_roman_tension.png`,
`t_roman_our_place.png` (`t_` = test, kept apart from the live set).

### Roman · rain

```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 film still, as if paused from a movie about them.
SUBJECT: Roman, 31yo tall broad-shouldered man. Black hair combed back with a loose strand, piercing grey eyes, thin scar along jaw. Plain platinum wedding band on his left ring finger. Tailored dark wool overcoat.
MOMENT: Night, heavy rain on a city pavement outside a grand old building. He holds a large black umbrella entirely over the viewer; his own shoulder and the side of his face are soaked, rain running off his hair. He has not mentioned it.
CAMERA: medium shot from slightly behind and to the side of him, 50mm, he fills the right half of the frame, the umbrella canopy crossing the top; shallow focus, rain streaks caught in a streetlamp.
GAZE: caught glancing back down at the viewer over his shoulder, not posing for the camera.
EXPRESSION: formal, almost cold, but the eyes give away that he would stand here all night.
YOU IN THE FRAME: only the edge of the viewer's dark coat shoulder, dry, under the umbrella at the lower left; no face, nothing that says man or woman.
COLOUR: deep bottle-green reflections from a shop sign on the wet stone as a strong second light, against warm golden streetlamp light on his skin.
SAFE ZONE: keep his face inside the middle 80% of the width, eyes in the upper half.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait, smooth luminous natural skin, realistic hair strands and wet fabric, ZERO black ink outlines, ZERO comic lineart, 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: posed portrait, passport photo, centred symmetrical headshot, looking straight into the lens, reaching hands, black outlines, comic lineart, text, logos, readable signs, watermark, extra fingers.
```

### Roman · tension

```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 film still, as if paused from a movie about them.
SUBJECT: Roman, 31yo tall broad-shouldered man. Black hair combed back with a loose strand, piercing grey eyes, thin scar along jaw. Plain platinum wedding band on his left ring finger. White dress shirt, collar open, tie pulled loose.
MOMENT: Late at night in the long hallway of a dark old mansion, he stops in front of a tall antique mirror with a gilded frame, fixing his cufflink, and sees the viewer behind him in it.
CAMERA: the frame is mostly the mirror: his reflection large and sharp in the mirror, the real him a soft dark silhouette at the right edge; 85mm, low candle light.
GAZE: in the reflection he looks straight into the lens (the viewer's eyes in the mirror); the only direct look.
EXPRESSION: cold and controlled, jaw tight, but his eyes hold the look one second too long.
YOU IN THE FRAME: a faint, blurred, faceless dark shape of the viewer deep in the mirror behind him; nothing that says man or woman.
COLOUR: bottle-green damask walls and candle gold, the mirror's old glass slightly green.
SAFE ZONE: keep the reflected face inside the middle 80% of the width, eyes in the upper half.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait, smooth luminous natural skin, realistic hair and fabric, ZERO black ink outlines, ZERO comic lineart, 35mm film lighting; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: posed portrait, passport photo, centred symmetrical headshot, reaching hands, black outlines, comic lineart, text, logos, watermark, extra fingers, distorted reflection.
```

### Roman · our_place

```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 film still, as if paused from a movie about them.
SUBJECT: Roman, 31yo tall broad-shouldered man. Black hair combed back with a loose strand, piercing grey eyes, thin scar along jaw. Plain platinum wedding band on his left ring finger. Dark tailored suit, no tie.
MOMENT: A very long, formal family dining table at night after the guests have gone, candles burning low, plates cleared. At the far end, the patriarch's tall empty chair. Roman stands halfway along the table and pulls out the chair next to his own for the viewer.
CAMERA: wide shot from the viewer's standing height at the near end of the table, deep perspective down the table, Roman small but clear in the middle third, the empty patriarch chair behind him; 35mm, candlelight.
GAZE: he looks up from the chair straight at the viewer, waiting.
EXPRESSION: quiet, not smiling, almost shy for a man like him; the mask set down for a moment.
YOU IN THE FRAME: nothing but the viewer's point of view and their empty chair; no hands.
COLOUR: deep bottle-green walls and tablecloth runner, warm candle gold on his face and the silver.
SAFE ZONE: keep him inside the middle 80% of the width, his eyes in the upper half of the frame.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait, smooth luminous natural skin, realistic fabric and silverware, ZERO black ink outlines, ZERO comic lineart, 35mm film lighting and soft candle bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: posed portrait, passport photo, centred symmetrical headshot, reaching hands, other people, black outlines, comic lineart, text, logos, watermark, extra fingers.
```

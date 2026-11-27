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

1. **Attach ONLY the character's 1:1 close-up avatar** (`art-new/c_<name>_avatar.png`) to each prompt — **never** attach the full-scene portrait `art-new/c_<name>.png` or a previously generated mood still. Full-scene portraits carry studio props, cars, stethoscopes, or kitchen counters that bleed into unrelated moods.
2. Start a **fresh context per prompt** (or pass only `c_<name>_avatar.png` as the single reference image) so earlier moods never contaminate hands, gender, or room layouts.
3. Fill in `SUBJECT`, `HANDS`, and `WARDROBE` from the **Character Identity, Hands & Wardrobe Table** below so every character keeps their own hands, signature marks, and mood-appropriate clothing (e.g., no hospital stethoscope for Asher, no hospital scrubs for Mia, no necktie for Victor in bed).
4. Save each result as `art-new/m_<name>_<mood>.png` (for example `art-new/m_milo_close_night.png`), then crop/compress to `assets/stills/c_<name>_<mood>.jpg` (`900x1200`) and wire into `assets/stills/registry.ts`.

**Order: one test first.** Milo `close_night` only, check the look; then Milo's other six; then the other eleven (7 each, 84 in all).

**Frame for every still:** vertical 3:4, the person centered horizontally (middle 70 % of the width — the poster crops the sides), the eyes about 38–40 % from the top (the card shows a wide band around them), and the viewer's POV element in the bottom 20–25 %.

**The viewer line in every prompt** (`THE VIEWER:`) puts the user in the frame without a face; keep it.

**Users of every gender, one set of pictures.** The user is only ever a hand, a sleeve or a shoulder, so one drawing works for everyone; the line asks for a plain hand (medium size, short clean nails, no rings, no polish, no hair, a plain dark sleeve) that reads as neither a man's nor a woman's. The characters keep their own gender; the user picks who they talk to. If a mood ever needs more of the user's body, it is drawn twice and picked by the user's pronouns (`User.pronouns`), never guessed; none of the seven needs it now.

---

## Character Identity, Hands & Wardrobe Table

| id | SUBJECT (face, hair, skin, signature marks) | HANDS (character's own) | WARDROBE by mood |
|---|---|---|---|
| `milo` | Milo, 24yo man. Messy dark curls, warm brown skin, faint nose-bridge freckles, lazy warm eyes, small silver hoop in left ear | Masculine hands with two silver rings | `close_night`/`our_place`: faded charcoal tee under open plaid flannel; `rain`/`city_lights`: dark wet rain jacket over open flannel; `morning`: soft grey sleep tee; `laughing`/`tension`: open dark vintage overshirt over charcoal tee |
| `jace` | Jace, 23yo man, lean boxer's build. Buzzed dark hair, healing cut through one eyebrow, faint cheek scrape, warm brown eyes | Masculine hands with white athletic tape wrapped around knuckles | `close_night`/`morning`: soft dark henley; `rain`/`city_lights`: wet black bomber/leather jacket over hoodie; `laughing`/`tension`: dark fitted tee; `our_place`: grey hoodie with sleeves pushed up |
| `sam` | Sam, 24yo tall athletic woman. Deep rich brown skin, long dark braids tied up with loose curls framing face, warm expressive eyes, small silver hoop earrings | Graceful feminine hands, short clean nails | `close_night`/`morning`: soft oversized off-shoulder lounge sweater; `rain`/`city_lights`: sleek wet dark track jacket; `laughing`/`tension`: stylish fitted dark top; `our_place`: oversized grey athletic hoodie over football kit |
| `roman` | Roman, 31yo tall broad-shouldered man. Black hair combed back with a loose strand, piercing grey eyes, thin scar along jaw | Masculine hands with a plain platinum wedding band on left ring finger | `close_night`/`morning`: dark silk/cotton dress shirt unbuttoned at collar, no jacket or tie; `rain`/`city_lights`: tailored dark wool overcoat wet with rain; `laughing`/`tension`/`our_place`: crisp charcoal dress shirt with sleeves rolled up |
| `ethan` | Ethan, 26yo man. Soft wavy brown hair falling into his eyes, warm hazel eyes, light stubble | Masculine hands, black hair tie on one wrist | `close_night`/`morning`: soft oatmeal knit sweater or white cotton tee; `rain`/`city_lights`: wet denim or canvas jacket over white tee; `laughing`/`tension`: casual layered overshirt; `our_place`: white tee and vintage film camera strap around neck |
| `clara` | Clara, 33yo woman. Sleek dark bob with soft waves, sculpted cheekbones, expressive green eyes behind thin gold round glasses, small gold hoop earrings | Slender feminine hands with a delicate gold ring | `close_night`: soft ivory silk loungewear shirt; `morning`: cozy oversized cream cashmere sweater; `rain`/`city_lights`: wet classic trench coat over blouse; `laughing`/`tension`/`our_place`: elegant black silk blouse |
| `caleb` | Caleb, 27yo broad-shouldered man. Cropped sandy-blond hair, striking blue eyes, sun-kissed skin with light freckles | Strong masculine hands and forearms, small faded burn scar on one wrist | `close_night`/`morning`/`our_place`: soft worn navy henley; `rain`/`city_lights`: wet dark canvas work jacket; `laughing`/`tension`: fitted dark flannel with sleeves rolled up |
| `asher` | Asher, 25yo man. Neat black hair with soft strands falling over forehead, sharp jawline, dark expressive eyes, one dimple | Clean masculine hands (**NO stethoscope or scrubs in any mood**) | `close_night`/`morning`: soft dark crewneck tee; `rain`/`city_lights`: wet tailored dark wool coat; `laughing`/`tension`: crisp dark button-down shirt with top buttons open; `our_place`: dark sweater over collared shirt |
| `mia` | Mia, 25yo woman. Wavy copper-red hair pinned in a tortoiseshell claw clip with loose tendrils, dark brown eyes, freckles across nose and cheeks, tiny silver nose stud | Slender feminine hands (**NO hospital scrubs in any mood**) | `close_night`/`morning`: soft oversized charcoal knit sweater slipping slightly off one shoulder; `rain`/`city_lights`: wet dark coat over soft sweater; `laughing`/`tension`: warm burgundy/dark top; `our_place`: oversized grey hoodie over plain white tee |
| `lena` | Lena, 23yo woman. Honey-blonde hair in a loose side plait with soft wisps, bright grey-blue eyes, light freckles (**NO pencil behind ear**) | Slender feminine hands, tiny faint smudge of ink on fingers | `close_night`/`morning`: soft cream cable-knit jumper; `rain`/`city_lights`/`our_place`: wet light wool coat over knit sweater; `laughing`/`tension`: soft sage or pastel knit top |
| `victor` | Victor, 34yo tall precise man. Thick dark wavy hair with silver-grey at temples, cool brown eyes, clean-shaven sculpted jaw | Masculine hands, sleek brushed-steel wristwatch | `close_night`/`morning`: crisp white dress shirt with top three buttons open (**NO tie, NO jacket**); `rain`/`city_lights`: dark cashmere overcoat over open collar; `laughing`/`tension`/`our_place`: tailored navy suit with loosened tie |
| `yuna` | Yuna, 24yo slight East Asian woman. Straight black hair cut in a blunt chin-length bob with wispy bangs, sleepy dark eyes, small silver hoop earring | Slender feminine hands, faint ink smudges on two fingers (**NO headphones in `close_night`/`rain`/`laughing`/`tension`**) | `close_night`/`morning`/`our_place`: oversized vintage washed-black tee; `rain`/`city_lights`: oversized dark waterproof jacket/hoodie; `laughing`/`tension`: sleek minimal black knit top |

---

### close_night (THE TEST, with Milo)
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and close_night WARDROBE from Character Identity table)
MOMENT: Late at night, very close. They lie on their side facing the camera on a soft dark pillow, or lean in intimately across a quiet dimly lit table; one hand reaches softly toward the lens, almost touching.
THE VIEWER: the viewer's own hand, out of focus at the bottom edge, almost meeting theirs; no face; a plain hand of medium size, short clean nails, no rings or polish, a plain dark sleeve, nothing that says man or woman.
EXPRESSION: A soft, unguarded, deeply affectionate gaze straight into the lens, lips slightly parted in a quiet private smile, eyes glowing with warmth and magnetic pull.
LIGHT: One warm low amber bedside lamp from the side against cool deep night shadows, a luminous catchlight in their eyes, silky soft bokeh behind.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, shallow depth of field.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, hospital scrubs, stethoscope, necktie in bed, posed ID portrait, nudity, text, logos, brand names, watermark, signature, extra fingers.
```

### rain
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and rain WARDROBE from Character Identity table)
MOMENT: Rain at night. They stand close to the viewer under a sheltered doorway or beside a rain-streaked glass window, damp strands of hair and rain droplets on their wet coat, as if they came back just to say what they couldn't earlier.
THE VIEWER: the edge of the viewer's shoulder and plain dark wet sleeve, out of focus in the lower foreground; no face, nothing that says man or woman.
EXPRESSION: Intense longing held just under control, eyes locked on the viewer, lips slightly parted, vulnerability glistening in their gaze.
LIGHT: Cool rainy midnight blue contrasted with a single warm amber doorway or streetlamp light behind them, glowing bokeh raindrops catching the rim light.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, shallow depth of field.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, hospital scrubs, stethoscope, posed ID portrait, text, logos, brand names, watermark, signature, extra fingers.
```

### city_lights
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and city_lights WARDROBE from Character Identity table)
MOMENT: Out in the city at night. Walking a step ahead on a wet neon-lit street, they glance back over their shoulder directly at the viewer and reach one hand back toward the lens, inviting you to catch up.
THE VIEWER: the viewer's blurred plain hand reaching into the bottom foreground edge with a small clear gap before their outstretched hand (hands NOT touching or overlapping, clean separate five-finger anatomy); no face; medium size, short clean nails, no rings or polish, plain dark sleeve, nothing that says man or woman.
EXPRESSION: Eyes alive with playful mischief and quiet fondness, an irresistible half-smile looking back only at you.
LIGHT: Warm amber streetlamps and soft rainy city bokeh (gentle warm gold, soft teal-blue rain reflections, subtle distant city lights) behind them, natural cinematic warm-and-cool rim light across their hair and cheek.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, subtle cinematic depth and motion blur in background.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, readable signs, text, logos, brand names, watermark, signature, extra fingers.
```

### morning
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and morning WARDROBE from Character Identity table)
MOMENT: Early golden morning at home. Hair softly tousled from sleep, wearing cozy morning loungewear, they lean close in the warm kitchen or bedroom doorway holding out a steaming ceramic mug of coffee or tea to the viewer.
THE VIEWER: the viewer's plain hands at the bottom edge reaching to take the mug; no face; medium size, short clean nails, no rings or polish, plain dark sleeve, nothing that says man or woman.
EXPRESSION: A sleepy, crooked, utterly fond smile, eyes soft and warm in the morning light, comfortable and close.
LIGHT: Golden low morning sunlight streaming through a window behind them, warm backlit halo in their hair, delicate rising steam catching the sunbeams.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, shallow depth of field.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, hospital scrubs, stethoscope, necktie, nudity, text, logos, brand names, watermark, signature, extra fingers.
```

### laughing
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and laughing WARDROBE from Character Identity table)
MOMENT: At an intimate night rooftop or warm evening gathering. Caught mid-laugh at something the viewer just whispered, head tipped slightly, eyes sparkling back onto the viewer while leaning in closer.
THE VIEWER: the viewer's blurred dark shoulder and a hand holding a plain clear glass in the lower foreground; no face; plain hand, short clean nails, no rings or polish, plain dark sleeve, nothing that says man or woman.
EXPRESSION: A genuine, radiant, helpless laugh with crinkled happy eyes and warm flushed cheeks, completely drawn into the moment with you.
LIGHT: Warm golden fairy lights and soft city bokeh behind them against deep velvet night sky, warm amber glow on their face.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, shallow depth of field.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, bottle labels, text, logos, brand names, watermark, signature, extra fingers.
```

### tension
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and tension WARDROBE from Character Identity table)
MOMENT: A breathless, charged moment in a quiet doorway or narrow dimly lit hallway. Standing very close, one hand bracing softly against the doorframe, neither leaving nor stepping back after something intense was just said.
THE VIEWER: the viewer's dark, out-of-focus shoulder in one lower foreground corner, standing inches away; no face, nothing that says man or woman.
EXPRESSION: Guarded intensity — jaw set, brow slightly low, holding the viewer's gaze with unspoken hurt, pride, and undeniable pull underneath.
LIGHT: Dramatic chiaroscuro — one sharp warm side light sculpting half their face against cool deep midnight shadows.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, shallow depth of field.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, weapons, blood, violence, text, logos, brand names, watermark, signature, extra fingers.
```

### our_place
Fill in PLACE from the table (each one comes from that character's story, `src/mock/character-stories.ts`).
```
Using the exact same person from the attached reference portrait (keep ONLY their facial features, eye colour, hairstyle, and skin tone; do NOT copy the reference image's background or clothing), create a brand-new vertical 3:4 picture.
SUBJECT: (paste SUBJECT from Character Identity table)
HANDS & WARDROBE: (paste HANDS and our_place WARDROBE from Character Identity table)
MOMENT: Back at PLACE — the signature place from their shared story with the viewer. Already there when the viewer arrives, they look up mid-moment directly into your eyes.
THE VIEWER: the viewer's plain hand or dark shoulder out of focus in the lower foreground, close; no face; medium size hand, short clean nails, no rings or polish, plain dark sleeve, nothing that says man or woman.
EXPRESSION: One unmistakable emotion from their shared story with you — quiet recognition, warmth, or longing held just below the surface — eyes locked onto the lens.
LIGHT: Authentic evening or night lighting for PLACE, one strong warm key light balanced against cool ambient shadow, rich atmospheric bokeh.
COMPOSITION: vertical 3:4, centered horizontally (middle 70% of width), face large and clear with eyes about 38–40% from the top, viewer's POV element in the bottom 20%, shallow depth of field.
STYLE: High-end cinematic 2.5D semi-realistic digital painting matching the attached portrait — smooth luminous natural skin with warm subsurface scattering, realistic hair strands and natural fabric texture, crisp expressive eyes with bright catchlights, deep emotional eye contact, ZERO black ink outlines, ZERO comic lineart, rich warm-against-cool 35mm film lighting and creamy bokeh; an original adult character, not a real person photo, not 2D cartoon or anime.
AVOID: black outlines, dark ink contours, comic book lineart, 2D cartoon, flat cel-shading, anime, harsh gritty noise, readable signs, text, logos, brand names, watermark, signature, extra fingers.
```

| character | PLACE |
|---|---|
| Milo | his small bedroom music studio late at night, warm desk lamp and soft purple-blue DAW screen glow behind, your oversized cream hoodie draped over his chair; he pauses mid-chord at his mini keyboard, pen in hand, looking up with a caught-red-handed smile |
| Jace | outside a brick boxing gym at night under a warm caged amber work light against deep blue night sky, gym bag on the bench; he pauses mid-unwrapping the white athletic tape from his knuckles, looking up with quiet relief and bruised tenderness |
| Sam | the floodlit five-a-side pitch at night after everyone else has left, bright white stadium floodlights creating a golden rim light on her braids and misty night air behind; she sits on the wooden sideline bench holding a football under one arm and reaching out her other hand |
| Roman | the long candlelit dining table in the grand dim house late at night after all the guests have gone, dying tapers and untouched crystal glasses in soft bokeh; he stands beside the table with collar unbuttoned, offering you a warm glass, his composed mask softening into quiet devotion |
| Ethan | the warm-lit kitchen of your shared flat, two ceramic mugs on the counter (one shaped like a little cat); he leans against the counter with his vintage film camera hanging at his chest, looking up with shy, adoring hazel eyes |
| Clara | your warm apartment kitchen at night, amber pendant light above and blue city night outside the window, a pan simmering on the stove; she turns from the counter holding out a poured glass of red wine for you, tired green eyes melting into a fond intimate smile |
| Caleb | your family kitchen late at night when the rest of the house is asleep, only the warm amber stove-hood light on against cool dark shadows; he leans against the counter with a glass of water, caught looking at you with guarded aching longing |
| Asher | the empty university library at closing time at night, tall arched windows with dark rain-blue night outside and a single warm green-shaded brass desk lamp illuminating two stacks of case notes; he looks up from the notes as you walk up, smug grin softening into unguarded warmth |
| Mia | the warm-lit doorway of the apartment you two used to share at dusk, holding a small cardboard box of keepsakes (folded scarf, book) against her hip while her other hand hesitates on the doorframe, looking at you with bittersweet longing and parted lips |
| Lena | the glowing airport arrivals hall at night, soft blurred departure boards and glass doors in background bokeh; she stands with a small shoulder bag, eyes wide and glistening with relief and shy joy as you walk up, reaching a hand toward yours |
| Victor | the quiet rooftop or executive car park late at night after the launch party, soft amber sodium lamps and rain-slick reflections with his dark luxury coupe blurred behind; leaning against the car door with suit jacket open and tie loosened, guarded intensity giving way to longing |
| Yuna | your small shared apartment kitchen at 2 a.m., one warm pendant light over the table against a deep blue night window, the fridge behind with three small square sticky notes taped to it; sitting at the table with a steaming mug of tea pushed toward your side, looking up with quiet sleepy affection |

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

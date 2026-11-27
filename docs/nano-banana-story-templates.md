# Nano Banana: the 100 story templates' pictures (batches 1–7: all 100 characters)

Owner, 2026-11-27: the 100 story characters on Find (`src/lib/templates.ts`) get pictures in the style of the six
group scenes (`assets/portraits/g_cafe.jpg` is the reference the owner picked): **2.5D semi-realistic cinematic
illustration**, never a passport photo. Each picture is an emotional, slightly flirty moment from a different camera
angle, a different scene each time.

## The look (every prompt carries it)
1. **The moment of their first text.** The picture is the template's `scenario` + `opening` action: the second the
   user walks into the story. The character looks at or acts toward the viewer ("you"); the viewer is never shown
   except, at most, a hand or a shoulder in the foreground.
2. **Emotion, a little flirt.** A real feeling from their mask (caught out, blushing, smug, cold, nervous, teasing).
   Not every face smiles. Never a posed headshot, never centred and symmetrical, never looking straight down the lens
   like an ID.
3. **A different camera every time.** Each prompt names its own angle (over-the-shoulder, low, high, through a door,
   close, wide). Sixteen pictures side by side must not look like one template.
4. **Card layout.** Vertical 3:4. The character's face and body in the right two-thirds, face in the upper half; the
   lower-left quarter is calm (dark floor, table, wall) because the card's name and hook sit there.
5. **Style.** Match the attached café group picture: smooth luminous skin, warm subsurface scattering, real hair and
   fabric, warm practical light against cool shadows, 35 mm shallow depth of field, creamy bokeh. Zero black
   outlines, zero comic lineart, zero anime. Original adults (all are 23+), no real people, no text or logos.

## Workflow (the owner draws, Claude wires)
1. A **brand-new Gemini chat** for each character.
2. Attach **`art-new/g_cafe.webp`** (the café group scene) as the style reference.
3. Send the **3:4 scene prompt** → save as `art-new/t_<name>.png`.
4. In the **same chat**, send the **avatar prompt** (the same one for everyone, below) → save as
   `art-new/t_<name>_avatar.png`.
5. Tell Claude when a batch is in `art-new/`: Claude crops, compresses (`assets/portraits/t_*.jpg` 3:4,
   `assets/avatars/t_*_avatar.jpg` 1:1), registers them and checks the cards on the A51.

### Avatar prompt (same chat, after the scene; replace NAME)
```text
Using NAME from the picture you just made, create a square 1:1 avatar for a small round icon. Solo tight head-and-shoulders shot of only that person, face filling most of the frame, turned slightly to one side with the same emotion, never a straight-on ID photo. Keep the exact same face, hair, skin tone, clothes, colours, light and cinematic 2.5D semi-realistic rendering with no outlines. Softly blurred background from the same scene so the face reads at a tiny size. No other people, no text, signature or logo.
```

## Status (batch 1: 8 men, 8 women, every trope): drawn and wired 2026-11-27 (0z387)
- [x] 1. Noah (`t_noah`), best friend
- [x] 2. Maya (`t_maya`), best friend
- [x] 3. Lucas (`t_lucas`), close to home
- [x] 4. Ivy (`t_ivy`), close to home
- [x] 5. Adrian (`t_adrian`), likes you
- [x] 6. Kira (`t_kira`), likes you
- [x] 7. Aurora (`t_aurora`), likes you
- [x] 8. Alexander (`t_alexander`), married
- [x] 9. Isabella (`t_isabella`), married
- [x] 10. Kane (`t_kane`), dangerous
- [x] 11. Raven (`t_raven`), dangerous
- [x] 12. Elliot (`t_elliot`), boss
- [x] 13. Camille (`t_camille`), boss
- [x] 14. Scarlett (`t_scarlett`), enemies
- [x] 15. Oliver (`t_oliver`), ex
- [x] 16. Cassian (`t_cassian`), fantasy

## Status (batches 2–7: 84 remaining, 14 per batch, all tropes mixed in each batch)
- **Batch 2 (17–30):** `[ ]` Theo, Zoe, Gabriel, Nadia, Jonah, Nina, Damian, Luca, Valentina, Grant, Cole, Julian, Seraphine, Ash
- **Batch 3 (31–44):** `[ ]` Rafael, Hana, Dominic, Sofia, Malik, Bianca, Anya, Dante, Serena, Austin, Dana, Aurelian, Elowen, Robin
- **Batch 4 (45–58):** `[ ]` Idris, Elena, Marco, Chloe, Freya, Hugo, Lucia, Silas, Jasper, Vera, Hayden, Mara, Nyx, Sky
- **Batch 5 (59–72):** `[ ]` Kenji, Priya, Felix, Leila, Yasmin, Rhys, Ryder, Lorenzo, Zane, Talia, Diego, Lily, Rowan, River
- **Batch 6 (73–86):** `[ ]` Owen, Jade, Ezra, Aiko, Reina, Sebastian, Matteo, Nikolai, Henry, Tristan, Nathan, Lucien, Lyra, Quinn
- **Batch 7 (87–100):** `[ ]` Arjun, Callum, Grace, Axel, Gideon, Leon, Ruby, Alaric, Draven, Orion, Daniel, Simon, Rosa, June

---

### 1. Noah (`t_noah`): best friend since nine, turned down Berlin
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: late evening on a small city balcony, string lights, the city blurred behind. Noah (26, man, sound engineer) leans on the railing and holds a takeaway coffee out toward the viewer.
LOOK: messy dark-brown hair, light stubble, warm olive skin, an oversized grey hoodie with the sleeves pushed up, headphones around his neck.
EMOTION: a lopsided, guilty half-smile, eyebrows up, eyes on the viewer: "don't make it weird"; a little nervous, a little flirty.
CAMERA: over-the-shoulder POV from the viewer's side, the viewer's blurred shoulder at the left edge; eye level, 35 mm.
COMPOSITION: Noah in the right two-thirds, face in the upper half; lower-left quarter calm (dark railing and floor).
LIGHT: warm string lights on his face against a cool blue night city.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 2. Maya (`t_maya`): best friend who never gives your jacket back
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a rainy afternoon in a cosy flat, rain streaks on the big window. Maya (25, woman, florist) sits curled on the windowsill wrapped in the viewer's oversized denim jacket, pulling it tighter.
LOOK: wavy auburn hair in a loose bun with strands falling, freckles, fair skin, a small sunflower tucked behind one ear, bare feet.
EMOTION: playful defiance, chin down, eyes cutting sideways at the viewer with a teasing smirk: "it's mine now"; a hint of a blush.
CAMERA: low angle from the couch, slightly below her, 50 mm; the window light behind her.
COMPOSITION: Maya in the right two-thirds, face in the upper half; lower-left quarter calm (dim couch cushion and floor).
LIGHT: soft cool grey daylight from the rainy window, warm lamp glow on her face.
STYLE: smooth luminous skin, subsurface scattering, real hair and denim texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 3. Lucas (`t_lucas`): your brother's best friend on your couch
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a living room at night, only a TV glow and one lamp. Lucas (27, man, paramedic) sits up on the couch under a borrowed blanket, one arm stretched along the back of the couch, the front door just closed behind the viewer.
LOOK: short dark-blond hair messy from the pillow, strong jaw, light tan skin, a plain white T-shirt, a paramedic watch.
EMOTION: a slow, mischievous grin, one eyebrow raised, eyes locked on the viewer: "rule one: there are no rules"; confident and flirty.
CAMERA: high angle from the viewer standing by the door, looking down at him on the couch, 35 mm.
COMPOSITION: Lucas in the right two-thirds, face in the upper half; lower-left quarter calm (dark rug and coffee table).
LIGHT: blue TV glow on one side of his face, warm amber lamp on the other.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, readable TV screen, text, logos, watermark, extra fingers.
```

### 4. Ivy (`t_ivy`): your sister's best friend
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: movie night on a couch, a blanket over two laps, a bowl of popcorn. Ivy (26, woman, tattooed bookshop owner) sits right next to the viewer, stealing popcorn from the viewer's hand while someone sleeps blurred in the far corner.
LOOK: black bob with a blunt fringe, dark eyeliner, pale skin, fine-line tattoos on her forearm, an oversized black hoodie that is too big for her.
EMOTION: dry, knowing smirk, eyes sliding toward the viewer without turning her head: "she's asleep; want to watch something good now?"; secretly soft.
CAMERA: close side angle at shoulder height, as if from the seat beside her, 50 mm; the viewer's hand with popcorn in the foreground, blurred.
COMPOSITION: Ivy in the right two-thirds, face in the upper half; lower-left quarter calm (dark blanket).
LIGHT: flickering cool screen light on her face, a warm small lamp behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 5. Adrian (`t_adrian`): the quiet barista who writes on your cup
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a small café at 8 a.m., morning sun through the window. Adrian (28, man, art student and barista) stands behind the counter, a marker still in his hand, just realising the viewer has read the note on the cup.
LOOK: soft black curls, warm brown skin, round thin glasses, a charcoal apron over a cream knit sweater, paint on one knuckle.
EMOTION: caught out, blushing hard, a shy embarrassed smile, eyes flicking up to the viewer and away.
CAMERA: across the counter from the customer side, the viewer's hand holding the paper cup blurred in the foreground (no readable writing), slightly low, 50 mm.
COMPOSITION: Adrian in the right two-thirds, face in the upper half; lower-left quarter calm (dark wooden counter).
LIGHT: golden morning sun slanting across his face, warm pendant light, cool shadow behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, readable text on the cup, logos, brand names, watermark, extra fingers.
```

### 6. Kira (`t_kira`): the baker who saves you the last croissant
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bakery at closing time, empty shelves behind her. Kira (25, woman, pastry chef) pushes a paper bag with one last croissant across the counter toward the viewer.
LOOK: long dark hair in a low braid, East Asian features, flour on her cheek and apron, a mustard-yellow bandana, sleeves rolled.
EMOTION: shy and brave at once: blushing, biting her lip, eyes meeting the viewer's for the first time.
CAMERA: a slightly high angle across the counter, close, 50 mm; the bag sliding toward the lens in the foreground.
COMPOSITION: Kira in the right two-thirds, face in the upper half; lower-left quarter calm (dark counter top).
LIGHT: warm evening glow from the display lights, cool blue dusk through the shop window.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, readable signs, text, logos, watermark, extra fingers.
```

### 7. Aurora (`t_aurora`): the most popular girl at your university
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a lecture hall five minutes before class, rows of wooden seats, her friends blurred and waving in the background. Aurora (24, woman, law student) drops into the seat right beside the viewer, her bag landing on the desk.
LOOK: long glossy platinum-blonde hair, light tan skin, gold hoops, a cropped cream blazer over a white top.
EMOTION: bold, playful confidence, a cheeky smile, chin propped on her hand, eyes on the viewer: "it's mine now"; beneath it, a flicker of nerves.
CAMERA: from the viewer's seat, a sideways eye-level shot across the desk, 35 mm, slight tilt.
COMPOSITION: Aurora in the right two-thirds, face in the upper half; lower-left quarter calm (dark desk wood).
LIGHT: bright soft daylight from high windows, warm skin, cooler hall behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, text on boards, logos, watermark, extra fingers.
```

### 8. Alexander (`t_alexander`): the arranged husband who kept your letters
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a dark wood-panelled study at midnight, bookshelves, a green-shaded desk lamp. Alexander (31, man, shipping heir) stands at his desk, one hand closing a wooden box of old letters, too late: the viewer has seen them.
LOOK: neat dark hair, sharp cheekbones, pale skin, a loosened tie and an open waistcoat over a white shirt, sleeves rolled, a signet ring.
EMOTION: composure cracking: jaw tight, eyes on the viewer, caught and exposed, almost vulnerable.
CAMERA: through the half-open study door, the doorframe dark at the left edge, eye level, 50 mm.
COMPOSITION: Alexander in the right two-thirds, face in the upper half; lower-left quarter calm (dark door and floor).
LIGHT: a pool of warm lamp light on his face and the box, deep cool shadows around.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, readable writing on letters, text, logos, watermark, extra fingers.
```

### 9. Isabella (`t_isabella`): the arranged wife who makes two cups of tea
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet kitchen at dawn, steam rising. Isabella (29, woman, violinist from an old family) sets a cup of tea down on the counter for the viewer.
LOOK: dark hair in an elegant low bun with loose strands, Mediterranean olive skin, a silk robe in deep blue over pyjamas, a thin gold necklace.
EMOTION: guarded tenderness: a tiny almost-smile, eyes lowered, not meeting the viewer's, as if she wants to say something and won't.
CAMERA: a slow close shot from the side, at counter height, 85 mm, the steaming cup sharp in the foreground.
COMPOSITION: Isabella in the right two-thirds, face in the upper half; lower-left quarter calm (marble counter in shadow).
LIGHT: pale cool dawn light from a window behind her, a warm under-cabinet light on her face.
STYLE: smooth luminous skin, subsurface scattering, real hair and silk texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 10. Kane (`t_kane`): the bodyguard who was already waiting outside
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a wet street outside a club at 2 a.m., neon reflections in puddles. Kane (30, man, ex-soldier, bodyguard) holds the back door of a black car open for the viewer.
LOOK: buzz-cut dark hair, a thin scar through one eyebrow, deep brown skin, a black wool coat over a black shirt, an earpiece.
EMOTION: cold and steady on the surface, a faint unimpressed lift at the corner of his mouth: "nice try"; the eyes give away that he was worried.
CAMERA: low angle from the curb, looking up at him, 35 mm, a little Dutch tilt.
COMPOSITION: Kane in the right two-thirds, face in the upper half; lower-left quarter calm (wet dark pavement).
LIGHT: pink-and-teal neon rim light on one side, warm streetlight on his face.
STYLE: smooth luminous skin, subsurface scattering, real fabric and rain, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, anime, cartoon, black outlines, readable neon text, logos, car badges, watermark, extra fingers.
```

### 11. Raven (`t_raven`): the thief stuck in your window
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a flat at 3 a.m., the light just switched on. Raven (27, woman, gentleman thief) is stuck halfway through an open window, hanging upside down from the waist, waving at the viewer.
LOOK: a black hood slipped back, a long black ponytail hanging down, brown skin, a black fitted jacket and gloves, a small pouch on her belt.
EMOTION: caught red-handed and laughing about it: a wide, sheepish, charming grin, eyebrows up: "this isn't what it looks like".
CAMERA: a wide shot from the light switch across the room, eye level, 28 mm, a little comic timing in the frame.
COMPOSITION: the window and Raven in the right two-thirds, her face in the upper half; lower-left quarter calm (dark floor and a sofa edge).
LIGHT: a warm ceiling light just switched on, cool blue night outside the window.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 12. Elliot (`t_elliot`): the founder who called you in at 9 p.m.
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a glass corner office at 9 p.m., the city lights behind, the rest of the floor dark. Elliot (32, man, startup founder) sits at his desk with papers, only now lifting his eyes to the viewer at the door.
LOOK: swept-back black hair, light stubble, East Asian features, a white shirt open at the collar, sleeves rolled, a dark watch, reading glasses pushed up.
EMOTION: intense and unreadable, a long look over the papers; a hint that he called the viewer in for a reason that is not work.
CAMERA: from the doorway, across the desk, slightly low, 50 mm; the glass wall reflections soft.
COMPOSITION: Elliot in the right two-thirds, face in the upper half; lower-left quarter calm (dark desk edge and floor).
LIGHT: a warm desk lamp on his face, cool blue city glow behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, readable papers or screens, text, logos, watermark, extra fingers.
```

### 13. Camille (`t_camille`): the fashion CEO after a terrible board meeting
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a minimalist top-floor office at dusk. Camille (33, woman, fashion house CEO) stands at the floor-to-ceiling window, half turned, glancing back over her shoulder at the viewer.
LOOK: a sleek dark-brown low ponytail, Black woman with luminous deep skin, a tailored ivory suit, gold earrings, heels kicked off beside her.
EMOTION: exhausted and proud: a tired, guarded look over the shoulder, jaw set, eyes letting the viewer see a crack for a second.
CAMERA: from behind and to the side, a long lens (85 mm), her reflection faint in the glass.
COMPOSITION: Camille in the right two-thirds, face in the upper half; lower-left quarter calm (dark polished floor).
LIGHT: orange-pink dusk sky on her face, cool shadows in the room.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, text, logos, brand names, watermark, extra fingers.
```

### 14. Scarlett (`t_scarlett`): your rival, snowed in at the lab
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a university research lab at night, snow falling past the window, glassware glinting. Scarlett (25, woman, chemist) sits on the lab bench holding out the smaller half of a chocolate bar to the viewer.
LOOK: copper-red curly hair in a messy clip, pale freckled skin, a white lab coat over a black turtleneck, safety goggles pushed up on her head, a red pen behind her ear.
EMOTION: a competitive smirk that softens, one eyebrow raised: "you get the small half"; a flicker of warmth she would deny.
CAMERA: medium shot, eye level as if sitting on the stool opposite, 50 mm; her hand with chocolate reaching toward the lens.
COMPOSITION: Scarlett in the right two-thirds, face in the upper half; lower-left quarter calm (dark lab bench).
LIGHT: a warm desk lamp on her, cold blue snow light from the window.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, readable labels or writing, text, logos, watermark, extra fingers.
```

### 15. Oliver (`t_oliver`): the ex in the rain on your doorstep
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a front doorstep at night in heavy rain, the porch light on. Oliver (27, man) stands soaked on the step, hands in his jacket pockets, finally looking up as the door opens.
LOOK: wet light-brown hair falling in his eyes, fair skin, a soaked dark-green jacket over a grey hoodie.
EMOTION: raw regret and hope: red eyes, a trembling, uncertain half-smile, waiting to be sent away.
CAMERA: from inside the door looking out, slightly high, the dark doorframe at the left edge, 35 mm, rain streaks in the light.
COMPOSITION: Oliver in the right two-thirds, face in the upper half; lower-left quarter calm (dark door and floor).
LIGHT: a warm porch light from above on his face, cool blue rain and night behind.
STYLE: smooth luminous wet skin, subsurface scattering, real hair, fabric and rain, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, house numbers, text, logos, watermark, extra fingers.
```

### 16. Cassian (`t_cassian`): the 312-year-old neighbour at midnight
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an old apartment building's hallway at midnight, ornate wallpaper, a flickering sconce. Cassian (looks 30, man, centuries-old vampire neighbour) leans on the viewer's doorframe holding a misdelivered parcel.
LOOK: long dark wavy hair tied back loosely, very pale skin, faint dark circles, an open black shirt with an old-fashioned high collar coat, a vintage ring; no fangs showing.
EMOTION: dry, amused, weary charm: a slow sideways smile, heavy-lidded eyes on the viewer: "I believe this is yours"; lonelier than he lets on.
CAMERA: from inside the flat through the open door, low and close, 50 mm, the door edge dark at the left.
COMPOSITION: Cassian in the right two-thirds, face in the upper half; lower-left quarter calm (dark door and floor).
LIGHT: warm amber sconce light on his face, deep cool shadows in the hallway.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, blood, fangs, horror, anime, cartoon, black outlines, readable labels, text, logos, watermark, extra fingers.
```


---

## Batch 2 (17–30)

### 17. Theo (`t_theo`): your "just friends" making toast in your kitchen at midnight
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a small apartment kitchen at midnight, only the warm hood light over the stove on. Theo (25, man, bike courier) leans his hip against the counter, holding up a piece of warm toast in playful surrender as the viewer walks in.
LOOK: tousled light-brown curls, bright hazel eyes, light tanned skin, a faded charcoal Henley with pushed-up sleeves, a thin silver chain, a messenger bag dropped by the door behind.
EMOTION: caught red-handed and shamelessly charming: a crooked, teasing grin, brows raised, eyes lingering warmly on the viewer like he belongs here.
CAMERA: slightly low angle from the kitchen doorway, 35 mm, candid midnight snapshot feel, soft foreground doorframe at the left.
COMPOSITION: Theo in the right two-thirds, face in the upper half; lower-left quarter calm (dark tiled floor and shadow of the counter).
LIGHT: warm amber stove-hood glow spilling down his face and collarbones against deep cool blue night through the kitchen window.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 18. Zoe (`t_zoe`): the friend who bet she could make you fall for her — day 29
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet corner of a rooftop party at night, warm fairy lights and blurred city skyline behind, distant partygoers far out of focus. Zoe (24, woman, dance teacher) stands close to the viewer, holding out a cold glass while leaning against the brick wall.
LOOK: voluminous dark curly hair pinned back on one side, warm golden-brown skin, expressive dark eyes, small gold hoops, an off-shoulder rust-red top and high-waisted jeans.
EMOTION: playful swagger suddenly melting into nervous honesty: chin slightly tilted up, eyes shining and locked on the viewer a beat too long, a soft, flushed half-smile with a spark of flirtation.
CAMERA: intimate close-medium side angle at eye level, 50 mm, shallow depth of field melting the rooftop lights into soft orbs.
COMPOSITION: Zoe in the right two-thirds, face in the upper half; lower-left quarter calm (dark parapet ledge and night shadow).
LIGHT: warm string lights grazing her cheekbones and collarbone against a cool indigo night sky.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 19. Gabriel (`t_gabriel`): the charming neighbour across the hall with your parcel and dinner
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm-lit apartment hallway in the evening, seen as the viewer opens the front door. Gabriel (28, man, chef) stands just outside holding a small brown parcel tucked under one arm and raising a steaming ceramic plate of pasta with the other.
LOOK: wavy dark-chestnut hair slightly damp from cooking, warm Mediterranean olive skin, neat stubble, dark amused eyes, a dark linen shirt unbuttoned at the collar with sleeves rolled to the elbows.
EMOTION: effortless, teasing warmth: a slow dimpled smile, head tilted, eyes crinkling playfully as if he planned the whole excuse just to see the viewer tonight.
CAMERA: from inside the doorway looking slightly across, 35 mm, dark door edge framing the left side, steam rising softly in the light.
COMPOSITION: Gabriel in the right two-thirds, face in the upper half; lower-left quarter calm (dark hallway floor and open door edge).
LIGHT: warm golden hallway sconce lighting one side of his face, softer cool indoor glow from behind the viewer.
STYLE: smooth luminous skin, subsurface scattering, real hair and linen texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable labels on parcel, text, logos, watermark, extra fingers.
```

### 20. Nadia (`t_nadia`): your best friend's sister who switched the place cards
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a candlelit birthday dinner table in a stylish restaurant, warm glassware and blurred guests down the long table. Nadia (27, woman, lawyer) sits right beside the viewer, leaning in close enough to whisper with one elbow resting lightly on the tablecloth.
LOOK: glossy dark wavy hair swept over one shoulder, warm Middle Eastern olive skin, defined brows, satin emerald-green slip dress with delicate gold jewellery, soft berry lipstick.
EMOTION: daring, knowing flirtation: a secret wicked smile, eyes glancing sideways at the viewer while her chin stays coolly poised, enjoying breaking her brother's rule.
CAMERA: close over-the-table side angle from the seat right beside her, 85 mm, wine glasses softly glowing in the foreground blur.
COMPOSITION: Nadia in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed tablecloth).
LIGHT: flickering warm candlelight across her cheek and collarbones, cool moody restaurant depth behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and satin texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable place cards, text, logos, watermark, extra fingers.
```

### 21. Jonah (`t_jonah`): the rowing captain who sat at your table in an empty library
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet university library late at night, tall arched windows and rows of warm green desk lamps glowing down an almost empty hall. Jonah (26, man, rowing captain and medical student) sits across the corner of the viewer's wooden table, sliding a warm takeaway coffee cup gently across toward the viewer.
LOOK: tousled honey-brown hair, athletic broad shoulders, light freckles across his nose, clear blue-grey eyes, a navy knit crewneck over a white tee, a worn watch on his wrist.
EMOTION: boyish charm mixed with a sudden shy blush: a hopeful, slightly crooked smile, leaning forward on his forearms, eyes warm and soft on the viewer.
CAMERA: slightly low angle from the viewer's seat across the study table, open notebook blurred in the left foreground, 50 mm.
COMPOSITION: Jonah in the right two-thirds, face in the upper half; lower-left quarter calm (dark polished table wood in shadow).
LIGHT: warm amber banker's lamp pooling on his face and hands, cool deep-blue night window behind him.
STYLE: smooth luminous skin, subsurface scattering, real hair and knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable books or cup logos, text, watermark, extra fingers.
```

### 22. Nina (`t_nina`): the gym trainer who always picks the machine next to yours
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a modern dimly lit evening gym at 7 p.m., big floor-to-ceiling windows showing city dusk lights, gym machines softly blurred behind. Nina (23, woman, personal trainer) leans lightly beside the cable machine, one hand resting on the pin as if she just adjusted the viewer's weight without asking.
LOOK: high messy dark ponytail with loose curls framing her glowing face, warm tan Latina skin, light sheen of workout glow, a sleek fitted charcoal athletic top and cropped zip jacket half-off one shoulder, small silver studs.
EMOTION: teasing, fearless challenge: one eyebrow raised, a wicked playful smirk, dark eyes sparkling directly at the viewer like she enjoys flustering them.
CAMERA: dynamic slightly low 35 mm angle from the viewer's workout bench looking up at her, slight tilt for energy.
COMPOSITION: Nina in the right two-thirds, face in the upper half; lower-left quarter calm (dark rubber gym floor and machine shadow).
LIGHT: cool twilight blue from the tall window rim-lighting her shoulder, warm overhead gym spotlights glowing on her face.
STYLE: smooth luminous skin, subsurface scattering, real hair and athletic fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, brand logos, text, watermark, extra fingers.
```

### 23. Damian (`t_damian`): your contract CEO husband offering an extension with no end date
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sleek high-rise penthouse office after hours, rain-speckled glass overlooking glittering city skyscrapers. Damian (33, man, tech founder) leans forward over a dark glass desk, tapping a neat folder of papers with one finger, his wedding ring catching the light.
LOOK: sharply tailored dark charcoal suit with loosened silk tie, sculpted jaw, dark-brown hair neatly styled with one stray lock, intense slate-grey eyes, pale-olive skin.
EMOTION: controlled power giving way to quiet desire: lowered gaze lifting steadily to meet the viewer's eyes, a faint, dangerous half-smile that dares them to say no.
CAMERA: slightly low cinematic angle across the desk from the viewer's chair, 50 mm, moody reflections on the dark tabletop.
COMPOSITION: Damian in the right two-thirds, face in the upper half; lower-left quarter calm (dark glass desk surface).
LIGHT: warm architectural lamp glowing softly on one side of his face against cool cyan-blue skyline lights behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and tailored wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable contract text, logos, watermark, extra fingers.
```

### 24. Luca (`t_luca`): the polite mafia heir after closing at a dark restaurant
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an upscale Italian restaurant after closing, chairs up in the shadowy distance, a single candlelit table set for two. Luca (32, man, mafia heir) sits relaxed in a leather booth, swirling or pouring a deep-red glass of wine as he gestures politely to the empty seat across from him.
LOOK: sleek dark-black hair brushed back, warm Italian olive skin, heavy-lidded dark eyes, tailored black coat draped over a crisp open-collared black shirt, a vintage gold signet ring.
EMOTION: velvet danger and magnetic charm: completely relaxed brow, a slow, possessive half-smile, intense eyes holding the viewer like they already belong beside him.
CAMERA: eye-level medium shot across the candlelit booth, 50 mm, a single wine glass softly glowing in the lower-right foreground.
COMPOSITION: Luca in the right two-thirds, face in the upper half; lower-left quarter calm (dark mahogany tabletop in shadow).
LIGHT: warm golden candle flame and amber wall sconce illuminating his cheekbones against velvety deep shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, leather and fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, guns, violence, anime, cartoon, black outlines, text, bottle labels, logos, watermark, extra fingers.
```

### 25. Valentina (`t_valentina`): the mafia boss's daughter who takes the front passenger seat
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: inside a luxury black sedan parked in a misty villa driveway at night, dashboard lights glowing softly. Valentina (29, woman, mafia boss's daughter) sits in the front passenger seat, buckling her seatbelt while turning her head toward the viewer in the driver's seat.
LOOK: long jet-black hair cascading over one shoulder, striking dark almond eyes, warm olive skin, bold red lips, a tailored black trench coat over a silk camisole, delicate diamond studs.
EMOTION: cool authority with a sharp, flirty edge: chin slightly lifted, slow amused smirk, eyes assessing the viewer with unexpected warmth and curiosity.
CAMERA: intimate interior side angle from the driver's seat looking across the console at her, 35 mm, rain beads on the passenger window behind.
COMPOSITION: Valentina in the right two-thirds, face in the upper half; lower-left quarter calm (dark leather steering wheel edge and shadowed dashboard).
LIGHT: warm villa gate lights through the wet glass catching her hair and cheek, cool dashboard glow underneath.
STYLE: smooth luminous skin, subsurface scattering, real hair, silk and leather texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, anime, cartoon, black outlines, car logos, text, watermark, extra fingers.
```

### 26. Grant (`t_grant`): Friday's stranger walking in Monday morning as your new boss
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bright glass-walled conference room on Monday morning, blurred coworkers seated along the far side. Grant (34, man, new director) pauses near the head of the table, resting one hand on the back of a chair as his gaze locks onto the viewer across the room.
LOOK: salt-and-pepper temples in thick dark-brown hair, sharp jawline with clean stubble, warm light-tan skin, piercing hazel eyes, an impeccably tailored navy suit with a crisp white shirt and no tie.
EMOTION: polished restraint hiding a wicked secret: completely composed posture, yet one corner of his mouth curves into an unmistakable knowing smirk only the viewer understands.
CAMERA: across the long conference table from the viewer's seat, 85 mm telephoto compression isolating him from the blurred team.
COMPOSITION: Grant in the right two-thirds, face in the upper half; lower-left quarter calm (dark matte conference table edge).
LIGHT: crisp morning sunlight slanting through glass blinds across his face, cool modern office shadows behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and suit fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable screens or slides, text, logos, watermark, extra fingers.
```

### 27. Cole (`t_cole`): your sharp-tongued rival who turns out to be your new roommate
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunlit, half-unpacked apartment living room on moving day, cardboard boxes stacked in the blurred background. Cole (26, man, law student) sprawls comfortably across the worn sofa with one arm slung over the cushions, glancing lazily back over his shoulder as the viewer opens the door.
LOOK: messy dark-blond hair falling across his forehead, sharp cheekbones, fair skin, bright teasing green eyes, an unbuttoned flannel over a white tee, rolled sleeves, silver ring.
EMOTION: infuriatingly smug and playfully provocative: a lazy crooked grin, one brow arched as if he already won the argument before it started, a teasing spark in his eyes.
CAMERA: slightly high angle from the open front door looking into the living room, 35 mm, candid moving-day framing.
COMPOSITION: Cole in the right two-thirds, face in the upper half; lower-left quarter calm (dark wooden floor and shadowed box edge).
LIGHT: warm afternoon sunbeams streaming through tall windows across his face, cool shadows across the floor.
STYLE: smooth luminous skin, subsurface scattering, real hair and cotton texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, writing on cardboard boxes, text, logos, watermark, extra fingers.
```

### 28. Julian (`t_julian`): your ex at 2 a.m. holding your folded hoodie
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a dimly lit musician's bedroom at 2 a.m., an acoustic guitar resting in soft shadow behind, warm bedside lamp glowing. Julian (28, man, musician) sits on the edge of the bed holding the viewer's neatly folded oversized hoodie against his lap, glancing up like a late-night video call or candid memory.
LOOK: soft wavy dark-brown hair longer at the nape, warm pale skin, tired soulful brown eyes, light stubble, a loose faded black band T-shirt, thin silver rings.
EMOTION: aching nostalgia and soft longing: eyebrows slightly drawn together, a quiet hesitant half-smile, eyes shining with everything he hasn't stopped feeling.
CAMERA: close intimate eye-level shot at 50 mm, slightly angled from the side, warm lamp bokeh behind him.
COMPOSITION: Julian in the right two-thirds, face in the upper half; lower-left quarter calm (dark bedsheet shadow).
LIGHT: soft golden bedside lamp sculpting his face and hands against deep midnight-blue room shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, phone UI frame, anime, cartoon, black outlines, band text or logos, watermark, extra fingers.
```

### 29. Seraphine (`t_seraphine`): the siren in moonlit shallows asking her price
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a secluded moonlit cove at night, gentle glowing waves lapping dark wet sand and jagged sea rocks. Seraphine (looks 26, woman, siren) rests gracefully in the shallow tide, water shimmering over her collarbones, leaning closer on one elbow toward the viewer on the shore.
LOOK: long damp pearl-silver waves clinging to her shoulders, luminous iridescent bronze-olive skin with faint shimmering sea-droplets, captivating sea-glass teal eyes, draped in flowing translucent dark-teal sea-silk around her shoulders and chest (tasteful, non-explicit).
EMOTION: hypnotic, playful mystery: head tilted slowly to one side, a faint knowing smile, eyes gleaming with dangerous curiosity and unexpected tenderness.
CAMERA: low ground-level POV from the wet shore looking across the glowing water at her, 50 mm, dark foreground ripples.
COMPOSITION: Seraphine in the right two-thirds, face in the upper half; lower-left quarter calm (dark wet sand and moonlit water shadow).
LIGHT: cool silver moonlight pouring across her face and hair, subtle warm bioluminescent shimmer reflecting off the water beneath her chin.
STYLE: smooth luminous wet skin, subsurface scattering, real damp hair and water reflections, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, nudity, explicit clothing, horror, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 30. Ash (`t_ash`): your exhausted doctor partner collapsing beside you Friday night
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet, cosy living room on Friday night, rain pattering softly outside, a single warm floor lamp glowing. Ash (26, androgynous person, junior doctor) sits nestled close on the plush couch, leaning their head gently toward the viewer's blurred shoulder with eyes half-closed in relief.
LOOK: soft tousled dark-chestnut short layered hair, warm olive skin, tired gentle dark eyes with faint shadows underneath, wearing crumpled soft navy scrubs with a warm knit throw blanket draped over their shoulders.
EMOTION: tender vulnerability and quiet devotion: a small, drowsy smile, eyes fluttering up affectionately to meet the viewer's, completely letting their guard down only here.
CAMERA: ultra-intimate close side angle from the viewer's spot on the couch, 50 mm, viewer's blurred sleeve at the far left edge.
COMPOSITION: Ash in the right two-thirds, face in the upper half; lower-left quarter calm (dark wool blanket and couch shadow).
LIGHT: warm amber floor lamp bathing their cheek and lashes against cool blue twilight rain on the window behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, hospital clutter, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

---

## Batch 3 (31–44)

### 31. Rafael (`t_rafael`): your tattoo-artist best friend catching up outside the bar
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet cobblestone street outside a glowing neighbourhood bar on Saturday night, warm pub lights blurred behind. Rafael (27, man, tattoo artist) has just caught up to the viewer, slightly out of breath, hands tucked into his jacket pockets while stepping close.
LOOK: wavy jet-black hair swept carelessly back, warm Latino tan skin, dark expressive eyes, fine-line ink peeking above his collar and wrists, a worn black leather jacket over a soft white crew tee, small silver hoop earring.
EMOTION: guilty, disarming honesty with an undeniable spark: brows knitted lightly, a breathless crooked half-smile, eyes pleading and intense: "let me explain why I want to lose the bet".
CAMERA: eye-level medium close-up from the viewer's perspective pausing on the sidewalk, 50 mm, warm streetlamp bokeh behind.
COMPOSITION: Rafael in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wet pavement).
LIGHT: warm neon bar sign and amber streetlight painting his jawline against cool midnight-blue street shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, leather and ink detail, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable bar signs, text, logos, watermark, extra fingers.
```

### 32. Hana (`t_hana`): your grumpy best friend and roommate taping rules to the fridge
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bright, lived-in shared kitchen on Sunday morning, coffee steaming on the counter. Hana (26, woman, vet nurse) stands beside a magnet-covered fridge, tapping a fresh sheet of paper with the cap of a black marker while glaring sideways at the viewer.
LOOK: shoulder-length straight dark-brown hair clipped loosely half-up, East Asian features, fair skin with a tiny hint of morning flush, an oversized sage-green sweater slipping slightly off one shoulder, bare wrist with a hair tie.
EMOTION: mock-strict grumpiness failing to hide a crush: one eyebrow cocked, lips pressed in an almost-smile, eyes flustered as she catches the viewer looking at her before coffee.
CAMERA: medium candid shot across the breakfast bar at eye level, 35 mm, a coffee mug softly blurred in the foreground.
COMPOSITION: Hana in the right two-thirds, face in the upper half; lower-left quarter calm (dark counter shadow).
LIGHT: crisp golden morning sun streaming across the kitchen floor, soft cool shadow behind the fridge.
STYLE: smooth luminous skin, subsurface scattering, real hair and knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable writing on fridge paper, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 33. Dominic (`t_dominic`): your brother's cold best friend cutting in at the party
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a crowded house party living room at night, warm fairy lights and blurred silhouettes behind, a retreating stranger barely visible far in the background blur. Dominic (29, man, carpenter) stands close in front of the viewer, arms loosely crossed, turning his head back down toward the viewer after scaring the stranger off.
LOOK: short dark-brown hair, rugged stubble, broad shoulders, weathered olive skin, intense dark-hazel eyes, a dark-brown henley shirt with forearms exposed, worn leather bracelet.
EMOTION: fierce quiet protectiveness cracking into rare gentleness: jaw still tense from jealousy, yet his eyes soften unmistakably as he checks if the viewer is okay.
CAMERA: low-angle close-medium shot looking slightly up at him, 50 mm, intimate closeness in the bustling room.
COMPOSITION: Dominic in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed room corner).
LIGHT: warm amber party lamp grazing his brow and collarbone, cool dim blue shadows behind him.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, fighting, violence, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 34. Sofia (`t_sofia`): your summer houseguest eating cereal in your hoodie
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunny apartment kitchen on the first morning of summer, bright daylight pouring over a small wooden table. Sofia (24, woman, nursing student) perches on a barstool with her knees tucked up, holding a cereal bowl and waving her spoon cheerfully at the viewer.
LOOK: long sun-streaked wavy brown hair slightly messy from sleep, warm Latina golden skin, bright laughing brown eyes, wearing the viewer's huge faded navy hoodie with sleeves covering half her hands.
EMOTION: sunny chaotic flirtation: cheeky grin, head tilted playfully, eyes sparkling with an unmistakable crush disguised as breezy teasing.
CAMERA: slightly high candid angle from the viewer walking into the kitchen, 35 mm, lively morning energy.
COMPOSITION: Sofia in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed table corner).
LIGHT: warm golden morning light pouring from a side window, glowing dust motes, soft cool indoor shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and fleece hoodie texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, cereal box text, logos, watermark, extra fingers.
```

### 35. Malik (`t_malik`): your office coworker pretending he didn't make your exact coffee
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sleek sunlit office pantry at 9 a.m., espresso machine gleaming softly behind. Malik (29, man, accountant) leans calmly against the marble counter, hands tucked in his pockets, glancing innocently up toward the ceiling while a freshly made takeaway cup sits right beside his elbow for the viewer.
LOOK: neat short locs with clean fade, rich deep brown skin, warm intelligent dark eyes, slim tortoiseshell glasses, a soft camel knit cardigan over a crisp white shirt.
EMOTION: deadpan dry humour hiding a year-long crush: trying hard not to smile, corner of his mouth twitching upward, eyes sneaking a warm sideways glance back at the viewer.
CAMERA: medium across-the-counter shot from the doorway, 50 mm, the fresh coffee cup sharp in the mid-foreground.
COMPOSITION: Malik in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed counter edge).
LIGHT: clean warm morning sunlight across his cheek and cardigan, soft cool office glass reflections behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and knit texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable name on cup, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 36. Bianca (`t_bianca`): your dramatic coworker grabbing your arm before Mom's video call
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an empty glass-walled office meeting room in late afternoon, an open laptop glowing on the table behind her. Bianca (26, woman, marketing manager) leans close into the viewer's space, reaching playfully toward the viewer's sleeve as she gives frantic last-second fake-boyfriend instructions.
LOOK: glossy chestnut waves styled with a claw clip, warm fair-olive Italian skin, lively hazel eyes, gold layered necklaces, a chic blush-toned blazer over a fitted white top.
EMOTION: breathless chaotic charm with a secret thrill: wide sparkling eyes, excited teasing grin, cheeks slightly flushed from pulling the viewer close on purpose.
CAMERA: dynamic close-up POV with slight Dutch tilt, 35 mm, capturing her leaning into the viewer's frame.
COMPOSITION: Bianca in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed table edge).
LIGHT: warm late-afternoon golden sun slanting through office windows, cool laptop screen rim-light on her fingers.
STYLE: smooth luminous skin, subsurface scattering, real hair and tailored blazer fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable laptop screen, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 37. Anya (`t_anya`): your ice-cold contract wife whispering at a glittering gala
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a grand ballroom gala at night, crystal chandeliers dissolving into warm golden bokeh, blurred guests in evening wear behind. Anya (30, woman, board director) stands close at the viewer's side, her gloved or bare hand resting lightly on the viewer's blurred arm as she turns her face slightly toward them to whisper.
LOOK: sleek ash-blonde hair swept into a sculpted low chignon, pale Slavic features, cool ice-blue eyes, silver drop earrings, an architectural black velvet evening gown with clean neckline.
EMOTION: regal composure softening by a millimeter: a poised society smile for the room, yet her eyes hold the viewer's with quiet, unexpected gratitude and hidden warmth.
CAMERA: close side-by-side 85 mm shot as if photographed from the viewer's shoulder height, chandelier orbs glowing behind.
COMPOSITION: Anya in the right two-thirds, face in the upper half; lower-left quarter calm (dark tuxedo sleeve shadow and dim ballroom edge).
LIGHT: warm chandelier gold catching her cheekbones and earrings against deep cool midnight-blue shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and velvet texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 38. Dante (`t_dante`): the biker-crew leader offering you a ride on a night highway
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: the dark shoulder of an open highway at night, a row of parked motorcycles gleaming in blurred red tail-lights behind. Dante (27, man, mechanic and biker leader) kneels near the viewer's open car hood, straightening up with a small flashlight in hand and gesturing back toward his bike.
LOOK: windswept dark-brown hair, sun-tanned rugged skin, strong jaw with short beard, warm teasing brown eyes, a scuffed black leather riding jacket over a dark grey tee, mechanic's silver rings.
EMOTION: roguish, effortless flirtation: an easy cocky grin, brow relaxed, eyes gleaming warmly as he leaves the choice up to the viewer.
CAMERA: low dramatic angle beside the car fender, 35 mm, golden headlight beam slicing through cool night air.
COMPOSITION: Dante in the right two-thirds, face in the upper half; lower-left quarter calm (dark asphalt road and shadow).
LIGHT: warm golden headlamp glow across his face and leather collar against cool moonlit highway blue and distant crimson tail-lights.
STYLE: smooth luminous skin, subsurface scattering, real hair and worn leather texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, gang patches, readable licence plates, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 39. Serena (`t_serena`): your new manager who rejected you in college — first one-on-one
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a polished modern office with frosted glass walls in late afternoon, city buildings soft outside. Serena (30, woman, rising manager) sits across a dark wooden desk, hands neatly folded over a closed notebook, leaning slightly forward after closing the door behind the viewer.
LOOK: rich dark-brown hair in smooth sculpted waves, warm South Asian golden-brown skin, sharp dark eyes, understated gold watch and hoop earrings, a fitted cream silk blouse and dark trousers.
EMOTION: crisp professionalism cracking into electric honesty: poised chin, intense unwavering eye contact, a faint rueful smile that admits she never stopped thinking about the viewer.
CAMERA: eye-level shot across the desk from the visitor's chair, 50 mm, glass reflections framing the right edge.
COMPOSITION: Serena in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed desk surface).
LIGHT: warm late-day sun casting soft amber highlights on her face against cool slate office shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and silk fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, readable documents, text, logos, watermark, extra fingers.
```

### 40. Austin (`t_austin`): your enemy sliding the "fake dating" napkin across the café table
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bustling warm-toned neighbourhood café in late afternoon, espresso steam and soft amber lights in the background. Austin (27, man, personal trainer) leans back slightly in the booth across from the viewer, sliding a pen and folded napkin across the wooden table with two fingers.
LOOK: athletic build, wavy golden-brown hair, tanned skin, bright playful blue eyes, a fitted olive henley with rolled sleeves showing strong forearms, sporty silver watch.
EMOTION: shameless cocky charm: a dazzling, teasing grin, one eyebrow lifted high: "rule one: no falling for me", clearly enjoying the game a little too much.
CAMERA: slightly angled over-the-table booth shot at 35 mm, coffee cups softly blurred in the foreground edge.
COMPOSITION: Austin in the right two-thirds, face in the upper half; lower-left quarter calm (dark wooden tabletop shadow).
LIGHT: warm golden window sunlight illuminating one side of his grin, cool café shadows behind him.
STYLE: smooth luminous skin, subsurface scattering, real hair and cotton texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable writing on napkin, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 41. Dana (`t_dana`): your ex showing up an hour early to your birthday with your scarf
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an apartment doorway in the early evening before guests arrive, warm string lights and hallway shadows behind. Dana (27, woman, illustrator) stands on the threshold holding out a soft knitted scarf looped over her fingers, half-smiling before stepping in.
LOOK: choppy dark-espresso bob tucked behind one ear, fair olive skin, sharp clever hazel eyes, faint smudge of charcoal on one thumb, an oversized camel wool coat over a black turtleneck.
EMOTION: dry teasing shielding genuine longing: head slightly tilted, a wry fond smirk, eyes softening as she looks at the viewer for the first time in a year.
CAMERA: from inside the flat looking out at eye level, 50 mm, warm door edge framing the left side.
COMPOSITION: Dana in the right two-thirds, face in the upper half; lower-left quarter calm (dark open door and hallway floor).
LIGHT: warm indoor glow illuminating her face and the wool scarf against cool evening corridor light behind her.
STYLE: smooth luminous skin, subsurface scattering, real hair and wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, house numbers, text, logos, watermark, extra fingers.
```

### 42. Aurelian (`t_aurelian`): the young emperor walking past everyone to offer you his hand
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a grand marble palace hall lit by tall torches and moonlight through Gothic arches, shocked court nobles blurred far in the background. Aurelian (29, man, young emperor) has stopped directly in front of the viewer, extending one gloved or bare hand toward them in quiet command.
LOOK: dark wavy hair brushed back beneath a thin understated gold circlet, noble pale-bronze skin, striking piercing amber-grey eyes, a high-collared deep-midnight velvet imperial coat embroidered with fine antique gold thread.
EMOTION: fierce imperial authority softened by sudden fascination: chin high, unwavering gaze locked solely on the viewer, the barest appreciative curve at his mouth for the only one who didn't bow.
CAMERA: slightly low cinematic angle looking up at him as his hand reaches into the lower foreground, 35 mm, sweeping grandeur behind.
COMPOSITION: Aurelian in the right two-thirds, face in the upper half; lower-left quarter calm (dark polished marble floor shadow).
LIGHT: warm golden torchlight across his cheekbone and gold embroidery against cool silver moonlight streaming from tall arches.
STYLE: smooth luminous skin, subsurface scattering, real hair, velvet and gold metallic sheen, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 43. Elowen (`t_elowen`): the elf princess holding out a silver ring in the forest court
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an ancient twilight forest court glowing with floating golden lanterns among towering silver-barked trees, noble guests blurred behind. Elowen (25, woman, elf princess) pauses directly in front of the viewer, holding out a delicate engraved silver ring between her fingers.
LOOK: long flowing moon-blond hair braided loosely at the temples, softly pointed elf ears, luminous fair skin, vivid emerald eyes, wearing an ivory-and-forest-green embroidered silk gown with silver leaf clasps.
EMOTION: regal daring masking a heartbeat of vulnerability: poised chin, intense pleading-yet-bold gaze locked on the viewer, lips parted slightly as if silently begging them to trust her.
CAMERA: intimate eye-level medium shot, 50 mm, the silver ring gleaming softly toward the foreground, warm lantern orbs behind.
COMPOSITION: Elowen in the right two-thirds, face in the upper half; lower-left quarter calm (dark mossy forest floor shadow).
LIGHT: warm golden lantern glow lighting her face and ring against cool twilight-blue forest mist.
STYLE: smooth luminous skin, subsurface scattering, real hair and silk embroidery, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 44. Robin (`t_robin`): the wandering musician offering one earphone on the night train
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet sleeper train compartment gliding past snow-dusted moonlit mountains at night, condensation along the windowpane. Robin (27, androgynous person, wandering musician) sits beside the viewer by the window, holding out one wired earbud with a gentle smile while the other rests in their ear.
LOOK: soft tousled dark-auburn wavy hair, warm freckled fair skin, dreamy warm-brown eyes, an oversized vintage olive wool coat over a chunky knit scarf, a worn guitar case tucked in the dim rack behind.
EMOTION: quiet poetic intimacy and gentle warmth: soft knowing smile, eyes warm and steady on the viewer like sharing a secret at midnight.
CAMERA: close side-seat POV from the seat right beside them, 50 mm, the small earphone held gently toward the lens.
COMPOSITION: Robin in the right two-thirds, face in the upper half; lower-left quarter calm (dark train seat cushion and aisle shadow).
LIGHT: warm dim overhead reading light glowing on their face against deep sapphire-blue mountain night outside the window.
STYLE: smooth luminous skin, subsurface scattering, real hair and wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```


---

## Batch 4 (45–58)

### 45. Idris (`t_idris`): your fake plus-one pulling you onto the wedding dance floor
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm fairy-lit wedding reception dance floor at night, dancing guests and glowing string lights softly blurred behind. Idris (26, man, pharmacist) has just stepped close on a slow song, holding out his hand toward the viewer while grinning warmly for the watching family.
LOOK: neat short black waves, rich deep brown skin, dazzling warm smile with dimples, a tailored deep-burgundy suit jacket over a crisp open-collared black shirt, gold watch.
EMOTION: effortless charm turning genuinely breathless: playful sparkling eyes lingering on the viewer: "smile, your aunt is watching — also, you look unfair tonight", warm and unmistakably flirty.
CAMERA: close dance-floor POV slightly low looking up into his eyes, 35 mm, golden reception lights dissolving into dreamy bokeh.
COMPOSITION: Idris in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed dance floor).
LIGHT: warm golden string lights illuminating his face and suit lapels against cool evening shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and tailored fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 46. Elena (`t_elena`): your summer best friend back on the old pier after six years
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an old weathered wooden pier stretching over calm golden water at sunset, warm orange-violet sky reflecting on ripples behind. Elena (25, woman, photographer) sits perched on the edge of the pier planks, lowering her vintage film camera from her face as she looks up to see the viewer walking closer.
LOOK: windswept soft chestnut hair catching sunset gold, warm light-olive skin, soulful amber-brown eyes, an airy cream linen shirt over denim shorts, camera strap looped over her shoulder, silver anklets.
EMOTION: bittersweet nostalgia blooming into magnetic warmth: a luminous, unguarded smile like six years vanished in one second, eyes shining softly at the viewer.
CAMERA: slightly high walking-up POV from along the wooden pier, 50 mm, sunlit water glistening behind her.
COMPOSITION: Elena in the right two-thirds, face in the upper half; lower-left quarter calm (dark weathered pier planks in shadow).
LIGHT: rich golden-hour sunset rim-lighting her hair and cheek against cool violet-blue twilight water.
STYLE: smooth luminous skin, subsurface scattering, real hair and linen texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, camera brand names, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 47. Marco (`t_marco`): the charming pilot best man saving the last dance
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an almost-empty grand wedding pavilion late at night, scattered candlelit tables and glass doors opening onto a starry terrace. Marco (30, man, commercial pilot) stops gracefully before the viewer, offering one hand with a slight old-world bow as the last slow song begins.
LOOK: impeccably styled dark-brown hair with a loose strand, tanned Mediterranean skin, clean-shaven strong jaw, intense dark eyes, a midnight-blue tuxedo with undone bow tie draped loosely around his open collar.
EMOTION: polished confidence hiding quiet loneliness: a warm knowing half-smile, eyes gleaming softly and holding the viewer's gaze with unmistakable allure.
CAMERA: medium 50 mm shot at eye level from the viewer's seated perspective, his offered hand extending gently toward the foreground.
COMPOSITION: Marco in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed terrace floor).
LIGHT: warm candle glow across his cheekbones and white shirt against cool moonlit glass behind him.
STYLE: smooth luminous skin, subsurface scattering, real hair and tuxedo wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 48. Chloe (`t_chloe`): the neighbour's daughter pretending she can't fix her bike chain
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunlit suburban driveway in late afternoon, leafy trees casting dappled shadows, an upside-down vintage bicycle resting beside her. Chloe (23, woman, mechanical engineering graduate) crouches beside the bike wheel, holding up a small wrench helplessly with a tiny smudge of grease on her cheek.
LOOK: golden-blonde hair in a messy half-up bun, sun-kissed freckled skin, bright sparkling blue eyes, wearing a cropped sage tank top, overalls with one strap undone, sneakers.
EMOTION: adorably bad acting and sunny flirtation: biting back a mischievous grin, eyebrows lifted innocently as if she totally didn't stage this excuse to talk to the viewer.
CAMERA: slightly high candid angle from the viewer strolling down the driveway, 35 mm, warm afternoon flare in the leaves.
COMPOSITION: Chloe in the right two-thirds, face in the upper half; lower-left quarter calm (shaded asphalt driveway).
LIGHT: warm golden late-afternoon sunlight catching her hair and freckled cheek against cool leafy shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and denim texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 49. Freya (`t_freya`): the cool sound designer texting you at 1 a.m. after the party
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a dimly lit moody studio apartment at 1 a.m., vinyl records and warm amber studio monitors blurred behind, rain-kissed city window. Freya (25, woman, sound designer) sits curled in an armchair holding her glowing phone, biting her lower lip just after hitting send on her late-night text.
LOOK: silver-streaked dark wavy hair past her shoulders, pale Nordic features, striking cool grey-green eyes, dark minimalist knit sweater slipping off one shoulder, multiple small silver ear piercings.
EMOTION: cool exterior giving way to restless midnight yearning: eyes glancing up over the phone with a dry, daring half-smile and a faint blush she'd never admit to.
CAMERA: intimate 85 mm angled close-medium shot, soft glow from her phone illuminating her chin and fingers.
COMPOSITION: Freya in the right two-thirds, face in the upper half; lower-left quarter calm (dark armchair arm and shadowed room).
LIGHT: cool-white phone glow on her lower face balanced by warm amber studio lamp behind her shoulder.
STYLE: smooth luminous skin, subsurface scattering, real hair and knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable phone screen, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 50. Hugo (`t_hugo`): your stubborn husband sitting up on the couch at 1 a.m. after a fight
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet dimly lit living room at 1 a.m., streetlights filtering through sheer curtains. Hugo (30, man, teacher) sits up on the sofa from under a crumpled throw blanket, still wearing his rumpled collared shirt, looking straight at the viewer who just stepped into the hallway.
LOOK: messy warm-brown hair, light beard stubble, fair tanned skin, earnest tired brown eyes, a soft grey unbuttoned shirt over a white tee, plain gold wedding band visible on his hand resting on his knee.
EMOTION: pride completely surrendered to love: soft brows, an aching honest half-smile, eyes warm and vulnerable as he asks to talk and offers to apologise first.
CAMERA: slightly high angle from the living-room doorway, 50 mm, quiet midnight stillness.
COMPOSITION: Hugo in the right two-thirds, face in the upper half; lower-left quarter calm (dark carpeted floor and coffee table edge).
LIGHT: cool moonlight from the curtained window across one side of his face, faint warm hallway light from behind the viewer.
STYLE: smooth luminous skin, subsurface scattering, real hair and cotton fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, anger, scowl, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 51. Lucia (`t_lucia`): your wife back from three months at sea, stopping in arrivals
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bright glass-roofed airport arrivals hall at golden twilight, travellers and glowing departure boards softly blurred behind. Lucia (27, woman, marine biologist) has stopped a few steps through the sliding doors beside her single rolling suitcase, hands sliding nervously off the handle as she sees the viewer.
LOOK: sun-bleached dark wavy hair tied loosely back with windblown strands, warm sun-kissed Spanish skin, luminous dark eyes, a worn olive field jacket over a soft striped knit, plain wedding ring.
EMOTION: quiet shy ache breaking into overwhelming relief: misty shining eyes, a trembling tender smile, stepping half a pace closer as if dying to be held.
CAMERA: eye-level 85 mm telephoto compression from the waiting barrier, isolating her completely from the soft blurred airport crowd.
COMPOSITION: Lucia in the right two-thirds, face in the upper half; lower-left quarter calm (dark glossy terminal floor reflection).
LIGHT: warm golden sunset streaming through tall airport glass across her face against cool terminal steel blues.
STYLE: smooth luminous skin, subsurface scattering, real hair and jacket texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable airport signs, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 52. Silas (`t_silas`): the night street racer tapping the passenger seat for his lucky charm
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an empty neon-lit city bridge starting line at midnight, wet asphalt shimmering with colourful reflections, distant sports cars blurred behind. Silas (29, man, car designer and street racer) leans smoothly out of the lowered driver's window of a sleek dark matte coupe, resting one arm on the door and looking directly at the viewer.
LOOK: sleek windblown black hair, sharp chiseled features, cool light-olive skin, piercing dark eyes, a matte-black bomber jacket over a black crew neck, thin silver chain and driving watch.
EMOTION: magnetic, dangerous composure with a flirty glint: a slow confident smirk, eyes locking onto the viewer like a magnet: "I don't race without my good luck — get in".
CAMERA: low 35 mm angle just outside the passenger window looking across the hood into his eyes, dramatic neon bokeh streaks.
COMPOSITION: Silas in the right two-thirds, face in the upper half; lower-left quarter calm (dark glossy car door and wet road shadow).
LIGHT: electric teal and warm amber streetlamps slicing across his cheekbones and dark car bodywork.
STYLE: smooth luminous skin, subsurface scattering, real hair, fabric and wet metal reflections, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, car brand emblems, licence plates, weapons, anime, cartoon, black outlines, text, watermark, extra fingers.
```

### 53. Jasper (`t_jasper`): your office rival rolling his chair over with truce coffee at night
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet open-plan office late at night, city skyline sparkling through glass windows, only two desk lamps still glowing. Jasper (30, man, sales lead) has rolled his swivel chair right up beside the viewer's desk, setting a warm takeaway coffee gently onto the edge of the desk while leaning in playfully.
LOOK: thick wavy dark-auburn hair slightly ruffled from a long day, warm fair skin with a light beard shadow, bright teasing hazel-green eyes, crisp light-blue button-down with loosened tie and rolled sleeves.
EMOTION: disarming rival charm: a crooked lopsided grin, brow arched playfully, eyes warmer and closer than any workplace truce should allow.
CAMERA: seated eye-level side angle from the viewer's desk chair, 35 mm, coffee cup sharp in the lower foreground.
COMPOSITION: Jasper in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed desk mat).
LIGHT: warm amber desk lamp glowing across his face and shirt against cool blue night skyline behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and cotton shirt texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable computer screens or notes, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 54. Vera (`t_vera`): your sharp old rival seated beside you at the wedding rehearsal
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm candlelit garden conservatory during a wedding rehearsal at dusk, floral arches and blurred guests behind. Vera (26, woman, bridesmaid) sits right next to the viewer on a wooden bench, arms loosely folded, turning only her eyes sideways toward the viewer with surprising quiet vulnerability.
LOOK: glossy raven-black hair in sleek loose waves, porcelain skin with subtle blush, striking dark cat-like eyes, wearing a draped champagne-rose satin bridesmaid dress and delicate pearl studs.
EMOTION: sharp pride softening into quiet regret and tension: lips slightly parted, cool guarded smirk hiding a flicker of genuine warmth and nervous honesty.
CAMERA: close side-by-side 85 mm profile-three-quarter shot from the seat next to her, floral fairy lights melted into creamy bokeh.
COMPOSITION: Vera in the right two-thirds, face in the upper half; lower-left quarter calm (dark wooden pew and evening shadow).
LIGHT: soft rose-gold dusk light grazing her cheek and satin dress against cool twilight conservatory greens.
STYLE: smooth luminous skin, subsurface scattering, real hair and satin texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 55. Hayden (`t_hayden`): your ex, now a famous chef, setting down your secret favourite dish
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an intimate Michelin-style dining room at night, dim warm pendant lights over white-linen tables, open kitchen glowing softly behind. Hayden (30, man, celebrity chef) leans calmly beside the viewer's table, placing an artfully plated dish down himself with one hand resting lightly on the table edge.
LOOK: tousled dark-blond hair, sharp features with neat stubble, warm tanned skin, intense grey-blue eyes, a tailored black double-breasted chef coat with sleeves rolled to show forearms.
EMOTION: cool cocky mastery hiding desperate anticipation: one eyebrow raised, a slow challenging half-smile, eyes watching the viewer's reaction like nothing else in the room exists.
CAMERA: seated low-angle shot from the critic's chair looking up at him as he sets the plate down, 50 mm.
COMPOSITION: Hayden in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed table corner).
LIGHT: focused warm overhead spotlight illuminating his face and the dish against moody dim restaurant shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and heavy cotton chef coat texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable menus, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 56. Mara (`t_mara`): the gallery owner ex walking into your meeting room as your new client
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sleek sunlit glass-walled creative agency meeting room, framed modern art blurred on the wall behind. Mara (27, woman, gallery owner) sits poised across the minimalist table, legs crossed, resting her chin lightly near her fingertips as she studies the viewer calmly.
LOOK: rich mahogany-brown hair styled in a chic sculptural waves bob, luminous deep-caramel skin, dark observant eyes, sleek gold cuff bracelet, a sharp camel tailored blazer over a black silk turtleneck.
EMOTION: poised power laced with unmistakable old tension: a cool amused half-smile, eyes lingering knowingly on the viewer: "I wanted to see if you'd look at me the same way".
CAMERA: eye-level 85 mm across-the-table shot, shallow depth of field isolating her commanding gaze.
COMPOSITION: Mara in the right two-thirds, face in the upper half; lower-left quarter calm (dark matte conference table).
LIGHT: bright soft architectural daylight from tall side windows illuminating her cheek and gold jewellery, crisp cool shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, wool and silk texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 57. Nyx (`t_nyx`): the chaotic witch magically tethered to your café table
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a cosy rain-streaked evening café with glowing brass lamps and warm wooden booths. Nyx (27, woman, modern witch) has just flopped back dramatically into the chair opposite the viewer, a faint delicate shimmer of violet-gold magical sparks curling invisibly around her wrist toward the viewer's side of the table.
LOOK: wild layered midnight-purple-black hair with messy bangs, pale warm skin, bright mischievous violet-hazel eyes, silver moon rings, a dark plum knit cardigan over a black camisole and velvet choker.
EMOTION: sheepish panic mixed with playful flirtation: wide expressive eyes, a guilty lopsided grin, leaning forward on her elbows: "small problem — we're magically stuck".
CAMERA: slightly angled across-the-table 35 mm candid shot, tiny golden magic motes floating softly in the bokeh.
COMPOSITION: Nyx in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden tabletop).
LIGHT: warm amber café table lamp and subtle lavender-gold spark light across her cheek against cool rainy window blue.
STYLE: smooth luminous skin, subsurface scattering, real hair and knit fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, pointed witch hat, halloween costume, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 58. Sky (`t_sky`): the barista friend who showed up alone to your birthday with a tiny cake
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet dimly lit apartment doorway at night, warm fairy lights glowing faintly inside. Sky (25, warm androgynous person, barista) stands just inside the threshold holding a tiny homemade birthday cake topped with one glowing lit candle, its warm flame lighting their face.
LOOK: fluffy tousled golden-brown short curls, warm freckled medium-tan skin, bright crinkled hazel eyes, a cosy oversized cream knitted sweater with pushed-up sleeves, playful beaded bracelet.
EMOTION: radiant, tender warmth with a sweet lingering spark: a beaming genuine smile, eyes shining softly over the candlelight: "make a wish, a big one".
CAMERA: intimate eye-level 50 mm shot across the glowing candle flame, soft golden light wrapping their face.
COMPOSITION: Sky in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed hallway floor and door edge).
LIGHT: warm flickering golden candlelight illuminating their smile and eyes against deep cool indigo evening shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and chunky knit texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

---

## Batch 5 (59–72)

### 59. Kenji (`t_kenji`): your gaming duo logging on at 2 a.m. pretending he wasn't waiting
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a cosy dark gaming bedroom at 2 a.m., dual glowing monitors softly blurred off to one side, warm LED desk strip glowing behind. Kenji (24, man, night-shift programmer) leans back slightly in his chair adjusting his headset mic, eyes glancing sideways toward the webcam/viewer after a week of quiet jealousy.
LOOK: messy jet-black hair falling over his brow, East Asian features, fair skin, dark tired-yet-sharp eyes, black headset resting over one ear and half-off the other, a dark oversized hoodie.
EMOTION: deadpan sulking barely hiding relief and a crush: trying to look unbothered, one corner of his mouth giving away a soft fond smirk, faint blush on his ears.
CAMERA: slightly angled close-up desk POV at 50 mm, warm mug and keyboard edge blurred in the foreground.
COMPOSITION: Kenji in the right two-thirds, face in the upper half; lower-left quarter calm (dark desk mat and room shadow).
LIGHT: cool cyan-indigo monitor glow on one side of his face balanced by warm amber desk lamp behind him.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft fleece texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable monitor text, webcam UI borders, anime, cartoon, black outlines, logos, watermark, extra fingers.
```

### 60. Priya (`t_priya`): your architect best friend in her car asking you to be her fake fiancé
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: inside a warm-lit car parked outside an apartment building at dusk, streetlamps glowing through the rain-speckled windshield. Priya (27, woman, architect) sits in the driver's seat gripping the steering wheel lightly, turning hastily toward the viewer in the passenger seat before they can close the door.
LOOK: thick wavy dark hair cascading over one shoulder, warm rich South Asian brown skin, luminous dark eyes, tiny gold nose stud, wearing a tailored camel trench over a burgundy sweater.
EMOTION: adorable nervous panic mixed with undeniable warmth: wide earnest eyes, cheeks flushed, a sheepish hopeful smile as she asks if they'd pretend to be engaged.
CAMERA: interior passenger-seat POV looking across the car toward her, 35 mm, glowing streetlamps bokeh outside her window.
COMPOSITION: Priya in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed dashboard and console).
LIGHT: warm golden cabin dome light illuminating her face and hair against cool twilight blue outside the glass.
STYLE: smooth luminous skin, subsurface scattering, real hair and wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, car brand logos, anime, cartoon, black outlines, text, watermark, extra fingers.
```

### 61. Felix (`t_felix`): your best friend's older brother freezing mid-flip at the backyard grill
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm string-lit suburban backyard barbecue at golden sunset, warm grill smoke drifting softly, blurred family and wooden fence behind. Felix (25, man, soldier home on leave) stands by the barbecue grill holding metal tongs mid-air, frozen for half a beat as he spots the viewer walking across the lawn.
LOOK: neatly cropped warm sandy-brown hair, broad athletic shoulders, sun-tanned skin, bright expressive blue-hazel eyes, wearing a fitted olive-green cotton henley with sleeves pushed up, simple dog-tag chain tucked under the collar.
EMOTION: stunned delight blooming into a warm, flirty grin: eyes widening slightly then crinkling softly as he looks the viewer up and down with genuine admiration: "no way — you grew up".
CAMERA: eye-level 50 mm across the warm sunlit lawn, golden barbecue smoke catching the sunset light.
COMPOSITION: Felix in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed picnic table edge and grass).
LIGHT: rich orange-gold late-day sun backlighting his shoulders and warm front bounce lighting his grin.
STYLE: smooth luminous skin, subsurface scattering, real hair and cotton fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, military uniforms, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 62. Leila (`t_leila`): your blunt new doctor roommate sliding a coffee mug across at 7 a.m.
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a clean minimalist apartment kitchen at 7 a.m., pale early morning light streaming over a stone counter. Leila (25, woman, medical resident) stands on the far side of the island counter, sliding a steaming ceramic coffee mug neatly toward the viewer while keeping her other hand on a tiny label maker.
LOOK: thick curly dark hair pulled neatly into a high messy bun, warm North African olive-tan skin, sharp dark eyes with faint tired shadows, wearing a crisp oversized white linen shirt half-tucked over dark joggers.
EMOTION: cool, controlled bluntness hiding sudden softness: refusing to look directly for a beat, then sneaking a quick dry glance up with the faintest secret smile.
CAMERA: slightly low counter-height shot from the viewer's side, 50 mm, steaming mug crisp in the foreground.
COMPOSITION: Leila in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed counter surface).
LIGHT: cool crisp 7 a.m. window light meeting warm sunrise peach reflecting across the kitchen tiles.
STYLE: smooth luminous skin, subsurface scattering, real hair and linen texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable labels, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 63. Yasmin (`t_yasmin`): your flustered tutor caught fixing her hair in the window
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunlit cosy university study room filled with bookshelves and stacked linguistics books, afternoon light pouring through a tall window. Yasmin (27, woman, PhD linguistics tutor) spins around from the windowpane where she was tucking a stray curl behind her ear, clutching a notebook to her chest as the viewer arrives fifteen minutes early.
LOOK: long dark chestnut curls half-pinned back, warm Middle Eastern golden skin, large expressive warm brown eyes behind thin gold-rimmed glasses, a soft cream cardigan over a floral blouse.
EMOTION: adorably flustered and caught off-guard: rosy blush blooming across her cheeks, startled wide eyes softening into a flustered, welcoming smile.
CAMERA: doorway POV entering the warm study room, 50 mm, bookshelves framing the soft background blur.
COMPOSITION: Yasmin in the right two-thirds, face in the upper half; lower-left quarter calm (dark wood desk edge and door shadow).
LIGHT: warm golden afternoon window light illuminating her curls and rosy cheek against cosy dark bookcase shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable notes or books, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 64. Rhys (`t_rhys`): your gentle husband on Sunday morning playing with your fingers
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunlit peaceful bedroom on Sunday morning, rumpled soft white linen sheets glowing in warm daylight. Rhys (29, man, nurse) lies propped on one elbow on the pillows facing the viewer, his other hand resting gently near the viewer's blurred fingers on the duvet.
LOOK: soft tousled warm-blond-brown hair, gentle pale-tan Welsh features, kind luminous grey-blue eyes, light morning stubble, wearing a soft faded grey sleep T-shirt, gold wedding ring.
EMOTION: tender, breathless devotion: a hopeful nervous swallow, eyes warm and shimmering with quiet love as he gathers courage to ask about starting a family.
CAMERA: ultra-intimate pillow-level side angle from across the mattress, 85 mm, dreamy shallow depth of field.
COMPOSITION: Rhys in the right two-thirds, face in the upper half; lower-left quarter calm (softly shadowed folded blanket).
LIGHT: soft golden morning sunlight filtering through sheer white curtains across his face and shoulders.
STYLE: smooth luminous skin, subsurface scattering, real hair and linen bedding texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, explicit content, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 65. Ryder (`t_ryder`): the reckless boxer going instantly quiet when you find him in the alley
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet brick alley outside a neon-lit boxing gym at dusk, warm gym doorway glow spilling onto wet cobblestones. Ryder (26, man, boxer) leans his back against the brick wall catching his breath, white hand-wraps loose around his bruised knuckles, going completely still the instant he sees the viewer.
LOOK: tousled dark-brown hair damp with sweat, lean muscular build, tanned skin with a faint healing graze on his cheekbone (no blood), intense amber-brown eyes, a dark sleeveless gym hoodie pushed back, taped hands.
EMOTION: raw defiance melting immediately into quiet sheepish softness: guarded brow dropping, lips curving into a reluctant fond half-smile only the viewer ever sees: "okay, I'm done — patch me up?".
CAMERA: eye-level 50 mm medium shot walking into the alley, wet brick reflections framing the sides.
COMPOSITION: Ryder in the right two-thirds, face in the upper half; lower-left quarter calm (dark wet alley ground).
LIGHT: warm orange gym doorway light hitting one side of his face against cool blue dusk twilight shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, fabric and hand-wrap texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, blood, open wounds, gore, weapons, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 66. Lorenzo (`t_lorenzo`): your tired single-dad boss calling at midnight for fractions help
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm dimly lit home dining room at midnight, colourful school notebooks and a half-finished math sheet scattered on the wooden table, a cosy lamp glowing. Lorenzo (31, man, single-dad CEO) sits at the table rubbing the back of his neck with one hand while holding his phone up toward the viewer on a late-night video call.
LOOK: dark wavy Italian hair slightly dishevelled, warm olive skin, kind tired dark eyes, light evening stubble, crisp white dress shirt with collar unbuttoned and sleeves rolled up, luxury watch.
EMOTION: exhausted vulnerability turning into grateful, shy warmth: sheepish apologetic smile, eyes softening unmistakably when the viewer answers his midnight call.
CAMERA: close intimate table-level video-call POV angle (no UI chrome), 50 mm, warm domestic bokeh behind.
COMPOSITION: Lorenzo in the right two-thirds, face in the upper half; lower-left quarter calm (dark wooden tabletop in shadow).
LIGHT: warm golden table lamp glowing on his cheek and shirt against cool midnight shadows across the room.
STYLE: smooth luminous skin, subsurface scattering, real hair and crisp cotton texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, phone UI overlays, children in frame, readable homework text, anime, cartoon, black outlines, logos, watermark, extra fingers.
```

### 67. Zane (`t_zane`): your proud enemy caught standing over dropped Valentine's flowers
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a rain-damp sidewalk beside an apartment building entrance on Valentine's night, warm streetlamps glowing, a crumpled bouquet of red-and-white roses resting on the pavement near his boots. Zane (24, man, indie musician) stands caught mid-turn, hands jammed awkwardly into his coat pockets as the viewer catches him red-handed.
LOOK: shaggy dark-copper-brown hair falling into his eyes, pale freckled skin, expressive stormy hazel eyes, dark corduroy jacket over a graphic-free faded tee, silver chain and chipped nail polish.
EMOTION: mortified jealousy and transparent pride: fierce blush spreading across his cheekbones, brows furrowed defensively, eyes darting back to the viewer: "they were never for you — why are you smiling?".
CAMERA: slightly high candid 35 mm angle from the apartment steps, the abandoned flowers softly visible lower-right.
COMPOSITION: Zane in the right two-thirds, face in the upper half; lower-left quarter calm (dark wet sidewalk shadow).
LIGHT: warm amber streetlamp shining down on his flushed face against cool blue night rain mist.
STYLE: smooth luminous skin, subsurface scattering, real hair and corduroy texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 68. Talia (`t_talia`): your chaotic travel-vlogger nemesis dropping into the plane seat beside you
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: inside an aircraft cabin before takeoff, dim moody boarding lights, oval airplane window glowing with twilight runway lights behind. Talia (24, woman, travel vlogger) has just dropped brightly into the window seat right beside the viewer, holding up a tiny compact vlogging camera on a mini-grip aimed playfully toward the viewer.
LOOK: glossy dark wavy hair with warm caramel highlights, sun-kissed Latina skin, sparkling mischievous brown eyes, cute gold hoops, an oversized cream travel hoodie and wireless earbuds around her neck.
EMOTION: fearless, teasing chaos with a secret sparkle: bright wicked grin, leaning right into the viewer's personal space: "twelve hours, you and me — say hi".
CAMERA: close cabin-seat POV from seat 34B looking directly across the armrest into 34A, 35 mm, playful tight framing.
COMPOSITION: Talia in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed seat armrest and tray table).
LIGHT: warm overhead cabin reading light illuminating her grin against cool twilight blue through the plane window.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft fleece texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, airline logos, camera brand text, anime, cartoon, black outlines, watermark, extra fingers.
```

### 69. Diego (`t_diego`): your ex slipping away at the night fair with a stuffed bear
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a dazzling summer night carnival midway, glowing Ferris wheel and warm golden booth lights melted into vivid bokeh behind. Diego (28, man, DJ) has walked right up to the viewer while holding a plush carnival bear tucked awkwardly under one arm, glancing down at the viewer with eyes that never really moved on.
LOOK: styled dark wavy hair with tapered sides, warm golden-tan Hispanic skin, dark magnetic eyes, subtle earring stud, a sleek unbuttoned varsity-style bomber jacket over a black tee.
EMOTION: loud showman charm cracking into unmistakable regret and longing: a soft stunned smile, eyes lingering warmly on the viewer: "hey — you look really good".
CAMERA: eye-level 50 mm medium shot amidst the glowing carnival haze, vivid warm Ferris wheel lights behind him.
COMPOSITION: Diego in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed fairground walkway).
LIGHT: glowing warm gold and soft magenta carnival lights kissing his cheekbones against deep cool indigo night sky.
STYLE: smooth luminous skin, subsurface scattering, real hair and fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable carnival signs, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 70. Lily (`t_lily`): your warm messy ex rolling two suitcases into your flat for thirty days
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bright apartment entryway in late afternoon, soft sunlight stretching down the hallway. Lily (26, woman, night-shift nurse) stands right inside the open doorway with a colourful suitcase handle in each hand, wearing an over-bright grin that barely hides how much she missed being here.
LOOK: wavy strawberry-blonde hair clipped loosely with wisps framing her face, fair rosy skin, warm sparkling green eyes, a cosy oversized mustard cardigan over jeans and canvas sneakers.
EMOTION: chaotic sweetness masking unresolved love: too-bright cheerful smile, eyes crinkling warmly with a tiny flash of hopeful flirtation: "thirty days — I labelled my yoghurts".
CAMERA: eye-level 35 mm candid shot from inside the apartment hallway looking toward the open door.
COMPOSITION: Lily in the right two-thirds, face in the upper half; lower-left quarter calm (dark wooden entryway floor shadow).
LIGHT: warm golden afternoon light spilling across the hallway onto her face against cool corridor shadows behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, luggage tags with text, logos, watermark, extra fingers.
```

### 71. Rowan (`t_rowan`): your werewolf neighbour gripping your doorframe before moonrise
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a rustic wooden porch at twilight just as a bright silver full moon rises over dark pine trees behind. Rowan (27, man, forest ranger and werewolf) stands outside the viewer's open front door, gripping the wooden doorframe tightly with one strong hand, breathing hard as a faint golden glow flickers inside his irises.
LOOK: thick tousled chestnut hair damp with light sweat, broad rugged shoulders, sun-bronzed skin, intense hazel eyes catching a subtle amber-gold shimmer, wearing a worn forest-green flannel jacket over a dark thermal shirt.
EMOTION: aching restraint and fierce devotion: jaw tight from holding back, eyes locked tenderly on the viewer: "lock your door tonight — and don't worry if you hear howling, it's just me missing you".
CAMERA: from inside the doorway looking slightly up at him, 50 mm, dark doorframe slicing cleanly down the left edge.
COMPOSITION: Rowan in the right two-thirds, face in the upper half; lower-left quarter calm (dark indoor floor and open door shadow).
LIGHT: cool silver full-moon rim-light outlining his hair and shoulders against warm amber hallway light across his face.
STYLE: smooth luminous skin, subsurface scattering, real hair and flannel texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, wolf transformation, fangs, horror, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 72. River (`t_river`): your night-owl online friend in another time zone sending morning coffee
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunlit minimalist café window table in morning light across the world, warm city street softly blurred outside. River (28, androgynous person, night-owl translator) sits leaning on one hand with a steaming ceramic latte mug resting beside an open notebook, glancing warmly straight toward the viewer like a candid morning snap sent across time zones.
LOOK: soft wavy dark-brown chin-length hair tucked behind one ear, warm East Asian-mixed features, calm observant dark eyes behind slim round glasses, wearing an oversized charcoal knit sweater.
EMOTION: soothing, effortless intimacy with a soft private smile: relaxed brow, eyes warm and steady as if saying "morning here, night there — tell me everything".
CAMERA: intimate across-the-table 50 mm POV, steaming coffee cup sharp in the lower-right foreground.
COMPOSITION: River in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden table).
LIGHT: bright golden morning sunbeams crossing their cheek and glasses against cool interior café shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and knit fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, phone UI chrome, readable notebook text, anime, cartoon, black outlines, logos, watermark, extra fingers.
```


---

## Batch 6 (73–86)

### 73. Owen (`t_owen`): your firefighter best friend stepping out of his truck with a blanket
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet glowing gas station beside a dark empty highway at night, his pickup truck headlights gleaming through mist behind. Owen (28, man, firefighter) has just stepped up to the viewer holding out a warm folded wool blanket first, coiled jumper cables slung casually over his other arm.
LOOK: short warm light-brown hair, broad sturdy shoulders, fair weathered skin, kind deep-blue eyes, a faded navy zip sweatshirt over a grey tee, rugged watch.
EMOTION: steady, melting devotion he tries to call friendship: brows drawn gently in concern, a soft reassuring half-smile, eyes warm and lingering on the viewer: "blanket first, car second".
CAMERA: slightly low eye-level 35 mm shot from beside the viewer's stalled car, warm truck headlights casting dramatic rim light through cool night fog.
COMPOSITION: Owen in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed tarmac).
LIGHT: glowing golden gas-station canopy overhead balanced with crisp headlight beams and deep blue highway night.
STYLE: smooth luminous skin, subsurface scattering, real hair and heavy wool fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, fire, danger, anime, cartoon, black outlines, gas station brand logos, text, watermark, extra fingers.
```

### 74. Jade (`t_jade`): your streamer gaming partner on a quiet 3 a.m. voice call
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a cosy dim bedroom at 3 a.m., soft pastel-violet fairy lights and a blurred gaming setup behind. Jade (23, woman, streamer) lies curled up on her pillows holding her phone loosely near her ear, gazing sleepily toward the viewer in the quiet dark after going silent for a minute.
LOOK: messy dark hair with bleached front strands falling across her cheek, East Asian features, luminous fair skin, sleepy soft dark eyes, an oversized faded lavender hoodie pulled around her chin.
EMOTION: loud streamer mask completely gone — soft, sleepy vulnerability and quiet crush: faint drowsy smile, eyes heavy-lidded and clinging warmly to the viewer's voice: "don't hang up, just talk".
CAMERA: ultra-close pillow-level 85 mm shot angled gently across the bed, dreamy purple-amber night bokeh behind.
COMPOSITION: Jade in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed duvet).
LIGHT: soft warm bedside glow on her cheek and lashes against cool violet-blue bedroom lights behind.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft fleece texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, phone UI overlays, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 75. Ezra (`t_ezra`): your mom's best friend's son on your doorstep with suitcases and a cake
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm-lit porch doorway on a rainy evening, rain glistening softly on railings behind. Ezra (26, man, astronomy grad student) stands awkwardly outside the viewer's front door with two rolling suitcases parked beside his boots, holding out a bakery-boxed homemade cake with both hands like a peace offering.
LOOK: soft curly chestnut hair slightly damp from rain, fair skin with light freckles, warm shy brown eyes behind thin silver-rimmed glasses, a rumpled olive jacket over a beige knit sweater.
EMOTION: adorably mortified and hopelessly sweet: rosy embarrassed blush, apologetic crooked half-smile, eyes flicking nervously up to the viewer with an unmistakable hidden crush.
CAMERA: from inside the open doorway looking out at eye level, 35 mm, dark door frame edge at the left.
COMPOSITION: Ezra in the right two-thirds, face in the upper half; lower-left quarter calm (dark doorway threshold and floor).
LIGHT: warm yellow porch light shining down on his glasses and wet curls against cool blue evening rain behind.
STYLE: smooth luminous skin, subsurface scattering, real hair, rain droplets and fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable cake box text, anime, cartoon, black outlines, house numbers, logos, watermark, extra fingers.
```

### 76. Aiko (`t_aiko`): your dry-witted dinner set-up staring at your moms' empty chairs
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm lantern-lit family restaurant booth at night, chopsticks and tea cups set for four with two conspicuously empty chairs blurred on the side. Aiko (26, woman, game designer) rests her chin lightly in one hand across the table, glancing sideways from the empty chairs back to the viewer with deadpan amusement.
LOOK: sleek straight jet-black shoulder-length hair with neat fringe, Japanese features, fair luminous skin, clever dark eyes, subtle silver earrings, a chic black mock-neck sweater.
EMOTION: dry sarcastic comedy turning subtly flirty: one eyebrow raised, a wicked tiny smirk tugging at her lips: "they're not coming back — want to order the most expensive thing?".
CAMERA: seated across-the-table 50 mm eye-level shot, warm glowing paper lanterns melted into rich bokeh behind.
COMPOSITION: Aiko in the right two-thirds, face in the upper half; lower-left quarter calm (dark lacquered tabletop in shadow).
LIGHT: warm amber lantern glow across her face and hands against deep moody evening restaurant shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and knit fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable restaurant menus or signs, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 77. Reina (`t_reina`): the sunny girl peeking out from behind a pillar after confessing
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a dimly lit university hall corridor after a late-night party, warm distant party lights glowing down the far end. Reina (24, woman, cheer captain) peeks shyly out from behind a wide marble corridor pillar, fingers gripping the stone edge as she looks straight at the viewer who just found her hiding spot.
LOOK: long glossy dark-brown hair tied in a high bouncy ponytail with loose strands, warm Filipina-tan skin, big sparkling dark eyes, a cropped red cardigan over a white top, delicate gold heart necklace.
EMOTION: dramatic panic mixed with brave, blushing romance: bright flush on her cheeks, lips parted in a nervous sheepish grin, eyes pleading warmly: "okay, I meant it — please say something".
CAMERA: eye-level 50 mm shot walking down the quiet corridor, the pillar softly framing the right edge as she leans out.
COMPOSITION: Reina in the right two-thirds, face in the upper half; lower-left quarter calm (dark polished hallway floor).
LIGHT: warm golden hallway sconce lighting her blushing face against cool indigo shadows behind the pillar.
STYLE: smooth luminous skin, subsurface scattering, real hair and knit fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, cheerleader uniform, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 78. Sebastian (`t_sebastian`): your ex-husband pulling out the window seat at Sunday dinner
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a sunlit, cosy family dining room on Sunday afternoon, warm table set for dinner by a tall bay window overlooking garden trees. Sebastian (30, man, architect) stands beside the sunny window seat, holding the back of a wooden chair pulled out specifically for the viewer as they walk in.
LOOK: neatly swept dark-ash-brown hair, fair olive skin, fine laugh lines around calm hazel eyes, a soft navy merino sweater layered over a crisp collared shirt, minimalist steel watch.
EMOTION: dry tenderness and lingering unspoken affection: a quiet fond half-smile, eyes crinkling softly: "your mom still thinks we're together — I don't have the heart to tell her".
CAMERA: eye-level 50 mm walking-in POV across the warm dining room, bright garden light backlighting the curtains.
COMPOSITION: Sebastian in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden table corner).
LIGHT: soft afternoon sunlight streaming through sheer curtains across his cheek and sweater against cosy warm indoor shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and fine knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 79. Matteo (`t_matteo`): your fierce husband setting his glass down at family dinner
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a grand candlelit Italian villa dining room at night, crystal glassware gleaming along a long dark-wood table, hushed blurred relatives frozen across the background. Matteo (34, man, formidable businessman) sits beside the viewer, calmly setting his crystal wine glass down with one hand while turning his protective gaze slightly toward the table and then warmly toward the viewer.
LOOK: sleek dark hair with a touch of silver at the temples, strong chiseled Mediterranean jaw with trimmed dark beard, intense dark eyes, tailored black wool jacket over a charcoal dress shirt, gold wedding band.
EMOTION: icy dangerous authority for the room, fierce unmistakable devotion for the viewer: steady dark gaze, subtle protective set to his mouth that softens the moment his eyes catch theirs.
CAMERA: close side-seat 85 mm angle from the viewer's chair beside him, tall dinner candles glowing into soft gold orbs.
COMPOSITION: Matteo in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed tablecloth).
LIGHT: dramatic warm candlelight illuminating his brow, jaw and wedding ring against velvety midnight shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, beard and tailored fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, violence, anger scowl, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 80. Nikolai (`t_nikolai`): the quiet soldier wrapping a blanket around you in a snowy cabin
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: the warm timber interior of a remote mountain cabin during a winter blizzard, snow swirling past a small frosted window, a crackling hearth glowing off to the right. Nikolai (31, man, border guard) leans close in front of the viewer holding out a steaming tin mug of tea, having just draped a thick wool blanket toward them.
LOOK: short dark-blond hair dusted faintly with melted snow, pale rugged Slavic features, steady ice-blue eyes, light beard, wearing a heavy dark-olive wool knit sweater with rolled cuffs.
EMOTION: stoic restraint warmed by unexpected tenderness: calm watchful eyes lingering gently on the viewer's face, the faintest softening at the corners of his mouth: "drink slowly — the road won't open until morning".
CAMERA: slightly low seated POV from the wooden bench by the fire looking up at him, 50 mm, glowing embers softly blurred.
COMPOSITION: Nikolai in the right two-thirds, face in the upper half; lower-left quarter calm (dark timber floor and wool blanket shadow).
LIGHT: rich orange firelight warming one side of his face against icy pale-blue snowlight through the cabin window.
STYLE: smooth luminous skin, subsurface scattering, real hair and coarse wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, rifles, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 81. Henry (`t_henry`): your strict newspaper editor tapping the one line he loved at midnight
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: an atmospheric old-school newspaper newsroom late at night, empty desks and glowing green-shaded lamps receding into shadow behind. Henry (35, man, strict senior editor) leans casually on the edge of the viewer's desk, tapping a printed article page marked with red-pen notes with a red fountain pen while looking down at the viewer.
LOOK: neatly parted dark-brown hair with early silver strands, refined sharp features, fair skin, warm shrewd grey-brown eyes behind classic tortoiseshell glasses, rolled-sleeve crisp white shirt and dark vest.
EMOTION: stern perfectionism cracking into rare private praise: glasses lowered slightly, a dry secret half-smile, eyes holding the viewer's with genuine admiration: "this line is the best thing I've read all year".
CAMERA: slightly low seated POV from the writer's desk looking up at him, 50 mm, blurred red-marked page in the lower foreground.
COMPOSITION: Henry in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden desk edge).
LIGHT: warm amber desk lamp glowing across his face and shirt against deep moody slate newsroom shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and tailored fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable article text, anime, cartoon, black outlines, logos, watermark, extra fingers.
```

### 82. Tristan (`t_tristan`): your reformed university enemy awkwardly offering his hand at work
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a bright contemporary open office on a fresh Monday morning, sunlit plants and glass partitions blurred behind. Tristan (25, man, coworker) has just stood up from the desk facing the viewer's new workspace, awkwardly extending one hand across the divider while rubbing the back of his neck with the other.
LOOK: tousled dark-chocolate hair, sharper more mature jawline with light stubble, fair tanned skin, earnest smoky-green eyes, a relaxed charcoal crewneck sweater over a white tee.
EMOTION: proud vulnerability and disarming regret with a spark: sheepish crooked half-smile, brows slightly lifted, eyes hoping desperately for a second chance: "can I buy you lunch for the next ten years?".
CAMERA: eye-level 50 mm across the shared desk divider, natural sunlit office bokeh behind.
COMPOSITION: Tristan in the right two-thirds, face in the upper half; lower-left quarter calm (dark matte desk surface).
LIGHT: bright golden morning sunlight across his cheek and extended hand against cool office shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and knit fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable screens or ID badges, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 83. Nathan (`t_nathan`): your gentle ex offering his arm outside the church doors
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: the sun-dappled stone vestibule just outside tall wooden church doors before a wedding ceremony, floral arrangements softly blurred behind. Nathan (29, man, teacher and best man) stands beside the viewer in a sharp suit, bending his arm slightly to offer it to the viewer as he leans down just enough to speak quietly.
LOOK: soft neatly combed warm-brown hair, fair skin, gentle soulful brown eyes, crisp charcoal three-piece suit with a small white rose boutonniere on his lapel.
EMOTION: calm dignity struggling against lingering love: tender sad-sweet smile, eyes warm and steady on the viewer's face: "just for today, hold on to me".
CAMERA: intimate close side-by-side 85 mm shot at eye level, soft golden doorway light kissing the edge of his suit.
COMPOSITION: Nathan in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed oak door panel).
LIGHT: warm golden sunlight filtering through the arched entrance across his face against cool stone hall shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and fine suit wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 84. Lucien (`t_lucien`): the sarcastic fallen angel pulling you back at a rainy crosswalk
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a wet neon-lit city street crosswalk at dusk, blurred headlights streaking past in the background, rain glistening on dark pavement. Lucien (30, man, fallen angel) stands close right beside the viewer on the curb after yanking them safely back, exhaling toward the sky before cutting his eyes down to the viewer.
LOOK: windswept silver-tipped ash-brown hair, ethereal sculpted pale features, ancient tired golden-grey eyes, a long weathered dark charcoal wool trench coat over a black turtleneck, faint subtle silver glow catching raindrops around his collar (no wings).
EMOTION: exasperated ancient humour hiding fierce devotion: one eyebrow raised, wry tired smirk, eyes unmistakably relieved and warm beneath the sarcasm: "third time this week".
CAMERA: slightly tilted 35 mm street-level POV from right beside him on the sidewalk, glowing traffic bokeh streaking behind.
COMPOSITION: Lucien in the right two-thirds, face in the upper half; lower-left quarter calm (dark wet asphalt curb).
LIGHT: glowing amber traffic light and cool blue streetlamps reflecting off his damp hair and cheekbones.
STYLE: smooth luminous wet skin, subsurface scattering, real hair, rain droplets and heavy wool coat texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, angel wings, halo, car crash, violence, anime, cartoon, black outlines, readable street signs, text, logos, watermark, extra fingers.
```

### 85. Lyra (`t_lyra`): the runaway princess curtsying by mistake after dropping a tavern tray
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm candlelit wooden tavern dining hall at lunch, oak beams and sunlit stained-glass windows softly blurred behind. Lyra (24, woman, runaway princess working as a waitress) kneels gracefully beside an overturned wooden serving tray and scattered silver forks, looking straight up at the viewer with a finger pressed playfully to her lips.
LOOK: long golden-honey wavy hair braided loosely with a ribbon, rosy fair skin, bright sparkling violet-blue eyes, a simple cream linen peasant blouse and dark laced tavern apron that she wears with unintentional royal posture.
EMOTION: adorable royal panic and playful conspiracy: blushing cheeks, wide lively eyes, a sheepish dazzling grin: "please don't tell anyone I curtsied — I'm a very common commoner".
CAMERA: slightly high eye-level POV looking down at her beside the tavern table, 35 mm, warm sunlit dust motes floating.
COMPOSITION: Lyra in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed oak tavern floorboards).
LIGHT: warm golden sunlight streaming through tavern windows across her face against cosy dark timber shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and linen fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, crown, tiara, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 86. Quinn (`t_quinn`): your steady climbing mentor spotting you from below on the last hold
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a vibrant sunlit indoor bouldering gym, colourful textured climbing holds fading softly behind, chalk dust drifting in sunbeams. Quinn (30, athletic androgynous person, climbing mentor) stands poised on the padded mat looking up toward the viewer on the wall, arms ready to spot with calm total focus.
LOOK: short tousled dark curls dusted faintly with climbing chalk, warm bronze-tan skin, steady encouraging amber eyes, wearing a fitted charcoal athletic tank, chalk bag at their waist, taped fingers.
EMOTION: calm magnetic belief and warm encouragement: a proud confident half-smile, eyes shining up at the viewer with total trust: "you've got this — breathe, then trust your feet".
CAMERA: dramatic high-angle POV looking down from the top of the climbing wall toward them, 35 mm, coloured holds framing the edge.
COMPOSITION: Quinn in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed climbing mat).
LIGHT: crisp golden skylight sunbeams catching chalk dust and illuminating their upturned face against cool gym shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and cotton athletic fabric, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, gym brand logos, anime, cartoon, black outlines, text, watermark, extra fingers.
```

---

## Batch 7 (87–100)

### 87. Arjun (`t_arjun`): the polite doctor your mom keeps inviting to dinner suggesting an escape
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm family dining room after dinner, dessert plates and glowing candlelight on the table, balcony glass doors visible behind. Arjun (27, man, doctor) sits across the corner of the table after the viewer's parents conspicuously left the room, glancing toward the empty doorway and then back to the viewer with quiet amusement.
LOOK: neat wavy black hair, warm South Asian brown skin, kind gentle dark eyes, light groomed stubble, wearing a soft sage button-down shirt with rolled sleeves and a classic leather watch.
EMOTION: polite composure warming into shy conspiratorial flirtation: a soft amused smile, slight head tilt toward the balcony: "your mom is not subtle — want to escape to the balcony?".
CAMERA: seated eye-level 50 mm angle across the dining table corner, warm candlelight flickering gently in the foreground.
COMPOSITION: Arjun in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden table corner).
LIGHT: warm golden chandelier and candle glow lighting his face against cool evening blue outside the balcony doors.
STYLE: smooth luminous skin, subsurface scattering, real hair and crisp cotton texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 88. Callum (`t_callum`): your nervous boyfriend at a rooftop restaurant reaching for the ring
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a romantic candlelit rooftop restaurant overlooking sparkling night city lights, white tablecloth and untouched wine glasses between them. Callum (28, man, sports reporter) leans forward across the small table, one hand slipping nervously toward his jacket pocket while looking intensely into the viewer's eyes.
LOOK: tousled warm sandy-auburn hair, fair rosy Scottish skin, bright shining blue eyes, wearing a sharp dark-navy suit jacket he clearly dressed up specially for, open white shirt collar.
EMOTION: breathless, adorable panic overflowing with love: flushed ears, trembling hopeful smile, eyes glistening as he forgets his whole speech: "just look at me for a second".
CAMERA: intimate across-the-table 85 mm close-medium shot, warm candle flame and city skyline melting into golden bokeh behind.
COMPOSITION: Callum in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed tablecloth).
LIGHT: flickering golden candle light glowing on his face and collar against deep twilight-blue skyline bokeh.
STYLE: smooth luminous skin, subsurface scattering, real hair and suit wool texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, open ring box cliche, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 89. Grace (`t_grace`): your sweet wife turning her laptop toward you with her colour-coded five-year plan
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a cosy lamp-lit living room couch on Friday night, soft knit pillows and a mug of tea on the side table. Grace (28, woman, data analyst) sits curled close beside the viewer, angling a glowing laptop slightly toward the viewer while pointing shyly at the screen edge.
LOOK: soft chestnut hair tucked behind one ear with loose waves, warm fair skin with rosy cheeks, expressive gentle hazel eyes behind sleek thin glasses, wearing an oversized cream knit sweater and gold wedding band.
EMOTION: shy nervous hope mixed with radiant romantic sweetness: biting back an embarrassed laugh, soft shining eyes looking up at the viewer for their reaction: "don't laugh — column F is the important one".
CAMERA: close side-by-side couch POV at 50 mm, soft warm light from the angled laptop illuminating her smile.
COMPOSITION: Grace in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed couch cushion and blanket).
LIGHT: warm living-room lamp glow paired with soft neutral laptop illumination across her face and knit sweater.
STYLE: smooth luminous skin, subsurface scattering, real hair and chunky knit texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable spreadsheet text on laptop, anime, cartoon, black outlines, logos, watermark, extra fingers.
```

### 90. Axel (`t_axel`): the gruff mechanic next door wiping his hands at sunset
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm open neighbourhood garage bay at golden sunset, vintage tools and the viewer's repaired car hood blurred behind. Axel (28, man, mechanic starting over) has just stood up beside the car wiping engine grease off his hands with a shop rag, nodding quietly toward the car as he meets the viewer's eyes.
LOOK: short shaggy dark-brown hair, rugged stubble, sun-browned forearms with faded old tattoos, guarded warm-brown eyes, wearing a faded dark work shirt with rolled sleeves and worn jeans.
EMOTION: gruff walls softening for one person: serious brow easing into a quiet honest half-smile, eyes steady and unexpectedly gentle: "fixed, no charge — don't believe everything the neighbours say".
CAMERA: eye-level 50 mm medium shot from the garage entrance, dramatic warm orange sunset streaming past the open bay door.
COMPOSITION: Axel in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed concrete garage floor).
LIGHT: rich low sunset orange painting his cheekbone and shoulders against cool metallic garage interior shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, cotton workwear and grease smudge detail, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, anime, cartoon, black outlines, car logos, shop signs, text, watermark, extra fingers.
```

### 91. Gideon (`t_gideon`): the masked special-forces captain sitting on the medic tent cot
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet canvas medical tent at night lit by one warm hanging lantern, folded supply crates softly blurred behind. Gideon (33, man, special-forces captain) sits upright on the edge of a field cot, rolling up his dark tactical sleeve over a wrapped shoulder dressing while watching the viewer steadily over a dark half-face cloth mask.
LOOK: neatly cropped dark-black hair, broad imposing shoulders, pale-olive skin visible above a matte-black tactical neck gaiter pulled up over his nose and mouth, intense piercing steel-grey eyes with a tiny scar near one temple, dark tactical field shirt.
EMOTION: razor-sharp discipline hiding reluctant trust: eyes alone doing all the talking — intense, steady, softening by a fraction as he lets only the viewer tend to him: "don't tell anyone I came to you".
CAMERA: slightly low intimate close-medium 50 mm angle from beside the medical tray, lantern glow catching his eyes.
COMPOSITION: Gideon in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed cot blanket and tent floor).
LIGHT: warm amber lantern overhead illuminating his brow and steel-grey eyes against deep cool midnight-blue tent shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and heavy canvas/tactical fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, guns, rifles, weapons, blood, open wounds, skull masks, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 92. Leon (`t_leon`): your prickly engineer enemy opening his dark door in a blanket with the flu
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a dim apartment hallway in the evening, seen as the door opens halfway. Leon (26, man, engineer) stands inside wrapped dramatically up to his chin in a soft plaid blanket over sleepwear, squinting suspiciously down at the steaming container of soup the viewer brought.
LOOK: wildly messy dark-brown hair, pale fair skin with a light feverish flush across his nose and cheeks, tired sharp grey-blue eyes, oversized dark T-shirt peeking under the blanket.
EMOTION: prickly pride losing instantly to surprise and secret gratitude: squinting dryly, then his expression softening just enough to let the viewer in: "is that soup — come in before I change my mind".
CAMERA: eye-level 35 mm doorway POV from the hallway looking in, dark door edge framing the left side.
COMPOSITION: Leon in the right two-thirds, face in the upper half; lower-left quarter calm (dark hallway floor and door shadow).
LIGHT: cool dim hallway light on the door balanced by a faint warm lamp glowing behind him inside his dark flat.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft wool blanket texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, tissues, gross illness details, anime, cartoon, black outlines, house numbers, text, logos, watermark, extra fingers.
```

### 93. Ruby (`t_ruby`): your gentle ex slipping out onto the party balcony beside you
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet high-floor apartment balcony at night, warm glowing party windows behind glass doors, cool blue city skyline below. Ruby (28, woman, teacher) leans her forearms on the balcony railing right beside the viewer, turning her face sideways toward them in the quiet night breeze.
LOOK: soft wavy warm-copper-brown hair gently stirred by night air, fair skin, tender shining hazel eyes, wearing a soft sage wrap dress and thin gold chain, arms lightly hugging against the cool air.
EMOTION: aching honesty and quiet heartbreak laced with longing: vulnerable soft smile, eyes glistening and searching the viewer's face: "I needed air — or I needed you".
CAMERA: intimate side-by-side 85 mm profile-three-quarter angle along the balcony railing, warm indoor glow behind her hair.
COMPOSITION: Ruby in the right two-thirds, face in the upper half; lower-left quarter calm (dark balcony railing and night shadow).
LIGHT: warm amber party light spilling through the glass door onto her hair and cheek against cool blue city night.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, straight stare into the lens, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 94. Alaric (`t_alaric`): the runaway prince in a borrowed kitchen apron holding a broken plate
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm rustic medieval inn kitchen lit by hearth fire and hanging copper pots, warm steam rising from a washbasin. Alaric (26, man, runaway prince) stands helplessly beside the stone sink holding up two halves of a cracked ceramic plate with soap suds on his fingertips.
LOOK: windswept golden-blond princely waves, fair radiant skin, bright mischievous sapphire-blue eyes, an embroidered ivory noble linen shirt with rolled sleeves hidden poorly under a borrowed coarse linen kitchen apron.
EMOTION: outrageous royal charm and playful flirtation: sheepish dazzling grin, eyebrows arched in theatrical innocence: "in my defence, nobody told me plates were this slippery".
CAMERA: eye-level 35 mm candid shot from the kitchen doorway, copper pans and hearth fire softly glowing behind.
COMPOSITION: Alaric in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden prep table).
LIGHT: warm golden hearth light glowing on his face and blonde hair against cool stone-wall shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair, linen and soap-bubble sheen, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, crown, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 95. Draven (`t_draven`): the grumpy dragon knight pulling hot bread from the oven bare-handed
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a cosy stone fantasy bakery at dawn, glowing brick oven open behind, golden loaves and clouds of floating flour dust catching early sunlight. Draven (30, man, legendary dragon knight) sets a steaming hot crusty loaf straight onto the wooden counter with his bare, unbothered hands while glancing dryly at the viewer.
LOOK: long dark-iron-grey hair tied back in a rough low knot, tanned scarred forearms, striking smoky amber eyes, light rugged beard, wearing a flour-dusted dark linen tunic and leather apron over dark trousers.
EMOTION: deadpan grumpy charm hiding secret fondness: raised eyebrow, completely unimpressed yet wryly amused half-smile: "dragon-proof hands — now what does customer service mean?".
CAMERA: across-the-counter 50 mm medium shot, warm loaf steaming in the foreground and glowing oven fire behind him.
COMPOSITION: Draven in the right two-thirds, face in the upper half; lower-left quarter calm (dark flour-dusted wooden counter shadow).
LIGHT: intense warm orange brick-oven glow lighting his cheek and bare hands against cool pale-blue dawn light from the bakery window.
STYLE: smooth luminous skin, subsurface scattering, real hair, flour dust and rustic leather texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, weapons, swords, full plate armor, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 96. Orion (`t_orion`): the curious 1503 prince gazing down at your glowing phone in a royal garden
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a lush Renaissance royal garden at twilight in 1503, marble colonnades, blooming rose trellises and glowing wrought-iron lanterns behind. Orion (28, man, Renaissance prince) has just stepped close to the viewer, one hand resting thoughtfully on his ornate sheathed rapier hilt as he leans slightly forward, utterly fascinated by the soft glow coming from the viewer's unseen phone below frame.
LOOK: wavy dark-chestnut Renaissance-length hair brushed back, warm Mediterranean olive skin, intelligent bright dark-hazel eyes, wearing a richly tailored deep-emerald velvet doublet with subtle gold embroidery and white collared linen shirt.
EMOTION: aristocratic caution melting rapidly into breathless fascination and charm: brows arched in wonder, a captivated slight smile: "witch or angel? the glass box is singing".
CAMERA: slightly low 50 mm POV looking up at him from the garden bench, soft cool glow illuminating his face from below-left.
COMPOSITION: Orion in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed garden hedge and stone bench).
LIGHT: soft cool luminescence from off-screen below-left meeting warm golden garden lantern light across his velvet doublet.
STYLE: smooth luminous skin, subsurface scattering, real hair, velvet and antique gold texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, drawn sword, pointing weapon, violence, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 97. Daniel (`t_daniel`): the calm night-shift nurse handing you warm tea at 3 a.m.
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a quiet hospital waiting corridor at 3 a.m., soft rain on tall windows, dim blue night-lights down the empty hall. Daniel (30, man, night-shift nurse) has sat down gently on the wooden bench right beside the viewer, holding out a steaming paper cup of tea with a calm, steady smile.
LOOK: neat short dark-brown hair, warm medium-brown skin, kind observant dark eyes with gentle smile lines, wearing clean dark-teal hospital scrubs with a stethoscope tucked loosely in his pocket.
EMOTION: soothing, unhurried closeness with a quiet warm spark: soft relaxed brow, comforting private smile, eyes holding the viewer gently: "can't sleep either? tell me what's keeping you up".
CAMERA: seated side-by-side 50 mm eye-level shot on the bench, the steaming paper cup held toward the left foreground.
COMPOSITION: Daniel in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed bench and floor).
LIGHT: warm dim corridor wall lamp glowing softly on his face against cool peaceful midnight-blue hospital window light.
STYLE: smooth luminous skin, subsurface scattering, real hair and soft cotton scrubs texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, medical horror, needles, readable name badges, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 98. Simon (`t_simon`): your gruff big-brother carpenter neighbour pausing at your doorway
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a warm older apartment hallway in late afternoon, sunlit stairs softly blurred behind. Simon (32, man, carpenter neighbour) pauses outside the viewer's half-open door, leaning one forearm casually against the doorframe with a weathered metal toolbox hanging from his other hand.
LOOK: short rugged sandy-brown hair, thick neat beard, warm weathered skin, kind crinkled hazel eyes, wearing a soft faded plaid flannel shirt with sleeves rolled over strong forearms.
EMOTION: gruff exterior hiding massive heart and gentle care: brows furrowed sympathetically, a dry warm half-smile: "something broken — a shelf or a day?".
CAMERA: from inside the apartment looking out at eye level, 50 mm, dark open door framing the left edge.
COMPOSITION: Simon in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden door and hallway floor).
LIGHT: warm late-afternoon hallway light illuminating his cheek and beard against cooler stairwell shadows behind.
STYLE: smooth luminous skin, subsurface scattering, real hair, beard and flannel fabric texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, sharp tools, weapons, anime, cartoon, black outlines, apartment numbers, text, logos, watermark, extra fingers.
```

### 99. Rosa (`t_rosa`): your warm midwife friend answering your 4 a.m. call while making tea
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a cosy dim home kitchen at 4 a.m., a kettle steaming gently on the stove behind, warm under-cabinet lights glowing softly. Rosa (29, woman, midwife) sits at her kitchen counter wrapped in a soft terracotta cardigan over pyjamas, holding a warm ceramic mug with both hands while smiling warmly into the late-night video call.
LOOK: lush dark natural curls gathered loosely in a high pineapple bun, radiant deep brown skin, warm soulful dark eyes, tiny gold sleeper hoops.
EMOTION: sleepy, grounding, effortless tenderness: soft eyes crinkling warmly, a soothing fond smile that immediately lowers your shoulders: "I'm here — take your time, I'm making tea on my end too".
CAMERA: intimate counter-level 50 mm video-call POV angle (no UI chrome), warm mug steam drifting softly in the foreground.
COMPOSITION: Rosa in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed wooden counter edge).
LIGHT: warm amber kitchen under-light illuminating her smile and curls against deep peaceful 4 a.m. indigo shadows.
STYLE: smooth luminous skin, subsurface scattering, real hair and chunky knit texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, phone UI overlays, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```

### 100. June (`t_june`): your sharp, warm senior-designer coworker bringing soup to your desk
```text
Match ONLY the rendering style, light, skin texture and cinematic 2.5D semi-realistic finish of the attached reference (do NOT copy its people, poses or room). Create a new vertical 3:4 picture.
SCENE: a stylish sunlit creative studio on a gloomy rainy Tuesday afternoon, colour swatches and studio plants softly blurred behind. June (31, woman, senior designer) perches casually on the edge of the viewer's desk, setting a warm takeaway soup container and spoon right in front of the viewer while crossing her arms with protective warmth.
LOOK: sleek chin-length dark-espresso bob with subtle highlights, warm Korean-American features, sharp affectionate dark eyes, chic sculptural silver rings, wearing a tailored charcoal knit vest over a crisp white shirt.
EMOTION: tough-love warmth and protective charm: one eyebrow lifted knowingly, a dry fond smirk: "eat — then tell me who I need to have words with".
CAMERA: slightly low seated POV from the viewer's desk chair looking up at her perched beside the desk, 50 mm, warm soup cup sharp in the lower foreground.
COMPOSITION: June in the right two-thirds, face in the upper half; lower-left quarter calm (dark shadowed desk mat).
LIGHT: cool rainy studio window daylight balanced by a warm brass architect's desk lamp glowing on her face.
STYLE: smooth luminous skin, subsurface scattering, real hair and tailored knitwear texture, creamy bokeh, zero black outlines, zero comic lineart, original adult, not a real person.
AVOID: passport photo, centred headshot, readable computer screens or soup labels, anime, cartoon, black outlines, text, logos, watermark, extra fingers.
```
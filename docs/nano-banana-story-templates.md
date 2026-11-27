# Nano Banana: the 100 story templates' pictures (batch 1 of 7: 16 characters)

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

## Status (batch 1: 8 men, 8 women, every trope)
- [ ] 1. Noah (`t_noah`), best friend
- [ ] 2. Maya (`t_maya`), best friend
- [ ] 3. Lucas (`t_lucas`), close to home
- [ ] 4. Ivy (`t_ivy`), close to home
- [ ] 5. Adrian (`t_adrian`), likes you
- [ ] 6. Kira (`t_kira`), likes you
- [ ] 7. Aurora (`t_aurora`), likes you
- [ ] 8. Alexander (`t_alexander`), married
- [ ] 9. Isabella (`t_isabella`), married
- [ ] 10. Kane (`t_kane`), dangerous
- [ ] 11. Raven (`t_raven`), dangerous
- [ ] 12. Elliot (`t_elliot`), boss
- [ ] 13. Camille (`t_camille`), boss
- [ ] 14. Scarlett (`t_scarlett`), enemies
- [ ] 15. Oliver (`t_oliver`), ex
- [ ] 16. Cassian (`t_cassian`), fantasy

Batches 2-7 (84 left) follow in this file once batch 1 is seen on the phone.

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

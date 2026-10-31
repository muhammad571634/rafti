# Character.AI Reverse Engineering: Art Style Teardown & Next-Gen Cinematic Prompt Bible

**Source:** Reverse-engineered via `rea` from mobile app (`c.ai`), active user screenshots (`02-home.png`, `12-chat.png`, `17-char-sheet.png`), and industry benchmarking (Character.AI, Arcane, Midjourney v6, Nano Banana).  
**Target:** Ready-to-use prompts and generation formulas for **Codex, ChatGPT, Gemini / Nano Banana, Midjourney, and DALL-E 3**.

---

## 1. Character.AI Visual DNA & Teardown Analysis

From our deep inspection of the genuine Character.AI mobile app screenshots (`02-home.png`, `17-char-sheet.png`):
- **Derek** (2.7M chats): Moody, high-contrast, tactile proximity, storytelling vignette with chiaroscuro lighting.
- **College Romance** (1.8M chats): Intimate silhouette, warm ambient lighting, leaning back casually, mysterious and alluring storytelling posture.
- **Jungkook Husband / Seeing Him Again** (440k–490k chats): Low-key cinematic lighting, emotional longing in the eyes, candid POV angle.

### Why these images achieve millions of interactions:
1. **Storytelling Vignette (Not a passport photo):**
   - The character is never stiff or staring blankly into a void.
   - They are captured mid-moment: leaning on a counter, touching hair, reading a book, glancing up with a dry smirk, or sitting relaxed in their natural habitat.
2. **2.5D Semi-Realistic Painterly Concept Art:**
   - **NOT** cheap flat 2D anime or cel-shaded cartoons (looks childish/low-budget).
   - **NOT** real human photography (avoids creepy uncanny-valley AI faces, privacy issues, and copyright risks).
   - **Instead:** High-end digital painting / concept art (similar to *League of Legends / Arcane / Dishonored* concept art) with smooth skin, rich subsurface scattering, and painterly brush textures.
3. **Intimate POV (Point-of-View) & Eye Contact:**
   - The camera acts as the user's eyes.
   - Catchlights (bright reflective pinpoints) inside the pupils give the character a living soul and emotional depth.
4. **Cinematic Lighting & Depth of Field:**
   - Shallow depth of field (`f/1.4`, `85mm portrait lens`) blurs the background into creamy, atmospheric bokeh.
   - High-contrast lighting: warm key light + cool rim light separating the character from the background.

---

## 2. Global Aesthetic & Diversity Directive

To make the app truly international and globally attractive (moving away from purely East Asian / K-pop / anime faces):
- **Hugo Lind:** Northern European / Scandinavian warmth, sandy wavy hair, hazel-green eyes, natural light stubble, ruggedly kind.
- **Adrian Wells:** Mediterranean / Southern European elegance, dark wavy hair, olive undertone, chiseled jaw, contemplative intellectual gaze.
- **Kael:** Middle-Eastern / Fantasy dragon sovereign, bronze skin, sharp chiseled features, obsidian horns, radiant amber-gold eyes.
- **Seraphine:** Afro-Latina / Fantasy paladin commander, radiant brown skin, sculpted cheekbones, silver-white braids, intense protective gaze.
- **Tessa Moreau:** French / Latin bohemian barista, warm honey-brown skin, curly dark hair, radiant smile.
- **Lyra:** Slavic / Nordic starlight scholar, pale porcelain skin, midnight-blue hair, luminous violet eyes.

---

## 3. The Universal Master Prompt Formula

Every character prompt is composed using this 5-layer formula:

```text
[Layer 1: Subject, Age & Global Features] +
[Layer 2: Emotional Expression, Eye Contact & Pose] +
[Layer 3: Clothing, Textures & Tactile Details] +
[Layer 4: Cinematic Environment, Lighting & Atmosphere] +
[Layer 5: Art Style, Camera Specs & Quality Modifiers] +
[Negative Constraints]
```

### Prompt Structure Template:
```text
Close-up portrait of [Character Name], a [Age]-year-old [Gender] with [Global Ethnicity/Facial Features: jawline, skin tone, hair texture/color, eye color].
[Emotion/Expression: intense eye contact, subtle smirk, warm inviting gaze, catchlights in eyes].
Wearing [Specific clothing, textured fabrics, layered materials, collars, jewelry].
[Environment: atmospheric background, time of day, warm lamp glow, soft bokeh blur].
Art style: High-end 2.5D semi-realistic digital character concept art, painterly digital illustration, Arcane-inspired aesthetic, volumetric lighting, subtle rim light illuminating hair, subsurface scattering on skin.
Shot on 85mm f/1.4 lens, cinematic color grading, shallow depth of field.
Original character, not a real human photo, not a 2D flat cartoon, no cel-shading, no watermark, no logo, no text, clean composition.
```

---

## 4. Ready-to-Use Character Prompts

### ☕ 1. Hugo Lind (Tidepool Café — Barista / Rescue Vet)

#### A. Avatar (1:1 Square Portrait for Chat & Profile)
```text
Close-up character portrait of an adult man, 26 years old, Northern European features: wavy light-brown hair with sun-bleached strands, warm expressive hazel eyes with glistening catchlights, friendly captivating smile, light natural stubble on a defined jawline. High-end 2.5D semi-realistic digital concept art, painterly digital illustration, volumetric soft morning light, subtle rim light illuminating his hair, warm subsurface scattering on skin. Wearing a soft cream linen shirt and sage-green knit cardigan. Background is a warmly blurred cafe with golden morning sunbeams and lush Monstera leaves. Original character, not a real person photo, not a flat cartoon, no line-art cel-shading, centered, square 1:1. No text, no logo, no watermark.
```

#### B. Hero Scene (3:4 or 16:9 Ambient Story Vignette for Today / Find Card)
```text
Cinematic medium shot of an adult man, 26 years old, Northern European features: wavy warm light-brown hair, expressive hazel eyes, warm relaxed smile, light stubble. Wearing a relaxed cream linen shirt with rolled sleeves and dark trousers. He sits casually at a rustic wooden table in Tidepool Café, hands loosely resting near an artisanal ceramic coffee cup, looking directly at the viewer with inviting warmth. A small scruffy rescue terrier sleeps happily on the cushioned bench beside him. Sunlit cafe interior, golden dust motes in soft light beams, indoor potted plants, soft bokeh depth of field. High-end 2.5D semi-realistic painterly digital art, cinematic volumetric lighting. Original character, not a real person photo, not a flat 2D cartoon, no watermark, no text.
```

---

### 🏛️ 2. Adrian Wells (Tidepool Café — Architect)

#### A. Avatar (1:1 Square Portrait)
```text
Close-up character portrait of an adult man, 30 years old, Mediterranean-Latin features: dark wavy hair neatly kept but slightly relaxed, warm olive skin tone, deep thoughtful dark-brown eyes with sharp emotional focus and subtle reflections, calm captivating smirk, sculpted cheekbones and clean beard shadow. High-end 2.5D semi-realistic digital concept art, painterly character art, moody late-afternoon golden hour rim lighting, rich realistic skin depth. Wearing a charcoal tailored collared shirt unbuttoned at the neck. Background is an architect's studio softly blurred with architectural sketches, warm drafting desk lamp glow, and city twilight outside the window. Original character, not a real person photo, not a flat cartoon, square 1:1. No text, no logo.
```

#### B. Hero Scene (3:4 or 16:9 Ambient Story Vignette)
```text
Cinematic medium shot of an adult man, 30 years old, Mediterranean-Latin features: dark wavy hair, deep contemplative brown eyes, sculpted jawline. Wearing a charcoal collared shirt with rolled sleeves and dark slacks. He leans back against a tall drafting table covered in hand-drawn blue architectural sketches, holding a brass drafting pencil, looking up and making eye-contact with the viewer with a thoughtful, private smile. Architectural design studio at twilight, glowing blueprint lamps, glass windows overlooking a glowing evening cityscape. High-end 2.5D semi-realistic digital art, volumetric atmospheric lighting. Original character, not a real human photo, not a flat 2D cartoon, no watermark.
```

---

### 🐉 3. Kael (Moonlit Realm — Dragon Sovereign)

#### A. Avatar (1:1 Square Portrait)
```text
Close-up character portrait of an adult man, 29 years old, Middle-Eastern fantasy features: warm bronze skin tone, sharp chiseled features, layered dark-ebony hair, two small polished obsidian dragon horns curving elegantly back over his temples. Captivating luminous amber-gold eyes with subtle slit pupils, an intense, slightly guarded yet deeply alluring expression, a faint self-assured smirk. High-end 2.5D semi-realistic digital fantasy concept art, painterly render, volumetric candlelight, dramatic rim light gleaming across his cheekbone and obsidian horns. Wearing an embroidered deep-crimson velvet collar with antique gold dragon-scale filigree and a dark jewel ring. Dim candlelit obsidian sanctum background, soft bokeh. Original character, not a real person photo, not a flat cartoon, square 1:1. No text, no logo.
```

#### B. Hero Scene (3:4 or 16:9 Ambient Story Vignette)
```text
Cinematic medium shot of an adult man, 29 years old, Middle-Eastern fantasy features: bronze skin, dark layered hair, obsidian dragon horns, radiant amber-gold eyes. Wearing a lavish high-collared crimson velvet coat with intricate gold embroidery and gold rings. He sits casually on an ancient dark stone throne in a cavernous moonlit hall, resting his chin on his knuckles, gazing intently down at the viewer with a mixture of regal pride and concealed tenderness. Glittering antique gold coins and glowing crystals reflect soft candlelight on the dark stone floor, moonlight streaming through high vaulted gothic arches. High-end 2.5D semi-realistic painterly digital art, dramatic volumetric lighting. Original character, not a real human photo, not a flat 2D cartoon, no watermark.
```

---

### ⚔️ 4. Commander Seraphine (Moonlit Realm — Paladin)

#### A. Avatar (1:1 Square Portrait)
```text
Close-up character portrait of an adult woman, 27 years old, Afro-Latina fantasy features: radiant rich brown skin, high sculpted cheekbones, striking long silver-white braids tied high, captivating hazel-green eyes with an intense, steady, and protective gaze, calm confident expression. High-end 2.5D semi-realistic digital concept art, painterly cinematic render, luminous moonlit rim light outlining her braids and silver armor collar. Wearing polished matte-silver plate armor with subtle dark-blue engravings. Background is a nocturnal castle balcony under a luminous silver moon with night mist. Original character, not a real person photo, not a flat cartoon, square 1:1. No text, no logo.
```

#### B. Hero Scene (3:4 or 16:9 Ambient Story Vignette)
```text
Cinematic medium shot of an adult woman, 27 years old, Afro-Latina fantasy features: rich brown skin, long silver braids, captivating hazel-green eyes. Wearing polished silver plate armor with midnight-blue mantle. She stands on the high battlements of an ancient castle at midnight, resting one armored gauntlet on the stone crenelation while holding a warm steaming cup of tea in the other. She looks over her shoulder at the viewer with a rare gentle, relaxed smile. A vast starry night sky and full silver moon illuminate the scene, misty mountains in the deep background. High-end 2.5D semi-realistic painterly concept art, volumetric moonbeams. Original character, not a real human photo, not a flat cartoon, no watermark.
```

---

### 🎨 5. Tessa Moreau (Tidepool Café — Ceramic Artist)

#### A. Avatar (1:1 Square Portrait)
```text
Close-up character portrait of an adult woman, 25 years old, French-Latin features: warm honey-tan skin, messy dark-brown curly hair pinned up with a wooden hairpin with loose tendrils framing her face, sparkling warm amber eyes, playful affectionate smirk, tiny smudge of white clay on her cheek. High-end 2.5D semi-realistic digital concept art, painterly digital illustration, warm sunbeams filtering through studio glass, soft rim light. Wearing an oversized ochre-yellow linen work shirt over an olive tank top. Background is a sunlit ceramic pottery workshop with shelves of handcrafted clay pots and green succulents. Original character, not a real person photo, not a flat cartoon, square 1:1. No text, no watermark.
```

---

### 🌌 6. Lyra (Moonlit Realm — Celestial Astrologer)

#### A. Avatar (1:1 Square Portrait)
```text
Close-up character portrait of an adult woman, 24 years old, Slavic-Nordic fantasy features: pale porcelain skin, long dark midnight-blue wavy hair falling over one shoulder, luminous violet eyes with faint constellation reflections, gentle curious and mystical gaze, delicate serene lips. High-end 2.5D semi-realistic digital concept art, painterly render, glowing celestial backlight and soft blue starlight rim lighting. Wearing a draped navy velvet cloak with antique brass star embroidery. Background is an ancient observatory with brass astrolabes, glowing star charts, and arched stone windows showing a starry night sky. Original character, not a real person photo, not a flat cartoon, square 1:1. No watermark.
```

---

## 5. Codex & ChatGPT Metaprompt (System Instruction)

Give the following system prompt to **ChatGPT (GPT-4o)** or **Codex** to automatically produce new character prompts matching this exact art direction whenever you give it character details:

```text
You are an Elite AI Art Director & Prompt Engineer specializing in next-generation Character.AI visual styling.
Your task is to generate image generation prompts for character avatars and hero scenes.

RULES & ART DIRECTIVE:
1. Style: High-end 2.5D semi-realistic digital character concept art, painterly digital illustration (inspired by Arcane, League of Legends concept art, and high-end digital fantasy paintings).
2. Prohibited: NEVER generate flat 2D cartoons, cheap anime cel-shading, line-art, or real human photorealistic portraits. Avoid uncanniness.
3. Facial Diversity: Use global, international ethnic features (Scandinavian, Mediterranean, Latin, Middle-Eastern, African, Celtic, etc.). Do not default to generic anime tropes.
4. Lighting: Volumetric lighting, atmospheric depth, soft rim light, subsurface scattering on skin, catchlights in the eyes.
5. Camera: Shot on 85mm f/1.4 lens, shallow depth of field, creamy background bokeh.
6. Framing:
   - Avatar (1:1): Close-up portrait focusing on face, shoulders, emotional eye contact, and catchlights.
   - Hero Scene (3:4 or 16:9): Medium story vignette showing the character in their environment interacting with the scene.

OUTPUT FORMAT FOR EVERY CHARACTER:
For any character requested, provide:
### [Character Name] ([Role / Archetype])
1. Avatar (1:1 Square Portrait Prompt): [Full prompt in English]
2. Hero Scene (3:4 or 16:9 Prompt): [Full prompt in English]
3. Negative Prompt: flat 2D, cartoon, anime, cel-shaded, black outlines, oversaturated, real human photo, amateur, blurry, distorted anatomy, watermark, text, signature.
```

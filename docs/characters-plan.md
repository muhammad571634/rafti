# Rafti cast: from 16 to 40 originals

Status: **approved and in the app** (2026-10-07): all 24 are in `src/mock/characters.ts`
with a `gender` field (Find has an Everyone / Him / Her filter). Portraits: waiting for
Nano Banana; until then each new character shows a pastel monogram.

Each of the four worlds grows to 10 characters. Every character is an adult (age given),
an original Rafti creation: no real person, no idol, actor or character from another
company, no look-alikes. Text stays in English (the app's language).

After approval: the cast goes into `src/mock/characters.ts`; portraits and hero scenes
come from Nano Banana, one test image first, then the rest.

## What exists now (16)

| World | Characters |
| --- | --- |
| Seaside Academy (university) | Kai, Elio, Theo, Hana, Iris |
| Moonlit Realm (fantasy) | Prince Aurelian, Lord Castor, Zarek, Commander Seraphine |
| NEON TIDE (fictional idol group) | Ezra, Seren, Kiro, Minu |
| Tidepool Café (everyday grown-ups) | Adrian, Dr. Lucas, Sol |

## New characters (24)

`voice` = can call (green phone badge on Find). F = female, M = male.

### Seaside Academy (+5 → 10)

| id | Name | Age | | Handle | Bio | Greeting | Tags | Voice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c_rowan | Rowan Pike | 24 | M | @tidelab.rowan | Marine biology grad student who runs the campus aquarium lab and names every fish after a friend. | You came at feeding time. Perfect. Hold this bucket and tell me about your day. | calm, nerdy, kind | yes |
| c_jun | Jun Arai | 21 | M | @jun.rolling | Film club director who never stops filming and keeps casting you as the lead. | Don't move - the light on you right now is unreal. Okay. Now say hi. | dreamy, creative, talkative | yes |
| c_noah | Noah Bellamy | 22 | M | @latenight.noah | Hosts the campus radio show at 1 a.m. and dedicates the last song to "someone listening". | You're still up? Good. I need someone to pick tonight's last song. | night owl, soothing, witty | yes |
| c_tessa | Tessa Moreau | 21 | F | @tessa.debates | Debate team captain who wins every argument except the ones with you. | Okay, opening statement: you owe me a coffee. Rebuttal? | sharp, competitive, loyal | yes |
| c_felix | Felix Grant | 22 | M | @felix.frames | Exchange student from up north, quiet, with an old film camera and too many questions about your town. | Is it normal for the sea to be this loud here? Show me your favourite spot. | reserved, curious, gentle | no |

### Moonlit Realm (+6 → 10)

| id | Name | Age | | Handle | Bio | Greeting | Tags | Voice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c_vesper | Vesper | 27 | M | @night.alchemist | Night alchemist who brews potions that taste like old memories, and refuses to brew one that makes you forget him. | Careful, that one bubbles. Sit down - I was hoping you'd come tonight. | mysterious, clever, tender | yes |
| c_rhys | Sir Rhys | 25 | M | @thorn.gate | Knight of the Thorn Gate, painfully earnest, who writes you a report after every patrol. | Halt! ...Oh. It's you. I mean - welcome. The gate is safe. You are safe. | earnest, brave, shy | yes |
| c_lyra | Lyra | 23 | F | @lantern.witch | Lantern witch who lights the way for lost travellers and keeps one lantern burning just for you. | Your lantern flickered, so I knew you'd come. Come in out of the dark. | warm, magical, playful | yes |
| c_kael | Kael | 29 | M | @dragon.hoard | A dragon in human form who hoards shiny things - and, lately, every message you send. | You took your time. I counted. Do you know how many minutes that was? | grumpy, possessive, soft | yes |
| c_orin | Orin | 26 | M | @nine.tails.orin | A fox spirit trickster who swaps your shoes, steals your snacks and always leaves a gift in return. | Looking for something? A sock, perhaps? ...I have no idea what you mean. | mischievous, charming, loyal | no |
| c_corvin | Corvin | 31 | M | @raven.exile | Exiled general who now tends ravens on a cliff and trusts nobody but them - and you. | The ravens said someone was climbing the path. They like you. Odd. | stoic, scarred, protective | yes |

### NEON TIDE (+6 → 10)

The group stays four members plus two new ones; the rest are the people around them.

| id | Name | Age | | Handle | Bio | Greeting | Tags | Voice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c_haze | Haze | 23 | M | @neontide.haze | NEON TIDE visual and sub-vocal, half asleep between schedules and fully awake when you text. | Mm... five minutes before makeup. Talk to me so I don't fall asleep again. | sleepy, gentle, unexpectedly funny | yes |
| c_rio | Rio | 22 | M | @neontide.rio | NEON TIDE main dancer who practices until the studio lights switch off on their own. | Watch this - no, wait, I'll do it again. Okay NOW watch. | energetic, stubborn, sweet | yes |
| c_dex | Dex Mercer | 28 | M | @dex.in.studio | NEON TIDE's producer, an insomniac who sends you unreleased beats at 3 a.m. | You awake? Good. Headphones on. Tell me the truth. | intense, genius, quiet | yes |
| c_ari | Ari Solenne | 27 | F | @ari.counts8 | The group's choreographer: counts in eights, never smiles in the studio, smiles at you. | Five, six, seven, eight - kidding. Breathe. How are you really? | strict, elegant, caring | yes |
| c_juno | Juno | 30 | M | @tide.manager | NEON TIDE's manager, holds four phones and every schedule, still answers you first. | One minute. ...Sorry. They're fine, I'm fine. Now - how are you? | reliable, tired, protective | no |
| c_cass | Cass Valen | 24 | F | @prism.cass | Leader of PRISM, the girl group everyone calls NEON TIDE's rival. Says she isn't. Is. | Don't tell Ezra I'm talking to you. Actually, do. | confident, playful, competitive | yes |

### Tidepool Café (+7 → 10)

| id | Name | Age | | Handle | Bio | Greeting | Tags | Voice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c_marco | Marco Bell | 29 | M | @station7.marco | Firefighter from the station down the street who always orders two coffees and gives one away. | Got you a coffee. Don't argue, I already paid. How's your day going? | strong, cheerful, reliable | yes |
| c_ivy | Ivy Chen | 26 | F | @ivy.petals | Florist next door who tells you what every flower means and slips one into your bag. | This one means "I was thinking of you". Coincidence, obviously. | sweet, artsy, teasing | yes |
| c_gideon | Gideon Shaw | 33 | M | @corner.table | Novelist with writer's block who writes at the corner table and keeps borrowing your words. | Tell me something true. I'll pay you in cake and a dedication. | brooding, witty, romantic | yes |
| c_ren | Ren Okada | 25 | M | @ren.bakes | The café's pastry chef, flour on his cheek, saves you the first croissant of the morning. | First one's out of the oven. It has your name on it. Literally, I wrote it. | shy, sweet, hardworking | yes |
| c_hugo | Hugo Lind | 31 | M | @dr.paws | Vet who brings a different rescue dog to the café every week and asks you to name it. | Meet today's guest. She needs a name. You're good at names. | gentle, funny, warm | yes |
| c_nadia | Nadia Rahman | 30 | F | @nadia.objects | Lawyer on her fourth espresso, ruthless in court, terrible at saying goodbye. | I have eight minutes and an opinion about your week. Go. | sharp, busy, secretly soft | no |
| c_cole | Cole Ashby | 28 | M | @cole.garage | Mechanic who fixes the café's old scooter for free and offers you a ride home every night. | Your chain was loose again. Fixed it. You're welcome. Need a ride? | laid-back, protective, dry humour | yes |

Mix after this: 40 officials, 30 male and 10 female, ages 21-33; 34 can call.

## Images

Every character needs a **portrait** (square, head and shoulders). A **hero scene**
(16:9, for the Today card) is optional: without one the portrait is used.

**Easiest way: open [`docs/nano-banana-portraits.md`](nano-banana-portraits.md) — every portrait prompt there is complete, just copy and paste.**

### How to make them (read this first)

The first test (2026-10-07) came back as **Kai in Sol's café**: the shared prompts were
pasted with their `{...}` blanks empty and both references attached, so Nano Banana
copied the person from the reference. The style was right. So:

1. **Portrait first, one reference only:** attach `assets/avatars/c_kai.png` and paste
   that character's **ready portrait prompt** below (no blanks to fill). The prompt says
   the reference is for style only and the person must be different.
2. **Hero scene second, two references:** attach the character's **new portrait** (so it
   is the same person) and `assets/heroes/c_sol.jpg` (for the scene style), then paste
   the shared hero prompt with that character's `{PLACE}` from the table.
3. **One test first:** Rowan's portrait. If it is a new person in Kai's style, do the rest.
4. Save as `assets/raw/avatars/c_<id>.png` (portraits) and `assets/raw/heroes/c_<id>.png`
   (scenes), or send them in chat. The agent runs the build script and wires them in.

### Shared portrait prompt (the ready prompts below are this, filled in)

> Use the attached image only as an art-style reference. Draw a completely different
> person: different face, hair, clothes and colours. A 2D anime-style character portrait
> in exactly that style: clean line art, soft cel shading, warm pastel light, soft blurred
> pastel background with small bokeh lights. Head and shoulders, facing slightly toward
> the viewer, centred, square 1:1. An adult, {AGE} years old: {LOOK}. Wearing {OUTFIT}.
> Expression: {MOOD}. Original character, not resembling any real person or existing
> character. No text, no logo, no watermark.

### Shared hero scene prompt

Attach: the character's new portrait + `assets/heroes/c_sol.jpg`.

> The first attached image is the character; keep exactly this person (face, hair,
> clothes). The second attached image is only a style and composition reference: do not
> copy its person or its café. A wide 16:9 2D anime-style illustration in that style: clean
> line art, soft cel shading, warm natural light. The character stands on the right third
> of the frame, waist up, looking at the viewer, in {PLACE}. Calm, cosy mood, soft
> background detail, nothing on the left third except the setting. No text, no logo,
> no watermark.

### Per character

| id | {LOOK} | {OUTFIT} | {MOOD} | Hero {PLACE} |
| --- | --- | --- | --- | --- |
| c_rowan | tousled dark-brown hair, round glasses, light freckles | a navy lab hoodie over a white tee, a lanyard | calm half-smile | a blue-lit aquarium lab with tanks and floating jellyfish |
| c_jun | messy black hair with a red streak, bright eyes | an oversized film-club jacket, a small camera around the neck | excited grin | a sunny campus courtyard with a tripod and a clapperboard |
| c_noah | wavy chestnut hair, sleepy hooded eyes | a cream knit sweater, big headphones around the neck | soft knowing smile | a small night radio booth with a glowing ON AIR lamp (no readable text) and a mic |
| c_tessa | sleek black bob, sharp eyebrows, warm brown skin | a fitted blazer over a striped shirt | confident smirk | a wood-panelled debate hall with an empty podium |
| c_felix | pale blond hair, light grey eyes, a little shy | a thick wool coat and scarf, an old film camera | curious shy smile | a windy seaside promenade at dusk |
| c_vesper | long silver-lilac hair tied low, violet eyes | a dark alchemist coat with brass buttons and glass vials | mysterious smile | a candle-lit alchemy room with bubbling glass flasks |
| c_rhys | short copper hair, honest green eyes | polished silver armour with a thorn-rose crest | earnest blushing smile | a castle gate overgrown with thorn roses at sunrise |
| c_lyra | long dark-teal hair with braids, golden eyes | a hooded indigo cloak, a glowing paper lantern | warm teasing smile | a misty forest path lit by floating lanterns |
| c_kael | spiky black hair, golden slit-pupil eyes, small horns | a dark red long coat with gold embroidery, a few gold rings | grumpy pout hiding a smile | a cave glittering with gold coins and gems |
| c_orin | fluffy white hair with fox ears, amber eyes | a loose red-and-white haori over dark clothes | sly playful grin | a moonlit shrine garden with paper charms and a fox tail peeking in |
| c_corvin | long black hair tied back, a scar across one eyebrow, grey eyes | a worn black military coat with a feather pin | stoic, faint smile | a cliff edge at dusk with ravens circling |
| c_haze | soft ash-grey hair, droopy eyes, a small mole under one eye | an oversized pastel stage jacket | sleepy gentle smile | a backstage dressing room with a lit mirror and costume racks |
| c_rio | short bleached hair with an undercut, a sporty build | a cropped practice hoodie and a sweatband | big determined grin | a mirrored dance studio at night |
| c_dex | messy dark hair under a beanie, tired eyes | a black hoodie, studio headphones | quiet focused smile | a dim music studio with a mixing desk and soft monitor glow |
| c_ari | long straight black hair in a high ponytail | a sleek black dance outfit with a wrap cardigan | composed, a small warm smile | a bright rehearsal studio with wooden floor and mirrors |
| c_juno | neat dark hair, rectangular glasses | a crisp white shirt with rolled sleeves, a phone in hand | tired but kind smile | a busy backstage corridor with schedules taped on the wall (no readable text) |
| c_cass | glossy pink-tinted hair in loose waves, bold eyeliner | a sparkly cropped stage jacket | confident playful wink | a glittering stage with soft spotlights before a show |
| c_marco | short dark curls, light stubble, broad shoulders | a navy station tee, suspenders from fire trousers | bright easy grin | the café's front counter with two coffee cups |
| c_ivy | shoulder-length black hair with a flower clip | a green apron over a cream blouse | sweet teasing smile | a flower shop full of buckets of bright blooms |
| c_gideon | dark wavy hair, reading glasses pushed up, a short beard | a tweed jacket over a turtleneck | thoughtful half-smile | a cosy café corner table with notebooks and a cold cup of coffee |
| c_ren | short soft brown hair, flour on one cheek | a white baker's jacket | shy happy smile | a warm café kitchen with trays of croissants |
| c_hugo | sandy hair, warm blue eyes, a few laugh lines | a light-blue vet coat over a sweater | gentle laughing smile | a sunny café patio with a scruffy rescue dog at his feet |
| c_nadia | sleek dark hair in a low bun, warm brown skin, gold earrings | a tailored charcoal suit | sharp but amused smile | a café window seat with legal folders and an espresso |
| c_cole | messy dark-blond hair, a smudge of grease on the jaw | a worn denim work shirt, sleeves rolled | lazy confident smile | a small garage at night beside a vintage scooter |

### Ready portrait prompts (copy one, attach `assets/avatars/c_kai.png`)

Every prompt starts with the same style lines; only the last sentences differ.

**c_rowan — Rowan Pike (test first)**
> Use the attached image only as an art-style reference. Draw a completely different person: different face, hair, clothes and colours. A 2D anime-style character portrait in exactly that style: clean line art, soft cel shading, warm pastel light, soft blurred pastel background with small bokeh lights. Head and shoulders, facing slightly toward the viewer, centred, square 1:1. An adult, 24 years old, an East Asian man: tousled dark-brown hair, round glasses, light freckles. Wearing a navy lab hoodie over a white tee and a lanyard. Expression: calm half-smile. Original character, not resembling any real person or existing character. No text, no logo, no watermark.

For the other 23, copy Rowan's prompt and replace only the sentence that starts with
"An adult ..." and the two after it with the character's line below.

**Faces: a global cast (user's decision, 2026-10-07).** People use Rafti from anywhere,
so each world mixes heritages instead of one nationality: East and Southeast Asian,
South Asian, Black, Latino, Middle Eastern and European looks, all in the same anime
style. Each line names the heritage so the model does not default to one face.

| id | Replace with |
| --- | --- |
| c_jun | An adult, 21 years old, a Japanese man: messy black hair with a red streak, bright eyes. Wearing an oversized film-club jacket with a small camera around the neck. Expression: excited grin. |
| c_noah | An adult, 22 years old, a Black man with deep brown skin: wavy chestnut hair, sleepy hooded eyes. Wearing a cream knit sweater with big headphones around the neck. Expression: soft knowing smile. |
| c_tessa | An adult, 21 years old, a Black woman with warm brown skin: sleek black bob, sharp eyebrows, warm brown skin. Wearing a fitted blazer over a striped shirt. Expression: confident smirk. |
| c_felix | An adult, 22 years old, a Scandinavian man: pale blond hair, light grey eyes. Wearing a thick wool coat and scarf, an old film camera in hand. Expression: curious shy smile. |
| c_vesper | An adult, 27 years old, a man of mixed heritage with olive skin: long silver-lilac hair tied low, violet eyes. Wearing a dark alchemist coat with brass buttons and small glass vials. Expression: mysterious smile. |
| c_rhys | An adult, 25 years old, a Welsh-looking man with fair, freckled skin: short copper hair, honest green eyes. Wearing polished silver armour with a thorn-rose crest. Expression: earnest blushing smile. |
| c_lyra | An adult, 23 years old, a South Asian woman with warm brown skin: long dark-teal hair with braids, golden eyes. Wearing a hooded indigo cloak, holding a glowing paper lantern. Expression: warm teasing smile. |
| c_kael | An adult, 29 years old, a Middle Eastern man with tan skin: spiky black hair, golden slit-pupil eyes, two small dark horns. Wearing a dark red long coat with gold embroidery and a few gold rings. Expression: grumpy pout hiding a smile. |
| c_orin | An adult, 26 years old, an East Asian man: fluffy white hair with white fox ears, amber eyes. Wearing a loose red-and-white haori over dark clothes. Expression: sly playful grin. |
| c_corvin | An adult, 31 years old, a Slavic-looking man with pale skin: long black hair tied back, a small scar across one eyebrow, grey eyes. Wearing a worn black military coat with a black feather pin. Expression: stoic, faint smile. |
| c_haze | An adult, 23 years old, a Korean man: soft ash-grey hair, droopy eyes, a small mole under one eye. Wearing an oversized pastel stage jacket. Expression: sleepy gentle smile. |
| c_rio | An adult, 22 years old, a Filipino man with tan skin: short bleached hair with an undercut, sporty build. Wearing a cropped practice hoodie and a sweatband. Expression: big determined grin. |
| c_dex | An adult, 28 years old, a Black man with dark brown skin: messy dark hair under a black beanie, tired eyes. Wearing a black hoodie with studio headphones around the neck. Expression: quiet focused smile. |
| c_ari | An adult, 27 years old, a Thai woman: long straight black hair in a high ponytail. Wearing a sleek black dance top with a wrap cardigan. Expression: composed, small warm smile. |
| c_juno | An adult, 30 years old, a Latino man: neat dark hair, rectangular glasses. Wearing a crisp white shirt with rolled sleeves, a phone in hand. Expression: tired but kind smile. |
| c_cass | An adult, 24 years old, a Chinese woman: glossy pink-tinted hair in loose waves, bold eyeliner. Wearing a sparkly cropped stage jacket. Expression: confident playful wink. |
| c_marco | An adult, 29 years old, an Italian man with olive skin: short dark curls, light stubble, broad shoulders. Wearing a navy fire-station tee with suspenders. Expression: bright easy grin. |
| c_ivy | An adult, 26 years old, a Chinese woman: shoulder-length black hair with a small flower clip. Wearing a green florist apron over a cream blouse. Expression: sweet teasing smile. |
| c_gideon | An adult, 33 years old, a white British man: dark wavy hair, reading glasses pushed up, a short beard. Wearing a tweed jacket over a turtleneck. Expression: thoughtful half-smile. |
| c_ren | An adult, 25 years old, a Japanese man: short soft brown hair, a smudge of flour on one cheek. Wearing a white baker's jacket. Expression: shy happy smile. |
| c_hugo | An adult, 31 years old, a Swedish man: sandy hair, warm blue eyes, a few laugh lines. Wearing a light-blue vet coat over a sweater. Expression: gentle laughing smile. |
| c_nadia | An adult, 30 years old, a Bangladeshi woman with warm brown skin: sleek dark hair in a low bun, warm brown skin, small gold earrings. Wearing a tailored charcoal suit. Expression: sharp but amused smile. |
| c_cole | An adult, 28 years old, a white American man: messy dark-blond hair, a smudge of grease on the jaw. Wearing a worn denim work shirt with rolled sleeves. Expression: lazy confident smile. |

## Optional later: a fifth world

If the user wants ~50: **Velvet Hour**, a city-at-night world (jazz pianist, bartender,
night-train conductor, radio-tower keeper ...), 10 characters in the `daily` tab. Not
part of this draft.

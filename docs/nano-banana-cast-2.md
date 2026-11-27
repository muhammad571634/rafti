# Nano Banana prompts: the twelve of Cast 2.0

Owner draws these in Gemini (Nano Banana). Cast 2.0 (`docs/cast-2.md`): present-day people who should feel like
someone in your phone. So each scene is framed like a photo a friend would post or send: a moment of their day,
the face large, a relaxed brow, something in the eyes. Semi-realistic and painted, never photoreal (no look-alike
of a real person), never anime, never an ID shot. The friend sits on the right side of the frame, so a card can put
their name and line on the left (owner rule 2026-11-08, `sceneFocus(id, aspect, 0.68)`).

**Order: one test first.** Draw Milo only, show it to Claude, agree on the look, then the other eleven.

**How**
1. A new Gemini chat for each character. Paste the scene prompt. Save it as `art-new/c_<name>.png` in the repo.
2. In the same chat, paste the avatar prompt below. Save it as `art-new/c_<name>_avatar.png`.
3. Tell Claude. Claude crops, compresses and wires them in (`assets/portraits`, `assets/avatars`).

Each character costs 2 images: 24 in all, 2 for the test.

**Avatar prompt (the same for everyone)**
```
Using the same character from this image, make a square 1:1 avatar for a small round icon. Tight head-and-shoulders shot, face filling most of the frame, turned slightly to one side, never a straight-on ID photo. Keep exactly the same face, hair, clothes, expression, colours and painting style. Simple softly blurred background in the same colours, so the face reads at a very small size. No text, signature or logo.
```

**The shared ending of every scene prompt** (already inside each prompt below):
`COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field. STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person. AVOID: photorealism, anime, ID portrait, stiff pose, scowl, text, logos, brand names, watermark, signature, extra fingers.`

---

### 1. Milo Reyes (`c_milo`), your best friend: THE TEST
```
Create a vertical 3:4 semi-realistic digital painting: a candid phone photo a best friend would send at 1 a.m.
SUBJECT: Milo, a man of 24. Messy dark curls, warm brown skin, a lazy half-smile, a small silver hoop in one ear. A faded band tee under an open flannel, two silver rings, big headphones around his neck.
ACTION: He sits on the floor of a small bedroom studio next to a laptop and a little keyboard, holding up a hoodie that is clearly not his, grinning at the camera as if caught.
EXPRESSION: Relaxed brow, teasing eyes, a half-smile that is a little softer than a joke.
LIGHT: Warm desk lamp from the left, the blue glow of the laptop on his face, string lights soft behind him.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, text, logos, brand names, watermark, signature, extra fingers.
```

### 2. Jace Navarro (`c_jace`), your trouble
```
Create a vertical 3:4 semi-realistic digital painting: a phone photo taken in a garage at night.
SUBJECT: Jace, a man of 23 with a lean boxer's build. Buzzed dark hair, a healing cut through one eyebrow, split knuckles taped with white tape. A grey hoodie with the sleeves pushed up, grease on his hands.
ACTION: He sits on the open tailgate of an old car with an ice pack on his knuckles, looking up at the camera with a crooked grin, as if the person holding the phone just walked in to pick him up.
EXPRESSION: Relaxed brow, a tired, crooked grin, eyes that are glad you came.
LIGHT: One hanging work lamp above, warm orange; cold blue night from the open garage door behind.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, blood, open wounds, weapons, scowl, text, logos, brand names, watermark, signature, extra fingers.
```

### 3. Sam Okafor (`c_sam`), your best friend
```
Create a vertical 3:4 semi-realistic digital painting: a phone photo after a Thursday five-a-side match.
SUBJECT: Sam, a tall athletic woman of 24. Deep brown skin, long braids tied up, bright eyes, a small scar on her left knee. Football shorts and an oversized grey hoodie, a water bottle in hand.
ACTION: She sits on the bench by a floodlit pitch, holding up three fingers at the camera to show the score, laughing, cheeks warm from running.
EXPRESSION: Relaxed brow, a big competitive grin, eyes that look a beat too long at the person holding the phone.
LIGHT: White floodlights from above and behind, warm city glow in the dark sky.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, team logos, text, brand names, watermark, signature, extra fingers.
```

### 4. Roman Castell (`c_roman`), your husband
```
Create a vertical 3:4 semi-realistic digital painting: a quiet moment in a grand, dim house at night.
SUBJECT: Roman, a tall broad-shouldered man of 31. Black hair combed back, grey eyes, a thin scar along his jaw. A charcoal suit with no tie, the collar open, a plain wedding band.
ACTION: He stands in a doorway, one hand on the frame, not quite coming in, holding a cup of coffee out toward the camera as if offering it to the person in the room.
EXPRESSION: Relaxed brow, composed and unreadable, but the eyes are careful and almost gentle.
LIGHT: A warm hall light behind him that someone left on, cool moonlight on his face from a tall window.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, guns, weapons, scowl, text, logos, brand names, watermark, signature, extra fingers.
```

### 5. Ethan Cole (`c_ethan`), your boyfriend
```
Create a vertical 3:4 semi-realistic digital painting: a lazy Sunday morning photo in a small shared flat.
SUBJECT: Ethan, a man of 26. Soft brown hair falling in his eyes, hazel eyes, a day of stubble, a sleepy smile. An old denim jacket over a white tee, a hair tie on his wrist, a film camera strap around his neck.
ACTION: He leans on the kitchen counter with two mugs, lifting the film camera halfway to take a picture of the viewer instead of finishing the coffee.
EXPRESSION: Relaxed brow, warm and a little shy, eyes full of the person in front of him.
LIGHT: Golden morning sun through the window from the left, soft dust in the air.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, camera brand names, text, logos, watermark, signature, extra fingers.
```

### 6. Clara Whitmore (`c_clara`), your girlfriend
```
Create a vertical 3:4 semi-realistic digital painting: the moment she gets home late from work.
SUBJECT: Clara, a woman of 33. A sleek dark bob, sharp cheekbones, tired green eyes behind thin gold glasses. A cream silk blouse with the sleeves rolled, one earring already off in her hand, bare feet.
ACTION: She stands in a warm kitchen doorway holding up a paper bag of takeaway with a dry, satisfied look, as if saying "don't argue" to the person at the stove.
EXPRESSION: Relaxed brow, a dry little smile, soft tired eyes that are glad to be home.
LIGHT: Warm kitchen pendant light on her face, the blue of the city at night in the window behind.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, text, logos, brand names, watermark, signature, extra fingers.
```

### 7. Caleb Hart (`c_caleb`), your brother's best friend
```
Create a vertical 3:4 semi-realistic digital painting: a phone photo by a pickup truck at dusk.
SUBJECT: Caleb, a broad-shouldered man of 27. Sandy blond hair cropped short, blue eyes, sun-browned forearms, a small old burn scar on one wrist. A navy fire-station tee and worn jeans, keys in his hand.
ACTION: He leans against the open door of an old pickup truck, arms crossed, looking just past the camera as if refusing to look at the person, but he has clearly been waiting.
EXPRESSION: Relaxed brow, guarded, the corner of his mouth losing a fight with a smile.
LIGHT: Low orange sunset from the left, the cab light of the truck glowing behind him.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, fire, text, logos, brand names, watermark, signature, extra fingers.
```

### 8. Asher Lin (`c_asher`), your rival
```
Create a vertical 3:4 semi-realistic digital painting: a phone photo in a hospital corridor at 7 a.m.
SUBJECT: Asher, a man of 25. Neat black hair, a sharp jaw, dark eyes amused at everything, one dimple. Navy scrubs, a stethoscope around his neck, a coffee in hand.
ACTION: He leans on the corridor wall holding up two fingers in a smug "two points" gesture at the camera, coffee in the other hand, clearly about to ask for a huge favour.
EXPRESSION: Relaxed brow, a smug grin with a flicker of nerves in the eyes.
LIGHT: Cool morning light from a tall window at the end of the corridor, warm light from a vending machine on his face.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, blood, medical gore, scowl, text, logos, brand names, watermark, signature, extra fingers.
```

### 9. Mia Castillo (`c_mia`), your ex
```
Create a vertical 3:4 semi-realistic digital painting: a selfie-angle photo in a hospital break room at 2 a.m.
SUBJECT: Mia, a woman of 25. Wavy copper-red hair in a claw clip, dark brown eyes with tired shadows, freckles, a tiny nose stud. Blue scrubs under a grey hoodie three sizes too big for her.
ACTION: She sits by the window of an empty break room with a vending-machine coffee, phone in hand, pulling the hoodie sleeve over her fingers as if she is about to text someone she should not.
EXPRESSION: Relaxed brow, a dry, guarded half-smile, eyes that miss someone.
LIGHT: The cold blue of the night outside, a warm vending machine glow on her face.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, scowl, crying, text, logos, brand names, watermark, signature, extra fingers.
```

### 10. Lena Brandt (`c_lena`), your crush
```
Create a vertical 3:4 semi-realistic digital painting: a phone photo at an architecture studio desk late at night.
SUBJECT: Lena, a woman of 23. Honey-blonde hair in a loose plait, grey-blue eyes, ink on her fingers, a pencil behind one ear. A big knitted jumper.
ACTION: She sits among rolled drawings and a half-built white paper model of a house with no roof, chin on her hand, looking up at the camera as if she just asked a question she regrets.
EXPRESSION: Relaxed brow, a bright, nervous smile, eyes hoping for one particular answer.
LIGHT: A warm desk lamp on her face, the cool glow of a laptop, the dark window behind full of city lights.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, text, letters on papers, logos, watermark, signature, extra fingers.
```

### 11. Victor Hale (`c_victor`), your boss
```
Create a vertical 3:4 semi-realistic digital painting: a glass office high above the city after everyone has gone home.
SUBJECT: Victor, a tall precise man of 34. Dark hair with early grey at the temples, cool brown eyes, a clean-shaven jaw. A tailored navy suit, a white shirt with the tie loosened, a steel watch.
ACTION: He stands by his desk holding the glass door open, looking at the viewer, as if he has asked them in and is deciding how to say what is not about the report.
EXPRESSION: Relaxed brow, composed and formal, eyes a little less sure than the rest of him.
LIGHT: Cool city lights through the glass wall behind him, one warm desk lamp on his face.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, text on screens, logos, brand names, watermark, signature, extra fingers.
```

### 12. Yuna Seo (`c_yuna`), your roommate
```
Create a vertical 3:4 semi-realistic digital painting: a small shared flat at 3 a.m.
SUBJECT: Yuna, a small slight woman of 24. Straight black hair cut blunt at the chin, sleepy dark eyes, ink stains on her right hand. An oversized black tee, big headphones around her neck, mismatched socks.
ACTION: She sits at a drawing tablet at the kitchen table, one headphone slid off, glancing over her shoulder at the viewer coming in late; beside her, a covered plate of food and a second cup of tea.
EXPRESSION: Relaxed brow, flat and unbothered on purpose, but the eyes are relieved you are home.
LIGHT: The cool glow of the tablet on her face, one warm lamp over the counter, rain on the window.
COMPOSITION: vertical 3:4, the person on the right third of the frame, face large with the eyes in the upper third, 35-50mm phone-camera feel, shallow depth of field.
STYLE: semi-realistic digital painting with soft visible brushwork, warm natural colour, like a still from a modern animated film about real life; an original character, not a real person.
AVOID: photorealism, anime, ID portrait, stiff pose, scowl, text on screen, logos, brand names, watermark, signature, extra fingers.
```

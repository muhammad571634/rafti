# Lottie animations

`<Anim name="…" />` plays the file registered for a slot in `registry.ts`, or a
Reanimated stand-in while that slot is empty — so the app always looks finished.

## Wired up

| Slot         | File               | Source                                              |
| ------------ | ------------------ | --------------------------------------------------- |
| `levelUp`    | `level-up.json`    | `xvrh/lottie-flutter` fireworks, recoloured to apricot / mint / sky |
| `typing`     | `typing.json`      | `useAnimations/react-useanimations` loading3 → apricot |
| `heartBurst` | `heart-burst.json` | LottieFiles "Add to favorites"                       |
| `giftBox`    | `gift-box.json`    | LottieFiles "Gift box"                               |
| `confetti`   | `confetti.json`    | LottieFiles "Confetti - Full Screen"                 |
| `loveLetter` | `love-letter.json` | LottieFiles "Envelope opens and releases a lot of hearts" by Farfique, recoloured to mint + apricot |

All LottieFiles items above are free animations under the Lottie Simple License.

The old cat animations (mascot wave, lucky cat, sleeping cat, dance cat, empty box)
were retired with the pink-cat brand: Rafti's still art in `assets/brand/` (with a
Reanimated float) now covers those moments.

## Still on the Reanimated fallback

These are deliberate: the fallbacks are 0 KB, take the theme colour, and read
better at small sizes than a fixed-palette Lottie.

| Slot        | Save as           | Used on                  | If you want a real one, search |
| ----------- | ----------------- | ------------------------ | ------------------------------ |
| `voiceWave` | `voice-wave.json` | Voice bubbles, call      | "sound wave", "audio bars"     |
| `calling`   | `calling.json`    | Call connecting state    | "phone call", "ringing"        |
| `shell`     | `shell.json`      | Shell Store balance      | "seashell", "coin spin"        |

## Adding one

1. Download from <https://lottiefiles.com/free-animations/SEARCH?type=free> —
   the `?type=free` filter matters, unfiltered results include premium items.
   Open a card → **Lottie JSON** row → green **Download**.
   (Free accounts have a daily download cap; GitHub is the unlimited fallback —
   `xvrh/lottie-flutter/example/assets` and `useAnimations/react-useanimations/src/lib`
   both serve raw `.json` over `raw.githubusercontent.com`.)
2. Save it here under the exact file name above.
3. Uncomment its line in `registry.ts`.
4. Recolour it to the palette if needed:

```bash
node scripts/recolor-lottie.js assets/lottie/voice-wave.json --list
node scripts/recolor-lottie.js assets/lottie/voice-wave.json 231f20=E8742A
```

`--list` prints every colour in the file; then pass `from=to` hex pairs.

Keep each file under ~150 KB and prefer shape layers over embedded images.

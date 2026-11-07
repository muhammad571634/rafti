# Performance budgets

The app must feel light on every phone people install it on, from a 2020 mid-range Android (our
Galaxy A51 test phone) to a 120 Hz iPhone Pro. These are the published platform budgets we hold
ourselves to, then the rules that keep us inside them, then how to measure.

## 1. Budgets (platform standards)

| What | Budget | Source |
|---|---|---|
| One frame at 60 Hz | 16.7 ms (work done by ~10-12 ms, the rest is the system's) | Android "Slow rendering" (developer.android.com/topic/performance/vitals/render); Google RAIL model |
| One frame at 120 Hz (ProMotion, many new Androids) | 8.3 ms | Apple "Optimizing ProMotion refresh rates for iPhone 13 Pro and iPad Pro" |
| Slow frames | under 50 % of frames over 16 ms is Android vitals' line for "excessive slow frames"; we aim for under 10 % on the A51 | Android vitals |
| Frozen frame | none over 700 ms | Android vitals |
| Tap to visible response | under 100 ms | Google RAIL ("respond in under 100 ms") |
| Screen transition | the system's own push / tab switch, ~350 ms; nothing of ours may add a stall to it | iOS UINavigationController, React Navigation native stack |
| Cold start to first frame | about 400 ms on iPhone | Apple WWDC19 "Optimizing App Launch" |
| Cold start | under 5 s on Android, warm under 2 s, hot under 1.5 s (vitals' "excessive" lines) | Android vitals |
| JS thread | no task over 50 ms while the user touches the screen | Google RAIL ("idle work in 50 ms chunks") |

## 2. Rules

1. **An idle screen draws nothing.** With no touch and nothing arriving, a main tab renders 0 frames.
   An endless animation (`withRepeat(..., -1)`, a looping Lottie, a `setInterval` that sets state)
   runs only to show a live event and stops with it (typing dots while a friend types, the widget
   jiggle in edit mode). `src/lib/idle-screens.test.ts` fails on any other loop in the main tabs.
   Ambient motion is one-shot (a settle, a pop on arrival), never a loop.
2. **Nothing works off screen.** An animation, a timer or a list of an unfocused tab or a scrolled-away
   card stops (`useFocusEffect` cleanup). Expo Router 58 ignores `freezeOnBlur`, so this is on us.
3. **Read only what you show.** A component selects the smallest slice of the store it draws (a
   number, an id list with `useShallow`), never `s.messages` or `s.relationships` whole unless it shows
   them. A chat line must not re-render Today's alarm. Shared derived data (the featured friend) is
   computed once per store change (`featuredFriendOf`), not per caller.
4. **Work only for what is on screen.** Today builds the four placed widgets, not all eleven; the
   gallery's live previews mount only while it is open. Long lists are `FlatList` with stable keys.
5. **Time-driven content wakes itself.** A widget whose content changes at a known moment sets one
   timer for that moment (`useWakeAt`) and refreshes on return to the foreground; no polling.
6. **Memo where props are stable.** Handlers passed to rows and slots are `useCallback` and take the
   row's index, so a parent's re-render does not reach them.
7. **Tab bars switch at the tap.** No press-scale on tab items: it redraws the window before the
   switch (iOS and Material bars do not shrink either).
8. **No Android elevation on cards that overlap others** (it lifts them over later siblings) and no
   live blur on Android (a full-screen layer per glass shape per frame).

## 3. Measure (lowest phone first)

On the A51 over USB with the SDK's adb (never the scrcpy one):

```bash
adb shell dumpsys gfxinfo com.sigmazam.app reset
# use the screen, or leave it untouched for 5 s to check rule 1
adb shell dumpsys gfxinfo com.sigmazam.app
```

Read "Total frames rendered" (0 when idle), "Janky frames", the 50th / 90th / 99th percentiles and
the GPU percentiles. `framestats` gives per-frame UI, draw and GPU times.

| Date | Screen | Before | After |
|---|---|---|---|
| 2026-11-07 (0z131) | Today, untouched 5 s | 320 frames, 78-92 % janky, 50th 32 ms, GPU 12-13 ms per frame (the hero's breath) | 0 frames |
| 2026-11-07 (0z131) | Today, six scrolls | 41 % janky, 90th 32 ms | 19 % janky, 90th 28 ms |
| 2026-11-07 (0z131) | 12 tab switches (warm) | median frame 40 ms (tab bar rebuilt on every tap) | median 25-29 ms; worst 130-150 ms (new screen appearing, open) |
| 2026-11-07 (0z134) | 12 tab switches (warm) | each tap: ~100-200 ms of full-window press-shrink frames, then one 130-150 ms frame | 12 frames in all, one 130-150 ms frame per switch (no press shrink); attached see-through tabs + fade tried: worse, reverted |

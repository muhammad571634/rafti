# Appearance plan: which screens are dark (proposal, 2026-11-11, waits for the owner's pick)

Owner, 2026-11-11: companion apps in the App Store are mostly dark; they are used most from 9 PM to
1-2 AM; find out which screens truly carry emotion in the dark, the way Apple would decide it.

## 1. What we found

**On the A51, with the phone in Light mode** (screenshots in the session, nothing tapped):
- Character.AI 1.17: fully dark (near-black ground, white text). It ignores the phone's Light mode;
  its light theme sits behind its paid tier.
- Replika: the chat is the companion standing in a softly lit 3D room, white bubbles over the scene;
  the loading screen is near-black. The room, not a white page, is the ground.
- For contrast, a general assistant (ChatGPT) follows the phone and shows white. Tools follow the
  phone; companions set a mood.
- Not verified on a device (App Store pages would not open in the agent's browser): Talkie, Chai,
  PolyBuzz, Janitor, Kindroid, Nomi are dark-first in their store screenshots as remembered; treat as
  likely, not measured.

**Research**
- Reading: dark text on a light ground (positive polarity) is read slightly faster and more
  accurately in bright surroundings; the effect is tied to pupil size and screen brightness
  (Piepenbrock, Mayr, Buchner 2014, Ergonomics). In a dark room a bright screen does the opposite:
  glare, pupils that keep adapting, a white flash every time the app opens.
- Preference: one third dark, one third light, one third mixed (NN/g, 115 mobile users); younger
  samples lean dark (about 68% in a 2026 study of 215 users, mean age 24). Comfort follows the
  ambient light more than taste.
- Night use: the owner's numbers (9 PM to 2 AM) match every account of companion apps; no public
  time-of-day telemetry was found. Our own server log can measure it (`[stats]`, per hour).

**Apple (HIG Dark Mode, read 2026-11-11)**: respect the system setting and avoid an in-app appearance
switch; "in rare cases, consider using only a dark appearance in the interface ... an app that
supports immersive media viewing ... lets the UI recede and helps people focus on the media."
What Apple ships: the TV app and Fitness+ are always dark; Camera, the Photos viewer, Music's Now
Playing, the call screen, FaceTime, the Clock's alarm and Sleep / Wind Down go dark for the moment;
Settings, Mail, Notes, Messages, Calendar follow the phone. Apple's own line: **the moment and the
media are dark; the tools that manage things follow the phone.** And with "Automatic" appearance
(sunset to sunrise), most iPhones are already dark at 9 PM.

## 2. Options

**A. Night-first (the whole app is dark, like Character.AI).** One look, one brand; matches the
category and the hours; the cast's art (night-lit scenes) is drawn for it; the stained-glass widgets
and orbs already look their best there; half the design and testing work. Against: daytime reading
in bright sun is a little harder; HIG prefers following the phone (Apple accepts dark-only apps).
Paper stays paper in any option (diary pages, polaroids, board notes, share posters).

**B. Apple's split (recommended by the agent).** Everything where you are *with* a character is
always dark; the screens where you *manage* things follow the phone:

| Always dark (the moment) | Follows the phone (the tools) |
|---|---|
| A chat (on the character's picture; needs the owner's word, the chat is a "leave it" screen) | Today, Chats list, Us, Find (the tabs; at night they turn to stained glass) |
| A character's page, memories, background picker | Profile, edit profile, personas, language, notifications |
| Calls, incoming call, group call | Store, plans, shell history, gifts |
| Bedtime, alarms (the ring keeps its sunrise: waking is morning light) | Create a character, lore, scenes, quiz writing |
| Radio player, streams (live) | Contacts, new group, group info |
| A date round, the date album | Diary (approved; paper), board, Photo Booth (paper on a soft room) |
| Level-up, the launch, onboarding's meeting steps | Mind, moments list |

Why B over A for Sigmazam: it is exactly Apple's rule, so iOS reviewers and iPhone users meet the
behaviour they know; daytime list and settings work stays legible in the sun; and at night, when the
app is used most, the tabs are dark anyway (iOS Automatic). The emotional peaks (the chat, a call,
falling asleep, a date) are dark at every hour.

**What B changes**: already always dark since `affab3c` and before: calls, bedtime, alarms, the radio
player, a date round, level-up, the launch. To move: the chat, a character's page (memories,
background picker), streams live, the date album, onboarding's meeting steps.

**What A changes**: `isDark` becomes true for everyone (one constant in `src/theme/colors.ts`) and
`userInterfaceStyle: "dark"` in `app.json` (system sheets, keyboard, alerts; needs a new APK);
every light-only token path is then dead code to remove over time.

## 3. Also worth doing (either option)

- No white flash at night: the launch, splash and the first frame are dark whatever the theme.
- At night (22:00-05:00 local) the Today hero already dims; keep the brightest white on screen off
  pure #FFFFFF in dark (done: `#09090D` ground, `#16161E` cards).
- Measure the hours: add the hour of each reply to the server's `[stats]` line, so the 9 PM-2 AM
  peak is our own number, not a belief.

Sources: [Piepenbrock et al. 2014](https://informahealthcare.com/doi/abs/10.1080/00140139.2014.948496),
[NN/g, Dark mode users](https://nngroup.com/articles/dark-mode-users-issues),
[Dark mode preferences, Univ. of Turku](https://research.utu.fi/converis/portal/detail/Publication/456851718?lang=en_US),
[Character.AI appearance setting](https://www.roborhythms.com/character-ai-new-ui/),
HIG Dark Mode (`developer.apple.com/design/human-interface-guidelines/dark-mode`).

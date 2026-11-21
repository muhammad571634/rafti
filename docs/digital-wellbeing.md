# Digital wellbeing: helping users off the endless scroll (research, 2026-10-26)

Owner's ask (2026-10-26): the owner and the people around them are stuck on TikTok, Instagram and
Reels. Our audience is 18-30 (Gen Z and young millennials). Research what the endless scroll does to
the mind, and what Sigmazam can do to bring people back from it, ideally in an "invisible" way (not
lectures). Nothing here is built yet; the owner picks.

## 1. What the evidence says

**Harm (mostly correlation, not proof of cause):**
- *Psychological Bulletin* meta-analysis (Nguyen, Walters et al.; 71 studies, ~98,000 people): heavier
  short-form video use goes with weaker attention, inhibitory control and working memory; moderate
  links to stress and anxiety; weak links to depression, sleep and loneliness. **How compulsively**
  people scroll matters more than how long. Most studies are cross-sectional, and the attention
  part rests on 14 studies, all from China.
  ([summary](https://siliconcanals.com/s-is-all-that-scrolling-really-dulling-your-attention-researchers-combed-71-studies-the-link-is-real-but-how-compulsively-you-scroll-matters-more-than-how-long/),
  [critique](https://www.aol.com/news/study-short-form-video-isnt-172407022.html))
- A 2026 systematic review of short-video addiction (23 studies, adolescents and young adults):
  linked to weaker attention and executive control. Self-control protects; impulsivity, boredom and
  negative thinking make people vulnerable.
  ([Bath Spa](https://researchspace.bathspa.ac.uk/17592/))
- **Sleep:**
  - In 815 young adults tracked for 4 weeks, 12% used the phone in the middle of the night and 41% had
    sleep broken by the phone at least once.
  - Frequent interruptions went with 48 minutes less sleep.
  - Keeping the phone out of reach, or not using it in the last hour before bed, looks most promising.
    A blue-light filter did nothing.
  ([KU](https://test01.ku.dk/:obvius/pureproxy/3974268/en/publications/overnight-smartphone-use-a-new-public-health-challenge-a-novel-st),
  [Springer](https://link.springer.com/article/10.1007/s41347-025-00536-9))
- **Gen Z wants out:**
  - 81% of Gen Z adults often wish they could disconnect more easily (Quad/Harris, Feb 2025).
  - 28% of Gen Z adults want a "dumb phone" (Morning Consult 2024).
  - 53% of Gen Z social media users say they doomscroll.
  ([eMarketer](https://www.emarketer.com/content/gen-z--millennials-feeling-digital-fatigue),
  [Morning Consult](https://pro.morningconsult.com/analysis/dumb-phone-gen-z-millennials-dumb-tech-interest-2024),
  [doomscrolling](https://pro.morningconsult.com/analysis/doomscrolling-impact-users-mood-2024))

**What actually works:**
- **Friction at the moment of opening:**
  - *one sec*, a field experiment published in PNAS 2023 (Heidelberg / Max Planck; 280 people, 6 weeks):
    a short pause with the option to back out cut app openings by **57%**.
  - In 36% of attempts people closed the app again, and attempts fell 37% from the first week.
  - **The strongest single element was the option to back out**; a delay helped; a "think about
    it" message alone did not.
  - Over 13 weeks (CHI 2024, 1,039 users) people took breaks from it and slipped back after them.
  ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409),
  [CHI 2024](https://researchgate.net/profile/Luke-Haliburton/publication/377774169_A_Longitudinal_In-the-Wild_Investigation_of_Design_Frictions_to_Prevent_Smartphone_Overuse/links/65b7d1311bed776ae313b600/A-Longitudinal-In-the-Wild-Investigation-of-Design-Frictions-to-Prevent-Smartphone-Overuse.pdf))
- **Hard time limits alone fail:**
  - Hunt et al. 2018 (143 students, 10 minutes per platform per day): less loneliness and depression.
  - But a replication with 644 people under 30 found no effect: only 10% kept under 30 minutes even
    for one week.
  ([APS](https://www.psychologicalscience.org/?p=224714),
  [TechCrunch](https://techcrunch.com/2018/11/09/limiting-social-media-use-reduced-loneliness-and-depression-in-new-experiment))
- **Taking a break helps a little:** deactivating Facebook or Instagram for 6 weeks improved a
  happiness / depression / anxiety index by 0.06 / 0.04 SD (Allcott, Gentzkow et al.).
  ([NBER](https://nber.org/system/files/working_papers/w33697/w33697.pdf))
- **The replacement must be easy:** people keep scrolling mainly because it is the most convenient
  thing; reading or walking "was harder to start".
  ([UW project](https://courses.cs.washington.edu/courses/cse440/24au/projects/focusshift))
- **A chatbot that talks it through:**
  - The evidence is thin but promising: a GPT-4 motivational-interviewing chatbot raised readiness to
    change.
  - An LLM prototype (MindShift) sent persuasive messages when 18-29-year-olds opened blacklisted apps.
  ([MindShift](https://arxiv.org/pdf/2309.16639))

**The warning that applies to us:**
- MIT Media Lab and OpenAI (2025; 40M chats plus a 981-person randomized trial): the heaviest chatbot
  users reported more loneliness, more dependence and less time with real people. This is
  correlation, not proof of cause.
- An AI friend that becomes the next endless scroll would repeat the problem.
- Our 20 pushes a day must pull people **out** too (sleep, a walk, a real friend), not only into the
  app.
([summary](https://siliconcanals.com/m-a-mit-openai-study-of-nearly-40-million-chats-found-the-heaviest-chatgpt-users-reported-more-loneliness-dependence-and-less-time-with-real-people-though-researchers-warn-the-link-is-correlation-no/))

## 2. What Sigmazam can do (ranked by evidence)

The invisible way: no lectures. The friend cares in their own temper, and "Open anyway" is always
there with no shame: autonomy works, preaching does not, least of all with Gen Z. The AI writes
every word (like threads, D87); the code only gives it moments and tools.

| # | Idea | Evidence | What it needs |
| --- | --- | --- | --- |
| A | **A friend at the door.** The user picks apps (TikTok, Instagram…). Opening one shows the friend for a few seconds: "Reels again? 😏 One minute with me instead?" with **Open anyway** / **Talk to Kai** / **Walk with me**. | Strongest (one sec: −57%; backing out is the key) | iOS: Screen Time API (FamilyControls individual authorization, iOS 16+; a shield with our own look via ShieldConfiguration / ShieldAction extensions); needs Apple's **Family Controls entitlement** (request early). Quick iOS path: a Shortcuts "App opened" automation into our deep link, as one sec does. Android: Usage Access (`PACKAGE_USAGE_STATS`) plus a foreground service and overlay, or an AccessibilityService (Play policy declaration). Native code in a real build. |
| B | **Night guardian.** In the user's learned sleep window, opening social apps (or late use of ours) brings the friend: a goodnight in their temper, "phone on the shelf, I'll wake you" (Bedtime + the morning-chain alarm). | Good (stop an hour before bed, phone out of reach) | Inside our app: now. Outside: same as A. |
| C | **Attention mirror.** Once a week the friend talks about screen time, curious, never judging: "3 hours of Reels yesterday. What would you rather have done?" Motivational interviewing, written by the AI. | Medium (MI raises readiness to change) | iOS DeviceActivityReport (private, on the device); Android UsageStatsManager; only with consent and nothing uploaded. |
| D | **Real-world quests.** Small, easy-to-start things the friend asks for from the user's interests and memories: "send me a photo of the sky", "walk to the shop without the phone and tell me what you saw", "call Aziz this week". Tracked as threads (D87), with shells as the reward. | Medium (the replacement must be easy) | Software only: threads + a quest kind. Works now. |
| E | **A goal with a friend.** "I want to use TikTok less" becomes a thread: the friend checks in, celebrates, never scolds. | Medium (accountability) | Software only (threads). Works now. |
| F | **An honest app ourselves.** No endless feed and no autoplay. Chats end naturally ("I'm off to sleep, you too"). Friends push real people and real life (`CHARACTER_RULES`). After long sessions the friend suggests a break. Pushes that lead out count toward the budget too. | The MIT/OpenAI warning | Software only. Partly in place. |
| G | **Phone-free hour together.** A group challenge with friends in a group chat, with a streak of offline evenings. | Low to medium | Software only. |

**Privacy:** the Screen Time API gives only opaque tokens (no app names); usage stays on the phone.
We never upload what apps someone uses.

**Speed:** the door has to be instant, so the friend's door lines are written ahead (the server writes
a few per friend per day; a local fallback covers the rest).

## 3. Status

- **Decided (owner, 2026-10-26):** everything that is software only is built now as one engine (the
  thread kinds in `src/lib/threads.ts` plus the moments in `src/lib/life.ts`). A + B (and C, which
  needs the same Screen Time plumbing) come in a later version, after the App Store release, with
  Apple's Family Controls entitlement.
- **D88 built:**
  - D: real-life quests, once a day in the daytime, with 3 shells when done;
  - E: goals ("use TikTok less" → checked on after 2, 4 and 7 days, never scolded);
  - F (in-app part): "it's late, sleep?" after 00:30 and "a break?" after 40 minutes and 25 messages,
    each once;
  - the model's rule `REAL LIFE` in the global tier.
- **Next:** G (a phone-free hour together in group chats).

## 4. Suggested order (as researched)

1. Now, software only (works in Expo Go): F (an honest app), then D + E (quests and goals as threads).
2. In parallel: request Apple's Family Controls entitlement; build A + B in a real build.
3. Then C (the attention mirror) once A's plumbing exists.

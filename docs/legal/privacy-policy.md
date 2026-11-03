# Sigmazam privacy policy (draft)

## For agents: not part of the published text

Written 2026-11-03 (0z98) from what the code does that day, so every line can be checked:
accounts and tables in `supabase/migrations/`, the server in `server/src/app.ts`, the app's
consents in `src/i18n/locales/en.json` (`voiceConsent`, `photoConsent`). When the code changes
what it collects, sends or keeps, change this file in the same commit.

Gates: the published text is true only when all of these hold. Until then it is a draft.

1. A paid model key. On Google's free tier, prompts may be used to improve Google's products,
   which this text says does not happen (`docs/road-to-launch.md`, "Owner only").
2. Server logs carry no message content. Today `[reply]` prints the first 50 characters of the
   reply (`server/src/app.ts`); drop that before strangers use the app.
3. The deletions promised under "How long we keep it" run on a schedule: reports 12 months after
   they are made, usage records after 13 months. Neither job exists yet.
4. The owner fills in the brackets: legal name, address, contact email (`sigmazam.app` waits for
   the domain), and the country whose law applies.
5. A lawyer reads it (road-to-launch item 8), including GDPR (EU/UK) and CCPA (California) wording
   for the markets in `marketing/playbook.md`.
6. The site hosts it, and Profile → Privacy and the onboarding line link to it
   (`src/app/profile.tsx`; the buttons do nothing today).
7. Voice replies (ElevenLabs), payments (Apple, Google, RevenueCat) and server pushes (Firebase)
   are not in the app yet. Add each one here when it ships.

The store forms (Apple's App Privacy, Google Play's Data safety) are at the end, under the same gates.

---

## Published text

**Last updated:** [date]

Sigmazam is an app for talking with AI characters. This policy explains what we collect, why,
who else handles it, how long we keep it, and what you can do about it. "We" means [legal name],
[address]. Contact: [email].

### Who can use Sigmazam

Sigmazam is for adults, 18 and over. The app asks for your year of birth when you start and does
not let anyone younger in. If you believe someone under 18 is using it, write to [email] and
we will delete the account.

### The short version

- You do not need an email or a phone number. Your account is created anonymously on your device.
- Your chats are processed by an AI service to write the characters' replies. We do not sell your
  data, show you ads, or use tracking tools from other companies.
- You can delete your account and everything we keep for it inside the app, at any time.

### What we collect

**Your account.** An anonymous account ID, your language and time zone (so days, free shells and
greetings follow your clock). The name you choose goes with your chats to our AI service, so
characters can call you by it. Your year of birth is checked on your phone and stays there.

**Your chats.** The messages you send and the characters' replies, in one-to-one chats and groups,
are kept on our servers so your chats can be restored on a new phone. That includes:
- the text of a voice message as our AI service heard it (the recording itself stays on your phone);
- for a photo you send, a short description the character wrote of it (the photo itself is not
  stored on our servers);
- what the characters remember about you and your story ("memories"), which they use in later chats.

**Shells and plans.** Your shell balance, each shell you earn or spend and what for, your daily
check-in, and the plan you are on.

**Reports.** When you report a character's message, we keep the message, the reason you chose,
and up to 8 lines of the chat before it, so a person can review it in context.

**Usage records.** For each AI request: when it happened, what kind it was, which model answered,
and how much it cost. These records hold no message content. We use them to keep the service
running, to count how many people come back, and to keep costs in check.

**On your phone only.** Your full chats, voice recordings, photos and settings are also kept on
your phone. Notifications from your characters are scheduled on the phone itself.

We do not collect your location, your contacts, an advertising ID, or your browsing activity.

### How we use it

- To write the characters' replies, remember your story, and send the messages characters write
  first.
- To keep your chats and shells across phones.
- To spot a message that may mean you are in danger, so the app can show you where to get help.
  This check is automatic and is not shared with anyone.
- To review reports and keep characters within our content rules.
- To keep the service working, secure and affordable, and to learn which features people use.

### Who else handles it

- **Google (Gemini API)** writes the characters' replies. To do that it receives the recent chat,
  the character's description and what the character remembers about you. Voice messages and
  photos are sent to it only after you allow it in the app. We use Google's paid API, under which
  Google does not use this content to improve its products. [Confirm against Google's terms at
  launch.]
- **Supabase** stores our database (Tokyo, Japan).
- **Fly.io** runs our server (Tokyo, Japan).
- **Apple and Google** deliver notifications and app updates, as for any app.

Each of them handles data only to provide its service to us. We do not sell or rent your data,
and we do not share it with advertisers. We disclose data if the law requires it.

Your data is processed in Japan and in the countries where these providers operate. [Lawyer:
transfer safeguards for the EU and UK.]

### How long we keep it

- Your account, chats, memories and shells: until you delete your account.
- Reports: 12 months after they are made, or until you delete your account, whichever comes first.
- Usage records: 13 months, so we can compare a month with the same month a year before.
- Our host's server logs are short-lived and hold no message content.

### Your choices and rights

- **Delete your account:** Profile → Delete account. This deletes everything we keep for it on our
  servers, and resets the app on your phone. It cannot be undone.
- **Voice and photos:** the app asks before the first voice message or photo goes to our AI
  service. Without your yes, nothing is sent.
- **Notifications:** turn them off in the app or in your phone's settings.
- Depending on where you live, you may have the right to see, correct, export or delete your data,
  and to object to how we use it. Write to [email] and we will answer within 30 days. You may also
  complain to your local data protection authority.

### AI characters

Characters are AI, not people. What they say is written by an AI model and can be wrong. Do not
rely on a character for medical, legal, financial or crisis help. If you are in danger, contact
your local emergency number.

### Changes

If we change this policy, we will update the date above, and tell you in the app when the change
matters.

---

## Store forms (draft, same gates)

Neither form counts data that stays on the phone.

| Data (Apple's / Google's names) | Collected | Linked to the account | Used for tracking | Purpose |
|---|---|---|---|---|
| User ID | yes | yes | no | App functionality |
| Name (the display name: sent to the AI with each chat, not kept in the profile) | yes | yes | no | App functionality |
| Other user content: chats, memories, voice-message text, photo descriptions, reports | yes | yes | no | App functionality |
| Audio (voice messages) | sent for processing, not stored | yes | no | App functionality |
| Photos | sent for processing, not stored | yes | no | App functionality |
| Purchase history (shells, plan) | yes | yes | no | App functionality |
| Product interaction / app activity (usage records) | yes | yes | no | Analytics |
| Other data: language, time zone (the year of birth stays on the phone) | yes | yes | no | App functionality |

Google Play also asks: data is encrypted in transit (HTTPS) — yes; users can request deletion —
yes, in the app; data shared with third parties — no (service providers do not count as sharing).
Apple's age rating questions belong to the store listing, not to this form.

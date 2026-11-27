import { LEGAL_URLS, SUPPORT_EMAIL } from '../ai/safety';

export type LegalDocKind = 'privacy' | 'terms';

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalDocument {
  kind: LegalDocKind;
  title: string;
  updated: string;
  intro: string;
  sections: readonly LegalSection[];
}

/**
 * In-app legal reader copy derived from `docs/legal/privacy-policy.md` and
 * `docs/legal/terms-of-use.md` (no unfinished `[bracket]` placeholders). Once `sigmazam.app`
 * hosts the final lawyer-reviewed pages and `LEGAL_URLS` is set, the app opens those URLs
 * directly; until then, Profile, Plans and Onboarding open this reader so every legal link works.
 */
export const LEGAL_DOCS: Record<LegalDocKind, LegalDocument> = {
  privacy: {
    kind: 'privacy',
    title: 'Privacy Policy',
    updated: 'November 27, 2026',
    intro: `Sigmazam is an app for talking with AI friends and characters. This summary explains what we collect, why we use it, who processes it, how long we keep it, and how to delete your data. Contact: ${SUPPORT_EMAIL}.`,
    sections: [
      {
        heading: 'Adults only (18+)',
        paragraphs: [
          'Sigmazam is for adults aged 18 and older. We check your year of birth on your device during onboarding and do not permit anyone under 18 to use the app.',
          `If you believe someone under 18 is using Sigmazam, write to ${SUPPORT_EMAIL} and we will delete the account.`,
        ],
      },
      {
        heading: 'The short version',
        paragraphs: [
          'You do not need an email address or phone number to start; your account is created anonymously on your device.',
          'Your messages are sent to our AI service to generate replies. We do not sell your data, show third-party ads, or use third-party ad tracking.',
          'You can delete your account and all server data inside the app at any time in Profile → Delete account.',
        ],
      },
      {
        heading: 'What we collect',
        paragraphs: [
          'Account & preferences: an anonymous account ID, your language and time zone (so days, free shells and greetings follow your clock), and the display name you choose for chats. Your birth year stays on your device.',
          'Chats & memories (when Chat backup is on): your one-to-one and group messages, voice-message transcripts (audio recordings stay on your device), short descriptions of photos you share (raw photos are not stored on our servers), and character memories so your conversations can be restored.',
          'Shells & plans: your shell balance, earned or spent shells, daily check-in progress, and subscription status.',
          'Community & reports: characters you choose to publish to the community catalogue, and any message reports (the reported line, reason, and up to 8 prior messages for safety review).',
          'Usage & app activity: aggregate counts of requests, screens visited, call duration, and levels reached—never message text or names. You can turn app activity off anytime in Profile → Share usage data.',
        ],
      },
      {
        heading: 'Service providers',
        paragraphs: [
          'Google (Gemini API): generates character replies, understands voice messages, and sees photos you choose to send (only after your explicit consent in the app).',
          'ElevenLabs: converts signed call lines to speech during live voice calls when voice is enabled.',
          'Supabase & Fly.io: host our database and API servers in Tokyo, Japan.',
          'Apple & Google: deliver app updates, system notifications, and store subscriptions.',
        ],
      },
      {
        heading: 'Retention & your controls',
        paragraphs: [
          'Account, chats, memories, and shells stay until you delete your account. Safety reports are automatically purged after 12 months, and usage/activity logs after 13 months (or immediately when you delete your account).',
          'Chat backup can be turned on or off anytime in Profile → Chat backup. Voice messages and photos are only sent to AI after you allow them.',
          `Depending on where you live, you may request access, correction, export, or deletion of your data by writing to ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        heading: 'AI characters & safety',
        paragraphs: [
          'Characters are AI, not real people. Do not rely on them for medical, legal, financial, or crisis advice. If you are in danger, contact your local emergency number or a crisis helpline.',
        ],
      },
    ],
  },
  terms: {
    kind: 'terms',
    title: 'Terms of Use',
    updated: 'November 27, 2026',
    intro: `By using Sigmazam you agree to these Terms of Use and our Privacy Policy. If you do not agree, please do not use the app. Questions or notices: ${SUPPORT_EMAIL}.`,
    sections: [
      {
        heading: '1. Eligibility (18+)',
        paragraphs: [
          'You must be at least 18 years old and legally able to agree to these terms where you live. Sigmazam is not for minors; we close accounts belonging to anyone under 18.',
        ],
      },
      {
        heading: '2. Your account',
        paragraphs: [
          'Your account starts anonymously on your device. Keep your device secure. You may delete your account at any time in Profile → Delete account, which permanently removes your chats, memories, and shells. Active store subscriptions must be cancelled in your App Store or Google Play settings.',
        ],
      },
      {
        heading: '3. AI characters',
        paragraphs: [
          'Every character in Sigmazam is generated by artificial intelligence, not a real person. Replies can be inaccurate or surprising, and characters may misremember details.',
          'Do not rely on Sigmazam for medical, mental health, legal, financial, or emergency help. If you are in danger or thinking of harming yourself, contact your local emergency services or a helpline right away.',
        ],
      },
      {
        heading: '4. Content rules',
        paragraphs: [
          'Sigmazam supports adult storytelling, romance, and mature themes, but strictly prohibits: any sexual or romantic content involving minors; explicit pornography (scenes fade to black); impersonating real people; sexual violence or non-consensual abuse; hate speech or harassment; instructions for weapons, drugs, self-harm, crime, or hacking; and reproducing copyrighted works such as full song lyrics.',
          'Do not attempt to bypass safety controls, scrape our servers, or access the API outside the app. We may review reported content and remove content or suspend accounts that violate these rules.',
        ],
      },
      {
        heading: '5. What you create',
        paragraphs: [
          'You keep the rights to what you write and create, and grant Sigmazam a limited license to store and process it solely to operate the app for you. If you publish a character to the community catalogue, other users may chat with it.',
          `Rights holders who believe content infringes their rights may contact ${SUPPORT_EMAIL} with details for review and removal.`,
        ],
      },
      {
        heading: '6. Shells, plans & subscriptions',
        paragraphs: [
          'Shells are virtual in-app currency with no cash value and cannot be exchanged for money or transferred. Daily free shells expire at midnight in your local time zone; welcome, purchased, and plan shells remain while your account is active.',
          'Subscriptions (Basic, Pro, Pro yearly) renew automatically through the App Store or Google Play unless cancelled at least 24 hours before the end of the current period. Free trials convert to a paid plan unless cancelled before the trial ends. Refunds are handled by Apple or Google under their store policies.',
        ],
      },
      {
        heading: '7. Disclaimers & app stores',
        paragraphs: [
          'Sigmazam is provided "as is" and "as available". Features, characters, and shell prices may evolve over time. To the extent permitted by law, we are not liable for indirect losses or actions taken based on AI output, and nothing here limits mandatory consumer rights under your local law.',
          'Apple and Google are not parties to these terms and are not responsible for the app or its support; store terms also apply to your use of their platforms.',
        ],
      },
    ],
  },
};

/** Returns the hosted URL once `sigmazam.app` is live, or null to open the in-app `LegalSheet`. */
export function hostedLegalUrl(kind: LegalDocKind): string | null {
  return LEGAL_URLS[kind];
}

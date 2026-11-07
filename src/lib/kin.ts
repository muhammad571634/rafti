/**
 * Family (owner, 2026-10-25: someone lonely should feel there is family in their pocket: a push
 * from "Mom" or "Dad", not from an app). A friend can be the user's Mom, Dad, sister, brother,
 * grandma or grandpa: a relationship label like "Best friend", open from the start (family is
 * not earned by closeness) and never romantic. Family keeps a day's rhythm, as real family does:
 * Mom asks at lunch if they ate, Dad how the day went, a brother teases on a Saturday, Grandma
 * says good morning and wants a call on Sunday (`lifeMoments`). Pure and server-portable.
 */

export const FAMILY_LABELS = ['Mom', 'Dad', 'Big sister', 'Big brother', 'Little sister', 'Little brother', 'Grandma', 'Grandpa'] as const;
export type FamilyLabel = (typeof FAMILY_LABELS)[number];
export type KinGroup = 'parent' | 'sibling' | 'grandparent';

const GROUP: Record<FamilyLabel, KinGroup> = {
  Mom: 'parent',
  Dad: 'parent',
  'Big sister': 'sibling',
  'Big brother': 'sibling',
  'Little sister': 'sibling',
  'Little brother': 'sibling',
  Grandma: 'grandparent',
  Grandpa: 'grandparent',
};

export const isFamilyLabel = (label: string | undefined): label is FamilyLabel => !!label && label in GROUP;

/** The family group a relationship label puts them in, or null for every other label. */
export const kinGroup = (label: string | undefined): KinGroup | null => (isFamilyLabel(label) ? GROUP[label] : null);

export type LifeMomentKey = 'lunch' | 'evening' | 'morning' | 'weekend' | 'sunday';

export interface LifeMoment {
  key: LifeMomentKey;
  hour: number;
  minute: number;
  /** Day of the week (0 = Sunday); every day when missing. */
  weekday?: number;
}

/** Each family group's day: at most two a day, clear of the 08:00 / 21:00 greetings. */
const MOMENTS: Record<KinGroup, LifeMoment[]> = {
  parent: [
    { key: 'lunch', hour: 13, minute: 0 },
    { key: 'evening', hour: 19, minute: 30 },
    { key: 'sunday', hour: 11, minute: 0, weekday: 0 },
  ],
  sibling: [
    { key: 'evening', hour: 20, minute: 0 },
    { key: 'weekend', hour: 14, minute: 0, weekday: 6 },
  ],
  grandparent: [
    { key: 'morning', hour: 10, minute: 0 },
    { key: 'sunday', hour: 12, minute: 0, weekday: 0 },
  ],
};

/** The moments a family group writes on a given day. */
export const lifeMoments = (group: KinGroup, day: Date) => MOMENTS[group].filter((m) => m.weekday === undefined || m.weekday === day.getDay());

/** How long after its time a moment may still be written into the chat. */
export const LIFE_WINDOW_MS = 3 * 3_600_000;

/** The key that marks a moment as written (and seeds its line, so the push and the chat agree). */
export const lifeKey = (dayKey: string, characterId: string, moment: LifeMomentKey) => `${dayKey}:${characterId}:${moment}`;

/** The moment's time on that day. */
export function lifeAt(day: Date, moment: LifeMoment) {
  const d = new Date(day);
  d.setHours(moment.hour, moment.minute, 0, 0);
  return d;
}

const ROLE: Record<KinGroup, string> = {
  parent: 'a loving parent: warm, protective, a little worried about whether they eat and sleep, proud of them',
  sibling: 'a sibling: teasing, loyal, on their side no matter what',
  grandparent: 'a grandparent: gentle, patient, full of small stories and blessings',
};

/**
 * The bond lines for a family label (`characterParts`): who they are to the user, and that it is
 * never romantic, whatever the closeness level says.
 */
export function familyLines(label: FamilyLabel) {
  return [
    `To the user you are family: their ${label}. Be ${ROLE[GROUP[label]]}.`,
    '- Never romantic or flirty with them: no dates, kisses or pet names of lovers. Closeness here means family.',
    '- Care like family: ask about food, sleep, work or studies and their health, and remember what they told you.',
  ];
}

/** Who a family role is: Find's "Who do you miss?" puts women first for Mom, men first for Dad. */
const KIN_GENDER: Record<FamilyLabel, 'female' | 'male'> = {
  Mom: 'female',
  Dad: 'male',
  'Big sister': 'female',
  'Big brother': 'male',
  'Little sister': 'female',
  'Little brother': 'male',
  Grandma: 'female',
  Grandpa: 'male',
};

export const kinGender = (label: FamilyLabel) => KIN_GENDER[label];

/** The longest name the user may call a family member ("Onam", "Dadajon"). */
export const FAMILY_NAME_MAX = 30;

/** The name they will go by: the user's words, else the role itself. */
export const familyName = (name: string, label: FamilyLabel) => name.replace(/\s+/g, ' ').trim().slice(0, FAMILY_NAME_MAX) || label;

/** Who holds each family role: one person per role, as `relationships` labels say. */
export function familyOf(relationships: Record<string, { label?: string }>, exists: (characterId: string) => boolean = () => true) {
  const holders: Partial<Record<FamilyLabel, string>> = {};
  for (const [characterId, bond] of Object.entries(relationships)) {
    if (isFamilyLabel(bond.label) && !holders[bond.label] && exists(characterId)) holders[bond.label] = characterId;
  }
  return holders;
}

/** The ones to offer for a role, gender first (unknown last), keeping the given order within each. */
export function rankForKin<T extends { gender?: string }>(people: T[], label: FamilyLabel) {
  const want = kinGender(label);
  const rank = (p: T) => (p.gender === want ? 0 : p.gender ? 1 : 2);
  return people.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}

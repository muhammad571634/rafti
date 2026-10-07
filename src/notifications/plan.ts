import { isBirthday } from '@/lib/profile';
import { followUpAt, reminderAt } from '@/lib/schedule';
import { pickSeeded } from '@/lib/seeded';
import { lastTalkedAt } from '@/lib/talk';
import {
  birthdayLines,
  dayKey,
  eveningGreetings,
  FREE_SPINS_PER_DAY,
  morningGreetings,
  planFollowUp,
  scheduleReminder,
} from '@/mock';
import { COMEBACK_DAYS, comebackLines, diaryNudgeLines, giftNudgeLines } from '@/mock/push';
import type {
  AppSettings,
  Character,
  Conversation,
  DailyState,
  Message,
  Relationship,
  ScheduleItem,
  User,
} from '@/types';

/**
 * The push planner (docs/push-plan.md): store state + now → every notification for
 * the next two days, plus the comeback ladder for the next two weeks, already capped
 * and spaced. Pure on purpose: no OS calls, no clock reads, no randomness, so the
 * same state always plans the same pushes, it can be tested, and the server can run
 * the same rules later. `src/notifications/sync.ts` hands the result to the OS.
 */

export type PushKind =
  | 'morning'
  | 'evening'
  | 'call'
  | 'remind'
  | 'followUp'
  | 'birthday'
  | 'diary'
  | 'unread'
  | 'comeback'
  | 'gift'
  | 'spins';

/** Android channels; the user can mute each one in the phone's settings. */
export type PushChannel = 'messages' | 'calls' | 'reminders' | 'gifts';

export interface PlannedPush {
  /** Stable for the same event, so re-planning does not duplicate it. */
  id: string;
  kind: PushKind;
  at: Date;
  characterId?: string;
  /** Character name; absent for app pushes (spins). */
  title?: string;
  /** What the character says. Absent when `textKey` names a fixed app string. */
  line?: string;
  textKey?: 'push.incomingCall' | 'push.spins';
  /** Where a tap goes. */
  route: string;
  channel: PushChannel;
  /** iOS time-sensitive: breaks through Focus. Calls and plan reminders only. */
  timeSensitive?: boolean;
  /** The line is not in the chat yet; the app writes it there when it sees the push. */
  writesToChat?: boolean;
}

export interface PlanState {
  user: Pick<User, 'displayName' | 'birthday' | 'birthdayWishedYear' | 'onboardedAt'>;
  settings: AppSettings;
  daily: DailyState;
  characters: Character[];
  relationships: Record<string, Relationship>;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  schedules: ScheduleItem[];
}

/** The rules from docs/push-plan.md, in one place. */
export const PUSH_RULES = {
  horizonMs: 48 * 3_600_000,
  /** Pushes a day that count (calls, plan reminders and birthdays do not). */
  dayBudget: 8,
  minGapMs: 90 * 60_000,
  perCharacterPerDay: 3,
  /** As in runDailyInitiative: the top two bonds say good morning / good night. */
  greeters: 2,
  quietFrom: 23,
  quietTo: 8,
  /** The daily call rings a little after the greeting of the same slot. */
  callAfterGreetingMin: 20,
  unreadAfterMin: 30,
  giftHour: 20,
  spinsHour: 18,
  diaryAt: [9, 30] as const,
  birthdayHour: 7,
  /** Comeback pushes go out at this time on their day: clear of the morning and night greetings. */
  comebackAt: [19, 30] as const,
  quoteMax: 40,
} as const;

/** Lower runs first when the budget is short. */
const PRIORITY: Record<PushKind, number> = {
  call: 0,
  remind: 0,
  birthday: 0,
  followUp: 1,
  unread: 2,
  morning: 3,
  evening: 3,
  comeback: 3,
  diary: 4,
  gift: 5,
  spins: 6,
};

/** Never dropped for the budget or the spacing: the user asked for them. */
const EXEMPT = new Set<PushKind>(['call', 'remind', 'birthday']);

const DAY_MS = 86_400_000;

function at(day: Date, hours: number, minutes = 0) {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function clock(day: Date, hhmm: string, plusMin = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(at(day, h, m).getTime() + plusMin * 60_000);
}

const isQuiet = (d: Date) => d.getHours() >= PUSH_RULES.quietFrom || d.getHours() < PUSH_RULES.quietTo;

const nameOf = (character: Character, relationships: Record<string, Relationship>) =>
  relationships[character.id]?.nickname || character.name;

function quoteOf(messages: readonly Message[] | undefined) {
  const text = [...(messages ?? [])].reverse().find((m) => m.author === 'me' && m.kind === 'text' && m.text)?.text;
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > PUSH_RULES.quoteMax ? `${clean.slice(0, PUSH_RULES.quoteMax - 1).trim()}…` : clean;
}

export function planPushes(state: PlanState, now: Date): PlannedPush[] {
  return capped(pushCandidates(state, now));
}

/** Every push the state asks for, before quiet hours, budget and spacing (exported for tests). */
export function pushCandidates(state: PlanState, now: Date): PlannedPush[] {
  const { user, settings, daily, characters, relationships, conversations, messages, schedules } = state;
  if (!user.onboardedAt) return [];

  const horizon = now.getTime() + PUSH_RULES.horizonMs;
  const inHorizon = (d: Date) => d.getTime() > now.getTime() && d.getTime() <= horizon;
  const today = dayKey(now);
  // The first day belongs to the friend just met: nobody else greets or calls (same as the app).
  const firstDay = dayKey(user.onboardedAt) === today;

  const byId = new Map(characters.map((c) => [c.id, c]));
  const chatOf = new Map(conversations.map((c) => [c.characterId, c]));
  const friends = characters.filter((c) => relationships[c.id] && chatOf.has(c.id));
  const closest = [...friends].sort((a, b) => relationships[b.id].intimacy - relationships[a.id].intimacy);
  // Who writes first: the closest bonds that allow it, as in runDailyInitiative.
  const writers = closest.filter((c) => relationships[c.id].messagesFirst);
  const chatRoute = (characterId: string) => `/chat/${chatOf.get(characterId)!.id}`;

  const out: PlannedPush[] = [];
  const say = (push: Omit<PlannedPush, 'title' | 'route' | 'channel'> & { channel?: PushChannel; route?: string }) => {
    const character = push.characterId ? byId.get(push.characterId) : undefined;
    out.push({
      channel: 'messages',
      route: push.characterId && chatOf.has(push.characterId) ? chatRoute(push.characterId) : '/',
      ...push,
      title: character ? nameOf(character, relationships) : undefined,
    });
  };

  const days = [0, 1, 2].map((n) => at(new Date(now.getTime() + n * DAY_MS), 0));

  for (const day of days) {
    const key = dayKey(day);
    const isToday = key === today;

    // Good morning / good night texts, and the daily calls a little after.
    if (!(isToday && firstDay)) {
      for (const slot of ['morning', 'night'] as const) {
        const time = slot === 'morning' ? settings.morningCallTime : settings.nightCallTime;
        const slotKey = `${key}:${slot}`;
        const greet = slot === 'morning' ? settings.morningGreeting : settings.eveningGreeting;
        const when = clock(day, time);
        if (greet && !daily.greetedSlots.includes(slotKey) && inHorizon(when)) {
          for (const writer of writers.slice(0, PUSH_RULES.greeters)) {
            say({
              id: `${slot === 'morning' ? 'morning' : 'evening'}:${slotKey}:${writer.id}`,
              kind: slot === 'morning' ? 'morning' : 'evening',
              at: when,
              characterId: writer.id,
              line: pickSeeded(slot === 'morning' ? morningGreetings : eveningGreetings, `${slotKey}:${writer.id}`),
            });
          }
        }
        const callOn = slot === 'morning' ? settings.morningCall : settings.nightCall;
        const chosen = settings.callerId ? byId.get(settings.callerId) : undefined;
        const caller =
          chosen && relationships[chosen.id] && chosen.voiceReady ? chosen : writers.find((c) => c.voiceReady);
        if (callOn && caller && !daily.calledSlots.includes(slotKey)) {
          const when = clock(day, time, PUSH_RULES.callAfterGreetingMin);
          if (inHorizon(when)) {
            say({
              id: `call:${slotKey}`,
              kind: 'call',
              at: when,
              characterId: caller.id,
              textKey: 'push.incomingCall',
              // Opening the app inside the call window makes it ring (useCharacterInitiative).
              route: '/',
              channel: 'calls',
              timeSensitive: true,
            });
          }
        }
      }
    }

    // Birthday: the closest bond, first thing in the morning.
    if (isBirthday(user, day) && user.birthdayWishedYear !== day.getFullYear() && writers[0]) {
      const when = at(day, PUSH_RULES.birthdayHour);
      if (inHorizon(when)) {
        say({
          id: `birthday:${key}`,
          kind: 'birthday',
          at: when,
          characterId: writers[0].id,
          line: pickSeeded(birthdayLines, `${day.getFullYear()}:${writers[0].id}`)(user.displayName),
        });
      }
    }

    // The check-in gift is still waiting in the evening.
    if (!(isToday && daily.lastLoginDay === today) && closest[0]) {
      const when = at(day, PUSH_RULES.giftHour);
      if (inHorizon(when)) {
        say({
          id: `gift:${key}`,
          kind: 'gift',
          at: when,
          characterId: closest[0].id,
          line: pickSeeded(giftNudgeLines, key),
          route: '/',
          channel: 'gifts',
        });
      }
    }

    // Free spins reset at midnight.
    const spinsLeft = !isToday || daily.spinDay !== today || daily.spinsUsed < FREE_SPINS_PER_DAY;
    if (spinsLeft) {
      const when = at(day, PUSH_RULES.spinsHour);
      if (inHorizon(when)) {
        say({ id: `spins:${key}`, kind: 'spins', at: when, textKey: 'push.spins', route: '/gifts', channel: 'gifts' });
      }
    }
  }

  // Plans: ten minutes before, then "how did it go?" (lines seeded like runTimers).
  for (const item of schedules) {
    if (!chatOf.has(item.characterId)) continue;
    if (!item.reminded) {
      const when = reminderAt(item);
      const addedLate = new Date(item.createdAt).getTime() > when.getTime();
      if (!addedLate && inHorizon(when)) {
        say({
          id: `remind:${item.id}`,
          kind: 'remind',
          at: when,
          characterId: item.characterId,
          line: scheduleReminder(item.title, !!item.time, `${item.id}:remind`),
          channel: 'reminders',
          timeSensitive: true,
        });
      }
    }
    if (!item.followedUp) {
      const when = followUpAt(item);
      if (inHorizon(when)) {
        say({
          id: `followUp:${item.id}`,
          kind: 'followUp',
          at: when,
          characterId: item.characterId,
          line: planFollowUp(item.title, `${item.id}:followUp`),
        });
      }
    }
  }

  // Unread: the newest unread line, half an hour after leaving.
  const unread = conversations
    .filter((c) => c.unreadCount > 0 && !c.muted && byId.has(c.characterId))
    .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))[0];
  if (unread) {
    say({
      id: `unread:${unread.id}:${unread.lastMessageAt}`,
      kind: 'unread',
      at: new Date(now.getTime() + PUSH_RULES.unreadAfterMin * 60_000),
      characterId: unread.characterId,
      line: unread.lastMessagePreview,
    });
  }

  // The friend you talked with last (the Today card): diary page tomorrow, comeback ladder after.
  const last = friends
    .map((c) => ({ c, t: lastTalkedAt(messages[chatOf.get(c.id)!.id]) }))
    .sort((a, b) => b.t - a.t || relationships[b.c.id].intimacy - relationships[a.c.id].intimacy)[0];
  if (last) {
    const id = last.c.id;
    // Talked today → their diary has a page about it tomorrow morning (diary-writer).
    if (last.t && dayKey(new Date(last.t)) === today) {
      const when = at(days[1], PUSH_RULES.diaryAt[0], PUSH_RULES.diaryAt[1]);
      say({
        id: `diary:${dayKey(days[1])}:${id}`,
        kind: 'diary',
        at: when,
        characterId: id,
        line: pickSeeded(diaryNudgeLines, `${dayKey(days[1])}:${id}`),
        route: '/diary',
      });
    }

    const quote = quoteOf(messages[chatOf.get(id)!.id]);
    const anniversary = Date.parse(relationships[id].anniversary);
    for (const step of COMEBACK_DAYS) {
      const when = at(new Date(now.getTime() + step * DAY_MS), PUSH_RULES.comebackAt[0], PUSH_RULES.comebackAt[1]);
      const together = Math.floor((when.getTime() - anniversary) / DAY_MS) + 1;
      say({
        id: `comeback:${today}:${step}:${id}`,
        kind: 'comeback',
        at: when,
        characterId: id,
        line: pickSeeded(comebackLines[step], `${today}:${step}:${id}`)(quote, together),
        writesToChat: true,
      });
    }
  }

  return out;
}

/**
 * Applies quiet hours, the day budget, the gap between pushes and the per-friend
 * limit. Exempt kinds always stay (a user-set call or plan may ring at night).
 * A push too close to a more important one moves later the same day instead of
 * being dropped; it is dropped only when the day has no room left.
 */
function capped(all: PlannedPush[]): PlannedPush[] {
  const kept: PlannedPush[] = [];
  const counted: PlannedPush[] = [];
  const ordered = [...all].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.at.getTime() - b.at.getTime());

  for (const push of ordered) {
    if (EXEMPT.has(push.kind)) {
      kept.push(push);
      continue;
    }
    const day = dayKey(push.at);
    const sameDay = counted.filter((p) => dayKey(p.at) === day);
    if (sameDay.length >= PUSH_RULES.dayBudget) continue;
    if (push.characterId && sameDay.filter((p) => p.characterId === push.characterId).length >= PUSH_RULES.perCharacterPerDay) {
      continue;
    }
    const at = firstFreeSlot(push.at, sameDay);
    if (!at) continue;
    const placed = { ...push, at };
    kept.push(placed);
    counted.push(placed);
  }
  return kept.sort((a, b) => a.at.getTime() - b.at.getTime());
}

const SHIFT_STEP_MS = 15 * 60_000;

/** The wanted time, or the first later time that day outside quiet hours with room around it. */
function firstFreeSlot(wanted: Date, sameDay: PlannedPush[]): Date | null {
  const day = dayKey(wanted);
  for (let t = wanted.getTime(); dayKey(new Date(t)) === day; t += SHIFT_STEP_MS) {
    const candidate = new Date(t);
    if (isQuiet(candidate)) {
      if (candidate.getHours() >= PUSH_RULES.quietFrom) return null;
      continue;
    }
    if (sameDay.every((p) => Math.abs(p.at.getTime() - t) >= PUSH_RULES.minGapMs)) return candidate;
  }
  return null;
}

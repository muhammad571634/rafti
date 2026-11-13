import { detectCrisis } from '@/ai/safety';
import { canRing } from '@/economy/plans';
import { BRIEF_REACH, morningBrief } from '@/lib/brief';
import { DAY_REACH, dayAsker } from '@/lib/day-ask';
import { greeters } from '@/lib/greeters';
import { recapAt, WEEK_REACH, weeklyRecap } from '@/lib/week';
import { kinGroup, lifeAt, lifeKey, lifeMoments } from '@/lib/kin';
import { isBirthday } from '@/lib/profile';
import { careReach, lifeReach, threadReach } from '@/lib/reply-ideas';
import { temperOf } from '@/lib/temper';
import { beforeThing } from '@/lib/threads';
import { followUpAt, reminderAt } from '@/lib/schedule';
import { pickSeeded } from '@/lib/seeded';
import { shortName } from '@/lib/names';
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
import { briefLine } from '@/mock/brief';
import { dayLine } from '@/mock/day-ask';
import { weekLine } from '@/mock/week';
import { careLine } from '@/mock/care';
import { lifeLine } from '@/mock/kin';
import { COMEBACK_DAYS, comebackLines, diaryNudgeLines } from '@/mock/push';
import { onPaidPlan } from '@/economy/plans';
import { DAILY_CHECK_IN } from '@/economy/shells';
import { temperComeback } from '@/mock/temper';
import { mockTouchLine } from '@/mock/threads';
import { worldNewsLine } from '@/mock/world-voice';
import { WORLDS } from '@/mock/worlds';
import { pickWorldNews, WORLD_NEWS_HOUR } from '@/lib/world-story';
import { content } from '@/i18n/voice';

import { asleep, placeFlexible, rhythm } from './budget';
import { capped } from './caps';
import { withWritten, type PushLines } from './written';

export { counts } from './caps';
import type {
  AppSettings,
  CareItem,
  DiaryEntry,
  Temper,
  Thread,
  Character,
  Conversation,
  DailyState,
  Message,
  PushSent,
  Relationship,
  ReplyIdea,
  ScheduleItem,
  User,
  Wallet,
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
  | 'brief'
  | 'evening'
  | 'day'
  | 'week'
  | 'world'
  | 'call'
  | 'voiceNote'
  | 'remind'
  | 'followUp'
  | 'care'
  | 'life'
  | 'touch'
  | 'birthday'
  | 'diary'
  | 'unread'
  | 'comeback'
  | 'gift'
  | 'spins'
  | 'streak'
  | 'shells';

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
  textKey?: 'push.incomingCall' | 'push.voiceNote' | 'push.spins' | 'push.giftWaiting' | 'push.giftLadder' | 'push.streak' | 'push.streakLast' | 'push.shellsBurn';
  /** The numbers and names an app push's `textKey` reads ("12 free shells burn at midnight"). */
  textParams?: Record<string, string | number>;
  /** Where a tap goes. */
  route: string;
  channel: PushChannel;
  /** iOS time-sensitive: breaks through Focus. Calls and plan reminders only. */
  timeSensitive?: boolean;
  /** The line is not in the chat yet; the app writes it there when it sees the push. */
  writesToChat?: boolean;
  /** Why they wrote first (`src/lib/reply-ideas.ts`): the push carries the line's reply ideas as buttons. */
  reach?: string;
  /** Replies the model wrote from this chat (`src/notifications/written.ts`): they take the buttons. */
  ideas?: ReplyIdea[];
  /** Thread texts this line already says (the morning brief). */
  covers?: string[];
}

export interface PlanState {
  user: Pick<User, 'displayName' | 'birthday' | 'birthdayWishedYear' | 'onboardedAt'>;
  /** The user's diary: pages shared with a friend show in their Sunday recap; older saved states may have none. */
  diary?: DiaryEntry[];
  settings: AppSettings;
  daily: DailyState;
  characters: Character[];
  relationships: Record<string, Relationship>;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  schedules: ScheduleItem[];
  /** Check-ins friends owe (`src/lib/care.ts`); older saved states have none. */
  care?: CareItem[];
  /** What the user said that has a future (`src/lib/threads.ts`); older saved states have none. */
  threads?: Thread[];
  /** Free users get a voice note instead of the daily call (`canRing`). */
  wallet: Pick<Wallet, 'subscription' | 'free'>;
  /** Blocked friends tell no world news; older saved states have none. */
  blockedIds?: string[];
  /** The lines the model wrote ahead (`src/notifications/written.ts`); older saved states have none. */
  pushLines?: PushLines;
}

/**
 * The rules from docs/push-plan.md, in one place. How many a day, each friend's share, the gaps,
 * sleep and active hours are `src/notifications/budget.ts` (Presence 2, P2.8).
 */
export const PUSH_RULES = {
  horizonMs: 48 * 3_600_000,
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
  /** A streak worth saving is at least this long; the evening nudge, then the last call before quiet hours. */
  streakMin: 2,
  streakAt: [19, 0] as const,
  streakLastAt: [22, 15] as const,
  /** Free shells left in the evening, if at least this many: they burn at midnight. */
  shellsMin: 5,
  shellsAt: [21, 0] as const,
} as const;


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

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The user's quiet hours as a test on a time; the range may run past midnight. */
function quietTest(settings: AppSettings): (d: Date) => boolean {
  if (!settings.quietHours) return () => false;
  const from = minutesOf(settings.quietFrom);
  const to = minutesOf(settings.quietTo);
  return (d) => {
    const m = d.getHours() * 60 + d.getMinutes();
    return from <= to ? m >= from && m < to : m >= from || m < to;
  };
}

/** Whether this moment falls in the user's quiet hours. */
export const inQuietHours = (settings: AppSettings, at: Date) => quietTest(settings)(at);

/** Which kinds the user switched off (Profile → Notifications). Greetings and calls use their own settings. */
function kindOn(kind: PushKind, settings: AppSettings) {
  switch (kind) {
    case 'remind':
    case 'followUp':
      return settings.notifyPlans;
    case 'diary':
      return settings.notifyDiary;
    case 'comeback':
      return settings.notifyAway;
    case 'gift':
    case 'spins':
    case 'shells':
      return settings.notifyGifts;
    // On unless switched off (saved settings from before 0z189 have no such key).
    case 'streak':
      return settings.notifyStreak !== false;
    default:
      return true;
  }
}

const nameOf = (character: Character, relationships: Record<string, Relationship>) =>
  relationships[character.id]?.nickname || character.name;

function quoteOf(messages: readonly Message[] | undefined) {
  const text = [...(messages ?? [])].reverse().find((m) => m.author === 'me' && m.kind === 'text' && m.text)?.text;
  // A message that read like the user was in danger is never quoted back: the push uses its gentle no-quote line.
  if (!text || detectCrisis(text)) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > PUSH_RULES.quoteMax ? `${clean.slice(0, PUSH_RULES.quoteMax - 1).trim()}…` : clean;
}

/** Pushes without an exact time: they move to an hour the user is active in, with a little jitter. */
const FLEXIBLE = new Set<PushKind>(['morning', 'evening', 'day', 'week', 'world', 'life', 'care', 'comeback', 'touch']);
// The brief is not flexible: it has to come before the things it wishes luck for.

/** `model`: friends' lines are the model's, and a push whose line is not written yet stays unsent (`withWritten`). */
export function planPushes(state: PlanState, now: Date, { model = false }: { model?: boolean } = {}): PlannedPush[] {
  const { hours, sleep, budget, sent } = rhythm(state, now);
  const userQuiet = quietTest(state.settings);
  const isQuiet = (d: Date) => userQuiet(d) || asleep(d, sleep);
  const byId = new Map(state.characters.map((c) => [c.id, c]));
  const temperFor = (id: string) => {
    const character = byId.get(id);
    return character ? temperOf(character, state.relationships[id]?.label) : 'warm';
  };
  const wanted = pushCandidates(state, now)
    .filter((push) => kindOn(push.kind, state.settings))
    .flatMap((push) => (model ? withWritten(push, state.pushLines ?? {}, now, state.settings.notificationPreview) : [push]))
    .map((push) => (FLEXIBLE.has(push.kind) && !push.timeSensitive ? { ...push, at: placeFlexible(push.at, push.id, hours, sleep) } : push));
  return capped(wanted, isQuiet, budget, temperFor, sent);
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
  // Thread texts a planned morning brief already says ("before" texts later that day).
  const covered = new Set<string>();
  const newsTold = [...(daily.worldNewsSent ?? [])];

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
          // On a day with something on, the closest friend who holds it sends the brief instead (B5).
          const brief =
            slot === 'morning'
              ? morningBrief(
                  writers.map((c) => c.id),
                  schedules,
                  state.threads ?? [],
                  when,
                )
              : null;
          if (brief) {
            brief.covers.forEach((id) => covered.add(id));
            const character = byId.get(brief.characterId)!;
            say({
              id: `brief:${slotKey}:${brief.characterId}`,
              kind: 'brief',
              at: when,
              characterId: brief.characterId,
              line: briefLine(brief.items, temperOf(character, relationships[brief.characterId].label), `${slotKey}:brief:${brief.characterId}`, character.gender),
              reach: BRIEF_REACH,
              covers: brief.covers,
            });
          }
          // The evening's "how was today?" (B6): one friend asks instead of their good night.
          const asker =
            slot === 'night'
              ? dayAsker(
                  {
                    writers: writers.map((c) => c.id),
                    chats: Object.fromEntries(writers.map((c) => [c.id, messages[chatOf.get(c.id)!.id] ?? []])),
                    familyAsks: writers
                      .filter((c) => {
                        const group = kinGroup(relationships[c.id].label);
                        return !!group && lifeMoments(group, day).some((m) => m.key === 'evening');
                      })
                      .map((c) => c.id),
                  },
                  when,
                )
              : null;
          if (asker) {
            const character = byId.get(asker)!;
            say({
              id: `day:${slotKey}:${asker}`,
              kind: 'day',
              at: when,
              characterId: asker,
              line: dayLine(temperOf(character, relationships[asker].label), `${slotKey}:day:${asker}`, character.gender),
              reach: DAY_REACH,
            });
          }
          const greeting = greeters(
            writers.map((c) => c.id),
            (id) => lastTalkedAt(messages[chatOf.get(id)!.id]),
            slotKey,
            when,
          );
          for (const writer of writers.filter((c) => greeting.includes(c.id))) {
            if (writer.id === brief?.characterId || writer.id === asker) continue;
            say({
              id: `${slot === 'morning' ? 'morning' : 'evening'}:${slotKey}:${writer.id}`,
              kind: slot === 'morning' ? 'morning' : 'evening',
              at: when,
              characterId: writer.id,
              line: pickSeeded((slot === 'morning' ? morningGreetings : eveningGreetings)(writer.gender), `${slotKey}:${writer.id}`),
            });
          }
        }
        const callOn = slot === 'morning' ? settings.morningCall : settings.nightCall;
        const chosen = settings.callerId ? byId.get(settings.callerId) : undefined;
        const caller =
          chosen && relationships[chosen.id] && chosen.voiceReady ? chosen : writers.find((c) => c.voiceReady);
        if (callOn && caller && !daily.calledSlots.includes(slotKey)) {
          const when = clock(day, time, PUSH_RULES.callAfterGreetingMin);
          // Without a plan or trial nothing rings: a voice note waits in their chat instead.
          if (inHorizon(when) && !canRing(state.wallet.subscription, when.getTime())) {
            say({
              id: `voiceNote:${slotKey}`,
              kind: 'voiceNote',
              at: when,
              characterId: caller.id,
              textKey: 'push.voiceNote',
            });
          } else if (inHorizon(when)) {
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

    // Sunday evening: the friend of the most days looks back on the week (B7).
    const recapWhen = settings.weeklyRecap ? recapAt(day) : null;
    if (recapWhen && inHorizon(recapWhen)) {
      const recap = weeklyRecap(
        {
          writers: writers.map((c) => c.id),
          chats: Object.fromEntries(writers.map((c) => [c.id, messages[chatOf.get(c.id)!.id] ?? []])),
          threads: state.threads ?? [],
          diary: state.diary ?? [],
        },
        recapWhen,
      );
      if (recap) {
        const character = byId.get(recap.characterId)!;
        say({
          id: `week:${key}:${recap.characterId}`,
          kind: 'week',
          at: recapWhen,
          characterId: recap.characterId,
          line: weekLine(recap.week, temperOf(character, relationships[recap.characterId].label), `${key}:week:${recap.characterId}`, character.gender),
          reach: WEEK_REACH,
        });
      }
    }

    // A new chapter or an event in a world, one a day, from the closest friend there (the same as the app).
    const newsWhen = at(day, WORLD_NEWS_HOUR);
    if (inHorizon(newsWhen)) {
      const picked = pickWorldNews({
        writers: writers.filter((c) => !state.blockedIds?.includes(c.id)),
        worlds: content('worlds', WORLDS),
        cast: characters,
        relationships,
        told: newsTold,
        now: newsWhen,
      });
      const teller = picked && byId.get(picked.characterId);
      if (picked && teller) {
        say({ id: `world:${picked.news.key}`, kind: 'world', at: newsWhen, characterId: teller.id, line: worldNewsLine(picked.news, teller.gender) });
        // The app will tell it that day: a later day in this plan moves on to what comes next.
        newsTold.push(`${picked.news.key}|${key}`);
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
          line: pickSeeded(birthdayLines, `${day.getFullYear()}:${writers[0].id}`)(user.displayName, writers[0].gender),
        });
      }
    }

    // What the user loses at midnight, Duolingo's way (owner, 2026-11-09): said by the app in its own
    // words with the real numbers, never put in a friend's mouth, so it goes whatever state the model
    // is in. The app re-plans while it is open, so doing the thing takes its push away: these only
    // reach someone who has not done it yet.
    const yesterday = dayKey(at(new Date(day.getTime() - DAY_MS), 12));
    // The check-in gift (free users; a paid plan has its own shells): past day 1, missing a day
    // starts the ladder over, and the push says so.
    if (!onPaidPlan(state.wallet.subscription, day.getTime()) && !(isToday && daily.lastLoginDay === today)) {
      const when = at(day, PUSH_RULES.giftHour);
      if (inHorizon(when)) {
        const ladderDay = daily.lastLoginDay === yesterday ? (daily.checkInDay % DAILY_CHECK_IN.length) + 1 : 1;
        say({
          id: `gift:${key}`,
          kind: 'gift',
          at: when,
          textKey: ladderDay > 1 ? 'push.giftLadder' : 'push.giftWaiting',
          textParams: { day: ladderDay, count: DAILY_CHECK_IN[ladderDay - 1] },
          route: '/',
          channel: 'gifts',
        });
      }
    }

    // A friend's streak (Us): the longest one still alive that a message that day would keep, in the
    // evening and once more before quiet hours.
    const streak = friends
      .map((c) => ({ c, r: relationships[c.id] }))
      .filter(({ r }) => r.streakDays >= PUSH_RULES.streakMin && r.lastChatDay === yesterday)
      .sort((a, b) => b.r.streakDays - a.r.streakDays)[0];
    if (streak) {
      // The first name, as a friend is spoken of ("8 days in a row with Hana").
      const textParams = { count: streak.r.streakDays, name: shortName(nameOf(streak.c, relationships)) };
      const steps = [
        { id: `streak:${key}`, time: PUSH_RULES.streakAt, textKey: 'push.streak' as const },
        { id: `streakLast:${key}`, time: PUSH_RULES.streakLastAt, textKey: 'push.streakLast' as const },
      ];
      for (const step of steps) {
        const when = at(day, step.time[0], step.time[1]);
        if (inHorizon(when)) say({ id: step.id, kind: 'streak', at: when, textKey: step.textKey, textParams, route: chatRoute(streak.c.id) });
      }
    }

    // Today's free shells burn at midnight (`creditFree`): how many are left, in the evening.
    const free = state.wallet.free;
    if (isToday && free && free.day === today && free.amount >= PUSH_RULES.shellsMin) {
      const when = at(day, PUSH_RULES.shellsAt[0], PUSH_RULES.shellsAt[1]);
      if (inHorizon(when)) {
        say({ id: `shells:${key}`, kind: 'shells', at: when, textKey: 'push.shellsBurn', textParams: { count: free.amount }, route: '/', channel: 'gifts' });
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
          line: scheduleReminder(item.title, !!item.time, `${item.id}:remind`, byId.get(item.characterId)?.gender),
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
          line: planFollowUp(item.title, `${item.id}:followUp`, byId.get(item.characterId)?.gender),
        });
      }
    }
  }

  // Family's day (src/lib/kin.ts): "Mom: Did you eat lunch?", the same line their chat gets.
  const written = new Set(daily.lifeSent ?? []);
  for (const character of writers) {
    const group = kinGroup(relationships[character.id].label);
    if (!group) continue;
    for (const day of days) {
      for (const moment of lifeMoments(group, day)) {
        const key = lifeKey(dayKey(day), character.id, moment.key);
        const when = lifeAt(day, moment);
        if (written.has(key) || !inHorizon(when)) continue;
        say({
          id: `life:${key}`,
          kind: 'life',
          at: when,
          characterId: character.id,
          line: lifeLine(group, moment.key, key, character.gender),
          reach: lifeReach(group, moment.key),
        });
      }
    }
  }

  // Care check-ins: "Is your head any better?" at its moment, the same line the chat gets.
  for (const item of state.care ?? []) {
    if (item.done || !byId.has(item.characterId) || !chatOf.has(item.characterId)) continue;
    const when = new Date(item.dueAt);
    if (inHorizon(when)) {
      say({
        id: `care:${item.id}`,
        kind: 'care',
        at: when,
        characterId: item.characterId,
        line: careLine(item.kind, `${item.id}:care`, byId.get(item.characterId)?.gender),
        reach: careReach(item.kind, item.again),
      });
    }
  }

  // Threads: "Good luck!" before, "How did it go?" after, the same line the chat gets; only from
  // friends who may write first. A text before the thing goes as a reminder (time-sensitive).
  for (const thread of state.threads ?? []) {
    const character = byId.get(thread.characterId);
    if (thread.status !== 'open' || !character || !chatOf.has(thread.characterId) || !relationships[thread.characterId]?.messagesFirst) continue;
    for (const touch of thread.touches) {
      const when = new Date(touch.at);
      if (touch.sent || covered.has(touch.id) || !inHorizon(when)) continue;
      const before = beforeThing(touch.phase);
      say({
        id: `touch:${touch.id}`,
        kind: 'touch',
        at: when,
        characterId: thread.characterId,
        line: mockTouchLine(thread, touch, temperOf(character, relationships[thread.characterId].label), touch.id, character.gender),
        reach: threadReach(touch.phase, thread.id),
        ...(before ? { channel: 'reminders' as const, timeSensitive: true } : {}),
      });
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
        line: pickSeeded(diaryNudgeLines(last.c.gender), `${dayKey(days[1])}:${id}`),
        route: '/diary',
      });
    }

    const quote = quoteOf(messages[chatOf.get(id)!.id]);
    const anniversary = Date.parse(relationships[id].anniversary);
    // The first two days sound like them: worried, teasing, sulking, missing you, or shy (`temperOf`).
    const temper = temperOf(byId.get(id)!, relationships[id].label);
    for (const step of COMEBACK_DAYS) {
      const when = at(new Date(now.getTime() + step * DAY_MS), PUSH_RULES.comebackAt[0], PUSH_RULES.comebackAt[1]);
      const together = Math.floor((when.getTime() - anniversary) / DAY_MS) + 1;
      say({
        id: `comeback:${today}:${step}:${id}`,
        kind: 'comeback',
        at: when,
        characterId: id,
        line:
          temperComeback(temper, step, quote, `${today}:${step}:${id}`, byId.get(id)?.gender) ??
          pickSeeded(comebackLines[step], `${today}:${step}:${id}`)(quote, together, byId.get(id)?.gender),
        writesToChat: true,
      });
    }
  }

  return out;
}

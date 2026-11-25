import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useReducer, useRef, type ComponentProps, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { HEROES } from '@/assets/heroes/registry';
import { useRadioClips, type ClipView } from '@/components/radio/use-clips';
import { featuredFriendOf } from '@/components/today-hero';
import { characterImage } from '@/components/ui/avatar';
import { useDayKey } from '@/hooks/use-day-key';
import { useFirstSteps } from '@/hooks/use-first-steps';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { helplineToday } from '@/lib/daily-note';
import { relativeStamp, shortName } from '@/lib/format';
import {
  freeShellsLeft,
  missedCall,
  nextRelativeWakeAt,
  resolveDateWidget,
  resolveGiftsAction,
  resolveSleepWidget,
} from '@/lib/today-widgets';
import { DAILY_CHECK_IN, dateFromKey, dayKey, FREE_SPINS_PER_DAY, levelForIntimacy } from '@/mock';
import { DATE_PLACES } from '@/mock/dates';
import { checkInStatus, minutesOf, useAppStore } from '@/store/use-app-store';
import type { Character, Conversation, WidgetKind } from '@/types';

import { widgetLabel, WidgetView, type WidgetModel } from './widgets';

/**
 * Today's widgets, one hook per kind (HIG Widgets: "display only the information that's directly
 * related to the widget's main purpose" + "Targeted Deep Links"). Each reads only its own part of
 * the store, so a chat line re-renders the widgets that show chats and leaves the alarm or the
 * shells alone, and only the four widgets on Today (and the gallery while it is open) do any work.
 * A widget whose content changes with the clock (a plan starts, an alarm rings, a missed call ages
 * out, a relative stamp ticks) wakes itself at that exact moment and on foreground return.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Re-runs `wake` at `at` (a timer, re-armed within a day) and whenever the app comes back to the foreground. */
function useWakeAt(at: number | undefined, wake: () => void) {
  const latest = useRef(wake);
  latest.current = wake;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && latest.current());
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (at == null) return;
    // A small margin past the moment, so the pick made then already sees it as past.
    const id = setTimeout(() => latest.current(), Math.min(DAY_MS, Math.max(0, at - Date.now()) + 500));
    return () => clearTimeout(id);
  }, [at]);
}

/**
 * A counter that moves when the widget's moment comes. A pick reads `Date.now()` afresh whenever it
 * runs (its inputs changed or the counter moved); `+ tick * 0` only names the counter as an input.
 */
function useClock(): [number, () => void] {
  return useReducer((n: number) => n + 1, 0);
}

/** The friends you chat with, the one you talked with last first (ids, so their order is all that re-renders). */
let friendOrder: { conversations: Conversation[]; ids: string[] } | undefined;
function friendIdsOf(s: { conversations: Conversation[] }): string[] {
  if (friendOrder?.conversations !== s.conversations) {
    friendOrder = {
      conversations: s.conversations,
      ids: [...s.conversations].sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt)).map((c) => c.characterId),
    };
  }
  return friendOrder.ids;
}

/** What every widget needs: words, routes, the day, unblocked characters by id and their short names. */
function useKit() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const today = useDayKey();
  const characters = useAppStore((s) => s.characters);
  const blockedIds = useAppStore((s) => s.blockedIds);
  // Only the nicknames, not the whole bond, which moves with every chat line.
  const nicknames = useAppStore(
    useShallow((s) => {
      const out: Record<string, string> = {};
      for (const id in s.relationships) {
        const nick = s.relationships[id]?.nickname;
        if (nick) out[id] = nick;
      }
      return out;
    }),
  );
  return useMemo(() => {
    const blocked = new Set(blockedIds);
    const byId = new Map<string, Character>();
    for (const c of characters) {
      if (!blocked.has(c.id)) byId.set(c.id, c);
    }
    const has = (id: string) => byId.has(id);
    const nameOf = (c: Character) => shortName(nicknames[c.id] || c.name);
    const pick = (ids: readonly string[]) => ids.map((id) => byId.get(id)).filter((c): c is Character => !!c);
    return { t, lang: i18n.language, router, today, byId, has, nameOf, pick, label: (kind: WidgetKind) => widgetLabel(kind, t) };
  }, [t, i18n.language, router, today, characters, blockedIds, nicknames]);
}
type Kit = ReturnType<typeof useKit>;

const useHeroId = () => useAppStore((s) => featuredFriendOf(s)?.character.id);
const useFriendIds = () => useAppStore(useShallow(friendIdsOf));
const useChatIdOf = (characterId: string | undefined) =>
  useAppStore((s) => (characterId ? s.conversations.find((c) => c.characterId === characterId)?.id : undefined));
const useHelplineActive = (characterId: string | undefined) => {
  const chatId = useChatIdOf(characterId);
  return useAppStore((s) => (chatId ? helplineToday(s.messages[chatId] ?? []) : false));
};

/** "Today", "Tomorrow", else "Fri, Nov 7" in the app's language. */
function dayWord(k: Kit, date: string) {
  const tomorrow = dateFromKey(k.today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date === k.today
    ? k.t('common.today')
    : date === dayKey(tomorrow)
      ? k.t('common.tomorrow')
      : new Date(`${date}T12:00:00`).toLocaleDateString(k.lang, { weekday: 'short', day: 'numeric', month: 'short' });
}

const newest = <T extends { createdAt: string; characterId: string }>(list: readonly T[], has: (id: string) => boolean) =>
  [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).find((x) => has(x.characterId));

/**
 * Calls: the friend to ring as a contact card with call and message buttons, and your call minutes.
 * A friend who called and was missed in the last day comes first, with "Missed call" and a call-back;
 * tapping the card opens Call History directly on Missed when a missed call is shown.
 */
function useCallsModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const friendIds = useFriendIds();
  const calls = useAppStore((s) => s.calls);
  const callMinutes = useAppStore((s) => Math.floor(minutesOf(s.wallet, 'call', Date.now()).total / 60));
  const [tick, wake] = useClock();
  const missed = useMemo(
    () => missedCall(calls.filter((c) => k.has(c.characterId)), Date.now() + tick * 0),
    [calls, k, tick],
  );
  useWakeAt(missed.changesAt, wake);
  const missedFrom = missed.call ? k.byId.get(missed.call.characterId) : undefined;
  const hero = heroId ? k.byId.get(heroId) : undefined;
  const caller = missedFrom ?? (hero?.voiceReady ? hero : k.pick(friendIds).find((c) => c.voiceReady));
  const chatId = useChatIdOf(caller?.id);
  const missedAt = missedFrom ? missed.call?.startedAt : undefined;

  return useMemo(() => {
    const { t, router, nameOf, label } = k;
    return {
      kind: 'calls',
      label: label('calls'),
      faces: [],
      title: caller ? nameOf(caller) : label('calls'),
      line: missedAt
        ? t('chat.callMissed')
        : callMinutes > 0
          ? t('home.widget.minutesLeft', { count: callMinutes })
          : t('home.widget.hearVoice'),
      onPress: () => router.push(missedAt ? { pathname: '/call-history', params: { filter: 'missed' } } : '/call-history'),
      ...(caller
        ? {
            person: caller,
            personDot: missedAt ? ('missed' as const) : ('call' as const),
            buttons: [
              {
                glyph: { ios: 'phone.fill', icon: 'call' },
                label: missedAt ? t('chat.callBack') : t('home.widget.call', { name: nameOf(caller) }),
                onPress: () => router.push(`/call/${caller.id}`),
                tone: missedAt ? ('go' as const) : undefined,
              },
              {
                glyph: { ios: 'message.fill', icon: 'chatbubble' },
                label: t('characterProfile.chat'),
                onPress: () => (chatId ? router.push(`/chat/${chatId}`) : router.push(`/character/${caller.id}`)),
              },
            ],
          }
        : {}),
    };
  }, [k, caller, chatId, callMinutes, missedAt]);
}

/** Diary: today's new pages (how many, who wrote them), else the last page's opening line; pencil pre-selects that friend. */
function useDiaryModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const pages = useAppStore((s) => s.characterDiary);
  const read = useAppStore((s) => s.diaryPagesRead);

  const fresh = useMemo(() => pages.filter((p) => p.date === k.today && !read.includes(p.id) && k.has(p.characterId)), [pages, read, k]);
  const lastPage = useMemo(
    () => (fresh.length ? undefined : [...pages].sort((a, b) => Date.parse(b.writtenAt) - Date.parse(a.writtenAt)).find((p) => k.has(p.characterId))),
    [fresh.length, pages, k],
  );
  const quiet = useHelplineActive(lastPage?.characterId);

  return useMemo(() => {
    const { t, router, byId, nameOf, label, today } = k;
    const writers = k.pick([...new Set(fresh.map((p) => p.characterId))]);
    const lastWriter = lastPage ? byId.get(lastPage.characterId) : undefined;
    const openPage = fresh[0] ?? lastPage;
    const writeTarget = openPage?.characterId ?? (heroId && k.has(heroId) ? heroId : undefined);
    const pageDay = (date: string) => {
      const yesterday = dateFromKey(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return date === today
        ? t('common.today')
        : date === dayKey(yesterday)
          ? t('common.yesterday')
          : new Date(`${date}T12:00:00`).toLocaleDateString(k.lang, { day: 'numeric', month: 'short' });
    };
    return {
      kind: 'diary',
      label: label('diary'),
      faces: [],
      ...(fresh.length
        ? {
            figure: String(fresh.length),
            unit: t('home.widget.newPages', { count: fresh.length }),
            line: writers.map(nameOf).join(', '),
            lineFace: writers[0],
          }
        : lastWriter && lastPage
          ? quiet
            ? { title: label('diary'), line: `${nameOf(lastWriter)} · ${pageDay(lastPage.date)}`, lineFace: lastWriter }
            : { quote: lastPage.body[0], line: `${nameOf(lastWriter)} · ${pageDay(lastPage.date)}`, lineFace: lastWriter }
          : { title: label('diary'), line: t('home.widget.writeToday') }),
      onPress: () =>
        openPage
          ? router.push({ pathname: '/diary/page/[characterId]', params: { characterId: openPage.characterId, date: openPage.date } })
          : router.push('/diary'),
      buttons: [
        ...(openPage
          ? [
              {
                glyph: { ios: 'books.vertical' as const, icon: 'library-outline' as const },
                label: t('home.modules.heartbeatDiary'),
                onPress: () => router.push('/diary'),
              },
            ]
          : []),
        {
          glyph: { ios: 'square.and.pencil', icon: 'create-outline' },
          label: t('home.widget.writeToday'),
          onPress: () => router.push(writeTarget ? { pathname: '/diary/write', params: { characterId: writeTarget } } : '/diary/write'),
        },
      ],
    };
  }, [k, fresh, lastPage, quiet, heroId]);
}

/**
 * Date / Plans: resumes an unfinished active date, else deep-links a calendar plan straight to that
 * friend & day on Us (`/(tabs)/us?friend=...&day=...`), else opens Dating pre-selected with `hero`.
 */
function useDateModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const activeDate = useAppStore((s) => s.activeDate);
  const schedules = useAppStore((s) => s.schedules);
  const [tick, wake] = useClock();
  const state = useMemo(
    () =>
      resolveDateWidget({
        activeDate,
        schedules,
        today: k.today,
        now: Date.now() + tick * 0,
        heroId,
        hasCharacter: k.has,
      }),
    [activeDate, schedules, k.today, k.has, heroId, tick],
  );
  useWakeAt(state.changesAt, wake);
  const focusCharId = state.mode === 'activeDate' ? state.characterId : state.mode === 'plan' ? state.plan.characterId : undefined;
  const chatId = useChatIdOf(focusCharId);

  return useMemo(() => {
    const { t, router, byId, nameOf, label, today } = k;
    if (state.mode === 'activeDate') {
      const friend = byId.get(state.characterId);
      const place = DATE_PLACES.find((p) => p.id === state.placeId);
      const placeTitle = state.customTitle ?? (place ? t(`dating.places.${place.titleKey}`) : label('date'));
      return {
        kind: 'date',
        label: label('date'),
        faces: [],
        badge: '1',
        title: placeTitle,
        titleLines: 2,
        line: friend ? t('home.widget.withName', { name: nameOf(friend) }) : t('home.waiting'),
        lineFace: friend,
        onPress: () => router.push({ pathname: '/date/[placeId]', params: { placeId: state.placeId, characterId: state.characterId } }),
        buttons: [
          {
            glyph: { ios: 'heart', icon: 'heart-outline' },
            label: t('home.modules.dating'),
            onPress: () => router.push({ pathname: '/dating', params: { partner: state.characterId } }),
          },
          ...(chatId
            ? [{ glyph: { ios: 'message' as const, icon: 'chatbubble-outline' as const }, label: t('characterProfile.chat'), onPress: () => router.push(`/chat/${chatId}`) }]
            : []),
        ],
      };
    }

    if (state.mode === 'plan') {
      const { plan, nextPlan } = state;
      const planFriend = byId.get(plan.characterId);
      return {
        kind: 'date',
        label: label('date'),
        icon: { ios: 'calendar', icon: 'calendar-outline' },
        faces: [],
        figure: plan.time ?? dayWord(k, plan.date),
        title: plan.title,
        titleLines: 2,
        line: [plan.time ? dayWord(k, plan.date) : '', planFriend && !nextPlan ? nameOf(planFriend) : ''].filter(Boolean).join(' · '),
        lineFace: planFriend,
        list: nextPlan
          ? [{ face: byId.get(nextPlan.characterId), text: `${dayWord(k, nextPlan.date)}${nextPlan.time ? ` ${nextPlan.time}` : ''} · ${nextPlan.title}` }]
          : undefined,
        onPress: () => router.navigate({ pathname: '/(tabs)/us', params: { friend: plan.characterId, day: plan.date, at: String(Date.now()) } }),
        buttons: [
          {
            glyph: { ios: 'heart', icon: 'heart-outline' },
            label: t('home.modules.dating'),
            onPress: () => router.push({ pathname: '/dating', params: { partner: plan.characterId } }),
          },
          ...(chatId
            ? [{ glyph: { ios: 'message' as const, icon: 'chatbubble-outline' as const }, label: t('characterProfile.chat'), onPress: () => router.push(`/chat/${chatId}`) }]
            : []),
        ],
      };
    }

    return {
      kind: 'date',
      label: label('date'),
      faces: [],
      title: label('date'),
      line: t('home.widget.planDate'),
      onPress: () => router.push(state.partnerId ? { pathname: '/dating', params: { partner: state.partnerId } } : '/dating'),
      buttons: [
        {
          glyph: { ios: 'plus', icon: 'add' },
          label: t('us.newPlan'),
          onPress: () =>
            router.navigate(
              state.partnerId ? { pathname: '/(tabs)/us', params: { friend: state.partnerId, day: today, plan: '1', at: String(Date.now()) } } : '/(tabs)/us',
            ),
        },
      ],
    };
  }, [k, state, chatId]);
}

/**
 * Sleep: the next alarm large (in 12h/24h phone format) with who wakes you; tapping an active alarm
 * opens `/alarms`, tapping empty opens `/bedtime?partner=<hero>`, and `+` opens `/alarms/edit` with
 * that friend pre-selected.
 */
function useSleepModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const alarms = useAppStore((s) => s.alarms);
  const h12 = uses12Hour();
  const [tick, wake] = useClock();
  const state = useMemo(
    () => resolveSleepWidget({ alarms, now: Date.now() + tick * 0, heroId, hasCharacter: k.has }),
    [alarms, heroId, k.has, tick],
  );
  useWakeAt(state.changesAt, wake);

  return useMemo(() => {
    const { t, router, byId, nameOf, label, lang } = k;
    const formatRowClock = (hour: number, minute: number) => {
      const c = alarmTime(hour, minute, h12);
      return c.period ? `${c.time} ${t(`alarms.${c.period}`)}` : c.time;
    };
    const openNewAlarm = () =>
      router.push(state.addFriendId ? { pathname: '/alarms/edit', params: { characterId: state.addFriendId } } : '/alarms/edit');

    if (state.mode === 'alarm') {
      const { alarm, later } = state;
      const wakerOf = (a: typeof alarm) => (a.characterId ? byId.get(a.characterId) : undefined);
      const waker = wakerOf(alarm);
      const mainClock = alarmTime(alarm.hour, alarm.minute, h12);
      const rows: { face?: Character; text: string }[] = later.slice(0, later.length > 2 ? 1 : 2).map((a) => {
        const who = wakerOf(a);
        return { face: who, text: `${formatRowClock(a.hour, a.minute)} · ${who ? nameOf(who) : a.label || t('home.widget.wakeUp')}` };
      });
      if (later.length > 2) rows.push({ face: undefined, text: `+${later.length - 1}` });
      // Monday first; 2026-11-01 is a Sunday, so day d of that week is weekday d.
      const weekday = (d: number) => new Date(2026, 10, 1 + d).toLocaleDateString(lang, { weekday: 'narrow' });
      const openBedtime = () =>
        router.push(state.bedtimePartnerId ? { pathname: '/bedtime', params: { partner: state.bedtimePartnerId } } : '/bedtime');
      return {
        kind: 'sleep',
        label: label('sleep'),
        icon: { ios: 'alarm', icon: 'alarm-outline' },
        faces: [],
        figure: mainClock.time,
        unit: mainClock.period ? t(`alarms.${mainClock.period}`) : undefined,
        days: alarm.repeat.length && !later.length ? [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: weekday(d), on: alarm.repeat.includes(d) })) : undefined,
        list: rows.length ? rows : undefined,
        line: waker ? t('home.widget.wakeWith', { label: alarm.label || t('home.widget.wakeUp'), name: nameOf(waker) }) : alarm.label || t('home.widget.wakeUp'),
        lineFace: waker,
        onPress: () => router.push('/alarms'),
        buttons: [
          { glyph: { ios: 'moon.fill', icon: 'moon' }, label: t('bedtime.title'), onPress: openBedtime },
          { glyph: { ios: 'plus', icon: 'add' }, label: t('home.widget.setWake'), onPress: openNewAlarm },
        ],
      };
    }

    return {
      kind: 'sleep',
      label: label('sleep'),
      faces: [],
      title: label('sleep'),
      line: t('home.widget.setWake'),
      onPress: () => router.push(state.partnerId ? { pathname: '/bedtime', params: { partner: state.partnerId } } : '/bedtime'),
      buttons: [
        ...(state.hasDisabledAlarms
          ? [{ glyph: { ios: 'alarm' as const, icon: 'alarm-outline' as const }, label: t('alarms.title'), onPress: () => router.push('/alarms') }]
          : []),
        { glyph: { ios: 'plus', icon: 'add' }, label: t('home.widget.setWake'), onPress: openNewAlarm },
      ],
    };
  }, [k, state, h12]);
}

/** Gifts: unifies check-in week, free daily spin, and First Steps rewards so More badge and widget always match. */
function useGiftsModel(): WidgetModel {
  const k = useKit();
  const daily = useAppStore((s) => s.daily);
  const stepReady = useFirstSteps().ready;
  return useMemo(() => {
    const { t, router, label, today } = k;
    const checkIn = checkInStatus(daily, today);
    const daysTaken = checkIn.claimed ? checkIn.day : checkIn.day - 1;
    const checkInPrize = DAILY_CHECK_IN[Math.max(0, Math.min(DAILY_CHECK_IN.length - 1, checkIn.day - 1))] ?? 10;
    const action = resolveGiftsAction({
      daily,
      today,
      checkInClaimed: checkIn.claimed,
      stepReady,
      freeSpinsPerDay: FREE_SPINS_PER_DAY,
    });
    return {
      kind: 'gifts',
      label: label('gifts'),
      faces: [],
      badge:
        action === 'spin'
          ? t('home.widget.oneFree')
          : action === 'checkIn'
            ? `+${checkInPrize}`
            : action === 'firstStep'
              ? '1'
              : undefined,
      title: t('gifts.day', { count: checkIn.day }),
      days: Array.from({ length: 7 }, (_, i) => ({ on: i < daysTaken })),
      line:
        action === 'spin' || action === 'firstStep'
          ? t('home.widget.readyNow')
          : action === 'checkIn'
            ? t('home.waiting')
            : t('home.widget.tomorrow'),
      onPress: () => router.push('/gifts'),
      pill:
        action === 'spin'
          ? { label: t('gifts.spin'), onPress: () => router.push({ pathname: '/gifts', params: { spin: '1' } }) }
          : action === 'checkIn' || action === 'firstStep'
            ? { label: t('gifts.firstSteps.claim'), onPress: () => router.push('/gifts') }
            : undefined,
    };
  }, [k, daily, stepReady]);
}

/** Store: the balance (opens its history) and "+"; while today's free shells last, how many go at midnight. */
function useStoreModel(): WidgetModel {
  const k = useKit();
  const shells = useAppStore((s) => s.wallet.shells);
  const free = useAppStore((s) => freeShellsLeft(s.wallet, k.today));
  return useMemo(() => {
    const { t, router, label } = k;
    return {
      kind: 'store',
      label: label('store'),
      faces: [],
      figure: String(shells),
      unit: t('home.widget.shells'),
      line: free > 0 ? t('home.gift.freeLeft', { count: free }) : label('store'),
      lineLines: 2,
      onPress: () => router.push('/store/ledger'),
      buttons: [{ glyph: { ios: 'plus', icon: 'add' }, label: t('profile.getMore'), onPress: () => router.push('/store/shell?tab=shells') }],
    };
  }, [k, shells, free]);
}

/** Photos: your newest Photo Booth picture (opens it), else the hero's scene; camera pre-selects that friend. */
function usePhotosModel(): WidgetModel {
  const k = useKit();
  const photos = useAppStore((s) => s.photos);
  const heroId = useHeroId();
  return useMemo(() => {
    const { t, router, byId, has, nameOf } = k;
    const photo = newest(photos, has);
    const friend = photo ? byId.get(photo.characterId) : heroId ? byId.get(heroId) : undefined;
    const openBooth = () => router.push(friend ? { pathname: '/photo-booth', params: { partner: friend.id } } : '/photo-booth');
    return {
      kind: 'photos',
      label: k.label('photos'),
      faces: [],
      photo: friend ? (HEROES[friend.id] ?? characterImage(friend)) : undefined,
      title: t('home.modules.photoBooth'),
      line: photo && friend ? t('home.widget.withName', { name: nameOf(friend) }) : t('home.widget.takeOne'),
      onPress: () => (photo ? router.push({ pathname: '/photo/[id]', params: { id: photo.id } }) : openBooth()),
      buttons: [{ glyph: { ios: 'camera', icon: 'camera-outline' }, label: t('home.modules.photoBooth'), onPress: openBooth }],
    };
  }, [k, photos, heroId]);
}

/** Radio: unlocked new gift clip first, then newest user clip, then any unlocked gift clip. */
function useRadioModel(): WidgetModel {
  const k = useKit();
  const { gifts, mine } = useRadioClips();
  const radioClips = useAppStore((s) => s.radioClips);
  return useMemo(() => {
    const { t, router, nameOf, label, has } = k;
    const validGifts = gifts.filter((c) => has(c.character.id));
    const validMine = mine.filter((c) => has(c.character.id));
    const own = newest(radioClips, has);
    const clip: ClipView | undefined =
      validGifts.find((c) => c.isNew && !c.locked) ?? (own ? validMine.find((c) => c.id === own.id) : undefined) ?? validGifts.find((c) => !c.locked);
    const friend = clip?.character;
    const length = clip ? `${Math.floor(clip.durationSec / 60)}:${String(Math.round(clip.durationSec % 60)).padStart(2, '0')}` : '';
    return {
      kind: 'radio',
      label: label('radio'),
      faces: friend ? [friend] : [],
      title: clip && friend ? clip.title : label('radio'),
      titleLines: 2,
      line: clip && friend ? `${t('home.widget.onAir')} · ${nameOf(friend)} · ${length}` : t('home.widget.tuneIn'),
      onPress: () => router.push('/radio'),
      buttons: clip
        ? [{ glyph: { ios: 'play.fill', icon: 'play' }, label: clip.title, onPress: () => router.push({ pathname: '/radio/[id]', params: { id: clip.id } }) }]
        : [{ glyph: { ios: 'mic.fill', icon: 'mic-outline' }, label: t('radio.make'), onPress: () => router.push('/radio/make') }],
    };
  }, [k, gifts, mine, radioClips]);
}

/** Board: the newest note itself, or the friend's answer once it arrived; live relative stamp & pre-selected recipient. */
function useBoardModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const posts = useAppStore((s) => s.boardPosts);
  const post = useMemo(() => newest(posts, k.has), [posts, k.has]);
  const stampIso = post ? (post.replied ? post.replyAt : post.createdAt) : undefined;
  const [tick, wake] = useClock();
  useWakeAt(nextRelativeWakeAt(stampIso, Date.now() + tick * 0), wake);
  const quiet = useHelplineActive(post?.characterId);

  return useMemo(() => {
    const { t, router, byId, has, nameOf, label } = k;
    const friend = post ? byId.get(post.characterId) : undefined;
    const writeTo = friend?.id ?? (heroId && has(heroId) ? heroId : undefined);
    const when = stampIso ? relativeStamp(stampIso) : '';
    return {
      kind: 'board',
      label: label('board'),
      faces: friend ? [friend] : [],
      title: label('board'),
      quote: post && friend && !quiet ? (post.replied && post.reply ? post.reply : post.text) : undefined,
      line: friend
        ? post?.replied
          ? `${t('home.widget.answered', { name: nameOf(friend) })}${when ? ` · ${when}` : ''}`
          : `${t('home.widget.noteTo', { name: nameOf(friend) })}${when ? ` · ${when}` : ''}`
        : t('home.widget.pinNote'),
      onPress: () => router.push('/board'),
      buttons: [
        {
          glyph: { ios: 'square.and.pencil', icon: 'create-outline' },
          label: t('home.widget.pinNote'),
          onPress: () => router.push(writeTo ? { pathname: '/board/write', params: { characterId: writeTo } } : '/board/write'),
        },
      ],
    };
  }, [k, post, stampIso, quiet, heroId, tick]);
}

/** Contacts: how many friends, the three you talked with last, and a way to meet someone new. */
function useContactsModel(): WidgetModel {
  const k = useKit();
  const friendIds = useFriendIds();
  return useMemo(() => {
    const { t, router, label } = k;
    const friends = k.pick(friendIds);
    return {
      kind: 'contacts',
      label: label('contacts'),
      faces: friends.slice(0, 2),
      figure: String(friends.length),
      unit: t('home.widget.friends', { count: friends.length }),
      line: label('contacts'),
      onPress: () => router.push('/contacts'),
      buttons: [{ glyph: { ios: 'person.badge.plus', icon: 'person-add-outline' }, label: t('home.todo.meet'), onPress: () => router.navigate('/(tabs)/find') }],
    };
  }, [k, friendIds]);
}

/** Bond: the friend on the card, their level and progress bar; deep-links straight to their Bond on Us. */
function useBondModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const bond = useAppStore((s) => (heroId ? s.relationships[heroId] : undefined));
  return useMemo(() => {
    const { t, router, byId, nameOf, label } = k;
    const friend = heroId ? byId.get(heroId) : undefined;
    const toGo = bond ? Math.max(0, Math.ceil(bond.nextLevelAt - bond.intimacy)) : 0;
    return {
      kind: 'bond',
      label: label('bond'),
      faces: friend ? [friend] : [],
      ...(bond && friend
        ? {
            figure: t('home.hero.level', { level: bond.level }),
            progress: levelForIntimacy(bond.intimacy).progress,
            line: t('home.widget.toNext', { name: nameOf(friend), count: toGo }),
            lineLines: 2,
          }
        : { title: label('bond'), line: t('home.todo.meet') }),
      onPress: () =>
        friend
          ? router.navigate({ pathname: '/(tabs)/us', params: { friend: friend.id, at: String(Date.now()) } })
          : router.navigate('/(tabs)/find'),
      buttons: friend
        ? [{ glyph: { ios: 'person.crop.circle', icon: 'person-circle-outline' }, label: nameOf(friend), onPress: () => router.push(`/character/${friend.id}`) }]
        : undefined,
    };
  }, [k, heroId, bond]);
}

type ViewProps = Omit<ComponentProps<typeof WidgetView>, 'model'>;

// One small component per kind, each calling its own model hook (no hook picked at run time).
const CallsWidget = (p: ViewProps) => <WidgetView model={useCallsModel()} {...p} />;
const DiaryWidget = (p: ViewProps) => <WidgetView model={useDiaryModel()} {...p} />;
const DateWidget = (p: ViewProps) => <WidgetView model={useDateModel()} {...p} />;
const SleepWidget = (p: ViewProps) => <WidgetView model={useSleepModel()} {...p} />;
const GiftsWidget = (p: ViewProps) => <WidgetView model={useGiftsModel()} {...p} />;
const StoreWidget = (p: ViewProps) => <WidgetView model={useStoreModel()} {...p} />;
const PhotosWidget = (p: ViewProps) => <WidgetView model={usePhotosModel()} {...p} />;
const RadioWidget = (p: ViewProps) => <WidgetView model={useRadioModel()} {...p} />;
const BoardWidget = (p: ViewProps) => <WidgetView model={useBoardModel()} {...p} />;
const ContactsWidget = (p: ViewProps) => <WidgetView model={useContactsModel()} {...p} />;
const BondWidget = (p: ViewProps) => <WidgetView model={useBondModel()} {...p} />;

const WIDGETS: Record<WidgetKind, (p: ViewProps) => ReactElement> = {
  calls: CallsWidget,
  diary: DiaryWidget,
  date: DateWidget,
  sleep: SleepWidget,
  gifts: GiftsWidget,
  store: StoreWidget,
  photos: PhotosWidget,
  radio: RadioWidget,
  board: BoardWidget,
  contacts: ContactsWidget,
  bond: BondWidget,
};

/** One widget with its live content; another kind is another component, so its state starts fresh. */
export const LiveWidget = memo(function LiveWidget({ kind, ...view }: { kind: WidgetKind } & ViewProps) {
  const Widget = WIDGETS[kind];
  return <Widget {...view} />;
});

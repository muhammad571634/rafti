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
import { relativeStamp, shortName } from '@/lib/format';
import { alarmsInOrder, freeShellsLeft, missedCall, upcomingPlans } from '@/lib/today-widgets';
import { dateFromKey, dayKey, FREE_SPINS_PER_DAY, levelForIntimacy } from '@/mock';
import { checkInStatus, minutesOf, useAppStore } from '@/store/use-app-store';
import type { Character, Conversation, WidgetKind } from '@/types';

import { widgetLabel, WidgetView, type WidgetModel } from './widgets';

/**
 * Today's widgets, one hook per kind (HIG Widgets: "display only the information that's directly
 * related to the widget's main purpose"). Each reads only its own part of the store, so a chat
 * line re-renders the widgets that show chats and leaves the alarm or the shells alone, and only
 * the four widgets on Today (and the gallery while it is open) do any work at all. A widget whose
 * content changes with the clock (a plan starts, an alarm rings, a missed call gets old) wakes
 * itself at that moment and when the app comes back to the foreground.
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

/** What every widget needs: words, routes, the day, characters by id and their short names. */
function useKit() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const today = useDayKey();
  const characters = useAppStore((s) => s.characters);
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
    const byId = new Map(characters.map((c) => [c.id, c]));
    const nameOf = (c: Character) => shortName(nicknames[c.id] || c.name);
    const pick = (ids: readonly string[]) => ids.map((id) => byId.get(id)).filter((c): c is Character => !!c);
    return { t, lang: i18n.language, router, today, byId, nameOf, pick, label: (kind: WidgetKind) => widgetLabel(kind, t) };
  }, [t, i18n.language, router, today, characters, nicknames]);
}
type Kit = ReturnType<typeof useKit>;

const useHeroId = () => useAppStore((s) => featuredFriendOf(s)?.character.id);
const useFriendIds = () => useAppStore(useShallow(friendIdsOf));
const useChatIdOf = (characterId: string | undefined) =>
  useAppStore((s) => (characterId ? s.conversations.find((c) => c.characterId === characterId)?.id : undefined));
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
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const newest = <T extends { createdAt: string; characterId: string }>(list: readonly T[], has: (id: string) => boolean) =>
  [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).find((x) => has(x.characterId));

/**
 * Calls: the friend to ring as a contact card with call and message buttons, and your call minutes.
 * A friend who called and was missed in the last day comes first, with "Missed call" and a call-back.
 */
function useCallsModel(): WidgetModel {
  const k = useKit();
  const heroId = useHeroId();
  const friendIds = useFriendIds();
  const calls = useAppStore((s) => s.calls);
  const callMinutes = useAppStore((s) => Math.floor(minutesOf(s.wallet, 'call', Date.now()).total / 60));
  const [tick, wake] = useClock();
  const missed = useMemo(() => missedCall(calls, Date.now() + tick * 0), [calls, tick]);
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
        ? `${t('chat.callMissed')} · ${relativeStamp(missedAt)}`
        : callMinutes > 0
          ? t('home.widget.minutesLeft', { count: callMinutes })
          : t('home.widget.hearVoice'),
      onPress: () => router.push('/call-history'),
      ...(caller
        ? {
            person: caller,
            personDot: missedAt ? ('missed' as const) : ('call' as const),
            buttons: [
              {
                glyph: { ios: 'phone.fill', icon: 'call' },
                label: missedAt ? t('chat.callBack') : t('home.widget.call', { name: nameOf(caller) }),
                onPress: () => router.push(`/call/${caller.id}`),
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

/** Diary: today's new pages (how many, who wrote them, never their words), else the last page's first lines. */
function useDiaryModel(): WidgetModel {
  const k = useKit();
  const pages = useAppStore((s) => s.characterDiary);
  const read = useAppStore((s) => s.diaryPagesRead);
  return useMemo(() => {
    const { t, router, byId, nameOf, label, today } = k;
    const fresh = pages.filter((p) => p.date === today && !read.includes(p.id));
    const writers = k.pick([...new Set(fresh.map((p) => p.characterId))]);
    const lastPage = fresh.length
      ? undefined
      : [...pages].sort((a, b) => Date.parse(b.writtenAt) - Date.parse(a.writtenAt)).find((p) => byId.has(p.characterId));
    const lastWriter = lastPage ? byId.get(lastPage.characterId) : undefined;
    const openPage = fresh[0] ?? lastPage;
    /** A page's day: "Today", "Yesterday", else "Nov 3" (a page is dated by its day, never "00:00"). */
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
      faces: lastWriter ? [lastWriter] : writers.slice(0, 3),
      ...(fresh.length
        ? { figure: String(fresh.length), unit: t('home.widget.newPages', { count: fresh.length }), line: writers.map(nameOf).join(', ') }
        : lastWriter && lastPage
          ? { quote: lastPage.body[0], line: `${t('home.widget.pageOf', { name: nameOf(lastWriter) })} · ${pageDay(lastPage.date)}` }
          : { title: label('diary'), line: t('home.widget.writeToday') }),
      onPress: () =>
        openPage
          ? router.push({ pathname: '/diary/page/[characterId]', params: { characterId: openPage.characterId, date: openPage.date } })
          : router.push('/diary'),
      buttons: fresh.length
        ? undefined
        : [{ glyph: { ios: 'square.and.pencil', icon: 'create-outline' }, label: t('home.widget.writeToday'), onPress: () => router.push('/diary/write') }],
    };
  }, [k, pages, read]);
}

/** Date: the next plan whole (time, day, name, who with) and the one after; a started plan leaves at its start. */
function useDateModel(): WidgetModel {
  const k = useKit();
  const schedules = useAppStore((s) => s.schedules);
  const [tick, wake] = useClock();
  const coming = useMemo(() => upcomingPlans(schedules, k.today, Date.now() + tick * 0), [schedules, k.today, tick]);
  useWakeAt(coming.changesAt, wake);
  const [plan, nextPlan] = coming.plans;
  const chatId = useChatIdOf(plan?.characterId);
  return useMemo(() => {
    const { t, router, byId, nameOf, label } = k;
    const planFriend = plan ? byId.get(plan.characterId) : undefined;
    return {
      kind: 'date',
      label: label('date'),
      faces: planFriend ? [planFriend] : [],
      ...(plan
        ? {
            figure: plan.time ?? dayWord(k, plan.date),
            title: plan.title,
            titleLines: 2,
            line: [plan.time ? dayWord(k, plan.date) : '', planFriend && !nextPlan ? nameOf(planFriend) : ''].filter(Boolean).join(' · '),
            list: nextPlan
              ? [{ face: byId.get(nextPlan.characterId), text: `${dayWord(k, nextPlan.date)}${nextPlan.time ? ` ${nextPlan.time}` : ''} · ${nextPlan.title}` }]
              : undefined,
          }
        : { title: label('date'), line: t('home.widget.planDate') }),
      // The heart is Dating's own door, plan or not (owner, 2026-11-05); the plan's friend is one tap away on the bubble.
      onPress: () => router.push('/dating'),
      buttons: chatId
        ? [{ glyph: { ios: 'message', icon: 'chatbubble-outline' }, label: t('characterProfile.chat'), onPress: () => router.push(`/chat/${chatId}`) }]
        : undefined,
    };
  }, [k, plan, nextPlan, chatId]);
}

/** Sleep: the next alarm large with who wakes you, the others as rows; after it rings, the next one leads. */
function useSleepModel(): WidgetModel {
  const k = useKit();
  const alarms = useAppStore((s) => s.alarms);
  const [tick, wake] = useClock();
  const order = useMemo(() => alarmsInOrder(alarms, Date.now() + tick * 0), [alarms, tick]);
  useWakeAt(order.changesAt, wake);
  return useMemo(() => {
    const { t, router, byId, nameOf, label, lang } = k;
    const [alarm, ...later] = order.alarms;
    const wakerOf = (a: (typeof order.alarms)[number]) => (a.characterId ? byId.get(a.characterId) : undefined);
    const waker = alarm ? wakerOf(alarm) : undefined;
    const wakers = [...new Set(order.alarms.map(wakerOf).filter((c): c is Character => !!c))];
    // Two rows fit under the next alarm; any more fold into "+N" on the second.
    const rows: { face?: Character; text: string }[] = later.slice(0, later.length > 2 ? 1 : 2).map((a) => {
      const who = wakerOf(a);
      return { face: who, text: `${hhmm(a.hour, a.minute)} · ${who ? nameOf(who) : a.label || t('home.widget.wakeUp')}` };
    });
    if (later.length > 2) rows.push({ face: undefined, text: `+${later.length - 1}` });
    // Monday first; 2026-11-01 is a Sunday, so day d of that week is weekday d.
    const weekday = (d: number) => new Date(2026, 10, 1 + d).toLocaleDateString(lang, { weekday: 'narrow' });
    return {
      kind: 'sleep',
      label: label('sleep'),
      faces: wakers,
      ...(alarm
        ? {
            figure: hhmm(alarm.hour, alarm.minute),
            // The days it rings, as the Clock app shows them: only for a lone repeating alarm.
            days: alarm.repeat.length && !later.length ? [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: weekday(d), on: alarm.repeat.includes(d) })) : undefined,
            list: rows.length ? rows : undefined,
            line: waker
              ? t('home.widget.wakeWith', { label: alarm.label || t('home.widget.wakeUp'), name: nameOf(waker) })
              : alarm.label || t('home.widget.wakeUp'),
          }
        : { title: label('sleep'), line: t('home.widget.setWake') }),
      onPress: () => (alarm ? router.push('/alarms') : router.push('/bedtime')),
      buttons: [{ glyph: { ios: 'plus', icon: 'add' }, label: t('home.widget.setWake'), onPress: () => router.push('/alarms/edit') }],
    };
  }, [k, order]);
}

/** Gifts: the check-in week as dots and, while today's free spin waits, a Spin pill. */
function useGiftsModel(): WidgetModel {
  const k = useKit();
  const daily = useAppStore((s) => s.daily);
  return useMemo(() => {
    const { t, router, label, today } = k;
    const spinReady = daily.spinDay !== today || daily.spinsUsed < FREE_SPINS_PER_DAY;
    const checkIn = checkInStatus(daily, today);
    const daysTaken = checkIn.claimed ? checkIn.day : checkIn.day - 1;
    return {
      kind: 'gifts',
      label: label('gifts'),
      faces: [],
      badge: spinReady ? t('home.widget.oneFree') : undefined,
      title: t('gifts.day', { count: checkIn.day }),
      days: Array.from({ length: 7 }, (_, i) => ({ on: i < daysTaken })),
      line: spinReady ? t('home.widget.readyNow') : !checkIn.claimed ? t('home.waiting') : t('home.widget.tomorrow'),
      onPress: () => router.push('/gifts'),
      pill: spinReady ? { label: t('gifts.spin'), onPress: () => router.push({ pathname: '/gifts', params: { spin: '1' } }) } : undefined,
    };
  }, [k, daily]);
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

/** Photos: your newest Photo Booth picture (opens it), else the friend's scene with an invitation. */
function usePhotosModel(): WidgetModel {
  const k = useKit();
  const photos = useAppStore((s) => s.photos);
  const heroId = useHeroId();
  return useMemo(() => {
    const { t, router, byId, nameOf } = k;
    const photo = newest(photos, (id) => byId.has(id));
    const friend = photo ? byId.get(photo.characterId) : heroId ? byId.get(heroId) : undefined;
    return {
      kind: 'photos',
      label: k.label('photos'),
      faces: [],
      photo: friend ? (HEROES[friend.id] ?? characterImage(friend)) : undefined,
      title: t('home.modules.photoBooth'),
      line: photo && friend ? t('home.widget.withName', { name: nameOf(friend) }) : t('home.widget.takeOne'),
      onPress: () => (photo ? router.push({ pathname: '/photo/[id]', params: { id: photo.id } }) : router.push('/photo-booth')),
      buttons: [{ glyph: { ios: 'camera', icon: 'camera-outline' }, label: t('home.modules.photoBooth'), onPress: () => router.push('/photo-booth') }],
    };
  }, [k, photos, heroId]);
}

/**
 * Radio, as Radio lists it: a friend's clip a level just opened first (not played yet), then your
 * newest, then any open gift (A51 2026-11-05: three open gifts, and the widget said "Tune in").
 */
function useRadioModel(): WidgetModel {
  const k = useKit();
  const { gifts, mine } = useRadioClips();
  const radioClips = useAppStore((s) => s.radioClips);
  return useMemo(() => {
    const { t, router, nameOf, label, byId } = k;
    const own = newest(radioClips, (id) => byId.has(id));
    const clip: ClipView | undefined =
      gifts.find((c) => c.isNew && !c.locked) ?? (own ? mine.find((c) => c.id === own.id) : undefined) ?? gifts.find((c) => !c.locked);
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
        : undefined,
    };
  }, [k, gifts, mine, radioClips]);
}

/** Board: the newest note itself, or the friend's answer to it once they gave one. */
function useBoardModel(): WidgetModel {
  const k = useKit();
  const posts = useAppStore((s) => s.boardPosts);
  return useMemo(() => {
    const { t, router, byId, nameOf, label } = k;
    const post = newest(posts, (id) => byId.has(id));
    const friend = post ? byId.get(post.characterId) : undefined;
    return {
      kind: 'board',
      label: label('board'),
      faces: friend ? [friend] : [],
      title: label('board'),
      quote: post && friend ? (post.replied && post.reply ? post.reply : post.text) : undefined,
      line: friend
        ? post?.replied
          ? `${t('home.widget.answered', { name: nameOf(friend) })} · ${relativeStamp(post.replyAt)}`
          : `${t('home.widget.noteTo', { name: nameOf(friend) })} · ${relativeStamp(post?.createdAt ?? '')}`
        : t('home.widget.pinNote'),
      onPress: () => router.push('/board'),
      buttons: [{ glyph: { ios: 'square.and.pencil', icon: 'create-outline' }, label: t('home.widget.pinNote'), onPress: () => router.push('/board/write') }],
    };
  }, [k, posts]);
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
      faces: friends.slice(0, 3),
      figure: String(friends.length),
      unit: t('home.widget.friends', { count: friends.length }),
      line: label('contacts'),
      onPress: () => router.push('/contacts'),
      buttons: [{ glyph: { ios: 'person.badge.plus', icon: 'person-add-outline' }, label: t('home.todo.meet'), onPress: () => router.push('/(tabs)/find') }],
    };
  }, [k, friendIds]);
}

/** Bond: the friend on the card, their level and a bar filling toward the next one. */
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
      onPress: () => (friend ? router.push(`/character/${friend.id}`) : router.push('/(tabs)/find')),
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

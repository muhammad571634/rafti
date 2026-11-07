import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { useRadioClips, type ClipView } from '@/components/radio/use-clips';
import { featuredFriend } from '@/components/today-hero';
import { CharacterAvatar, ModuleLine, PressableScale, SFIcon, Txt, type ModuleKey } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { useDayKey } from '@/hooks/use-day-key';
import { nextAlarmAt } from '@/lib/alarms';
import { relativeStamp, shortName } from '@/lib/format';
import { planStart } from '@/lib/schedule';
import { dateFromKey, dayKey, FREE_SPINS_PER_DAY, levelForIntimacy } from '@/mock';
import { checkInStatus, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, fonts, isDark, moduleColors, moduleTints, systemColors } from '@/theme';
import type { Ionicons as IoniconsSet } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { Character, WidgetKind } from '@/types';

/** Every widget, in the gallery's order. */
export const WIDGET_KINDS: WidgetKind[] = [
  'calls',
  'diary',
  'date',
  'sleep',
  'gifts',
  'store',
  'photos',
  'radio',
  'board',
  'contacts',
  'bond',
];

/** The Today tile a widget stands in for; Bond has none. */
export const WIDGET_MODULE: Record<WidgetKind, ModuleKey | null> = {
  calls: 'calls',
  diary: 'diary',
  date: 'date',
  sleep: 'sleep',
  gifts: 'gifts',
  store: 'store',
  photos: 'photo',
  radio: 'radio',
  board: 'board',
  contacts: 'contacts',
  bond: null,
};

const LABEL_KEY: Record<WidgetKind, string> = {
  calls: 'home.short.calls',
  diary: 'home.short.diary',
  date: 'home.short.dating',
  sleep: 'home.short.bedtime',
  gifts: 'home.short.gifts',
  store: 'home.short.store',
  photos: 'home.short.photo',
  radio: 'home.short.radio',
  board: 'home.short.board',
  contacts: 'home.short.contacts',
  bond: 'home.widget.bond',
};

/** Near square, as an iOS small widget, so a plan's or a note's words fit whole (owner, 2026-11-05). */
export const WIDGET_HEIGHT = 172;

/** What one widget shows; `WidgetView` draws it the same way in every slot and in the gallery. */
export interface WidgetModel {
  kind: WidgetKind;
  label: string;
  faces: Character[];
  badge?: string;
  /** A big number or time, with an optional word after it */
  figure?: string;
  unit?: string;
  title?: string;
  /** How many lines the title may take (a plan's name: two); on iOS it shrinks a little before it is cut. */
  titleLines?: number;
  line: string;
  /** How many lines `line` may take (Bond's "7 to the next level" runs long in Russian): one by default. */
  lineLines?: number;
  /** What comes after the main thing, as list rows with a small face each (the next plans, more alarms). */
  list?: { face?: Character; text: string }[];
  /** A row of seven: weekday letters (an alarm's days) or dots (the check-in week); `on` in ink. */
  days?: { label?: string; on: boolean }[];
  photo?: string | number;
  onPress: () => void;
  /** A friend as a contact card: their face in the middle, `title` their name, `line` under it (Calls). */
  person?: Character;
  /** Words shown as they are, large: the widget is the thing itself (the board's note). */
  quote?: string;
  /** How far toward the next step, 0-1, as a filling bar (Bond). */
  progress?: number;
  /** Round buttons that each do one thing (HIG Widgets: a few clear actions), in the corner or under a person. */
  buttons?: WidgetButton[];
  /** The one main thing as a dark pill along the foot (Gifts: Spin). */
  pill?: { label: string; onPress: () => void };
}

/** One round widget button: a glyph, what it says to VoiceOver, what it does. */
export interface WidgetButton {
  glyph: { ios: SFSymbol; icon: keyof typeof IoniconsSet.glyphMap };
  label: string;
  onPress: () => void;
}

/** The sizes words step down through to fit (`FitText`); the last is the floor, then they are cut. */
const QUOTE_SIZES = [15, 14, 13, 12] as const;
const SUBTITLE_SIZES = [15, 14, 13] as const;
const TITLE_SIZES = [17, 16, 15] as const;

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/**
 * Every widget's live content, built from the store (HIG Widgets: "prefer dynamic information
 * that changes throughout the day"). Each falls back to something still worth a glance before
 * it falls back to an invitation, so a quiet day never shows a row of empty cards.
 */
export function useWidgetModels(): Record<WidgetKind, WidgetModel> {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const today = useDayKey();
  const wallet = useAppStore((s) => s.wallet);
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const diaryPages = useAppStore((s) => s.characterDiary);
  const pagesRead = useAppStore((s) => s.diaryPagesRead);
  const schedules = useAppStore((s) => s.schedules);
  const alarms = useAppStore((s) => s.alarms);
  const photos = useAppStore((s) => s.photos);
  const radioClips = useAppStore((s) => s.radioClips);
  const boardPosts = useAppStore((s) => s.boardPosts);
  const daily = useAppStore((s) => s.daily);

  const byId = new Map(characters.map((c) => [c.id, c]));
  const nameOf = (c: Character) => shortName(displayName(c, relationships[c.id]));
  const hero = featuredFriend(characters, relationships, conversations, messages);
  const friends = [...conversations]
    .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
    .map((c) => byId.get(c.characterId))
    .filter((c): c is Character => !!c);
  const newest = <T extends { createdAt: string; characterId: string }>(list: T[]) =>
    [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).find((x) => byId.has(x.characterId));
  const label = (kind: WidgetKind) => t(LABEL_KEY[kind]);
  const now = Date.now();

  // Calls
  const caller = hero?.character.voiceReady ? hero.character : friends.find((c) => c.voiceReady);
  const callMinutes = Math.floor(minutesOf(wallet, 'call', now).total / 60);
  const callerChat = caller ? conversations.find((c) => c.characterId === caller.id) : undefined;

  // Diary
  const fresh = diaryPages.filter((p) => p.date === today && !pagesRead.includes(p.id));
  const writers = [...new Set(fresh.map((p) => p.characterId))].map((id) => byId.get(id)).filter((c): c is Character => !!c);
  const lastPage = fresh.length
    ? undefined
    : [...diaryPages].sort((a, b) => Date.parse(b.writtenAt) - Date.parse(a.writtenAt)).find((p) => byId.has(p.characterId));
  const lastWriter = lastPage ? byId.get(lastPage.characterId) : undefined;
  const openPage = fresh[0] ?? lastPage;

  // Date: the coming plans on any day, nearest first; the widget shows the next and names the one after.
  const plans = schedules
    .filter((p) => (p.date === today ? !p.time || planStart(p).getTime() > now : p.date > today))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const [plan, nextPlan] = plans;
  const planFriend = plan ? byId.get(plan.characterId) : undefined;
  const planChat = plan ? conversations.find((c) => c.characterId === plan.characterId) : undefined;
  const tomorrow = dateFromKey(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  /** "Today", "Tomorrow", else "Fri, Nov 7" in the app's language. */
  const dayWord = (date: string) =>
    date === today
      ? t('common.today')
      : date === dayKey(tomorrow)
        ? t('common.tomorrow')
        : new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });

  // Sleep: every alarm that is on, the next to ring first; the widget shows it large and the rest as rows.
  const ringing = alarms
    .filter((a) => a.enabled)
    .map((a) => ({ a, at: nextAlarmAt(a, new Date(now)).getTime() }))
    .sort((x, y) => x.at - y.at)
    .map(({ a }) => a);
  const [alarm, ...laterAlarms] = ringing;
  const wakerOf = (a: (typeof ringing)[number]) => (a.characterId ? byId.get(a.characterId) : undefined);
  const waker = alarm ? wakerOf(alarm) : undefined;
  const wakers = [...new Set(ringing.map(wakerOf).filter((c): c is Character => !!c))];
  // Two rows fit under the next alarm; any more fold into "+N" on the second.
  const alarmRows = laterAlarms.slice(0, laterAlarms.length > 2 ? 1 : 2).map((a) => ({
    face: wakerOf(a),
    text: `${hhmm(a.hour, a.minute)} · ${wakerOf(a) ? nameOf(wakerOf(a)!) : a.label || t('home.widget.wakeUp')}`,
  }));
  if (laterAlarms.length > 2) alarmRows.push({ face: undefined, text: `+${laterAlarms.length - 1}` });
  /** A diary page's day: "Today", "Yesterday", else "Nov 3" (a page is dated by its day, never "00:00"). */
  const pageDay = (date: string) => {
    const yesterday = dateFromKey(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return date === today
      ? t('common.today')
      : date === dayKey(yesterday)
        ? t('common.yesterday')
        : new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  };
  // Monday first; 2026-11-01 is a Sunday, so day d of that week is weekday d.
  const weekday = (d: number) => new Date(2026, 10, 1 + d).toLocaleDateString(i18n.language, { weekday: 'narrow' });

  // Gifts
  const spinReady = daily.spinDay !== today || daily.spinsUsed < FREE_SPINS_PER_DAY;
  const checkIn = checkInStatus(daily, today);
  const giftWaiting = !checkIn.claimed;
  // The check-in week: the days already taken, today's once it is.
  const daysTaken = checkIn.claimed ? checkIn.day : checkIn.day - 1;

  // Photos, Radio, Board
  const photo = newest(photos);
  const photoFriend = photo ? byId.get(photo.characterId) : hero?.character;
  // Radio as Radio lists it: a friend's clip a level just opened comes first (not played yet), then the
  // user's newest, then any open gift (A51 2026-11-05: three open gifts, and the widget said "Tune in").
  const { gifts: friendClips, mine: myClips } = useRadioClips();
  const ownClip = newest(radioClips);
  const clip: ClipView | undefined =
    friendClips.find((c) => c.isNew && !c.locked) ??
    (ownClip ? myClips.find((c) => c.id === ownClip.id) : undefined) ??
    friendClips.find((c) => !c.locked);
  const clipFriend = clip?.character;
  const clipLength = clip ? `${Math.floor(clip.durationSec / 60)}:${String(Math.round(clip.durationSec % 60)).padStart(2, '0')}` : '';
  const post = newest(boardPosts);
  const postFriend = post ? byId.get(post.characterId) : undefined;

  // Bond
  const bondFriend = hero?.character;
  const bond = bondFriend ? relationships[bondFriend.id] : undefined;
  const toGo = bond ? Math.max(0, Math.ceil(bond.nextLevelAt - bond.intimacy)) : 0;

  return {
    calls: {
      kind: 'calls',
      label: label('calls'),
      faces: [],
      title: caller ? nameOf(caller) : label('calls'),
      line: callMinutes > 0 ? t('home.widget.minutesLeft', { count: callMinutes }) : t('home.widget.hearVoice'),
      onPress: () => router.push('/call-history'),
      ...(caller
        ? {
            person: caller,
            buttons: [
              { glyph: { ios: 'phone.fill', icon: 'call' }, label: t('home.widget.call', { name: nameOf(caller) }), onPress: () => router.push(`/call/${caller.id}`) },
              {
                glyph: { ios: 'message.fill', icon: 'chatbubble' },
                label: t('characterProfile.chat'),
                onPress: () => (callerChat ? router.push(`/chat/${callerChat.id}`) : router.push(`/character/${caller.id}`)),
              },
            ],
          }
        : {}),
    },
    diary: {
      kind: 'diary',
      label: label('diary'),
      faces: lastWriter ? [lastWriter] : writers.slice(0, 3),
      // New pages: how many and who wrote them, never their words before they are opened. Else the
      // last page read, its first lines, as a diary app's widget shows the newest entry.
      ...(fresh.length
        ? { figure: String(fresh.length), unit: t('home.widget.newPages', { count: fresh.length }), line: writers.map(nameOf).join(', ') }
        : lastWriter && lastPage
          ? {
              quote: lastPage.body[0],
              line: `${t('home.widget.pageOf', { name: nameOf(lastWriter) })} · ${pageDay(lastPage.date)}`,
            }
          : { title: label('diary'), line: t('home.widget.writeToday') }),
      onPress: () =>
        openPage
          ? router.push({ pathname: '/diary/page/[characterId]', params: { characterId: openPage.characterId, date: openPage.date } })
          : router.push('/diary'),
      buttons: fresh.length ? undefined : [{ glyph: { ios: 'square.and.pencil', icon: 'create-outline' }, label: t('home.widget.writeToday'), onPress: () => router.push('/diary/write') }],
    },
    date: {
      kind: 'date',
      label: label('date'),
      faces: planFriend ? [planFriend] : [],
      // The next plan whole: its time and day, its name on up to two lines, who with; then the one after.
      ...(plan
        ? {
            figure: plan.time ?? dayWord(plan.date),
            title: plan.title,
            titleLines: 2,
            line: [plan.time ? dayWord(plan.date) : '', planFriend && !nextPlan ? nameOf(planFriend) : ''].filter(Boolean).join(' · '),
            list: nextPlan
              ? [{ face: byId.get(nextPlan.characterId), text: `${dayWord(nextPlan.date)}${nextPlan.time ? ` ${nextPlan.time}` : ''} · ${nextPlan.title}` }]
              : undefined,
          }
        : { title: label('date'), line: t('home.widget.planDate') }),
      // The heart is Dating's own door, plan or not: going into the plan's chat left no way to set up
      // a date (owner, 2026-11-05). The plan's friend is one tap away on the bubble.
      onPress: () => router.push('/dating'),
      buttons: planChat
        ? [{ glyph: { ios: 'message', icon: 'chatbubble-outline' }, label: t('characterProfile.chat'), onPress: () => router.push(`/chat/${planChat.id}`) }]
        : undefined,
    },
    sleep: {
      kind: 'sleep',
      label: label('sleep'),
      // Everyone who wakes you, side by side; the next alarm large, the others as rows with their face.
      faces: wakers,
      ...(alarm
        ? {
            figure: hhmm(alarm.hour, alarm.minute),
            // The days it rings, Monday first, as the Clock app shows them: only for a lone repeating alarm.
            days:
              alarm.repeat.length && !laterAlarms.length
                ? [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: weekday(d), on: alarm.repeat.includes(d) }))
                : undefined,
            list: alarmRows.length ? alarmRows : undefined,
            line: waker
              ? t('home.widget.wakeWith', { label: alarm.label || t('home.widget.wakeUp'), name: nameOf(waker) })
              : alarm.label || t('home.widget.wakeUp'),
          }
        : { title: label('sleep'), line: t('home.widget.setWake') }),
      onPress: () => (alarm ? router.push('/alarms') : router.push('/bedtime')),
      buttons: [{ glyph: { ios: 'plus', icon: 'add' }, label: t('home.widget.setWake'), onPress: () => router.push('/alarms/edit') }],
    },
    gifts: {
      kind: 'gifts',
      label: label('gifts'),
      faces: [],
      badge: spinReady ? t('home.widget.oneFree') : undefined,
      title: t('gifts.day', { count: checkIn.day }),
      days: Array.from({ length: 7 }, (_, i) => ({ on: i < daysTaken })),
      line: spinReady ? t('home.widget.readyNow') : giftWaiting ? t('home.waiting') : t('home.widget.tomorrow'),
      onPress: () => router.push('/gifts'),
      pill: spinReady ? { label: t('gifts.spin'), onPress: () => router.push({ pathname: '/gifts', params: { spin: '1' } }) } : undefined,
    },
    store: {
      kind: 'store',
      label: label('store'),
      faces: [],
      figure: String(wallet.shells),
      unit: t('home.widget.shells'),
      line: label('store'),
      // The balance opens where it came from and went (a bank card's history); "+" buys more.
      onPress: () => router.push('/store/ledger'),
      buttons: [{ glyph: { ios: 'plus', icon: 'add' }, label: t('profile.getMore'), onPress: () => router.push('/store/shell?tab=shells') }],
    },
    photos: {
      kind: 'photos',
      label: label('photos'),
      faces: [],
      photo: photoFriend ? (HEROES[photoFriend.id] ?? characterImage(photoFriend)) : undefined,
      title: t('home.modules.photoBooth'),
      line: photo && photoFriend ? t('home.widget.withName', { name: nameOf(photoFriend) }) : t('home.widget.takeOne'),
      onPress: () => (photo ? router.push({ pathname: '/photo/[id]', params: { id: photo.id } }) : router.push('/photo-booth')),
      buttons: [{ glyph: { ios: 'camera', icon: 'camera-outline' }, label: t('home.modules.photoBooth'), onPress: () => router.push('/photo-booth') }],
    },
    radio: {
      kind: 'radio',
      label: label('radio'),
      faces: clipFriend ? [clipFriend] : [],
      title: clip && clipFriend ? clip.title : label('radio'),
      titleLines: 2,
      line: clip && clipFriend ? `${t('home.widget.onAir')} · ${nameOf(clipFriend)} · ${clipLength}` : t('home.widget.tuneIn'),
      onPress: () => router.push('/radio'),
      buttons: clip
        ? [{ glyph: { ios: 'play.fill', icon: 'play' }, label: clip.title, onPress: () => router.push({ pathname: '/radio/[id]', params: { id: clip.id } }) }]
        : undefined,
    },
    board: {
      kind: 'board',
      label: label('board'),
      faces: postFriend ? [postFriend] : [],
      title: label('board'),
      quote: post && postFriend ? (post.replied && post.reply ? post.reply : post.text) : undefined,
      line: postFriend
        ? post?.replied
          ? `${t('home.widget.answered', { name: nameOf(postFriend) })} · ${relativeStamp(post.replyAt)}`
          : `${t('home.widget.noteTo', { name: nameOf(postFriend) })} · ${relativeStamp(post?.createdAt ?? '')}`
        : t('home.widget.pinNote'),
      onPress: () => router.push('/board'),
      buttons: [{ glyph: { ios: 'square.and.pencil', icon: 'create-outline' }, label: t('home.widget.pinNote'), onPress: () => router.push('/board/write') }],
    },
    contacts: {
      kind: 'contacts',
      label: label('contacts'),
      faces: friends.slice(0, 3),
      figure: String(friends.length),
      unit: t('home.widget.friends', { count: friends.length }),
      line: label('contacts'),
      onPress: () => router.push('/contacts'),
      buttons: [{ glyph: { ios: 'person.badge.plus', icon: 'person-add-outline' }, label: t('home.todo.meet'), onPress: () => router.push('/(tabs)/find') }],
    },
    bond: {
      kind: 'bond',
      label: label('bond'),
      faces: bondFriend ? [bondFriend] : [],
      ...(bond && bondFriend
        ? {
            figure: t('home.hero.level', { level: bond.level }),
            progress: levelForIntimacy(bond.intimacy).progress,
            line: t('home.widget.toNext', { name: nameOf(bondFriend), count: toGo }),
            lineLines: 2,
          }
        : { title: label('bond'), line: t('home.todo.meet') }),
      onPress: () => (bondFriend ? router.push(`/character/${bondFriend.id}`) : router.push('/(tabs)/find')),
    },
  };
}

/**
 * One widget card. `preview` draws it inert, for the gallery. Its buttons are siblings of the
 * card's own press area, never inside it: a button in a button breaks on web.
 *
 * Each widget shows what it does by its face, as iOS widgets do (owner, 2026-11-04): a friend to
 * call is a contact card with call and message buttons, the board shows the note itself, the bond
 * a bar filling toward the next level, the shells a balance with "+", the daily spin a dark pill.
 */
export function WidgetView({
  model,
  height = WIDGET_HEIGHT,
  preview,
  onPress,
  onLongPress,
}: {
  model: WidgetModel;
  height?: number;
  preview?: boolean;
  /** Replaces the widget's own tap (edit mode: open the gallery for this slot). */
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  // Photos is `photo`; Bond is the only widget with no module tile.
  const key = WIDGET_MODULE[model.kind] ?? 'bond';
  const tone = moduleColors[key];
  // A picture keeps its scrim and white words; every other widget wears its module's light tint
  // with ink on it (the playful skin, four-tab prototype). The line under a title stays full ink:
  // a faded ink fails contrast on every tint.
  const onPhoto = model.photo != null;
  const ink = onPhoto ? colors.white : colors.text;
  const sub = onPhoto ? SUB : colors.text;
  const tint = moduleTints[key] ?? moduleTints.bond;
  // The board widget is a note pinned up: a little tilt and a strip of tape.
  const pinned = model.kind === 'board' && !onPhoto;
  const buttons = model.buttons ?? [];
  // In edit mode (or the gallery) a tap belongs to the card, so its buttons do nothing.
  const inert = preview || !!onPress;
  const person = model.person;

  const words = (
    <View style={model.pill ? styles.abovePill : undefined}>
      {model.quote ? (
        // The thing itself, whole where it fits: a step smaller before it is cut, never tiny.
        <FitText key={model.quote} text={model.quote} lines={4} sizes={QUOTE_SIZES} style={styles.quote} color={ink} />
      ) : (
        <>
          {model.figure ? (
            <View style={styles.figureLine}>
              <Txt style={[styles.figure, { color: ink }]} lines={1}>
                {model.figure}
              </Txt>
              {model.unit ? (
                <Txt style={[styles.unit, { color: sub }]} lines={1}>
                  {model.unit}
                </Txt>
              ) : null}
            </View>
          ) : null}
          {model.title && model.titleLines && model.titleLines > 1 ? (
            // A plan's or a clip's name, whole where it fits.
            <FitText
              key={model.title}
              text={model.title}
              lines={model.titleLines}
              sizes={model.figure ? SUBTITLE_SIZES : TITLE_SIZES}
              style={model.figure ? styles.subtitle : styles.title}
              color={ink}
            />
          ) : model.title ? (
            <Txt style={[model.figure ? styles.subtitle : styles.title, { color: ink }]} lines={1}>
              {model.title}
            </Txt>
          ) : null}
        </>
      )}
      {model.days ? (
        <View style={styles.days}>
          {model.days.map((d, i) =>
            d.label != null ? (
              <Txt key={i} style={[styles.dayLetter, { color: ink, opacity: d.on ? 1 : 0.45 }]}>
                {d.label}
              </Txt>
            ) : (
              <View key={i} style={[styles.dayDot, d.on && { backgroundColor: ink }]} />
            ),
          )}
        </View>
      ) : null}
      {model.progress != null ? (
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${Math.round(Math.max(0.04, Math.min(1, model.progress)) * 100)}%` }]} />
        </View>
      ) : null}
      {model.pill || !model.line ? null : (
        <Txt variant="caption" color={sub} lines={model.lineLines ?? 1}>
          {model.line}
        </Txt>
      )}
      {model.list && !model.pill
        ? // What comes after, as list rows under the first (a forecast's next days), each with its face.
          model.list.map((row, i) => (
            <View key={i} style={styles.afterRow}>
              {row.face ? (
                <CharacterAvatar character={row.face} size={18} />
              ) : (
                <View style={styles.afterDotBox}>
                  <View style={[styles.afterDot, { backgroundColor: ink }]} />
                </View>
              )}
              <Txt variant="caption" color={sub} lines={1} style={styles.flexText}>
                {row.text}
              </Txt>
            </View>
          ))
        : null}
    </View>
  );

  const body = person ? (
    // A contact card: the face in the middle, the name, a word on it; the buttons sit below.
    <View style={styles.person}>
      <View>
        <CharacterAvatar character={person} size={46} ring ringColor={colors.white} />
        <View style={styles.callDot}>
          <Ionicons name="call" size={10} color={colors.white} />
        </View>
      </View>
      <Txt style={[styles.personName, { color: ink }]} lines={1}>
        {model.title}
      </Txt>
      <Txt style={[styles.personLine, { color: sub }]} lines={1}>
        {model.line}
      </Txt>
    </View>
  ) : (
    <>
      <View style={styles.top}>
        {onPhoto ? <View /> : <ModuleLine name={key} size={28} color={ink} />}
        <View style={[styles.faces, buttons.length > 0 && { marginRight: buttons.length * (BUTTON + 8) }]}>
          {model.faces.slice(0, 3).map((c, i) => (
            <CharacterAvatar key={c.id} character={c} size={28} ring ringColor={colors.white} style={i > 0 && styles.overlap} />
          ))}
          {model.badge ? (
            <View style={[styles.badge, !onPhoto && styles.badgeInk]}>
              <Txt style={[styles.badgeText, { color: onPhoto ? tone[1] : colors.textOnInk }]}>{model.badge}</Txt>
            </View>
          ) : null}
        </View>
      </View>
      {words}
    </>
  );

  return (
    <View style={[styles.card, !onPhoto && { backgroundColor: tint }, pinned && styles.pinned, { height }]}>
      {pinned ? <View style={styles.tape} pointerEvents="none" /> : null}
      {onPhoto ? (
        <>
          <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
          <Image source={model.photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <LinearGradient colors={PHOTO_SCRIM} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      {preview ? (
        <View style={styles.fill}>{body}</View>
      ) : (
        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={model.label}
          onPress={onPress ?? model.onPress}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={styles.fill}>
          {body}
        </PressableScale>
      )}
      {buttons.length ? (
        <View style={person ? styles.buttonsFoot : styles.buttonsTop} pointerEvents={inert ? 'none' : 'box-none'}>
          {buttons.map((b) => (
            <PressableScale
              key={b.label}
              scaleTo={0.88}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              onPress={b.onPress}
              style={[styles.button, onPhoto && styles.buttonOnPhoto]}>
              <SFIcon ios={b.glyph.ios} icon={b.glyph.icon} size={18} color={ink} weight="medium" />
            </PressableScale>
          ))}
        </View>
      ) : null}
      {model.pill ? (
        <View style={styles.pillWrap} pointerEvents={inert ? 'none' : 'box-none'}>
          <PressableScale scaleTo={0.94} accessibilityRole="button" accessibilityLabel={model.pill.label} onPress={model.pill.onPress} style={styles.pill}>
            <Txt style={styles.pillText} lines={1}>
              {model.pill.label}
            </Txt>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Words that should show whole: at their size when they fit in `lines`, else a step smaller, down to
 * the last of `sizes`, then cut. A hidden twin with no line limit counts the lines. Not
 * `adjustsFontSizeToFit`: Android ignores its `minimumFontScale`, and a diary page came out
 * microscopic on the A51 (2026-11-05), while plain cutting lost the end of a short note.
 */
function FitText({
  text,
  lines,
  sizes,
  style,
  color,
}: {
  text: string;
  lines: number;
  sizes: readonly number[];
  style: StyleProp<TextStyle>;
  color: string;
}) {
  // New words start again from the largest size: callers key this by its text.
  const [step, setStep] = useState(0);
  const last = sizes.length - 1;
  const size = sizes[Math.min(step, last)];
  const fit = { fontSize: size, lineHeight: Math.round(size * 1.27) };
  return (
    <View>
      <Txt style={[style, fit, { color }]} lines={lines}>
        {text}
      </Txt>
      {step < last ? (
        <Txt
          style={[style, fit, styles.twin]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onTextLayout={(e) => {
            // Only from the size it measured: a late layout of an older size moves nothing.
            if (e.nativeEvent.lines.length > lines) setStep((s) => (s === step ? Math.min(s + 1, last) : s));
          }}>
          {text}
        </Txt>
      ) : null}
    </View>
  );
}

/** A widget button's size: an iOS glass circle the thumb finds (44 pt with its hit slop). */
const BUTTON = 36;
const PHOTO_SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)'] as const;
/** The line under a widget's title: white, a step quieter. */
const SUB = 'rgba(255,255,255,0.85)';

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden' },
  // Flat colour, no elevation: Android would lift the card over the "−" badge and its neighbours.
  pinned: { transform: [{ rotate: '-1.6deg' }] },
  tape: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 54,
    height: 12,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)',
    zIndex: 1,
  },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, padding: 14, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  faces: { flexDirection: 'row', alignItems: 'center' },
  overlap: { marginLeft: -8 },
  badge: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  badgeInk: { backgroundColor: colors.text },
  badgeText: { fontSize: 12, fontWeight: '700' },
  // A word that does not fit beside its number goes under it; the number is never cut ("… new pages"
  // in the gallery's narrow card, Russian, A51 2026-11-05).
  figureLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6 },
  // The number is the widget's headline (a clock's time, a balance): large, tight, heavy.
  figure: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  unit: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  title: { fontFamily: fonts.playful, fontSize: 17, lineHeight: 22 },
  // Under a number: what it is for (a plan's name), up to two lines.
  subtitle: { fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2 },
  days: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 2, paddingRight: 4 },
  dayLetter: { width: 16, textAlign: 'center', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  dayDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)' },
  afterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  afterDotBox: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  afterDot: { width: 5, height: 5, borderRadius: 2.5, opacity: 0.5 },
  flexText: { flexShrink: 1 },
  // The note itself, in its own words: the widget is the note.
  quote: { fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2, marginBottom: 4 },
  // FitText's line counter: laid out like the words, never seen.
  twin: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  // Toward the next level: an ink bar in a soft track, as a battery widget fills (owner: the milk
  // stays, no colour added inside).
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.text },
  person: { flex: 1, alignItems: 'center', paddingTop: 0 },
  personName: { marginTop: 6, fontFamily: fonts.playful, fontSize: 16, lineHeight: 20 },
  personLine: { fontSize: 12, lineHeight: 15, fontWeight: '500' },
  // A soft white circle on the tint (the prototype's buttons), a faint one on a deep tint.
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)',
  },
  // Clear glass on a picture (the clear-glass rule), never a white disc.
  buttonOnPhoto: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.5)' },
  buttonsTop: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  buttonsFoot: { position: 'absolute', left: 0, right: 0, bottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 14 },
  abovePill: { marginBottom: 44 },
  pillWrap: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  // The one main thing, as a dark pill (the Payme and iOS wallet buttons).
  pill: { height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  pillText: { fontSize: 15, fontWeight: '700', color: colors.textOnInk },
  callDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: systemColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

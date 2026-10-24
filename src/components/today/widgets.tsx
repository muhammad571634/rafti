import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { featuredFriend } from '@/components/today-hero';
import { CharacterAvatar, MODULE_GLYPH, PressableScale, SFIcon, Txt, type ModuleKey } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { useDayKey } from '@/hooks/use-day-key';
import { nextAlarmAt } from '@/lib/alarms';
import { relativeStamp, shortName } from '@/lib/format';
import { planStart } from '@/lib/schedule';
import { FREE_SPINS_PER_DAY } from '@/mock';
import { checkInStatus, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, moduleColors, systemColors } from '@/theme';
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

export const WIDGET_HEIGHT = 158;

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
  line: string;
  photo?: string | number;
  onPress: () => void;
  /** A face in the corner that does its own thing (Calls: ring them). */
  action?: { character: Character; label: string; onPress: () => void };
}

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

  // Diary
  const fresh = diaryPages.filter((p) => p.date === today && !pagesRead.includes(p.id));
  const writers = [...new Set(fresh.map((p) => p.characterId))].map((id) => byId.get(id)).filter((c): c is Character => !!c);
  const lastPage = fresh.length
    ? undefined
    : [...diaryPages].sort((a, b) => Date.parse(b.writtenAt) - Date.parse(a.writtenAt)).find((p) => byId.has(p.characterId));
  const lastWriter = lastPage ? byId.get(lastPage.characterId) : undefined;
  const openPage = fresh[0] ?? lastPage;

  // Date: the next plan on any day
  const plan = schedules
    .filter((p) => (p.date === today ? !p.time || planStart(p).getTime() > now : p.date > today))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0];
  const planFriend = plan ? byId.get(plan.characterId) : undefined;
  const planChat = plan ? conversations.find((c) => c.characterId === plan.characterId) : undefined;
  const planDay =
    plan && plan.date !== today
      ? new Date(`${plan.date}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
      : undefined;

  // Sleep
  const alarm = alarms
    .filter((a) => a.enabled)
    .map((a) => ({ a, at: nextAlarmAt(a, new Date(now)).getTime() }))
    .sort((x, y) => x.at - y.at)[0]?.a;
  const waker = alarm?.characterId ? byId.get(alarm.characterId) : undefined;

  // Gifts
  const spinReady = daily.spinDay !== today || daily.spinsUsed < FREE_SPINS_PER_DAY;
  const giftWaiting = !checkInStatus(daily, today).claimed;

  // Photos, Radio, Board
  const photo = newest(photos);
  const photoFriend = photo ? byId.get(photo.characterId) : hero?.character;
  const clip = newest(radioClips);
  const clipFriend = clip ? byId.get(clip.characterId) : undefined;
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
      title: caller ? t('home.widget.call', { name: nameOf(caller) }) : label('calls'),
      line: callMinutes > 0 ? t('home.widget.minutesLeft', { count: callMinutes }) : t('home.widget.hearVoice'),
      onPress: () => router.push('/call-history'),
      action: caller
        ? {
            character: caller,
            label: t('home.widget.call', { name: nameOf(caller) }),
            onPress: () => router.push(`/call/${caller.id}`),
          }
        : undefined,
    },
    diary: {
      kind: 'diary',
      label: label('diary'),
      faces: lastWriter ? [lastWriter] : writers.slice(0, 2),
      ...(fresh.length
        ? { figure: String(fresh.length), unit: t('home.widget.newPages', { count: fresh.length }), line: label('diary') }
        : lastWriter && lastPage
          ? { title: t('home.widget.pageOf', { name: nameOf(lastWriter) }), line: relativeStamp(lastPage.writtenAt) }
          : { title: label('diary'), line: t('home.widget.writeToday') }),
      onPress: () =>
        openPage
          ? router.push({ pathname: '/diary/page/[characterId]', params: { characterId: openPage.characterId, date: openPage.date } })
          : router.push('/diary'),
    },
    date: {
      kind: 'date',
      label: label('date'),
      faces: planFriend ? [planFriend] : [],
      ...(plan
        ? { figure: plan.time ?? t('home.today'), line: planDay ? `${planDay} · ${plan.title}` : plan.title }
        : { title: label('date'), line: t('home.widget.planDate') }),
      onPress: () => (planChat ? router.push(`/chat/${planChat.id}`) : router.push('/dating')),
    },
    sleep: {
      kind: 'sleep',
      label: label('sleep'),
      faces: [],
      ...(alarm
        ? {
            figure: hhmm(alarm.hour, alarm.minute),
            line: waker
              ? t('home.widget.wakeWith', { label: alarm.label || t('home.widget.wakeUp'), name: nameOf(waker) })
              : alarm.label || t('home.widget.wakeUp'),
          }
        : { title: label('sleep'), line: t('home.widget.setWake') }),
      onPress: () => router.push('/bedtime'),
    },
    gifts: {
      kind: 'gifts',
      label: label('gifts'),
      faces: [],
      badge: spinReady ? t('home.widget.oneFree') : undefined,
      title: spinReady ? t('home.todo.spin') : giftWaiting ? t('home.widget.dailyGift') : label('gifts'),
      line: spinReady ? t('home.widget.readyNow') : giftWaiting ? t('home.waiting') : t('home.widget.tomorrow'),
      onPress: () => router.push('/gifts'),
    },
    store: {
      kind: 'store',
      label: label('store'),
      faces: [],
      figure: String(wallet.shells),
      unit: t('home.widget.shells'),
      line: label('store'),
      onPress: () => router.push('/store/shell'),
    },
    photos: {
      kind: 'photos',
      label: label('photos'),
      faces: [],
      photo: photoFriend ? (HEROES[photoFriend.id] ?? characterImage(photoFriend)) : undefined,
      title: t('home.modules.photoBooth'),
      line: photo && photoFriend ? t('home.widget.withName', { name: nameOf(photoFriend) }) : t('home.widget.takeOne'),
      onPress: () => router.push('/photo-booth'),
    },
    radio: {
      kind: 'radio',
      label: label('radio'),
      faces: clipFriend ? [clipFriend] : [],
      title: clipFriend ? t('home.widget.onAir') : label('radio'),
      line: clipFriend ? `${nameOf(clipFriend)} · ${label('radio')}` : t('home.widget.tuneIn'),
      onPress: () => router.push('/radio'),
    },
    board: {
      kind: 'board',
      label: label('board'),
      faces: postFriend ? [postFriend] : [],
      title: label('board'),
      line: postFriend
        ? post?.replied
          ? t('home.widget.answered', { name: nameOf(postFriend) })
          : t('home.widget.noteTo', { name: nameOf(postFriend) })
        : t('home.widget.pinNote'),
      onPress: () => router.push('/board'),
    },
    contacts: {
      kind: 'contacts',
      label: label('contacts'),
      faces: friends.slice(0, 2),
      figure: String(friends.length),
      unit: t('home.widget.friends', { count: friends.length }),
      line: label('contacts'),
      onPress: () => router.push('/contacts'),
    },
    bond: {
      kind: 'bond',
      label: label('bond'),
      faces: bondFriend ? [bondFriend] : [],
      ...(bond && bondFriend
        ? {
            figure: t('home.hero.level', { level: bond.level }),
            line: t('home.widget.toNext', { name: nameOf(bondFriend), count: toGo }),
          }
        : { title: label('bond'), line: t('home.todo.meet') }),
      onPress: () => (bondFriend ? router.push(`/character/${bondFriend.id}`) : router.push('/(tabs)/find')),
    },
  };
}

/**
 * One widget card. `preview` draws it inert, for the gallery. The face button (Calls) is a
 * sibling of the card's own press area, never inside it: a button in a button breaks on web.
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
  const glyph = MODULE_GLYPH[key];

  const body = (
    <>
      <View style={styles.top}>
        {model.photo == null ? <SFIcon ios={glyph.ios} icon={glyph.icon} size={30} color={colors.white} /> : <View />}
        <View style={styles.faces}>
          {model.faces.slice(0, 2).map((c, i) => (
            <CharacterAvatar key={c.id} character={c} size={28} ring ringColor={colors.white} style={i > 0 && styles.overlap} />
          ))}
          {model.badge ? (
            <View style={styles.badge}>
              <Txt style={[styles.badgeText, { color: tone[1] }]}>{model.badge}</Txt>
            </View>
          ) : null}
        </View>
      </View>
      <View>
        {model.figure ? (
          <View style={styles.figureLine}>
            <Txt style={styles.figure} lines={1}>
              {model.figure}
            </Txt>
            {model.unit ? <Txt style={styles.unit}>{model.unit}</Txt> : null}
          </View>
        ) : (
          <Txt style={styles.title} lines={1}>
            {model.title}
          </Txt>
        )}
        <Txt variant="caption" color={SUB} lines={1}>
          {model.line}
        </Txt>
      </View>
    </>
  );

  return (
    <View style={[styles.card, { height }]}>
      <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      {model.photo != null ? (
        <>
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
      {model.action && preview ? (
        <View style={styles.action}>
          <CharacterAvatar character={model.action.character} size={34} />
          <View style={styles.callDot}>
            <Ionicons name="call" size={10} color={colors.white} />
          </View>
        </View>
      ) : model.action ? (
        <PressableScale
          scaleTo={0.9}
          disabled={!!onPress}
          accessibilityRole="button"
          accessibilityLabel={model.action.label}
          onPress={model.action.onPress}
          style={styles.action}>
          <CharacterAvatar character={model.action.character} size={34} />
          <View style={styles.callDot}>
            <Ionicons name="call" size={10} color={colors.white} />
          </View>
        </PressableScale>
      ) : null}
    </View>
  );
}

const PHOTO_SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)'] as const;
/** The line under a widget's title: white, a step quieter. */
const SUB = 'rgba(255,255,255,0.85)';

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden' },
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
  badgeText: { fontSize: 12, fontWeight: '700' },
  figureLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  figure: { flexShrink: 1, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, color: colors.white },
  unit: { fontSize: 15, fontWeight: '600', color: colors.white },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: colors.white },
  action: { position: 'absolute', top: 14, right: 14 },
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

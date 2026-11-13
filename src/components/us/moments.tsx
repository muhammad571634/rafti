import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient as Gradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { moduleTile, PressableScale, SFIcon, Txt } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { phrase } from '@/i18n';
import { localCharacter, localized } from '@/i18n/content';
import { clockTime, shortName } from '@/lib/format';
import { buildTimeline, momentTarget, type TimelineItem } from '@/lib/moment-groups';
import { dateFromKey, dayKey } from '@/mock';
import { DATE_PLACES } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, isDark, systemColors, systemGround } from '@/theme';
import type { Character, MomentKind, Relationship } from '@/types';

const THUMB = 38;
/** The cards' side margin, the same as Us' other cards. */
const SIDE = 14;

/** Each kind's colour (a card's wash, its italic and its ring), with the glyph its module wears elsewhere. */
const KIND_TILE: Record<MomentKind, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }> = {
  met: { ios: 'sparkles', icon: 'sparkles', fill: systemColors.purple },
  levelUp: moduleTile('bond'),
  call: moduleTile('calls'),
  diary: moduleTile('diary'),
  secretNote: moduleTile('note'),
  dating: moduleTile('date'),
  photo: moduleTile('photo'),
  plan: { ios: 'calendar', icon: 'calendar', fill: systemColors.red },
  board: moduleTile('board'),
  quiz: { ios: 'questionmark', icon: 'help', fill: systemColors.indigo },
  arc: { ios: 'key.fill', icon: 'key', fill: systemColors.pink },
};

/*
 "Our moments" (owner, 2026-11-09; Ink cards 2026-11-13): the bond's story as cards, one per moment
 (`MomentCard`): Us shows the newest three (`OurMoments`), "Show N more" opens the whole story
 (`/moments/[characterId]`) with its filters, drawn a screenful at a time. A card shows what it was and
 their words or the result (`moment-groups.ts` ties it to its record) and opens it.
*/

/** One friend's whole timeline, newest first; `today` re-runs it on a new day, so a plan that has come moves in. */
export function useMomentTimeline(characterId: string, today: string): TimelineItem[] {
  const moments = useAppStore((s) => s.moments);
  const schedules = useAppStore((s) => s.schedules);
  const notes = useAppStore((s) => s.notes);
  const boardPosts = useAppStore((s) => s.boardPosts);
  const dates = useAppStore((s) => s.dates);
  const diary = useAppStore((s) => s.diary);
  const calls = useAppStore((s) => s.calls);
  const photos = useAppStore((s) => s.photos);
  return useMemo(
    () =>
      buildTimeline({
        moments: moments.filter((m) => m.characterId === characterId),
        plans: schedules.filter((p) => p.characterId === characterId),
        records: { notes, boardPosts, dates, diary, calls, photos },
        filter: 'all',
        now: new Date(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moments, schedules, notes, boardPosts, dates, diary, calls, photos, characterId, today],
  );
}

/** A row's words: what it was, their words or the result, the hearts a date won, a photo's picture. */
export interface MomentContent {
  title: string;
  sub?: string;
  hearts?: string;
  thumb?: ReactNode;
}

/** How each row reads, in the screen language, with the friend's short name for their words. */
export function useMomentContent(character: Character | undefined, relationship: Relationship | undefined): (item: TimelineItem) => MomentContent {
  const { t } = useTranslation();
  const name = character ? shortName(displayName(character, relationship)) : '';
  return useCallback(
    (item: TimelineItem): MomentContent => {
      const m = item.moment;
      const said = (text: string) => t('us.said', { name, text });
      const level = m?.params?.level;
      switch (item.kind) {
        case 'secretNote':
          return { title: item.note?.prompt || t('secretNote.title'), sub: item.note?.theirNote ? said(item.note.theirNote) : undefined };
        case 'board':
          return { title: item.post?.text || t('us.publishKind.board'), sub: item.post?.reply ? said(item.post.reply) : undefined };
        case 'diary':
          return { title: item.entry?.title || t('us.publishKind.diary'), sub: t('diary.replyTitle', { name }) };
        case 'dating': {
          const date = item.date;
          // A map place by its name in the screen language, as "Our dates" captions it; the user's own date by its title.
          const place = date ? localized('datePlaces', DATE_PLACES).find((p) => p.id === date.placeId) : undefined;
          const title = place ? t(`dating.places.${place.titleKey}`) : (date?.title ?? (m?.params?.title ? phrase(String(m.params.title)) : t('home.short.dating')));
          return { title, ...(date ? { hearts: `${date.hearts}/${date.maxHearts}`, sub: t(`date.ending.${date.ending}`) } : {}) };
        }
        case 'photo': {
          const photo = item.photo;
          return {
            title: t('photoBooth.title'),
            sub: photo ? t(`photoBooth.styleNames.${photo.style}`) : undefined,
            thumb: photo && character ? <BoothPicture photo={photo} character={character} width={fitWidth(photo.style, { width: THUMB, height: THUMB })} /> : undefined,
          };
        }
        case 'call': {
          const seconds = item.call?.durationSec ?? secondsOf(m?.params?.duration);
          return { title: t('us.momentTitle.call'), sub: seconds ? t('callHistory.min', { count: Math.max(1, Math.round(seconds / 60)) }) : undefined };
        }
        case 'quiz':
          return { title: m?.params?.title ? phrase(String(m.params.title)) : t('us.momentTitle.quiz'), sub: m?.params?.score ? String(m.params.score) : undefined };
        case 'plan':
          return { title: item.plan?.title ?? '' };
        case 'met':
          return { title: t('us.momentText.met') };
        case 'levelUp':
          return { title: m?.params?.title ? phrase(String(m.params.title)) : t('us.level', { level: level ?? '' }), sub: t('us.level', { level: level ?? '' }) };
        case 'arc': {
          // A chapter's title is the character's own text, in the screen language.
          const beat = character ? localCharacter(character).arc?.beats.find((b) => b.atLevel === level) : undefined;
          const title = beat?.title ?? (m?.params?.title ? phrase(String(m.params.title)) : '');
          return { title, sub: t('us.momentTitle.arc') };
        }
      }
    },
    [t, name, character],
  );
}

/** What a tap does: the place it happened (`momentTarget`), or for a plan its day (`onOpenDay`). */
export function useOpenMoment(onOpenDay: (day: string) => void): (item: TimelineItem) => (() => void) | undefined {
  const router = useRouter();
  return useCallback(
    (item: TimelineItem) => {
      const plan = item.plan;
      if (item.kind === 'plan' && plan) return () => onOpenDay(plan.date);
      const target = momentTarget(item);
      return target ? () => router.push(target as Href) : undefined;
    },
    [router, onOpenDay],
  );
}

/**
 * The moments on Us: the newest three, so the screen stops; "Show N more" under them opens the
 * whole story with its filters. A plan opens its day in the calendar above (`onOpenDay`).
 */
export function OurMoments({
  character,
  relationship,
  today,
  onOpenDay,
}: {
  character: Character;
  relationship: Relationship;
  /** Today's day key; a new day re-renders the headers. */
  today: string;
  onOpenDay: (day: string) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const everything = useMomentTimeline(character.id, today);
  // The newest three only, so Us stays short (owner, 2026-11-13; the canvas shows three); the rest
  // live in the whole story with its filters, one tap away.
  const recent = useMemo(() => everything.slice(0, SHOWN), [everything]);
  const content = useMomentContent(character, relationship);
  const open = useOpenMoment(onOpenDay);
  const more = everything.length - recent.length;
  const face = characterImage(character);

  return (
    <View>
      <Txt style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {t('us.moments')}
      </Txt>
      {recent.length === 0 ? (
        <Txt style={styles.hint}>{t('us.noMoments')}</Txt>
      ) : (
        <View style={styles.cards}>
          {recent.map((item) => (
            <MomentCard key={item.key} item={item} today={today} content={content(item)} face={face} onPress={open(item)} />
          ))}
        </View>
      )}
      {/* The rest of the story: the whole timeline with its filters (what "See all" opened). */}
      {more > 0 ? (
        <PressableScale
          scaleTo={0.96}
          accessibilityRole="button"
          onPress={() => router.push(`/moments/${encodeURIComponent(character.id)}` as Href)}
          style={styles.more}>
          <Txt style={styles.moreText} maxFontSizeMultiplier={1.3}>
            {t('us.showMore', { count: more })}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

/**
 * One moment as the Ink canvas draws it (owner, 2026-11-13, frame "Our moments"): a dark card washed
 * with the kind's colour from the left, the day on top, then what it was in serif with the particular
 * part in italic in that colour ("A date: walk in the rain"), their words under it when there are
 * any, and the friend's face in a ring of the same colour (a photo's picture for a photo).
 */
export function MomentCard({ item, today, content, face, onPress }: { item: TimelineItem; today: string; content: MomentContent; face: string | number | undefined; onPress?: () => void }) {
  const { t, i18n } = useTranslation();
  const hue = KIND_TILE[item.kind].fill;
  const { label, highlight, sub } = cardParts(item, content, t);
  const day = dayKey(item.at) === today ? t('common.today') : cardDay(item.at, today, i18n.language, t);
  const time = item.kind === 'plan' && !item.plan?.time ? undefined : clockTime(item.at);
  const when = time ? `${day} · ${time}` : day;
  return (
    <PressableScale
      scaleTo={0.98}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[when, highlight ? `${label}: ${highlight}` : label, content.hearts, sub].filter(Boolean).join(', ')}
      style={styles.card}>
      <Gradient colors={[`${hue}4D`, `${hue}00`]} start={{ x: 0, y: 0.3 }} end={{ x: 0.75, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <View style={styles.cardBody}>
        <Txt style={styles.cardWhen} lines={1} maxFontSizeMultiplier={1.3}>
          {when}
        </Txt>
        <View style={styles.cardBottom}>
          <View style={styles.grow}>
            <Text style={styles.cardTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
              {label}
              {highlight ? (
                <>
                  {': '}
                  <Text style={[styles.cardHighlight, { color: isDark ? hue : deeper(hue) }]}>{highlight}</Text>
                </>
              ) : null}
            </Text>
            {content.hearts ? (
              <View style={styles.heartsLine}>
                <SFIcon ios="heart.fill" icon="heart" size={12} color={systemColors.pink} />
                <Txt style={styles.hearts}>{content.hearts}</Txt>
                {sub ? (
                  <Txt style={[styles.cardSub, styles.shrink]} lines={1}>
                    {`· ${sub}`}
                  </Txt>
                ) : null}
              </View>
            ) : sub ? (
              <Txt style={styles.cardSub} lines={1}>
                {sub}
              </Txt>
            ) : null}
          </View>
          <View style={[styles.ring, { borderColor: hue }]}>
            <View style={styles.ringInner}>
              {content.thumb ? content.thumb : face != null ? <Image source={typeof face === 'string' ? { uri: face } : face} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * The kind's colour made dark enough to read as text on a light card (yellow on white failed on the
 * A51 by day; HIG Color: enough contrast for text). At night the bright colour reads as it is.
 */
function deeper(hex: string, by = 0.42): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const dim = (c: number) => Math.round(c * (1 - by));
  return `#${((1 << 24) | (dim((n >> 16) & 255) << 16) | (dim((n >> 8) & 255) << 8) | dim(n & 255)).toString(16).slice(1)}`;
}

/** A card's two parts: what it was ("A date") and the particular ("walk in the rain"), plus their words. */
function cardParts(item: TimelineItem, c: MomentContent, t: (key: string, o?: Record<string, unknown>) => string): { label: string; highlight?: string; sub?: string } {
  switch (item.kind) {
    case 'call':
    case 'photo':
      return { label: c.title, highlight: c.sub };
    case 'levelUp':
      return { label: c.sub ?? '', highlight: c.title };
    case 'met':
      return { label: c.title };
    case 'arc':
      return { label: t('us.momentTitle.arc'), highlight: c.title };
    case 'secretNote':
      return { label: t('secretNote.title'), highlight: c.title, sub: c.sub };
    case 'board':
      return { label: t('us.publishKind.board'), highlight: c.title, sub: c.sub };
    case 'diary':
      return { label: t('us.publishKind.diary'), highlight: c.title, sub: c.sub };
    case 'dating':
      return { label: t('home.short.dating'), highlight: c.title, sub: c.sub };
    case 'quiz':
      return { label: t('us.momentTitle.quiz'), highlight: c.title, sub: c.sub };
    case 'plan':
      return { label: t('us.publishKind.plan'), highlight: c.title };
  }
}

/** "Yesterday", else "Sat, 8 Nov" (with the year once it is another year), as the canvas dates its cards. */
function cardDay(at: string, today: string, locale: string, t: (key: string) => string): string {
  const date = new Date(at);
  const ago = Math.round((dateFromKey(today).getTime() - dateFromKey(dayKey(at)).getTime()) / 86_400_000);
  if (ago === 1) return t('common.yesterday');
  const sameYear = date.getFullYear() === dateFromKey(today).getFullYear();
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "12:08" (a call moment saved before its record was linked) as seconds. */
function secondsOf(duration: string | number | undefined): number | undefined {
  if (typeof duration !== 'string') return undefined;
  const parts = duration.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

const FACE = 40;
/** Moments shown on Us before "Show N more". */
const SHOWN = 3;

const styles = StyleSheet.create({
  title: { marginTop: 28, marginHorizontal: 20, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: systemGround.label },
  hint: { marginTop: 8, marginHorizontal: 20, fontSize: 15, color: colors.textSecondary },
  // The canvas's glow cards.
  cards: { marginTop: 12, marginHorizontal: SIDE, gap: 12 },
  card: {
    minHeight: 104,
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: systemGround.card,
    ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.06)' } : null),
  },
  cardBody: { flex: 1, justifyContent: 'space-between', gap: 14, paddingTop: 14, paddingBottom: 16, paddingHorizontal: 16 },
  cardWhen: { fontSize: 13, lineHeight: 17, color: systemGround.secondaryLabel },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 24, letterSpacing: -0.2, color: systemGround.label },
  cardHighlight: { fontFamily: fonts.serifItalic },
  cardSub: { marginTop: 3, fontSize: 13.5, lineHeight: 18, color: systemGround.secondaryLabel },
  ring: { width: FACE + 6, height: FACE + 6, borderRadius: (FACE + 6) / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: FACE, height: FACE, borderRadius: FACE / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  more: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, marginTop: 6, justifyContent: 'center' },
  moreText: { fontSize: 15, color: systemGround.secondaryLabel },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  heartsLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hearts: { fontSize: 13.5, lineHeight: 18, fontWeight: '700', color: systemColors.pink, fontVariant: ['tabular-nums'] },
  shrink: { flexShrink: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as Gradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InkText } from '@/components/ink';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { moduleTile, PressableScale, SFIcon } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { phrase } from '@/i18n';
import { localCharacter, localized } from '@/i18n/content';
import { clockTime, shortName } from '@/lib/format';
import { buildTimeline, isMilestone, momentTarget, type TimelineItem } from '@/lib/moment-groups';
import { dateFromKey, dayKey } from '@/mock';
import { DATE_PLACES } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { isDark, systemColors } from '@/theme';
import { ink, inkGutter } from '@/theme/ink';
import type { Character, MomentKind, Relationship } from '@/types';

const THUMB = 44;
/** The cards' side margin, aligned to the Ink 20 pt gutter on Us. */
const SIDE = inkGutter;
/** Moments shown on Us before "See all". */
const SHOWN = 3;

/** Each kind's colour (a card's wash and kind label), matching its module elsewhere. */
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
          return { title: item.entry?.title || t('us.publishKind.diary'), sub: t('diary.replyTitle', { name, context: character?.gender }) };
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
 * The moments on Us (approved Ink+ prototype): serif heading with a quiet "See all ›" link on the
 * right, followed by the newest three editorial glow cards. A plan opens its day in the calendar above.
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
  const recent = useMemo(() => everything.slice(0, SHOWN), [everything]);
  const content = useMomentContent(character, relationship);
  const open = useOpenMoment(onOpenDay);
  const face = characterImage(character);

  return (
    <View>
      <View style={styles.head}>
        <InkText variant="card" accessibilityRole="header" style={styles.grow}>
          {t('us.moments')}
        </InkText>
        {everything.length > 0 ? (
          <PressableScale
            scaleTo={0.95}
            hitSlop={8}
            accessibilityRole="button"
            onPress={() => router.push(`/moments/${encodeURIComponent(character.id)}` as Href)}
            style={styles.seeAll}>
            <InkText variant="footnoteStrong" color={ink.text2} lines={1}>
              {t('common.seeAll')}
            </InkText>
            <Ionicons name="chevron-forward" size={14} color={ink.text3} />
          </PressableScale>
        ) : null}
      </View>
      {recent.length === 0 ? (
        <InkText variant="sub" style={styles.hint}>
          {t('us.noMoments')}
        </InkText>
      ) : (
        <View style={styles.cards}>
          {recent.map((item) => (
            <MomentCard key={item.key} item={item} today={today} content={content(item)} face={face} calm highlightMilestone onPress={open(item)} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * One moment card: on Us (`calm` = true), a neutral Ink card with a 36 pt Apple tinted icon badge
 * and no rainbow wash; on `/moments/[characterId]` (`calm` = false), preserves its diagonal glow
 * wash untouched.
 */
export function MomentCard({
  item,
  today,
  content,
  calm = false,
  highlightMilestone = false,
  onPress,
}: {
  item: TimelineItem;
  today: string;
  content: MomentContent;
  /** Kept in props for backward compatibility with `/moments/[characterId]`. */
  face?: string | number;
  /** Neutral Ink card with a leading tinted icon tile (used on Us v3). */
  calm?: boolean;
  /** Milestones wear a soft hue-tinted rim and serif headline. */
  highlightMilestone?: boolean;
  onPress?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const tile = KIND_TILE[item.kind];
  const hue = tile.fill;
  const labelHue = isDark ? hue : deeper(hue);
  const milestone = highlightMilestone && isMilestone(item.kind);
  const { kindLabel, headline, sub } = cardParts(item, content, t);
  const day = dayKey(item.at) === today ? t('common.today') : cardDay(item.at, today, i18n.language, t);
  const time = item.kind === 'plan' && !item.plan?.time ? undefined : clockTime(item.at);
  const when = time ? `${day} · ${time}` : day;

  return (
    <PressableScale
      scaleTo={0.98}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[kindLabel, when, headline, content.hearts, sub].filter(Boolean).join(', ')}
      style={[styles.card, milestone && { borderColor: `${hue}55` }]}>
      {!calm ? <Gradient colors={[`${hue}33`, `${hue}00`]} start={{ x: 0, y: 0 }} end={{ x: 0.65, y: 0.85 }} style={StyleSheet.absoluteFill} /> : null}
      <View style={[styles.cardBody, calm && styles.calmRow]}>
        {calm ? (
          <View style={[styles.kindBadge, { backgroundColor: `${hue}24`, borderColor: `${hue}50` }]}>
            <SFIcon ios={tile.ios} icon={tile.icon} size={17} color={labelHue} />
          </View>
        ) : null}
        <View style={styles.calmMain}>
          <View style={styles.metaRow}>
            <InkText variant="caption" color={labelHue} lines={1} style={styles.kindLabel}>
              {kindLabel}
            </InkText>
            <InkText variant="footnote" color={ink.text3} lines={1} style={styles.tabular}>
              {when}
            </InkText>
          </View>

          <View style={styles.contentRow}>
            <View style={styles.grow}>
              <InkText variant={milestone ? 'cardSmall' : 'bodyStrong'} lines={2}>
                {headline}
              </InkText>
              {content.hearts ? (
                <View style={styles.heartsLine}>
                  <SFIcon ios="heart.fill" icon="heart" size={12} color={systemColors.pink} />
                  <InkText variant="caption" color={systemColors.pink} style={styles.tabular}>
                    {content.hearts}
                  </InkText>
                  {sub ? (
                    <InkText variant="quote" lines={1} style={styles.shrink}>
                      {`· ${sub}`}
                    </InkText>
                  ) : null}
                </View>
              ) : sub ? (
                <InkText variant="quote" lines={2} style={styles.quote}>
                  {sub}
                </InkText>
              ) : null}
            </View>
            {content.thumb ? <View style={styles.thumb}>{content.thumb}</View> : null}
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * The kind's colour made dark enough to read as text on a light card; kept as fallback if light
 * mode ever returns.
 */
function deeper(hex: string, by = 0.42): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const dim = (c: number) => Math.round(c * (1 - by));
  return `#${((1 << 24) | (dim((n >> 16) & 255) << 16) | (dim((n >> 8) & 255) << 8) | dim(n & 255)).toString(16).slice(1)}`;
}

/** A card's three parts: coloured kind label on top, headline in the middle, italic quote/detail below. */
function cardParts(
  item: TimelineItem,
  c: MomentContent,
  t: (key: string, o?: Record<string, unknown>) => string,
): { kindLabel: string; headline: string; sub?: string } {
  switch (item.kind) {
    case 'call':
      return { kindLabel: t('us.momentTitle.call'), headline: c.sub || c.title };
    case 'photo':
      return { kindLabel: t('photoBooth.title'), headline: c.sub || c.title };
    case 'levelUp':
      return { kindLabel: c.sub || t('us.ringLevel'), headline: c.title };
    case 'met':
      return { kindLabel: t('us.statMet'), headline: c.title };
    case 'arc':
      return { kindLabel: t('us.momentTitle.arc'), headline: c.title || t('us.momentTitle.arc') };
    case 'secretNote':
      return { kindLabel: t('secretNote.title'), headline: c.title, sub: c.sub };
    case 'board':
      return { kindLabel: t('us.publishKind.board'), headline: c.title, sub: c.sub };
    case 'diary':
      return { kindLabel: t('us.publishKind.diary'), headline: c.title, sub: c.sub };
    case 'dating':
      return { kindLabel: t('home.short.dating'), headline: c.title, sub: c.sub };
    case 'quiz':
      return { kindLabel: t('us.momentTitle.quiz'), headline: c.title, sub: c.sub };
    case 'plan':
      return { kindLabel: t('us.publishKind.plan'), headline: c.title };
  }
}

/** "Yesterday", else "Sat, 8 Nov" (with the year once it is another year). */
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

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
    marginHorizontal: inkGutter,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
  hint: { marginTop: 8, marginHorizontal: inkGutter },
  cards: { marginTop: 12, marginHorizontal: SIDE, gap: 10 },
  card: {
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  cardBody: { paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
  calmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kindBadge: {
    width: 36,
    height: 36,
    marginTop: 1,
    borderRadius: 11,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmMain: { flex: 1, minWidth: 0, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  kindLabel: { flexShrink: 1, textTransform: 'capitalize' },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0, gap: 3 },
  quote: { marginTop: 1 },
  heartsLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  shrink: { flexShrink: 1 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
});

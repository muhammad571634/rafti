import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as Gradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { moduleTile, PressableScale, SFIcon, SymbolTile, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { localCharacter, localized } from '@/i18n/content';
import { clockTime, shortName } from '@/lib/format';
import { buildTimeline, groupByDay, type MomentLine, momentLines, momentTarget, recentRows, type TimelineItem } from '@/lib/moment-groups';
import { dateFromKey } from '@/mock';
import { DATE_PLACES } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, isDark, systemColors, systemGround } from '@/theme';
import type { Character, MomentKind, Relationship } from '@/types';

const TILE = 30;
const THUMB = 38;
const WHITE = '#FFFFFF';
/** The grouped card's corners and side margin, the same as Us' other cards. */
const RADIUS = 22;
const SIDE = 14;

/** Each kind's tile: a system colour with a white SF Symbol (an Ionicon off iPhone), as on Today. */
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

/** A big moment's card: the bond's mint (the level card's colour), deep at night. */
const MINT = isDark
  ? { fill: ['#1D5A47', '#163F3A'] as const, ink: WHITE, deep: '#5FE0C4', sub: 'rgba(255,255,255,0.72)' }
  : { fill: ['#C9F3E1', '#A8E9CF'] as const, ink: '#1F1A17', deep: '#1E9E78', sub: 'rgba(31,26,23,0.66)' };

/*
 "Our moments" (owner, 2026-11-09, option A of `docs/prototypes/us-moments.html`): the bond's story
 a day at a time, as Apple's Journal and Wallet list it. Each day has a header, its big moments (you
 met, a level, a chapter) as mint cards, the rest in one grouped card. A row shows what it was and
 their words or the result (`moment-groups.ts` ties it to its record) and opens it. Us shows the last
 week (`OurMoments`); "See all" opens the whole story (`/moments/[characterId]`), drawn a screenful at
 a time. Both draw the same lines (`MomentLineView`).
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

/** One line of the timeline: a day's header, a big moment's card, or a row of the day's card. */
export function MomentLineView({
  line,
  today,
  content,
  open,
}: {
  line: MomentLine;
  today: string;
  content: (item: TimelineItem) => MomentContent;
  open: (item: TimelineItem) => (() => void) | undefined;
}) {
  const { t, i18n } = useTranslation();
  if (line.type === 'day') {
    const head = dayHeading(line.day, today, i18n.language, t);
    return (
      <View style={styles.dayHead} accessibilityRole="header">
        <Txt style={styles.dayTitle} lines={1} maxFontSizeMultiplier={1.3}>
          {head.title}
        </Txt>
        {head.date ? (
          <Txt style={styles.dayDate} lines={1} maxFontSizeMultiplier={1.3}>
            {head.date}
          </Txt>
        ) : null}
      </View>
    );
  }
  if (line.type === 'milestone') return <Milestone item={line.item} {...content(line.item)} onPress={open(line.item)} />;

  const { item, first, last } = line;
  const { title, sub, hearts, thumb } = content(item);
  const tile = KIND_TILE[item.kind];
  const onPress = open(item);
  // A plan with no hour shows none; everything else its time on the phone's clock.
  const time = item.kind === 'plan' && !item.plan?.time ? undefined : clockTime(item.at);
  return (
    <View style={[styles.piece, first && styles.pieceFirst, last && styles.pieceLast]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={[title, hearts, sub, time].filter(Boolean).join(', ')}
        style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}>
        <SymbolTile fill={tile.fill} ios={tile.ios} icon={tile.icon} size={TILE} />
        <View style={[styles.rowBody, !last && styles.rowLine]}>
          <View style={styles.grow}>
            <Txt style={styles.rowTitle} lines={1}>
              {title}
            </Txt>
            {hearts ? (
              // The hearts a date won: Apple's heart, not the emoji Android draws for ♥.
              <View style={styles.heartsLine}>
                <SFIcon ios="heart.fill" icon="heart" size={13} color={systemColors.pink} />
                <Txt style={styles.hearts}>{hearts}</Txt>
                {sub ? (
                  <Txt style={[styles.rowSub, styles.shrink]} lines={1}>
                    {`· ${sub}`}
                  </Txt>
                ) : null}
              </View>
            ) : sub ? (
              <Txt style={styles.rowSub} lines={2}>
                {sub}
              </Txt>
            ) : null}
          </View>
          {thumb ? <View style={styles.thumb}>{thumb}</View> : null}
          {time ? <Txt style={styles.time}>{time}</Txt> : null}
          {onPress ? <Ionicons name="chevron-forward" size={15} color={colors.textFaint} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

/**
 * The moments on Us: the last week (`recentRows`), so the screen stops; "See all" in the header
 * opens the whole story. A plan opens its day in the calendar above (`onOpenDay`).
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lines = useMemo(() => momentLines(groupByDay(recentRows(everything, new Date()))), [everything, today]);
  const content = useMomentContent(character, relationship);
  const open = useOpenMoment(onOpenDay);

  return (
    <View>
      <View style={styles.head}>
        <Txt style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t('us.moments')}
        </Txt>
        {everything.length ? (
          <PressableScale
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={`${t('us.moments')}, ${t('common.seeAll')}`}
            onPress={() => router.push(`/moments/${encodeURIComponent(character.id)}` as Href)}
            style={styles.seeAll}>
            <Txt style={styles.seeAllText} maxFontSizeMultiplier={1.3}>
              {t('common.seeAll')}
            </Txt>
          </PressableScale>
        ) : null}
      </View>
      {lines.length === 0 ? (
        <Txt style={styles.hint}>{t('us.noMoments')}</Txt>
      ) : (
        lines.map((line) => <MomentLineView key={line.key} line={line} today={today} content={content} open={open} />)
      )}
    </View>
  );
}

/** A big moment: the level's number (a glyph for meeting and a chapter) on the bond's mint. */
function Milestone({ item, title, sub, onPress }: { item: TimelineItem; title: string; sub?: string; onPress?: () => void }) {
  const level = item.kind === 'levelUp' ? item.moment?.params?.level : undefined;
  return (
    <PressableScale
      scaleTo={0.98}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, sub].filter(Boolean).join(', ')}
      style={styles.mileWrap}>
      <Gradient colors={MINT.fill} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.mile}>
        <View style={styles.mileMark}>
          {level !== undefined ? (
            <Txt style={styles.mileNumber} lines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1.2}>
              {String(level)}
            </Txt>
          ) : (
            <SFIcon ios={item.kind === 'met' ? 'sparkles' : 'key.fill'} icon={item.kind === 'met' ? 'sparkles' : 'key'} size={26} color={MINT.deep} />
          )}
        </View>
        <View style={styles.grow}>
          <Txt style={styles.mileTitle} lines={2} maxFontSizeMultiplier={1.3}>
            {title}
          </Txt>
          {sub ? (
            <Txt style={styles.mileSub} lines={1} maxFontSizeMultiplier={1.3}>
              {sub}
            </Txt>
          ) : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={15} color={MINT.sub} /> : null}
      </Gradient>
    </PressableScale>
  );
}

/** "12:08" (a call moment saved before its record was linked) as seconds. */
function secondsOf(duration: string | number | undefined): number | undefined {
  if (typeof duration !== 'string') return undefined;
  const parts = duration.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/**
 * A day's header: "Today" / "Yesterday" with the date beside it, the weekday for the rest of the
 * week, then the date itself (with the year once it is another year), as Journal heads its days.
 */
function dayHeading(day: string, today: string, locale: string, t: (key: string) => string): { title: string; date?: string } {
  const date = dateFromKey(day);
  const ago = Math.round((dateFromKey(today).getTime() - date.getTime()) / 86_400_000);
  const short = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  if (ago === 0) return { title: t('common.today'), date: short };
  if (ago === 1) return { title: t('common.yesterday'), date: short };
  if (ago > 1 && ago < 7) return { title: date.toLocaleDateString(locale, { weekday: 'long' }), date: date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) };
  const sameYear = date.getFullYear() === dateFromKey(today).getFullYear();
  return { title: date.toLocaleDateString(locale, { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }) };
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginLeft: 18, marginRight: 8 },
  title: { flex: 1, fontFamily: fonts.playful, fontSize: 21, lineHeight: 26, color: systemGround.label },
  // "See all": the iOS section header's trailing link, in the brand's ink; 44pt tall to tap.
  seeAll: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  seeAllText: { fontFamily: fonts.playfulBold, fontSize: 15, color: colors.brandText },
  hint: { marginTop: 8, marginHorizontal: 18, fontSize: 15, color: colors.textSecondary },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14, marginBottom: 8, marginHorizontal: 18 },
  dayTitle: { flex: 1, fontFamily: fonts.playful, fontSize: 17, lineHeight: 22, color: systemGround.label },
  dayDate: { fontSize: 13, color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  // One row of a day's grouped card; the first and last carry its corners, so the card can be drawn
  // a row at a time in a virtualized list.
  piece: { marginHorizontal: SIDE, backgroundColor: systemGround.card, overflow: 'hidden' },
  pieceFirst: { borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, borderCurve: 'continuous' },
  pieceLast: { borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS, borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  rowPressed: { backgroundColor: systemGround.fill },
  // The hairline starts under the text, not under the tile, as in iOS grouped lists.
  rowBody: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingRight: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 15.5, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2, color: systemGround.label },
  rowSub: { fontSize: 13.5, lineHeight: 18, color: systemGround.secondaryLabel },
  heartsLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hearts: { fontSize: 13.5, lineHeight: 18, fontWeight: '700', color: systemColors.pink, fontVariant: ['tabular-nums'] },
  shrink: { flexShrink: 1 },
  thumb: { width: THUMB, height: THUMB, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 13, color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  mileWrap: { marginHorizontal: SIDE, marginBottom: 10 },
  mile: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 12, paddingLeft: 16, paddingRight: 14, borderRadius: RADIUS, borderCurve: 'continuous' },
  mileMark: { width: 40, alignItems: 'center', justifyContent: 'center' },
  mileNumber: { fontFamily: fonts.playful, fontSize: 30, lineHeight: 36, color: MINT.deep, fontVariant: ['tabular-nums'] },
  mileTitle: { fontFamily: fonts.playful, fontSize: 16.5, lineHeight: 21, color: MINT.ink },
  mileSub: { fontSize: 13, lineHeight: 17, color: MINT.sub },
});

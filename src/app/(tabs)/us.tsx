import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Card,
  CharacterAvatar,
  EmptyState,
  Icon3D,
  PressableScale,
  Screen,
  Txt,
  UserAvatar,
} from '@/components/ui';
import type { IconName } from '@/components/ui';
import { daysBetween, relativeStamp } from '@/lib/format';
import { dateFromKey, levelForIntimacy, todayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, palette, radius, shadows, space, TAB_BAR_HEIGHT } from '@/theme';
import type { MomentKind } from '@/types';

const MOMENT_PAGE = 20;

const MOMENT_ICON: Record<MomentKind, IconName> = {
  met: 'sparkles',
  levelUp: 'growing-heart',
  call: 'call',
  diary: 'diary',
  secretNote: 'secret-note',
  dating: 'dating',
  photo: 'photo-booth',
};

/** [Us]: every sweet moment with each character, plus the plans they'll remind you of. */
export default function UsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const relationships = useAppStore((s) => s.relationships);
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const moments = useAppStore((s) => s.moments);
  const schedules = useAppStore((s) => s.schedules);
  const removeSchedule = useAppStore((s) => s.removeSchedule);

  const bonds = useMemo(
    () =>
      characters
        .filter((c) => relationships[c.id] && conversations.some((conv) => conv.characterId === c.id))
        .map((character) => ({ character, relationship: relationships[character.id] }))
        .sort((a, b) => b.relationship.intimacy - a.relationship.intimacy),
    [characters, relationships, conversations],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = bonds.find((b) => b.character.id === selectedId) ?? bonds[0];
  // Moments pile up for as long as a bond lasts; render them a page at a time.
  const [momentLimit, setMomentLimit] = useState({ id: selected?.character.id, count: MOMENT_PAGE });
  const visibleMoments = momentLimit.id === selected?.character.id ? momentLimit.count : MOMENT_PAGE;

  const timeline = useMemo(
    () =>
      moments
        .filter((m) => m.characterId === selected?.character.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [moments, selected],
  );

  const today = todayKey();
  const upcoming = useMemo(
    () =>
      schedules
        .filter((x) => x.characterId === selected?.character.id && x.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [schedules, selected, today],
  );

  if (!selected) {
    return (
      <Screen background={gradients.home}>
        <View style={styles.head}>
          <Txt variant="h1">{t('us.title')}</Txt>
        </View>
        <EmptyState
          title={t('us.noRelationships')}
          hint={t('us.noRelationshipsHint')}
          actionLabel={t('find.title')}
          onAction={() => router.push('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const { character, relationship } = selected;
  const { progress } = levelForIntimacy(relationship.intimacy);
  const conversation = conversations.find((c) => c.characterId === character.id);

  return (
    <Screen background={gradients.home}>
      <View style={styles.head}>
        <Txt variant="h1">{t('us.title')}</Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + space.xxl }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
          {bonds.map(({ character: c, relationship: r }) => {
            const active = c.id === character.id;
            return (
              <PressableScale key={c.id} style={styles.pick} scaleTo={0.92} onPress={() => setSelectedId(c.id)}>
                <CharacterAvatar character={c} size={active ? 56 : 48} ring={active} />
                <Txt variant="tiny" lines={1} color={active ? colors.primary : colors.textMuted}>
                  {displayName(c, r)}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        <PressableScale
          scaleTo={0.985}
          onPress={() => conversation && router.push(`/chat/${conversation.id}`)}>
          <LinearGradient colors={gradients.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadows.card]}>
            <View style={styles.pair}>
              <UserAvatar user={user} size={60} />
              <Icon3D name="growing-heart" size={40} style={styles.heart} />
              <CharacterAvatar character={character} size={60} ring ringColor={colors.white} />
            </View>
            <Txt variant="display" color={colors.white} center>
              {t('us.daysTogether', { count: daysBetween(relationship.anniversary) + 1 })}
            </Txt>
            <View style={styles.levelRow}>
              <Txt variant="smallStrong" color={colors.white}>
                {t('us.level', { level: relationship.level })} · {relationship.levelTitle}
              </Txt>
              <Txt variant="caption" color="rgba(255,255,255,0.85)">
                {t('us.toNext', { count: Math.max(0, relationship.nextLevelAt - relationship.intimacy) })}
              </Txt>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
            </View>
            <View style={styles.stats}>
              <Stat icon="heart" label={t('us.intimacy', { count: relationship.intimacy })} />
              <Stat icon="flame" label={t('us.streak', { count: relationship.streakDays })} />
            </View>
          </LinearGradient>
        </PressableScale>

        <Card style={styles.section}>
          <View style={styles.sectionHead}>
            <Icon3D name="calendar" size={24} />
            <Txt variant="title">{t('us.upcoming')}</Txt>
          </View>
          {upcoming.length === 0 ? (
            <Txt variant="small" color={colors.textMuted}>
              {t('us.upcomingHint')}
            </Txt>
          ) : (
            upcoming.map((item) => (
              <View key={item.id} style={styles.scheduleRow}>
                <View style={styles.dateBadge}>
                  <Txt variant="tiny" color={colors.primary}>
                    {dateFromKey(item.date).toLocaleDateString(i18n.language, { month: 'short' })}
                  </Txt>
                  <Txt variant="title" color={colors.primary}>
                    {dateFromKey(item.date).getDate()}
                  </Txt>
                </View>
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{item.title}</Txt>
                  <Txt variant="caption" color={colors.textMuted}>
                    {item.date === today ? t('common.today') : relativeDay(item.date, t, i18n.language)}
                  </Txt>
                </View>
                <PressableScale
                  hitSlop={12}
                  scaleTo={0.85}
                  accessibilityLabel={t('a11y.removePlan')}
                  onPress={() => removeSchedule(item.id)}>
                  <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                </PressableScale>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHead}>
            <Icon3D name="sparkles" size={24} />
            <Txt variant="title">{t('us.moments')}</Txt>
          </View>
          {timeline.length === 0 ? (
            <Txt variant="small" color={colors.textMuted}>
              {t('us.noMoments')}
            </Txt>
          ) : (
            timeline.slice(0, visibleMoments).map((moment, i, shown) => (
              <View key={moment.id} style={styles.momentRow}>
                <View style={styles.rail}>
                  <View style={styles.momentIcon}>
                    <Icon3D name={MOMENT_ICON[moment.kind]} size={22} />
                  </View>
                  {i < shown.length - 1 ? <View style={styles.railLine} /> : null}
                </View>
                <View style={[styles.flex, styles.momentBody]}>
                  <Txt variant="body">{t(`us.momentText.${moment.kind}`, moment.params ?? {})}</Txt>
                  <Txt variant="caption" color={colors.textFaint}>
                    {relativeStamp(moment.createdAt)}
                  </Txt>
                </View>
              </View>
            ))
          )}
          {timeline.length > visibleMoments ? (
            <PressableScale
              style={styles.showMore}
              scaleTo={0.97}
              onPress={() =>
                setMomentLimit({ id: selected?.character.id, count: visibleMoments + MOMENT_PAGE })
              }>
              <Txt variant="smallStrong" color={colors.primary}>
                {t('us.showMore', { count: Math.min(MOMENT_PAGE, timeline.length - visibleMoments) })}
              </Txt>
            </PressableScale>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function relativeDay(key: string, t: (k: string) => string, locale: string) {
  const days = Math.round((dateFromKey(key).getTime() - dateFromKey(todayKey()).getTime()) / 86_400_000);
  if (days === 1) return t('common.tomorrow');
  return dateFromKey(key).toLocaleDateString(locale, { weekday: 'long' });
}

function Stat({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={colors.white} />
      <Txt variant="caption" color={colors.white}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  scroll: { paddingHorizontal: space.lg, gap: space.lg },
  picker: { gap: space.md, paddingVertical: space.xs, alignItems: 'flex-end' },
  pick: { alignItems: 'center', gap: space.xs, width: 62 },
  hero: { borderRadius: radius.xxl, padding: space.xl, gap: space.md },
  pair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  heart: { marginHorizontal: -space.xs },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.white },
  stats: { flexDirection: 'row', gap: space.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dateBadge: {
    width: 44,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentRow: { flexDirection: 'row', gap: space.md },
  showMore: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg },
  rail: { alignItems: 'center', width: 36 },
  momentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.apricot50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: { flex: 1, width: 2, backgroundColor: palette.apricot100, marginVertical: 2 },
  momentBody: { paddingBottom: space.lg, gap: 2, paddingTop: space.xs },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Polaroid } from '@/components/date/polaroid';
import { artLook, placeLook, TicketBadge } from '@/components/date/ticket';
import { EmptyState, GlassBar, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { shortName } from '@/lib/format';
import { datePlaceById } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, isDark, space } from '@/theme';
import type { DateRecord } from '@/types';

const PINK = isDark ? '#FF6B8A' : '#D70F4C';

/**
 * "Our dates" (2026-10-22, coded straight from the Date screens' look at the owner's word): every
 * polaroid, newest first, two to a row under month headings as Photos groups them. Under each, the
 * date's ticket badge, who it was with and the hearts it earned.
 */
export default function DateAlbumScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { scrolled, onScroll } = useScrolledPast(40);

  const dates = useAppStore((s) => s.dates);
  const themes = useAppStore((s) => s.dateThemes);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const cardW = Math.floor((width - space.lg * 2 - space.lg) / 2);

  const months = useMemo(() => {
    const sorted = [...dates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const groups: { key: string; title: string; dates: DateRecord[] }[] = [];
    for (const d of sorted) {
      const at = new Date(d.createdAt);
      const key = `${at.getFullYear()}-${at.getMonth()}`;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, title: at.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }), dates: [] };
        groups.push(group);
      }
      group.dates.push(d);
    }
    return groups;
  }, [dates, i18n.language]);

  const card = (d: DateRecord, i: number) => {
    const character = characters.find((c) => c.id === d.characterId);
    if (!character) return null;
    const place = datePlaceById(d.placeId);
    const own = place ? undefined : themes.find((th) => th.id === d.placeId);
    const look = place ? placeLook(place.id) : artLook(own?.art ?? '');
    const name = shortName(displayName(character, relationships[character.id]));
    return (
      <View key={d.id} style={{ width: cardW }}>
        <Polaroid
          character={character}
          caption={place ? t(`dating.places.${place.titleKey}`) : d.title}
          date={new Date(d.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
          width={cardW}
          tilt={i % 2 ? 2 : -2}
        />
        <View style={styles.meta} accessible accessibilityLabel={`${name}, ${t('date.heartsOf', { n: d.hearts, max: d.maxHearts })}`}>
          <TicketBadge look={look} size={20} />
          <Txt style={styles.name} lines={1}>
            {name}
          </Txt>
          <Ionicons name="heart" size={12} color={PINK} />
          <Txt style={styles.hearts}>{d.hearts}</Txt>
        </View>
      </View>
    );
  };

  if (dates.length === 0) {
    return (
      <Screen background={colors.bg}>
        <GlassBar />
        <LargeTitle>{t('date.albumTitle')}</LargeTitle>
        <EmptyState title={t('date.albumEmpty')} actionLabel={t('dating.title')} onAction={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('date.albumTitle')} scrolled={scrolled} />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
        showsVerticalScrollIndicator={false}>
        <LargeTitle>{t('date.albumTitle')}</LargeTitle>
        {months.map((m) => (
          <View key={m.key}>
            <Txt style={styles.month}>{m.title}</Txt>
            <View style={styles.grid}>{m.dates.map((d, i) => card(d, i))}</View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  month: {
    marginTop: 22,
    marginBottom: 12,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingHorizontal: space.lg },
  meta: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.text },
  hearts: { fontSize: 15, fontWeight: '600', color: PINK, fontVariant: ['tabular-nums'] },
});

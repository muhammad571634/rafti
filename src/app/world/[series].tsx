import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_GAP, CharacterCard } from '@/components/character-card';
import { useEarlyAccess } from '@/components/plans/early-access';
import { EmptyState, Header, Screen, Txt } from '@/components/ui';
import { isReleased } from '@/economy/early-access';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * A whole world from Find ("See all"): everyone in it as the same portrait cards as Find,
 * two columns, with how many there are and how many can take a call.
 */
export default function WorldScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { series } = useLocalSearchParams<{ series: string }>();
  const cardWidth = Math.floor((Math.min(width, 520) - space.lg * 2 - CARD_GAP) / 2);

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const early = useEarlyAccess();
  const blockedIds = useAppStore((s) => s.blockedIds);

  const people = useMemo(
    () =>
      characters.filter(
        (c) => (c.series ?? 'Other') === series && !blockedIds.includes(c.id) && isReleased(c, Date.now()),
      ),
    [characters, series, blockedIds],
  );
  const friendIds = useMemo(() => new Set(conversations.map((c) => c.characterId)), [conversations]);
  const voices = people.filter((c) => c.voiceReady).length;

  return (
    <Screen background={colors.bgPlain}>
      <Header title={series} />
      {people.length === 0 ? (
        <EmptyState title={t('find.noResults')} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.huge }]} showsVerticalScrollIndicator={false}>
          <View style={styles.stats}>
            <Stat icon="people-outline" value={people.length} label={t('find.characters')} />
            <Stat icon="call-outline" value={voices} label={t('find.canCall')} />
          </View>
          <View style={styles.grid}>
            {people.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                width={cardWidth}
                isFriend={friendIds.has(character.id)}
                fresh={early.fresh(character)}
                onOpen={() => router.push(`/character/${character.id}`)}
                onAdd={() => early.add(character)}
              />
            ))}
          </View>
        </ScrollView>
      )}
      {early.sheet}
    </Screen>
  );
}

/** One fact about the world: a line icon in a grey tile, the number, then what it counts. */
function Stat({ icon, value, label }: { icon: 'people-outline' | 'call-outline'; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.tile}>
        <Ionicons name={icon} size={17} color={colors.text} />
      </View>
      <Txt variant="bodyStrong">{value}</Txt>
      <Txt variant="small" color={colors.textSecondary}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.huge },
  stats: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, paddingHorizontal: space.lg },
});

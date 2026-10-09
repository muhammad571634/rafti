import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Polaroid } from '@/components/date/polaroid';
import { EmptyState, Header, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { datePlaceById } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/** "Our dates": every polaroid, newest first, two to a row. */
export default function DateAlbumScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const dates = useAppStore((s) => s.dates);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const cardW = Math.floor((width - space.lg * 2 - space.lg) / 2);

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('date.albumTitle')} />
      {dates.length === 0 ? (
        <EmptyState title={t('date.albumEmpty')} actionLabel={t('dating.title')} onAction={() => router.back()} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {dates.map((d, i) => {
            const character = characters.find((c) => c.id === d.characterId);
            const place = datePlaceById(d.placeId);
            if (!character || !place) return null;
            const name = shortName(displayName(character, relationships[character.id]));
            return (
              <View key={d.id} style={{ width: cardW }}>
                <Polaroid
                  character={character}
                  caption={t(`dating.places.${place.titleKey}`)}
                  date={new Date(d.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                  width={cardW}
                  tilt={i % 2 ? 2 : -2}
                />
                <Txt variant="smallStrong" center color={colors.textSecondary} style={styles.with}>
                  {name} · {'\u{1F497}'} {d.hearts}
                </Txt>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, padding: space.lg, paddingBottom: space.huge },
  with: { marginTop: space.sm },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ClosenessSheet } from '@/components/closeness-sheet';
import { CharacterAvatar, Chip, EmptyState, Header, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const COLUMNS = 3;

export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const known = useMemo(() => {
    const withBond = characters.filter((c) => relationships[c.id]);
    return filter === 'mine' ? withBond.filter((c) => !c.isOfficial) : withBond;
  }, [characters, relationships, filter]);

  const tileWidth = (width - space.lg * 2 - space.md * (COLUMNS - 1)) / COLUMNS;

  const [closenessOpen, setClosenessOpen] = useState(false);

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('contacts.title')}
        right={
          <IconButton
            icon="information-circle-outline"
            size={21}
            accessibilityLabel={t('closeness.title')}
            onPress={() => setClosenessOpen(true)}
          />
        }
      />

      <View style={styles.filters}>
        <Chip label={t('contacts.all')} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip
          label={t('contacts.createdByYou')}
          active={filter === 'mine'}
          onPress={() => setFilter('mine')}
        />
      </View>

      {known.length === 0 ? (
        <EmptyState
          title={t('contacts.empty')}
          hint={t('contacts.emptyHint')}
          actionLabel={t('find.title')}
          onAction={() => router.push('/(tabs)/find')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            <PressableScale
              style={[styles.addTile, { width: tileWidth, height: tileWidth * 1.3 }]}
              scaleTo={0.94}
              onPress={() => router.push('/create-character')}>
              <Ionicons name="add" size={28} color={colors.text} />
              <Txt variant="caption" color={colors.textSecondary}>
                {t('contacts.addOne')}
              </Txt>
            </PressableScale>

            {known.map((character) => {
              const relationship = relationships[character.id];
              return (
                <PressableScale
                  key={character.id}
                  style={{ width: tileWidth }}
                  scaleTo={0.94}
                  onPress={() => router.push(`/character/${character.id}`)}>
                  <View style={[styles.tile, { height: tileWidth * 1.3 }]}>
                    <CharacterAvatar character={character}
                      size={tileWidth * 0.52}
                      verified={character.voiceReady}
                    />
                    <Txt variant="smallStrong" center lines={1} style={styles.tileName}>
                      {character.name}
                    </Txt>
                    {relationship ? (
                      <Txt variant="tiny" color={colors.bondText} center lines={2}>
                        {relationship.label ?? relationship.levelTitle}
                      </Txt>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </ScrollView>
      )}
      <ClosenessSheet visible={closenessOpen} onClose={() => setClosenessOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.huge },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.sm,
  },
  tileName: { marginTop: space.xs },
  addTile: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
});

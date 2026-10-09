import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ClosenessSheet } from '@/components/closeness-sheet';
import { CharacterAvatar, EmptyState, Header, IconButton, PressableScale, Screen, Segmented, Txt } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const AVATAR = 52;

/** Everyone the user has a bond with, closest first, as plain rows (docs/design-style.md). */
export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [closenessOpen, setClosenessOpen] = useState(false);

  const known = useMemo(() => {
    const withBond = characters.filter((c) => relationships[c.id]);
    const shown = filter === 'mine' ? withBond.filter((c) => !c.isOfficial) : withBond;
    return [...shown].sort((a, b) => {
      const ra = relationships[a.id]!;
      const rb = relationships[b.id]!;
      return rb.level - ra.level || rb.intimacy - ra.intimacy;
    });
  }, [characters, relationships, filter]);

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

      <Segmented
        options={[
          { value: 'all', label: t('contacts.all') },
          { value: 'mine', label: t('contacts.createdByYou') },
        ]}
        value={filter}
        onChange={setFilter}
        style={styles.tabs}
      />

      {known.length === 0 ? (
        <EmptyState
          title={t('contacts.empty')}
          hint={t('contacts.emptyHint')}
          actionLabel={filter === 'mine' ? t('contacts.create') : t('find.title')}
          onAction={() => router.push(filter === 'mine' ? '/create-character' : '/(tabs)/find')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <PressableScale style={styles.row} scaleTo={0.98} onPress={() => router.push('/create-character')}>
            <View style={styles.addCircle}>
              <Ionicons name="add" size={24} color={colors.text} />
            </View>
            <Txt variant="bodyStrong" style={styles.flex}>
              {t('contacts.create')}
            </Txt>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </PressableScale>

          {known.map((character) => {
            const relationship = relationships[character.id]!;
            return (
              <PressableScale
                key={character.id}
                style={styles.row}
                scaleTo={0.98}
                onPress={() => router.push(`/character/${character.id}`)}>
                <CharacterAvatar character={character} size={AVATAR} verified={character.voiceReady} />
                <View style={styles.flex}>
                  <Txt variant="bodyStrong" lines={1}>
                    {character.name}
                  </Txt>
                  <View style={styles.bond}>
                    <Txt variant="small" color={colors.bondText} style={styles.bold} lines={1}>
                      {relationship.label ?? relationship.levelTitle}
                    </Txt>
                    <Txt variant="small" color={colors.textFaint}>
                      ·
                    </Txt>
                    <Txt variant="small" color={colors.textSecondary}>
                      {t('contacts.level', { level: relationship.level })}
                    </Txt>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </PressableScale>
            );
          })}
        </ScrollView>
      )}
      <ClosenessSheet visible={closenessOpen} onClose={() => setClosenessOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '600', flexShrink: 1 },
  tabs: { marginHorizontal: space.lg, marginTop: space.xs, marginBottom: space.sm },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.huge },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  addCircle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bond: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: 2 },
});

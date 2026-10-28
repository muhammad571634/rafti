import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClosenessSheet } from '@/components/closeness-sheet';
import {
  CharacterAvatar,
  EmptyState,
  GlassBar,
  GlassButton,
  LargeTitle,
  PressableScale,
  Screen,
  SystemSegmented,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { phrase } from '@/i18n';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, space } from '@/theme';

type Filter = 'all' | 'mine';

const AVATAR = 44;
const ROW_PAD = 14;

/**
 * Everyone the user has a bond with, closest first, in the iOS Contacts look on the grouped
 * ground (2026-10-22, coded at the owner's word): a large title, All / Created by you, then one
 * inset group with "Create a character" on top and a row per friend (bond and level under the
 * name). The glass "i" explains closeness.
 */
export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { scrolled, onScroll } = useScrolledPast(40);

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const [filter, setFilter] = useState<Filter>('all');
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

  const info = (
    <GlassButton icon="information-circle-outline" accessibilityLabel={t('closeness.title')} onPress={() => setClosenessOpen(true)} />
  );

  return (
    <Screen background={colors.bg}>
      <GlassBar right={info} title={t('contacts.title')} scrolled={scrolled} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('contacts.title')}</LargeTitle>
        <SystemSegmented
          options={[
            { value: 'all', label: t('contacts.all') },
            { value: 'mine', label: t('contacts.createdByYou') },
          ]}
          value={filter}
          onChange={(f: Filter) => setFilter(f)}
          style={styles.track}
        />

        {known.length === 0 ? (
          <EmptyState
            title={t('contacts.empty')}
            hint={t('contacts.emptyHint')}
            actionLabel={filter === 'mine' ? t('contacts.create') : t('find.title')}
            onAction={() => router.push(filter === 'mine' ? '/create-character' : '/(tabs)/find')}
          />
        ) : (
          <View style={styles.group}>
            <PressableScale style={styles.row} scaleTo={0.985} accessibilityRole="button" onPress={() => router.push('/create-character')}>
              <View style={styles.addCircle}>
                <Ionicons name="add" size={26} color={colors.white} />
              </View>
              <Txt style={[styles.name, styles.addText]}>{t('contacts.create')}</Txt>
              <View style={styles.line} />
            </PressableScale>

            {known.map((character, i) => {
              const relationship = relationships[character.id]!;
              return (
                <PressableScale
                  key={character.id}
                  style={styles.row}
                  scaleTo={0.985}
                  accessibilityRole="button"
                  onPress={() => router.push(`/character/${character.id}`)}>
                  <CharacterAvatar character={character} size={AVATAR} verified={character.voiceReady} />
                  <View style={styles.body}>
                    <Txt style={styles.name} lines={1}>
                      {character.name}
                    </Txt>
                    <View style={styles.bond}>
                      <Txt style={styles.bondLabel} lines={1}>
                        {phrase(relationship.label ?? relationship.levelTitle)}
                      </Txt>
                      <Txt style={styles.meta}>·</Txt>
                      <Txt style={styles.meta}>{t('contacts.level', { level: relationship.level })}</Txt>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
                  {i < known.length - 1 ? <View style={styles.line} /> : null}
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>
      <ClosenessSheet visible={closenessOpen} onClose={() => setClosenessOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { marginTop: 12, marginHorizontal: space.lg },
  group: { marginTop: 22, marginHorizontal: space.lg, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: ROW_PAD },
  line: {
    position: 'absolute',
    left: ROW_PAD + AVATAR + 12,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  addCircle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: aurora.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { flex: 1 },
  body: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 },
  name: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  bond: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bondLabel: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.bondText },
  meta: { fontSize: 13, color: colors.textSecondary },
});

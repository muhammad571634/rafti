import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEROES } from '@/assets/heroes/registry';
import { useEarlyAccess } from '@/components/plans/early-access';
import { CharacterAvatar, EmptyState, PressableScale, Screen, SearchBar, Segmented, Txt } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { isReleased } from '@/economy/early-access';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Character, CharacterGender } from '@/types';

type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
const HERO_HEIGHT = 330;
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as const;

/**
 * A whole world from Find, like an artist page in Apple Music: its first face's scene
 * full-bleed with the world's name, how many live there and "Surprise me", then Everyone / Him /
 * Her and everyone in it as one list on the aurora ground. A row opens the profile; the trailing
 * "+" adds the friend, a mint tick shows one already made. The search button opens a field that
 * filters this list only (HIG Search fields: an inline field when search applies to one view).
 */
export default function WorldScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { series } = useLocalSearchParams<{ series: string }>();

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const rememberViewed = useAppStore((s) => s.rememberViewed);
  const early = useEarlyAccess();

  const [who, setWho] = useState<Who>('everyone');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const people = useMemo(
    () =>
      characters.filter(
        (c) => (c.series ?? 'Other') === series && !blockedIds.includes(c.id) && isReleased(c, Date.now()),
      ),
    [characters, series, blockedIds],
  );
  const friendIds = useMemo(() => new Set(conversations.map((c) => c.characterId)), [conversations]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      people.filter(
        (c) => (who === 'everyone' || c.gender === who) && (!q || c.name.toLowerCase().includes(q)),
      ),
    [people, who, q],
  );

  const lead = people[0];
  const open = (c: Character) => {
    rememberViewed(c.id);
    router.push(`/character/${c.id}`);
  };
  const surprise = () => {
    if (shown.length > 0) open(shown[Math.floor(Math.random() * shown.length)]);
  };

  return (
    <Screen background="aurora" edgeToEdge statusBarStyle="light">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={[styles.hero, { height: HERO_HEIGHT + insets.top }]}>
          {lead ? (
            <Image
              source={HEROES[lead.id] ?? characterImage(lead)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          <LinearGradient colors={SCRIM} style={styles.heroScrim} />
          <View style={styles.heroFoot}>
            <View style={styles.flex}>
              <Txt style={styles.title} accessibilityRole="header" lines={2}>
                {series}
              </Txt>
              <View style={styles.count}>
                <Ionicons name="person" size={14} color={colors.onMediaSoft} />
                <Txt variant="smallStrong" color={colors.onMediaSoft}>
                  {people.length}
                </Txt>
              </View>
            </View>
            {shown.length > 0 ? (
              <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={surprise} style={styles.surprise}>
                <Ionicons name="sparkles" size={16} color={colors.black} />
                <Txt variant="smallStrong" color={colors.black}>
                  {t('find.surprise')}
                </Txt>
              </PressableScale>
            ) : null}
          </View>
        </View>

        {searchOpen ? (
          <SearchBar
            tone="aurora"
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('find.searchWorld', { world: series })}
            style={styles.search}
          />
        ) : null}
        <Segmented
          tone="aurora"
          options={WHO.map((value) => ({ value, label: t(`find.who.${value}`) }))}
          value={who}
          onChange={setWho}
          style={styles.who}
        />

        {shown.length === 0 ? (
          <EmptyState title={t('find.noResults')} />
        ) : (
          <View style={styles.list}>
            {shown.map((c, i) => (
              <Row
                key={c.id}
                character={c}
                last={i === shown.length - 1}
                friend={friendIds.has(c.id)}
                fresh={!!early.fresh(c)}
                onOpen={() => open(c)}
                onAdd={() => early.add(c)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Clear glass over the scene (HIG Materials: the clear variant is for rich media). */}
      <View style={[styles.bar, { top: insets.top + space.xs }]} pointerEvents="box-none">
        <PressableScale
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          onPress={() => router.back()}
          style={styles.mediaButton}>
          <Ionicons name="chevron-back" size={24} color={colors.onMedia} style={styles.backIcon} />
        </PressableScale>
        <PressableScale
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('find.searchWorld', { world: series })}
          onPress={() => {
            if (searchOpen) setQuery('');
            setSearchOpen((v) => !v);
          }}
          style={styles.mediaButton}>
          <Ionicons name={searchOpen ? 'close' : 'search'} size={20} color={colors.onMedia} />
        </PressableScale>
      </View>
      {early.sheet}
    </Screen>
  );
}

/** One character: face, name, "New" and a phone when they can call, then add or a friend tick. */
function Row({
  character,
  last,
  friend,
  fresh,
  onOpen,
  onAdd,
}: {
  character: Character;
  last: boolean;
  friend: boolean;
  fresh: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <PressableScale
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={character.name}
        onPress={onOpen}
        style={styles.rowOpen}>
        <CharacterAvatar character={character} size={54} />
        <View style={[styles.rowBody, !last && styles.rowLine]}>
          <Txt style={styles.name} lines={1}>
            {character.name}
          </Txt>
          {fresh ? (
            <View style={styles.newPill}>
              <Txt style={styles.newText}>{t('find.newBadge').toUpperCase()}</Txt>
            </View>
          ) : null}
          {character.voiceReady ? (
            <Ionicons name="call" size={15} color={colors.bondText} accessibilityLabel={t('find.canCall')} />
          ) : null}
        </View>
      </PressableScale>
      <View style={[styles.trail, !last && styles.rowLine]}>
        {friend ? (
          <View style={styles.tick} accessible accessibilityLabel={t('find.isFriend', { name: character.name })}>
            <Ionicons name="checkmark" size={18} color={colors.white} />
          </View>
        ) : (
          <PressableScale
            scaleTo={0.88}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('find.addFriend', { name: character.name })}
            onPress={onAdd}
            style={styles.add}>
            <Ionicons name="add" size={20} color={colors.text} />
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  heroFoot: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
  },
  // iOS large title: 34pt bold.
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: 0.4, color: colors.onMedia },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  surprise: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.onMediaButton,
  },
  bar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  backIcon: { marginLeft: -2 },
  search: { marginHorizontal: space.lg, marginTop: space.lg },
  who: { marginHorizontal: space.lg, marginTop: space.lg },
  list: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: space.lg },
  rowBody: { flex: 1, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  newPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: colors.primaryFill },
  newText: { fontSize: 11, fontWeight: '700', color: colors.textOnPrimary },
  trail: { minHeight: 74, justifyContent: 'center', paddingRight: space.lg, paddingLeft: space.sm },
  add: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  tick: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});

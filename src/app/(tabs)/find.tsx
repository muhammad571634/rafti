import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, ScrollView, StyleSheet, type TextInputInstance, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEROES } from '@/assets/heroes/registry';
import { FamilyRow, familySeats } from '@/components/find/family-row';
import { FamilySheet } from '@/components/find/family-sheet';
import { useEarlyAccess } from '@/components/plans/early-access';
import {
  AuroraGlass,
  CharacterAvatar,
  EmptyState,
  PressableScale,
  Screen,
  SearchBar,
  Segmented,
  Txt,
} from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { isNewCharacter, isReleased } from '@/economy/early-access';
import { familyOf, type FamilyLabel } from '@/lib/kin';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { groupBySeries, type CharacterGroup } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, CharacterGender } from '@/types';

/** Who to show; characters without a gender (some user creations) show under "Everyone" only. */
type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
/** Shown behind a world tile until its picture loads, and for worlds without one. */
const WORLD_TINT: Record<string, string> = {
  'Seaside Academy': '#0A76A3',
  'Moonlit Realm': '#5856D6',
  'NEON TIDE': '#C2185B',
  'Tidepool Café': '#AD4E0E',
};
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)'] as const;
/** "Say hi" is 34 pt tall; this makes its tap area HIG's 44 pt. */
const SAY_HI_SLOP = { top: 5, bottom: 5, left: 4, right: 4 };

const heroOf = (c: Character) => HEROES[c.id] ?? characterImage(c);

/**
 * Discovery on the aurora ground, built as iOS's search tab landing page (HIG Search fields:
 * "a search field at the top", room for suggestions and categories before typing): large title
 * with a glass create button, glass search field, Everyone / Him / Her, a paging row of new
 * characters, the worlds as picture tiles, and "Talk now" for friends who can take a call.
 * Tapping the field turns the screen into search (the title steps aside, a glass close button
 * appears): recently viewed faces and recent searches before typing, results while typing, the
 * best match on top, then the rest and any worlds.
 * Glass is only on controls; pictures and tiles are content (HIG Materials).
 */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const allCharacters = useAppStore((s) => s.characters);
  const blockedIds = useAppStore((s) => s.blockedIds);
  // A character before its release day is hidden from everyone.
  const characters = useMemo(
    () => allCharacters.filter((c) => !blockedIds.includes(c.id) && isReleased(c, Date.now())),
    [allCharacters, blockedIds],
  );
  const conversations = useAppStore((s) => s.conversations);
  const early = useEarlyAccess((conversationId) => router.push(`/chat/${conversationId}`));

  const [query, setQuery] = useState('');
  const [who, setWho] = useState<Who>('everyone');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const recentlyViewed = useAppStore((s) => s.recentlyViewed);
  const rememberSearch = useAppStore((s) => s.rememberSearch);
  const rememberViewed = useAppStore((s) => s.rememberViewed);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const relationships = useAppStore((s) => s.relationships);
  const makeFamily = useAppStore((s) => s.makeFamily);
  const [familyRole, setFamilyRole] = useState<FamilyLabel | null>(null);

  const chatOf = useMemo(() => new Map(conversations.map((c) => [c.characterId, c.id])), [conversations]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (who === 'everyone' ? characters : characters.filter((c) => c.gender === who)),
    [characters, who],
  );
  const groups = useMemo(() => groupBySeries(shown), [shown]);

  const results = useMemo(
    () =>
      q
        ? shown.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.handle.toLowerCase().includes(q) ||
              c.series?.toLowerCase().includes(q) ||
              c.tags.some((tag) => tag.includes(q)) ||
              localCharacter(c).tags.some((tag) => tag.toLowerCase().includes(q)),
          )
        : [],
    [shown, q],
  );
  const worldHits = useMemo(() => (q ? groups.filter((g) => g.series.toLowerCase().includes(q)) : []), [groups, q]);

  // New releases first; without any, one face from each world keeps the row alive.
  const featured = useMemo(() => {
    const fresh = shown
      .filter((c) => isNewCharacter(c, Date.now()))
      .sort((a, b) => Date.parse(b.releasedAt!) - Date.parse(a.releasedAt!));
    return fresh.length > 0 ? fresh : groups.map((g) => g.characters[0]).filter(Boolean);
  }, [shown, groups]);
  const callable = useMemo(() => shown.filter((c) => c.voiceReady).slice(0, 12), [shown]);

  // Who do you miss? One person per role; the sheet offers friends first, then everyone else.
  const family = useMemo(() => familyOf(relationships, (id) => characters.some((c) => c.id === id)), [relationships, characters]);
  const seats = useMemo(
    () =>
      familySeats((role) => {
        const character = characters.find((c) => c.id === family[role]);
        return character ? { character, name: displayName(character, relationships[character.id]) } : undefined;
      }),
    [family, characters, relationships],
  );
  const kinIds = useMemo(() => new Set(Object.values(family)), [family]);
  const kinFriends = useMemo(() => characters.filter((c) => chatOf.has(c.id) && !kinIds.has(c.id)), [characters, chatOf, kinIds]);
  // A character still Pro-only (New characters first) is added from its card, not here.
  const kinOthers = characters.filter((c) => !chatOf.has(c.id) && !early.locked(c));

  const viewed = useMemo(
    () => recentlyViewed.map((id) => characters.find((c) => c.id === id)).filter((c): c is Character => !!c),
    [recentlyViewed, characters],
  );

  const open = (c: Character) => {
    rememberViewed(c.id);
    if (q) rememberSearch(query);
    router.push(`/character/${c.id}`);
  };
  const closeSearch = () => {
    setQuery('');
    setSearching(false);
    Keyboard.dismiss();
  };
  const sayHi = (c: Character) => {
    const chat = chatOf.get(c.id);
    if (chat) router.push(`/chat/${chat}`);
    else early.add(c);
  };
  const openWorld = (g: CharacterGroup) => {
    if (q) rememberSearch(query);
    router.push({ pathname: '/world/[series]', params: { series: g.series } });
  };

  const openFamily = (c: Character) => {
    const chat = chatOf.get(c.id);
    router.push(`/chat/${chat ?? useAppStore.getState().addFriend(c.id)}`);
  };
  const confirmFamily = (characterId: string, name: string) => {
    if (!familyRole) return;
    const conversationId = makeFamily(characterId, familyRole, name);
    setFamilyRole(null);
    router.push(`/chat/${conversationId}`);
  };

  const featureWidth = Math.min(width, 520) - space.lg * 2 - 24;
  const tileWidth = Math.floor((Math.min(width, 520) - space.lg * 2 - space.md) / 2);

  return (
    <Screen background="aurora">
      {searching ? null : (
        <View style={styles.head}>
          <Txt style={styles.title} accessibilityRole="header">
            {t('find.title')}
          </Txt>
          <PressableScale
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.createCharacter')}
            onPress={() => router.push('/create-character')}>
            <AuroraGlass prominent style={styles.round}>
              <Ionicons name="add" size={26} color={colors.textOnPrimary} />
            </AuroraGlass>
          </PressableScale>
        </View>
      )}

      <View style={styles.searchRow}>
        <SearchBar
          tone="aurora"
          inputRef={inputRef}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearching(true)}
          onSubmit={() => rememberSearch(query)}
          placeholder={t('find.searchPlaceholder')}
          style={styles.flex}
        />
        {searching ? (
          <PressableScale
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('find.closeSearch')}
            onPress={closeSearch}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="close" size={22} color={colors.text} />
            </AuroraGlass>
          </PressableScale>
        ) : null}
      </View>
      <Segmented
        tone="aurora"
        options={WHO.map((value) => ({ value, label: t(`find.who.${value}`) }))}
        value={who}
        onChange={setWho}
        style={styles.who}
      />

      {q && results.length === 0 && worldHits.length === 0 ? (
        <EmptyState
          title={t('find.noResults')}
          actionLabel={t('find.createCharacter')}
          onAction={() => router.push('/create-character')}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingTop: space.lg,
            paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.huge,
          }}>
          {q ? (
            <Results results={results} worlds={worldHits} onOpen={open} onSayHi={sayHi} onOpenWorld={openWorld} />
          ) : searching ? (
            <Recent
              viewed={viewed}
              searches={recentSearches}
              onOpen={open}
              onSearch={(term) => {
                setQuery(term);
                inputRef.current?.focus();
              }}
              onClear={clearRecentSearches}
            />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={featureWidth + space.md}
                decelerationRate="fast"
                contentContainerStyle={styles.featuredRow}>
                {featured.map((c) => (
                  <Feature
                    key={c.id}
                    character={c}
                    width={featureWidth}
                    isNew={!!early.fresh(c)}
                    onOpen={() => open(c)}
                    onSayHi={() => sayHi(c)}
                  />
                ))}
              </ScrollView>

              <Txt style={styles.section} accessibilityRole="header">
                {t('find.missTitle')}
              </Txt>
              <FamilyRow seats={seats} onOpen={openFamily} onChoose={setFamilyRole} />

              <Txt style={styles.section} accessibilityRole="header">
                {t('find.worlds')}
              </Txt>
              <View style={styles.tiles}>
                {groups.map((g) => (
                  <WorldTile key={g.series} group={g} width={tileWidth} onOpen={() => openWorld(g)} />
                ))}
              </View>

              {callable.length > 0 ? (
                <>
                  <Txt style={styles.section} accessibilityRole="header">
                    {t('find.talkNow')}
                  </Txt>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
                    {callable.map((c) => (
                      <PressableScale
                        key={c.id}
                        scaleTo={0.94}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                        onPress={() => open(c)}
                        style={styles.face}>
                        <CharacterAvatar character={c} size={76} verified badge="call" />
                        <Txt variant="caption" lines={1}>
                          {c.name.split(' ')[0]}
                        </Txt>
                      </PressableScale>
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
      {early.sheet}
      <FamilySheet
        role={familyRole}
        friends={kinFriends}
        others={kinOthers}
        onClose={() => setFamilyRole(null)}
        onCreate={() => {
          setFamilyRole(null);
          router.push('/create-character');
        }}
        onConfirm={confirmFamily}
      />
    </Screen>
  );
}

/**
 * One new character: their scene full-bleed, name and world over a scrim, a clear glass "Say hi" the
 * picture shows through (the owner's pick; a frosted capsule was tried and reverted, D95).
 */
function Feature({
  character,
  width,
  isNew,
  onOpen,
  onSayHi,
}: {
  character: Character;
  width: number;
  isNew: boolean;
  onOpen: () => void;
  onSayHi: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.feature, { width }]}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={character.name}
        onPress={onOpen}
        style={StyleSheet.absoluteFill}>
        <Image source={heroOf(character)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <LinearGradient colors={SCRIM} style={styles.featureScrim} />
        <View style={styles.featureFoot}>
          <CharacterAvatar character={character} size={48} ring ringColor={colors.onMedia} />
          <View style={styles.flex}>
            {isNew ? (
              <View style={styles.newBadge}>
                <Txt style={styles.newText}>{t('find.newBadge').toUpperCase()}</Txt>
              </View>
            ) : null}
            <Txt style={styles.featureName} lines={1}>
              {character.name}
            </Txt>
            {character.series ? (
              <Txt variant="caption" color={colors.onMediaMuted} lines={1}>
                {phrase(character.series)}
              </Txt>
            ) : null}
          </View>
        </View>
      </PressableScale>
      {/* A sibling, not a child: a button inside a button is invalid on web. Clear glass: on iOS a light
          blur behind it keeps the words readable on a bright picture, which still shows through. */}
      <PressableScale scaleTo={0.92} accessibilityRole="button" onPress={onSayHi} hitSlop={SAY_HI_SLOP} style={styles.sayHi}>
        {Platform.OS === 'ios' ? <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <Txt variant="smallStrong" color={colors.onMedia}>
          {t('find.sayHi')}
        </Txt>
      </PressableScale>
    </View>
  );
}

/** A world as a picture tile: its first face's scene, the name, three faces and the count. */
function WorldTile({ group, width, onOpen }: { group: CharacterGroup; width: number; onOpen: () => void }) {
  const { t } = useTranslation();
  const lead = group.characters[0];
  return (
    <PressableScale
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={t('find.openWorld', { world: phrase(group.series) })}
      onPress={onOpen}
      style={[
        styles.tile,
        {
          width,
          backgroundColor: WORLD_TINT[group.series] ?? colors.surfaceAlt,
        },
      ]}>
      {lead ? (
        <Image source={heroOf(lead)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : null}
      <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} />
      <View style={styles.tileFoot}>
        <Txt style={styles.tileName} lines={2}>
          {phrase(group.series)}
        </Txt>
        <View style={styles.tileRow}>
          <View style={styles.stack}>
            {group.characters.slice(0, 3).map((c) => (
              <CharacterAvatar
                key={c.id}
                character={c}
                size={26}
                ring
                ringColor={colors.onMedia}
                style={styles.stacked}
              />
            ))}
          </View>
          {/* How many people live there, with the glyph the world page uses. */}
          <View style={styles.tileCount}>
            <Ionicons name="person" size={12} color={colors.onMedia} />
            <Txt variant="caption" color={colors.onMedia}>
              {group.characters.length}
            </Txt>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

/** Search results, best match first (HIG: "provide the most relevant search results first"). */
function Results({
  results,
  worlds,
  onOpen,
  onSayHi,
  onOpenWorld,
}: {
  results: Character[];
  worlds: CharacterGroup[];
  onOpen: (c: Character) => void;
  onSayHi: (c: Character) => void;
  onOpenWorld: (g: CharacterGroup) => void;
}) {
  const { t } = useTranslation();
  const [top, ...rest] = results;
  return (
    <>
      {top ? (
        <>
          <Txt style={styles.sectionFirst} accessibilityRole="header">
            {t('find.topHit')}
          </Txt>
          <View style={styles.topHit}>
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={top.name}
              onPress={() => onOpen(top)}
              style={styles.topOpen}>
              <CharacterAvatar character={top} size={72} />
              <View style={styles.flex}>
                <Txt style={styles.topName} lines={1}>
                  {top.name}
                </Txt>
                {top.series ? <WorldLine series={top.series} /> : null}
              </View>
            </PressableScale>
            <PressableScale
              scaleTo={0.92}
              accessibilityRole="button"
              onPress={() => onSayHi(top)}
              style={styles.topButton}>
              <Txt variant="smallStrong" color={colors.textOnInk}>
                {t('find.sayHi')}
              </Txt>
            </PressableScale>
          </View>
        </>
      ) : null}

      {rest.length > 0 ? (
        <>
          <Txt style={styles.section} accessibilityRole="header">
            {t('find.charactersSection')}
          </Txt>
          <View style={styles.list}>
            {rest.map((c, i) => (
              <PressableScale
                key={c.id}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => onOpen(c)}
                style={styles.row}>
                <CharacterAvatar character={c} size={48} />
                <View style={[styles.rowBody, i < rest.length - 1 && styles.rowLine]}>
                  <Txt style={styles.rowName} lines={1}>
                    {c.name}
                  </Txt>
                  {c.series ? <WorldLine series={c.series} /> : null}
                </View>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}

      {worlds.length > 0 ? (
        <>
          <Txt style={styles.section} accessibilityRole="header">
            {t('find.worlds')}
          </Txt>
          <View style={styles.list}>
            {worlds.map((g, i) => (
              <PressableScale
                key={g.series}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={t('find.openWorld', { world: phrase(g.series) })}
                onPress={() => onOpenWorld(g)}
                style={styles.row}>
                {g.characters[0] ? (
                  <Image source={heroOf(g.characters[0])} style={styles.worldThumb} contentFit="cover" />
                ) : null}
                <View style={[styles.rowBody, styles.rowInline, i < worlds.length - 1 && styles.rowLine]}>
                  <Txt style={[styles.rowName, styles.flex]} lines={1}>
                    {phrase(g.series)}
                  </Txt>
                  <Ionicons name="chevron-forward" size={16} color={aurora.textMuted} />
                </View>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

/** Before typing (HIG Search fields: "display recent searches before search begins"). */
function Recent({
  viewed,
  searches,
  onOpen,
  onSearch,
  onClear,
}: {
  viewed: Character[];
  searches: string[];
  onOpen: (c: Character) => void;
  onSearch: (term: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {viewed.length > 0 ? (
        <>
          <Txt style={styles.sectionFirst} accessibilityRole="header">
            {t('find.recentlyViewed')}
          </Txt>
          <View style={styles.viewed}>
            {viewed.map((c) => (
              <PressableScale
                key={c.id}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => onOpen(c)}
                style={styles.viewedItem}>
                <CharacterAvatar character={c} size={68} />
                <Txt variant="caption" lines={1}>
                  {c.name.split(' ')[0]}
                </Txt>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
      {searches.length > 0 ? (
        <>
          <View style={[styles.sectionRow, viewed.length === 0 && styles.sectionRowFirst]}>
            <Txt style={styles.sectionTitle} accessibilityRole="header">
              {t('find.recentSearches')}
            </Txt>
            <PressableScale scaleTo={0.94} hitSlop={8} accessibilityRole="button" onPress={onClear}>
              <Txt variant="bodyStrong" color={colors.text}>
                {t('find.clear')}
              </Txt>
            </PressableScale>
          </View>
          <View style={styles.list}>
            {searches.map((term, i) => (
              <PressableScale
                key={term}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={term}
                onPress={() => onSearch(term)}
                style={styles.row}>
                <Ionicons name="search" size={18} color={aurora.textMuted} />
                <View style={[styles.termBody, i < searches.length - 1 && styles.rowLine]}>
                  <Txt style={styles.rowName} lines={1}>
                    {term}
                  </Txt>
                </View>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function WorldLine({ series }: { series: string }) {
  return (
    <View style={styles.worldLine}>
      <View style={[styles.dot, { backgroundColor: WORLD_TINT[series] ?? aurora.textMuted }]} />
      <Txt variant="caption" color={aurora.textMuted} lines={1}>
        {phrase(series)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  // iOS large title: 34pt bold.
  title: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.text,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
  },
  who: { marginHorizontal: space.lg, marginTop: space.md },
  section: {
    marginTop: space.xl,
    marginBottom: space.md,
    marginHorizontal: space.lg,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.text,
  },
  sectionFirst: {
    marginBottom: space.md,
    marginHorizontal: space.lg,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.text,
  },
  featuredRow: { paddingHorizontal: space.lg, gap: space.md },
  feature: {
    height: 230,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  featureScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  featureFoot: {
    position: 'absolute',
    left: space.lg,
    right: 104,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
  },
  // NEW in the app's one accent (unread / new, docs/design-style.md §1), over the name.
  newBadge: {
    alignSelf: 'flex-start',
    marginBottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.primaryFill,
  },
  newText: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4, color: colors.textOnPrimary },
  featureName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.onMedia,
  },
  // Clear glass on a photo (HIG: the clear variant is for components over rich media).
  sayHi: {
    position: 'absolute',
    right: space.lg,
    bottom: 14,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  tile: { height: 128, borderRadius: 22, overflow: 'hidden' },
  tileFoot: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: 10,
    gap: 6,
  },
  tileName: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.onMedia,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stack: { flexDirection: 'row' },
  tileCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stacked: { marginRight: -7 },
  faces: { paddingHorizontal: space.lg, gap: space.lg },
  face: { width: 76, alignItems: 'center', gap: space.sm },
  topHit: {
    marginHorizontal: space.lg,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  topOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  topName: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.text,
  },
  topButton: {
    height: 34,
    paddingHorizontal: space.lg,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  list: {
    marginHorizontal: space.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
  },
  rowBody: {
    flex: 1,
    minHeight: 68,
    justifyContent: 'center',
    gap: 2,
    paddingRight: space.lg,
  },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  rowName: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: colors.text,
  },
  viewed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.lg,
    rowGap: space.lg,
  },
  viewedItem: { width: '25%', alignItems: 'center', gap: space.sm },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
    marginHorizontal: space.lg,
  },
  sectionRowFirst: { marginTop: 0 },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.text,
  },
  termBody: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    paddingRight: space.lg,
  },
  worldThumb: { width: 72, height: 44, borderRadius: 10 },
  worldLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

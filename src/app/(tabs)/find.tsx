import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  type TextInputInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { CinemaFeatureCard } from '@/components/find/cinema-feature-card';
import { CircleTile } from '@/components/find/circle-tile';
import { familySeats } from '@/components/find/family-row';
import { FamilySheet } from '@/components/find/family-sheet';
import { MissCard, RoleSheet } from '@/components/find/miss-card';
import { CommunityShelf } from '@/components/community/community-shelf';
import { COMMUNITY_OPEN } from '@/lib/community-gate';
import { InkSegmented, InkText } from '@/components/ink';
import { useEarlyAccess } from '@/components/plans/early-access';
import { CharacterAvatar, EmptyState, GlassButton, NO_RESULTS, PressableScale, Screen, SearchBar, SFIcon } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { isNewCharacter, isReleased } from '@/economy/early-access';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { familyOf, type FamilyLabel } from '@/lib/kin';
import { leadFirst, partOfDay } from '@/lib/night-hour';
import { groupBySeries, type CharacterGroup } from '@/mock';
import { WORLDS } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character, CharacterGender } from '@/types';

/** Who to show; characters without a gender (some user creations) show under "Everyone" only. */
type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
/** The page never grows past a phone's width (tablets, web), so cards keep their shape. */
const MAX_WIDTH = 520;

const heroOf = (c: Character) => HEROES[c.id] ?? PORTRAITS[c.id] ?? characterImage(c);

/**
 * Discovery on the Ink Night ground (approved Ink+ prototype): airy header with collapsible
 * search button + create button, Everyone / Him / Her segmented control, snap-scrolling Cinema
 * Story Cards with Cast 2.0 opening hooks, the living "Who do you miss?" card, sleek 2x2 tinted
 * Circle tiles, and dark-glass Voice Pills for friends who can take a call.
 */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);

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
  // "Choose" on the Who do you miss? card: which role first (`RoleSheet`), then who (`FamilySheet`).
  const [rolesOpen, setRolesOpen] = useState(false);

  // Focus the search field automatically whenever the user opens search from the header lens.
  useEffect(() => {
    if (!searching) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [searching]);

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
        ? shown.filter((c) => {
            const loc = localCharacter(c);
            return (
              c.name.toLowerCase().includes(q) ||
              c.handle.toLowerCase().includes(q) ||
              c.series?.toLowerCase().includes(q) ||
              loc.relation?.toLowerCase().includes(q) ||
              loc.greeting?.toLowerCase().includes(q) ||
              c.tags.some((tag) => tag.includes(q)) ||
              loc.tags.some((tag) => tag.toLowerCase().includes(q))
            );
          })
        : [],
    [shown, q],
  );
  const worldHits = useMemo(() => (q ? groups.filter((g) => g.series.toLowerCase().includes(q)) : []), [groups, q]);

  // The hour, read again on each visit: the friend it belongs to leads the row (audit §8.2.4).
  const [hour, setHour] = useState(() => new Date().getHours());
  useFocusEffect(useCallback(() => setHour(new Date().getHours()), []));
  // New releases first; without any, one face from each circle keeps the row alive.
  const featured = useMemo(() => {
    const fresh = shown
      .filter((c) => isNewCharacter(c, Date.now()))
      .sort((a, b) => Date.parse(b.releasedAt!) - Date.parse(a.releasedAt!));
    const row = (fresh.length > 0 ? fresh : groups.map((g) => g.characters[0])).filter((c) => !!c && !!heroOf(c));
    return leadFirst(row, (c) => c.id, partOfDay(hour), shown.filter((c) => !!heroOf(c)));
  }, [shown, groups, hour]);
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

  const open = useCallback(
    (c: Character) => {
      rememberViewed(c.id);
      if (q) rememberSearch(query);
      router.push(`/character/${c.id}`);
    },
    [rememberViewed, rememberSearch, q, query, router],
  );
  const closeSearch = () => {
    setQuery('');
    setSearching(false);
    Keyboard.dismiss();
  };
  const sayHi = useCallback(
    (c: Character) => {
      const chat = chatOf.get(c.id);
      if (chat) router.push(`/chat/${chat}`);
      else early.add(c);
    },
    [chatOf, router, early],
  );
  const openWorld = useCallback(
    (g: CharacterGroup) => {
      if (q) rememberSearch(query);
      router.push({ pathname: '/world/[series]', params: { series: g.series } });
    },
    [q, query, rememberSearch, router],
  );

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

  const page = Math.min(width, MAX_WIDTH);
  // A featured card leaves the next one peeking, so the horizontal carousel reads immediately.
  const featureWidth = Math.round(Math.min(page * 0.78, 304));
  const featureHeight = Math.round(featureWidth * 1.26);
  const tileWidth = Math.floor((page - space.lg * 2 - space.md) / 2);

  return (
    <Screen background={ink.ground}>
      {searching ? (
        <View style={styles.searchRow}>
          <SearchBar
            tone="light"
            inputRef={inputRef}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearching(true)}
            onSubmit={() => rememberSearch(query)}
            placeholder={t('find.searchPlaceholder')}
            style={styles.search}
          />
          <GlassButton icon="close" accessibilityLabel={t('find.closeSearch')} onPress={closeSearch} />
        </View>
      ) : (
        <View style={styles.head}>
          <InkText variant="display" style={styles.title}>
            {t('find.title')}
          </InkText>
          <View style={styles.headActions}>
            <GlassButton icon="search" accessibilityLabel={t('common.search')} onPress={() => setSearching(true)} />
            <GlassButton icon="add" accessibilityLabel={t('a11y.createCharacter')} onPress={() => router.push('/create-character')} />
          </View>
        </View>
      )}

      <WhoSwitch value={who} onChange={setWho} />

      {q && results.length === 0 && worldHits.length === 0 ? (
        <EmptyState
          symbol={NO_RESULTS}
          title={t('find.noResults')}
          actionLabel={t('find.createCharacter')}
          onAction={() => router.push('/create-character')}
        />
      ) : (
        <ScrollView
          ref={scrollRef}
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
              {featured.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={featureWidth + space.md}
                  decelerationRate="fast"
                  contentContainerStyle={styles.featuredRow}>
                  {featured.map((c) => (
                    <CinemaFeatureCard
                      key={c.id}
                      character={c}
                      width={featureWidth}
                      height={featureHeight}
                      isNew={!!early.fresh(c)}
                      onOpen={() => open(c)}
                      onSayHi={() => sayHi(c)}
                    />
                  ))}
                </ScrollView>
              ) : null}

              <Section title={t('find.missTitle')} first={featured.length === 0} />
              <MissCard seats={seats} onOpen={openFamily} onAdd={() => setRolesOpen(true)} />

              {/* Characters other users shared (0z300); dev and preview builds only for now. */}
              {COMMUNITY_OPEN ? <CommunityShelf title={(text) => <Section title={text} />} /> : null}

              {groups.length > 0 ? (
                <>
                  <Section title={t('find.worlds')} count={groups.length} />
                  <View style={styles.circles}>
                    {groups.map((g, i) => (
                      <CircleTile key={g.series} group={g} index={i} width={tileWidth} onOpen={openWorld} />
                    ))}
                  </View>
                </>
              ) : null}

              {callable.length > 0 ? (
                <>
                  <Section title={t('find.talkNow')} count={callable.length} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceRow}>
                    {callable.map((c) => (
                      <PressableScale
                        key={c.id}
                        scaleTo={0.95}
                        accessibilityRole="button"
                        accessibilityLabel={`${c.name}, ${t('find.canCall')}`}
                        onPress={() => open(c)}
                        style={styles.voicePill}>
                        <View style={styles.voiceAvatarWrap}>
                          <CharacterAvatar character={c} size={36} />
                          <View style={styles.voiceDot} pointerEvents="none" />
                        </View>
                        <InkText variant="subStrong" color={ink.text} lines={1}>
                          {shortName(c.name)}
                        </InkText>
                        <SFIcon ios="phone.fill" icon="call-outline" size={14} color={ink.text2} />
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
      <RoleSheet
        visible={rolesOpen}
        roles={seats.filter((s) => !s.who).map((s) => s.role)}
        onClose={() => setRolesOpen(false)}
        onPick={(role) => {
          setRolesOpen(false);
          // One sheet at a time: iOS cannot show the next while the last one is still leaving.
          setTimeout(() => setFamilyRole(role), Platform.OS === 'ios' ? 350 : 0);
        }}
      />
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

/** A section's heading in the serif, with an optional tabular count on the right. */
function Section({ title, count, first }: { title: string; count?: number; first?: boolean }) {
  return (
    <View style={[styles.sectionRow, first && styles.sectionRowFirst]}>
      <InkText variant="card" accessibilityRole="header" style={styles.section}>
        {title}
      </InkText>
      {count != null ? (
        <InkText variant="footnote" color={ink.text3} style={styles.tabular}>
          {count}
        </InkText>
      ) : null}
    </View>
  );
}

/** Everyone / Him / Her on the kit's segmented control. */
function WhoSwitch({ value, onChange }: { value: Who; onChange: (who: Who) => void }) {
  const { t } = useTranslation();
  return <InkSegmented options={WHO.map((option) => ({ value: option, label: t(`find.who.${option}`) }))} value={value} onChange={onChange} style={styles.who} />;
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
          <Section title={t('find.topHit')} first />
          <View style={styles.topHit}>
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={top.name}
              onPress={() => onOpen(top)}
              style={styles.topOpen}>
              <CharacterAvatar character={top} size={68} />
              <View style={styles.flex}>
                <InkText variant="cardSmall" lines={1}>
                  {top.name}
                </InkText>
                {top.series ? <WorldLine series={top.series} /> : null}
              </View>
            </PressableScale>
            <PressableScale
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={`${t('find.sayHi')}, ${top.name}`}
              onPress={() => onSayHi(top)}
              style={styles.topButton}>
              <InkText variant="subStrong" color={ink.onPill}>
                {t('find.sayHi')}
              </InkText>
            </PressableScale>
          </View>
        </>
      ) : null}

      {rest.length > 0 ? (
        <>
          <Section title={t('find.charactersSection')} />
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
                  <InkText variant="bodyStrong" lines={1}>
                    {c.name}
                  </InkText>
                  {c.series ? <WorldLine series={c.series} /> : null}
                </View>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}

      {worlds.length > 0 ? (
        <>
          <Section title={t('find.worlds')} />
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
                  <InkText variant="bodyStrong" lines={1} style={styles.flex}>
                    {phrase(g.series)}
                  </InkText>
                  <Ionicons name="chevron-forward" size={16} color={ink.text3} />
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
          <Section title={t('find.recentlyViewed')} first />
          <View style={styles.viewed}>
            {viewed.map((c) => (
              <PressableScale
                key={c.id}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => onOpen(c)}
                style={styles.viewedItem}>
                <CharacterAvatar character={c} size={64} ring ringColor={ink.edge} />
                <InkText variant="caption" color={ink.text} lines={1}>
                  {shortName(c.name)}
                </InkText>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
      {searches.length > 0 ? (
        <>
          <View style={[styles.sectionRow, viewed.length === 0 && styles.sectionRowFirst]}>
            <InkText variant="card" accessibilityRole="header" style={styles.section}>
              {t('find.recentSearches')}
            </InkText>
            <PressableScale scaleTo={0.94} hitSlop={8} accessibilityRole="button" onPress={onClear}>
              <InkText variant="subStrong" color={ink.accent}>
                {t('find.clear')}
              </InkText>
            </PressableScale>
          </View>
          {/* Recent searches as chips: one tap puts the words back in the field. */}
          <View style={styles.chips}>
            {searches.map((term) => (
              <PressableScale
                key={term}
                scaleTo={0.95}
                accessibilityRole="button"
                accessibilityLabel={term}
                onPress={() => onSearch(term)}
                style={styles.chip}>
                <Ionicons name="search" size={13} color={ink.text} />
                <InkText variant="sub" color={ink.text} lines={1} style={styles.chipText}>
                  {term}
                </InkText>
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
      <View style={[styles.dot, { backgroundColor: WORLDS.find((w) => w.series === series)?.accent ?? ink.text3 }]} />
      <InkText variant="footnote" lines={1}>
        {phrase(series)}
      </InkText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flexShrink: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.sm,
  },
  search: { flex: 1, minWidth: 0, height: 44, borderRadius: inkRadius.pill },
  who: { marginHorizontal: space.lg, marginTop: space.md },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.xl,
    marginBottom: space.md,
    marginHorizontal: space.lg,
  },
  sectionRowFirst: { marginTop: 0 },
  section: { flexShrink: 1 },
  featuredRow: { paddingHorizontal: space.lg, gap: space.md },
  circles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  voiceRow: { paddingHorizontal: space.lg, gap: 10 },
  voicePill: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  voiceAvatarWrap: { position: 'relative' },
  voiceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: inkRadius.pill,
    backgroundColor: systemColors.green,
    borderWidth: 2,
    borderColor: ink.card,
  },
  topHit: {
    marginHorizontal: space.lg,
    padding: 14,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  topOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  topButton: {
    minHeight: 38,
    paddingHorizontal: space.lg,
    borderRadius: inkRadius.pill,
    justifyContent: 'center',
    backgroundColor: ink.pill,
  },
  list: {
    marginHorizontal: space.lg,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
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
    borderBottomColor: ink.line,
  },
  viewed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.lg,
    rowGap: space.lg,
  },
  viewedItem: { width: '25%', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.lg },
  chip: {
    maxWidth: '100%',
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: inkRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ink.raised,
  },
  chipText: { flexShrink: 1 },
  worldThumb: { width: 72, height: 44, borderRadius: 10 },
  worldLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: inkRadius.pill },
});

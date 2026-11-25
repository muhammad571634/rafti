import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
import { CastGridCard } from '@/components/find/cast-grid-card';
import { CinemaFeatureCard } from '@/components/find/cinema-feature-card';
import { familySeats } from '@/components/find/family-row';
import { FamilySheet } from '@/components/find/family-sheet';
import { MissCard, RoleSheet } from '@/components/find/miss-card';
import { InkChip, InkText, PillButton } from '@/components/ink';
import { useEarlyAccess } from '@/components/plans/early-access';
import { GroupStoryGrid, GroupStorySheet, GroupStoryStrip, useStartGroupStory } from '@/components/stories/group-stories';
import { StoryChips, storiesFor, StorySheet, TROPE_SHELVES, type TropeShelf, useStartStory } from '@/components/stories/stories-shelf';
import { StoryHookCard } from '@/components/stories/story-hook-card';
import { useTemplateStats } from '@/components/stories/use-template-stats';
import { CharacterAvatar, EmptyState, NO_RESULTS, PressableScale, Screen, SearchBar, SFIcon, Sheet } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { isReleased } from '@/economy/early-access';
import { useDiscoveryWeights } from '@/hooks/use-discovery-rank';
import { phrase } from '@/i18n';
import { localCharacter, localGroupStory, localTemplate } from '@/i18n/content';
import { rankCharactersForUser } from '@/lib/discovery-rank';
import {
  CAST_CIRCLES,
  type CastCircle,
  groupStoryFitsGender,
  isGroupStoryMember,
  isOfficialCast,
  isUserCreation,
  searchFindUniverse,
  splitCastForFind,
} from '@/lib/find-discovery';
import { shortName } from '@/lib/format';
import { GROUP_STORIES, type GroupStory } from '@/lib/group-stories';
import { familyOf, type FamilyLabel } from '@/lib/kin';
import { partOfDay } from '@/lib/night-hour';
import { allNew, type StoryTemplate, TEMPLATES, trendingIds } from '@/lib/templates';
import { WORLDS } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, space, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkGutter, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { Character, CharacterGender } from '@/types';

type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
type FindLens = 'forYou' | 'people' | 'groups' | 'stories' | 'family';
type CircleFilter = CastCircle | 'all';

const MAX_WIDTH = 520;
const STORY_PAGE_SIZE = 20;
const SEARCH_TEMPLATES_CAP = 24;
const PICK_STORY_WIDTH = 268;

const heroOf = (c: Character) => HEROES[c.id] ?? PORTRAITS[c.id] ?? characterImage(c);

/**
 * Find v3: Apple editorial header with gender filter sheet + Create CTA, always-visible universal
 * SearchBar (people, group scenes, 100 stories), 5 instant Scope Lenses (For you, People, Groups,
 * Stories, Family), Spotlight carousel with live Call shortcut, 2x2 Cast grid, horizontal painted
 * Group scenes strip, First-Message DM Hook story cards, and Family + Creations cleanly separated.
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
  const conversations = useAppStore((s) => s.conversations);
  const relationships = useAppStore((s) => s.relationships);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const recentlyViewed = useAppStore((s) => s.recentlyViewed);
  const rememberSearch = useAppStore((s) => s.rememberSearch);
  const rememberViewed = useAppStore((s) => s.rememberViewed);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const makeFamily = useAppStore((s) => s.makeFamily);

  const early = useEarlyAccess((conversationId) => router.push(`/chat/${conversationId}`));
  const startGroupStory = useStartGroupStory();
  const startStory = useStartStory();
  const templateStats = useTemplateStats();

  const characters = useMemo(
    () => allCharacters.filter((c) => !blockedIds.includes(c.id) && isReleased(c, Date.now())),
    [allCharacters, blockedIds],
  );

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [who, setWho] = useState<Who>('everyone');
  const [whoSheetOpen, setWhoSheetOpen] = useState(false);
  const [lens, setLens] = useState<FindLens>('forYou');
  const [circleFilter, setCircleFilter] = useState<CircleFilter>('all');
  const [storyTrope, setStoryTrope] = useState<TropeShelf>('forYou');
  const [storyLimit, setStoryLimit] = useState(STORY_PAGE_SIZE);

  const [openGroupStory, setOpenGroupStory] = useState<GroupStory | null>(null);
  const [openStory, setOpenStory] = useState<StoryTemplate | null>(null);
  const [familyRole, setFamilyRole] = useState<FamilyLabel | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);

  const inputRef = useRef<TextInputInstance>(null);
  const weights = useDiscoveryWeights();
  const [hour, setHour] = useState(() => new Date().getHours());
  useFocusEffect(useCallback(() => setHour(new Date().getHours()), []));
  const part = partOfDay(hour);

  const gender: CharacterGender | undefined = who === 'everyone' ? undefined : who;
  const chatOf = useMemo(() => new Map(conversations.map((c) => [c.characterId, c.id])), [conversations]);
  const chattedIds = useMemo(() => new Set(chatOf.keys()), [chatOf]);

  // Reset pagination whenever story filter or gender changes.
  useEffect(() => {
    setStoryLimit(STORY_PAGE_SIZE);
  }, [storyTrope, who]);

  // Ranked official Cast 2.0 matching the Everyone / Him / Her switch (zero spawned group members).
  const officialPool = useMemo(
    () => characters.filter((c) => isOfficialCast(c) && (!gender || c.gender === gender)),
    [characters, gender],
  );
  const rankedOfficial = useMemo(() => rankCharactersForUser(officialPool, weights, part), [officialPool, weights, part]);
  const { ordered: orderedCast, spotlight, gridPreview } = useMemo(
    () => splitCastForFind(rankedOfficial, chattedIds, (c) => Boolean(heroOf(c))),
    [rankedOfficial, chattedIds],
  );

  const matchingGroups = useMemo(() => GROUP_STORIES.filter((g) => groupStoryFitsGender(g, gender)), [gender]);

  // Clear circle filter if active gender hides all characters inside it.
  const activeCircles = useMemo(
    () => CAST_CIRCLES.filter((circle) => orderedCast.some((c) => c.series === circle)),
    [orderedCast],
  );
  useEffect(() => {
    if (circleFilter !== 'all' && !activeCircles.includes(circleFilter)) setCircleFilter('all');
  }, [circleFilter, activeCircles]);

  const peopleGrid = useMemo(
    () => (circleFilter === 'all' ? orderedCast : orderedCast.filter((c) => c.series === circleFilter)),
    [orderedCast, circleFilter],
  );

  // Story templates ranked for the user across `forYou` (home strip) and the active `stories` lens.
  const pickStories = useMemo(() => storiesFor('forYou', gender, templateStats, weights), [gender, templateStats, weights]);
  const pickStoriesTop = useMemo(() => pickStories.slice(0, 6), [pickStories]);
  const pickTrending = useMemo(() => trendingIds(pickStoriesTop, templateStats), [pickStoriesTop, templateStats]);
  const pickQuiet = useMemo(() => allNew(pickStoriesTop, templateStats, pickTrending), [pickStoriesTop, templateStats, pickTrending]);

  const shelfStories = useMemo(() => storiesFor(storyTrope, gender, templateStats, weights), [storyTrope, gender, templateStats, weights]);
  const shelfTrending = useMemo(() => trendingIds(shelfStories, templateStats), [shelfStories, templateStats]);
  const shelfQuiet = useMemo(() => allNew(shelfStories, templateStats, shelfTrending), [shelfStories, templateStats, shelfTrending]);
  const visibleStories = useMemo(() => shelfStories.slice(0, storyLimit), [shelfStories, storyLimit]);

  const ownTemplateMap = useMemo(() => {
    const map = new Map<string, Character>();
    for (const c of characters) {
      if (c.fromTemplate && !isGroupStoryMember(c) && c.handle !== '@stories' && !c.isOfficial) {
        map.set(c.fromTemplate, c);
      }
    }
    return map;
  }, [characters]);

  // Universal Search across Cast + creations, Group scenes, and 100 Solo Stories.
  const q = query.trim();
  const searchResults = useMemo(
    () =>
      searchFindUniverse({
        query: q,
        gender,
        people: characters,
        groups: GROUP_STORIES,
        templates: TEMPLATES,
        localizeCharacter: (c) => localCharacter(c),
        localizeGroup: (g) => localGroupStory(g),
        localizeTemplate: (t) => localTemplate(t),
      }),
    [q, gender, characters],
  );
  const searchHasAny = searchResults.people.length > 0 || searchResults.groups.length > 0 || searchResults.templates.length > 0;
  const searchTemplates = useMemo(() => searchResults.templates.slice(0, SEARCH_TEMPLATES_CAP), [searchResults.templates]);
  const searchTemplatesTrending = useMemo(() => trendingIds(searchTemplates, templateStats), [searchTemplates, templateStats]);
  const searchTemplatesQuiet = useMemo(
    () => allNew(searchTemplates, templateStats, searchTemplatesTrending),
    [searchTemplates, templateStats, searchTemplatesTrending],
  );

  // Family / Who do you miss? + Your creations.
  const family = useMemo(() => familyOf(relationships, (id) => characters.some((c) => c.id === id)), [relationships, characters]);
  const seats = useMemo(
    () =>
      familySeats((role) => {
        const character = characters.find((c) => c.id === family[role]);
        return character ? { character, name: displayName(character, relationships[character.id]) } : undefined;
      }),
    [family, characters, relationships],
  );
  const openFamilyRoles = useMemo(() => seats.filter((s) => !s.who).map((s) => s.role), [seats]);
  const kinIds = useMemo(() => new Set(Object.values(family)), [family]);
  const nonGroupAll = useMemo(() => characters.filter((c) => !isGroupStoryMember(c)), [characters]);
  const rankedNonGroup = useMemo(() => rankCharactersForUser(nonGroupAll, weights, part), [nonGroupAll, weights, part]);
  const kinFriends = useMemo(() => rankedNonGroup.filter((c) => chatOf.has(c.id) && !kinIds.has(c.id)), [rankedNonGroup, chatOf, kinIds]);
  const kinOthers = useMemo(() => rankedNonGroup.filter((c) => !chatOf.has(c.id) && !early.locked(c)), [rankedNonGroup, chatOf, early]);
  const userCreations = useMemo(() => characters.filter((c) => isUserCreation(c) && (!gender || c.gender === gender)), [characters, gender]);

  const viewed = useMemo(
    () =>
      recentlyViewed
        .map((id) => characters.find((c) => c.id === id))
        .filter((c): c is Character => c != null)
        .filter((c) => !isGroupStoryMember(c)),
    [recentlyViewed, characters],
  );

  const switchLens = useCallback((next: FindLens) => {
    setLens(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const openCharacter = useCallback(
    (c: Character) => {
      rememberViewed(c.id);
      if (q) rememberSearch(q);
      router.push(`/character/${c.id}`);
    },
    [rememberViewed, rememberSearch, q, router],
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

  const callCharacter = useCallback(
    (c: Character) => {
      if (early.locked(c)) {
        early.add(c);
        return;
      }
      if (!chatOf.has(c.id)) useAppStore.getState().addFriend(c.id);
      router.push(`/call/${c.id}`);
    },
    [early, chatOf, router],
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
  const featureWidth = Math.round(Math.min(page * 0.84, 336));
  const featureHeight = Math.round(featureWidth * 1.18);
  const gridCardWidth = (page - inkGutter * 2 - space.md) / 2;

  return (
    <Screen background={ink.ground}>
      {/* Compact Editorial Header: Find + Gender Filter Pill + "+ Create" */}
      <View style={styles.head}>
        <InkText variant="display" style={styles.title}>
          {t('find.title')}
        </InkText>
        <View style={styles.headActions}>
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t(`find.who.${who}`)}
            onPress={() => setWhoSheetOpen(true)}
            style={[styles.whoPill, who !== 'everyone' && styles.whoPillActive]}>
            <InkText variant="footnoteStrong" color={who !== 'everyone' ? ink.accent : ink.text} lines={1}>
              {t(`find.who.${who}`)}
            </InkText>
            <Ionicons name="chevron-down" size={13} color={who !== 'everyone' ? ink.accent : ink.text2} />
          </PressableScale>

          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.createCharacter')}
            onPress={() => router.push('/create-character')}
            style={styles.createPill}>
            <Ionicons name="add" size={16} color={ink.accent} />
            <InkText variant="footnoteStrong" color={ink.accent} lines={1}>
              {t('find.createShort')}
            </InkText>
          </PressableScale>
        </View>
      </View>

      {/* Always-Visible Inline Search Bar */}
      <View style={styles.searchRow}>
        <SearchBar
          tone="light"
          inputRef={inputRef}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!searching && text.length > 0) setSearching(true);
          }}
          onFocus={() => setSearching(true)}
          onSubmit={() => rememberSearch(query)}
          placeholder={t('find.searchAllPlaceholder')}
          style={styles.search}
        />
        {searching ? (
          <PressableScale
            scaleTo={0.95}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('find.closeSearch')}
            onPress={closeSearch}
            style={styles.cancelBtn}>
            <InkText variant="subStrong" color={ink.accent} lines={1}>
              {t('common.cancel')}
            </InkText>
          </PressableScale>
        ) : null}
      </View>

      {/* Single Row of 5 Instant Scope Lenses */}
      {!searching && !q ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lensRow} style={styles.lensWrap}>
          <InkChip label={t('stories.tropes.forYou')} on={lens === 'forYou'} onPress={() => switchLens('forYou')} />
          <InkChip label={`${t('find.lensPeople')} · ${orderedCast.length}`} on={lens === 'people'} onPress={() => switchLens('people')} />
          <InkChip label={`${t('find.lensGroups')} · ${matchingGroups.length}`} on={lens === 'groups'} onPress={() => switchLens('groups')} />
          <InkChip label={`${t('find.lensStories')} · ${TEMPLATES.length}`} on={lens === 'stories'} onPress={() => switchLens('stories')} />
          <InkChip label={t('find.lensFamily')} on={lens === 'family'} onPress={() => switchLens('family')} />
        </ScrollView>
      ) : null}

      {q && !searchHasAny ? (
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
            paddingTop: space.md,
            paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.huge,
          }}>
          {q ? (
            <UniversalSearchResults
              people={searchResults.people}
              groups={searchResults.groups}
              templates={searchTemplates}
              templatesTrending={searchTemplatesTrending}
              templatesQuiet={searchTemplatesQuiet}
              templateStats={templateStats}
              ownTemplateMap={ownTemplateMap}
              chatOf={chatOf}
              onOpenPerson={openCharacter}
              onSayHi={sayHi}
              onOpenGroup={setOpenGroupStory}
              onStartStory={startStory}
              onOpenStoryDetails={setOpenStory}
            />
          ) : searching ? (
            <Recent
              viewed={viewed}
              searches={recentSearches}
              onOpen={openCharacter}
              onSearch={(term) => {
                setQuery(term);
                inputRef.current?.focus();
              }}
              onClear={clearRecentSearches}
            />
          ) : lens === 'people' ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleChips}>
                <InkChip label={t('find.categories.all')} on={circleFilter === 'all'} onPress={() => setCircleFilter('all')} />
                {activeCircles.map((circle) => (
                  <InkChip key={circle} label={phrase(circle)} on={circleFilter === circle} onPress={() => setCircleFilter(circle)} />
                ))}
              </ScrollView>
              <View style={styles.castGrid}>
                {peopleGrid.map((c) => (
                  <CastGridCard
                    key={c.id}
                    character={c}
                    width={gridCardWidth}
                    inChats={chattedIds.has(c.id)}
                    onOpen={() => openCharacter(c)}
                    onCall={c.voiceReady ? () => callCharacter(c) : undefined}
                  />
                ))}
              </View>
            </>
          ) : lens === 'groups' ? (
            <GroupStoryGrid gender={gender} onSelect={setOpenGroupStory} />
          ) : lens === 'stories' ? (
            <>
              <StoryChips value={storyTrope} onChange={(next) => next !== 'groups' && setStoryTrope(next)} shelves={TROPE_SHELVES} />
              <View style={styles.hookList}>
                {visibleStories.map((item) => (
                  <StoryHookCard
                    key={item.id}
                    item={item}
                    own={ownTemplateMap.get(item.id)}
                    stats={templateStats[item.id]}
                    trending={shelfTrending.has(item.id)}
                    quiet={shelfQuiet}
                    onPress={() => startStory(item)}
                    onStory={() => setOpenStory(item)}
                  />
                ))}
              </View>
              {storyLimit < shelfStories.length ? (
                <View style={styles.moreWrap}>
                  <PillButton
                    label={`${t('stories.seeAll')} (${visibleStories.length}/${shelfStories.length})`}
                    kind="secondary"
                    full={false}
                    onPress={() => setStoryLimit((n) => n + STORY_PAGE_SIZE)}
                  />
                </View>
              ) : null}
            </>
          ) : lens === 'family' ? (
            <>
              <Section title={t('find.missTitle')} first />
              <MissCard seats={seats} onOpen={openFamily} onAdd={() => setRolesOpen(true)} />

              {openFamilyRoles.length > 0 ? (
                <View style={styles.familyRoles}>
                  {openFamilyRoles.map((role) => (
                    <PressableScale
                      key={role}
                      scaleTo={0.96}
                      accessibilityRole="button"
                      accessibilityLabel={t('find.chooseRole', { role: phrase(role) })}
                      onPress={() => setFamilyRole(role)}
                      style={styles.familyRoleTile}>
                      <View style={styles.familyHeartBadge}>
                        <SFIcon ios="heart.fill" icon="heart" size={14} color={ink.accent} />
                      </View>
                      <InkText variant="subStrong" color={ink.text} style={styles.flex} wordSafe>
                        {phrase(role)}
                      </InkText>
                    </PressableScale>
                  ))}
                </View>
              ) : null}

              <Section title={t('find.yourCreations')} count={userCreations.length} />
              {userCreations.length > 0 ? (
                <View style={styles.list}>
                  {userCreations.map((c, i) => {
                    const loc = localCharacter(c);
                    return (
                      <View key={c.id} style={styles.row}>
                        <PressableScale
                          scaleTo={0.99}
                          accessibilityRole="button"
                          accessibilityLabel={c.name}
                          onPress={() => openCharacter(c)}
                          style={styles.rowMain}>
                          <CharacterAvatar character={c} size={48} />
                          <View style={[styles.rowBody, i < userCreations.length - 1 && styles.rowLine]}>
                            <InkText variant="bodyStrong" lines={1}>
                              {c.name}
                            </InkText>
                            {loc.relation || c.bio ? (
                              <InkText variant="footnote" color={ink.text2} lines={1}>
                                {loc.relation ?? c.bio}
                              </InkText>
                            ) : null}
                          </View>
                        </PressableScale>
                        <PressableScale
                          scaleTo={0.94}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('find.sayHi')}, ${c.name}`}
                          onPress={() => sayHi(c)}
                          style={styles.inlineAction}>
                          <InkText variant="footnoteStrong" color={ink.accent} lines={1}>
                            {chatOf.has(c.id) ? t('find.continueChat') : t('find.sayHi')}
                          </InkText>
                        </PressableScale>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <PressableScale
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel={t('find.createCharacter')}
                onPress={() => router.push('/create-character')}
                style={[styles.createCard, userCreations.length > 0 && styles.createCardSpaced]}>
                <View style={styles.createCardIcon}>
                  <Ionicons name="add" size={20} color={inkPeachGlass.ctaText} />
                </View>
                <InkText variant="bodyStrong" color={ink.text} style={styles.flex}>
                  {t('find.createCharacter')}
                </InkText>
                <Ionicons name="chevron-forward" size={18} color={ink.text3} />
              </PressableScale>
            </>
          ) : (
            /* DEFAULT "FOR YOU" CURATED EDITORIAL HOME */
            <>
              {spotlight.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={featureWidth + space.md}
                  decelerationRate="fast"
                  contentContainerStyle={styles.horizontalRow}>
                  {spotlight.map((c) => (
                    <CinemaFeatureCard
                      key={c.id}
                      character={c}
                      width={featureWidth}
                      height={featureHeight}
                      isNew={Boolean(early.fresh(c))}
                      inChats={chattedIds.has(c.id)}
                      onOpen={() => openCharacter(c)}
                      onSayHi={() => sayHi(c)}
                      onCall={c.voiceReady ? () => callCharacter(c) : undefined}
                    />
                  ))}
                </ScrollView>
              ) : null}

              {gridPreview.length > 0 ? (
                <>
                  <Section
                    title={t('find.meetCast')}
                    actionLabel={`${t('find.categories.all')} ${orderedCast.length} →`}
                    onAction={() => switchLens('people')}
                    first={spotlight.length === 0}
                  />
                  <View style={styles.castGrid}>
                    {gridPreview.map((c) => (
                      <CastGridCard
                        key={c.id}
                        character={c}
                        width={gridCardWidth}
                        inChats={chattedIds.has(c.id)}
                        onOpen={() => openCharacter(c)}
                        onCall={c.voiceReady ? () => callCharacter(c) : undefined}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {matchingGroups.length > 0 ? (
                <>
                  <Section
                    title={t('find.groupScenes')}
                    actionLabel={`${t('find.categories.all')} ${matchingGroups.length} →`}
                    onAction={() => switchLens('groups')}
                  />
                  <GroupStoryStrip gender={gender} onSelect={setOpenGroupStory} />
                </>
              ) : null}

              {pickStoriesTop.length > 0 ? (
                <>
                  <Section
                    title={t('find.pickStory')}
                    actionLabel={`${t('stories.seeAll')} →`}
                    onAction={() => switchLens('stories')}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    {pickStoriesTop.map((item) => (
                      <StoryHookCard
                        key={item.id}
                        item={item}
                        own={ownTemplateMap.get(item.id)}
                        stats={templateStats[item.id]}
                        trending={pickTrending.has(item.id)}
                        quiet={pickQuiet}
                        width={PICK_STORY_WIDTH}
                        onPress={() => startStory(item)}
                        onStory={() => setOpenStory(item)}
                      />
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Section title={t('find.missTitle')} />
              <MissCard seats={seats} onOpen={openFamily} onAdd={() => setRolesOpen(true)} />
            </>
          )}
        </ScrollView>
      )}

      {early.sheet}

      <GroupStorySheet story={openGroupStory} onClose={() => setOpenGroupStory(null)} onStart={startGroupStory} />
      <StorySheet template={openStory} stats={openStory ? templateStats[openStory.id] : undefined} onClose={() => setOpenStory(null)} />

      {/* Clean iOS 3-option Gender Filter Sheet (Everyone / Him / Her) */}
      <Sheet visible={whoSheetOpen} onClose={() => setWhoSheetOpen(false)}>
        <View style={styles.whoSheet}>
          {WHO.map((option, i) => {
            const active = who === option;
            return (
              <PressableScale
                key={option}
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setWho(option);
                  setWhoSheetOpen(false);
                }}
                style={[styles.whoOption, i < WHO.length - 1 && styles.rowLine]}>
                <InkText variant="bodyStrong" color={active ? ink.accent : ink.text}>
                  {t(`find.who.${option}`)}
                </InkText>
                {active ? <Ionicons name="checkmark" size={20} color={ink.accent} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </Sheet>

      <RoleSheet
        visible={rolesOpen}
        roles={openFamilyRoles}
        onClose={() => setRolesOpen(false)}
        onPick={(role) => {
          setRolesOpen(false);
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

/** Editorial serif section heading with optional tabular count OR peach action link on the trailing side. */
function Section({
  title,
  count,
  actionLabel,
  onAction,
  first,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  first?: boolean;
}) {
  return (
    <View style={[styles.sectionRow, first && styles.sectionRowFirst]}>
      <InkText variant="card" accessibilityRole="header" style={styles.section}>
        {title}
      </InkText>
      {actionLabel && onAction ? (
        <PressableScale scaleTo={0.95} hitSlop={8} accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
          <InkText variant="subStrong" color={ink.accent} lines={1}>
            {actionLabel}
          </InkText>
        </PressableScale>
      ) : count != null ? (
        <InkText variant="footnote" color={ink.text3} style={styles.tabular}>
          {count}
        </InkText>
      ) : null}
    </View>
  );
}

/** Universal search results across People, Group scenes, and 100 Solo Stories. */
function UniversalSearchResults({
  people,
  groups,
  templates,
  templatesTrending,
  templatesQuiet,
  templateStats,
  ownTemplateMap,
  chatOf,
  onOpenPerson,
  onSayHi,
  onOpenGroup,
  onStartStory,
  onOpenStoryDetails,
}: {
  people: Character[];
  groups: GroupStory[];
  templates: StoryTemplate[];
  templatesTrending: ReadonlySet<string>;
  templatesQuiet: boolean;
  templateStats: Readonly<Record<string, ReturnType<typeof useTemplateStats>[string]>>;
  ownTemplateMap: ReadonlyMap<string, Character>;
  chatOf: ReadonlyMap<string, string>;
  onOpenPerson: (c: Character) => void;
  onSayHi: (c: Character) => void;
  onOpenGroup: (g: GroupStory) => void;
  onStartStory: (t: StoryTemplate) => void;
  onOpenStoryDetails: (t: StoryTemplate) => void;
}) {
  const { t } = useTranslation();
  const [top, ...rest] = people;
  const topInChats = top ? chatOf.has(top.id) : false;

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
              onPress={() => onOpenPerson(top)}
              style={styles.topOpen}>
              <CharacterAvatar character={top} size={62} />
              <View style={styles.flex}>
                <InkText variant="cardSmall" lines={1}>
                  {top.name}
                </InkText>
                <View style={styles.topMeta}>
                  {localCharacter(top).relation ? (
                    <InkText variant="footnote" color={friendAccent(top.id).strong} lines={1}>
                      {localCharacter(top).relation}
                    </InkText>
                  ) : null}
                  {top.series ? <WorldLine series={top.series} /> : null}
                </View>
              </View>
            </PressableScale>
            <PressableScale
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={`${topInChats ? t('find.continueChat') : t('find.sayHi')}, ${top.name}`}
              onPress={() => onSayHi(top)}
              style={styles.topButton}>
              <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <InkText variant="subStrong" color={inkPeachGlass.ctaText} lines={1}>
                {topInChats ? t('find.continueChat') : t('find.sayHi')}
              </InkText>
            </PressableScale>
          </View>
        </>
      ) : null}

      {rest.length > 0 ? (
        <>
          <Section title={t('find.lensPeople')} count={rest.length} first={!top} />
          <View style={styles.list}>
            {rest.map((c, i) => (
              <PressableScale
                key={c.id}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                onPress={() => onOpenPerson(c)}
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

      {groups.length > 0 ? (
        <>
          <Section title={t('find.groupScenes')} count={groups.length} first={people.length === 0} />
          <View style={styles.list}>
            {groups.map((g, i) => {
              const loc = localGroupStory(g);
              const cover = PORTRAITS[g.id];
              return (
                <PressableScale
                  key={g.id}
                  scaleTo={0.99}
                  accessibilityRole="button"
                  accessibilityLabel={loc.name}
                  onPress={() => onOpenGroup(g)}
                  style={styles.groupRow}>
                  {cover ? <Image source={cover} style={styles.groupThumb} contentFit="cover" contentPosition="top" /> : null}
                  <View style={[styles.groupRowBody, i < groups.length - 1 && styles.rowLine]}>
                    <View style={styles.groupTitleLine}>
                      <InkText variant="bodyStrong" lines={1} style={styles.flex}>
                        {loc.name}
                      </InkText>
                      <InkText variant="caption" color={ink.accent} lines={1}>
                        {t('find.scenesCount', { count: g.beats.length })}
                      </InkText>
                    </View>
                    <InkText variant="footnote" color={ink.text2} lines={2}>
                      {loc.hook}
                    </InkText>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </>
      ) : null}

      {templates.length > 0 ? (
        <>
          <Section title={t('find.lensStories')} count={templates.length} first={people.length === 0 && groups.length === 0} />
          <View style={styles.hookList}>
            {templates.map((item) => (
              <StoryHookCard
                key={item.id}
                item={item}
                own={ownTemplateMap.get(item.id)}
                stats={templateStats[item.id]}
                trending={templatesTrending.has(item.id)}
                quiet={templatesQuiet}
                onPress={() => onStartStory(item)}
                onStory={() => onOpenStoryDetails(item)}
              />
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

/** Recent viewed faces and recent search terms shown when Search is focused before typing. */
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
    paddingHorizontal: inkGutter,
    paddingTop: space.sm,
  },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1 },
  whoPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  whoPillActive: {
    backgroundColor: inkPeachGlass.flat,
    borderColor: inkPeachGlass.rim,
  },
  createPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: inkPeachGlass.flat,
    borderWidth: 1,
    borderColor: inkPeachGlass.rim,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: inkGutter,
    marginTop: space.sm,
  },
  search: {
    flex: 1,
    minWidth: 0,
    height: 40,
    backgroundColor: ink.card,
    borderColor: ink.edge,
    borderRadius: inkRadius.field,
  },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  // A ScrollView shrinks by default: in the screen's column it lost a few points and cut the pills' bottoms (A51 2026-11-25).
  lensWrap: { flexGrow: 0, flexShrink: 0, marginTop: space.sm },
  lensRow: {
    gap: 8,
    paddingHorizontal: inkGutter,
    paddingBottom: space.xs,
  },
  circleChips: {
    gap: 8,
    paddingHorizontal: inkGutter,
    paddingBottom: space.md,
  },
  horizontalRow: {
    paddingHorizontal: inkGutter,
    gap: space.md,
  },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: inkGutter,
  },
  hookList: {
    gap: 10,
    paddingHorizontal: inkGutter,
  },
  moreWrap: {
    alignItems: 'center',
    paddingTop: space.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.xl,
    marginBottom: space.md,
    marginHorizontal: inkGutter,
  },
  sectionRowFirst: { marginTop: space.xs },
  section: { flexShrink: 1 },
  topHit: {
    marginHorizontal: inkGutter,
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
  topOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  topMeta: { gap: 2, marginTop: 2 },
  topButton: {
    minHeight: 38,
    paddingHorizontal: space.lg,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: inkPeachGlass.ctaRim,
  },
  list: {
    marginHorizontal: inkGutter,
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
    paddingRight: space.md,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowBody: {
    flex: 1,
    minHeight: 68,
    justifyContent: 'center',
    gap: 2,
    paddingRight: space.sm,
  },
  rowLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ink.line,
  },
  inlineAction: { paddingVertical: 8, paddingHorizontal: 4 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  groupThumb: {
    width: 48,
    height: 64,
    borderRadius: 12,
    marginVertical: 10,
    backgroundColor: ink.raised,
  },
  groupRowBody: {
    flex: 1,
    minHeight: 84,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  groupTitleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  familyRoles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: inkGutter,
    marginTop: space.md,
  },
  familyRoleTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  familyHeartBadge: {
    width: 32,
    height: 32,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.tintFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCard: {
    marginHorizontal: inkGutter,
    padding: 16,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createCardSpaced: { marginTop: space.md },
  createCardIcon: {
    width: 36,
    height: 36,
    borderRadius: inkRadius.pill,
    backgroundColor: inkPeachGlass.ctaSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoSheet: { paddingBottom: space.xs },
  whoOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  viewed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: inkGutter,
    rowGap: space.lg,
  },
  viewedItem: { width: '25%', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: inkGutter },
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
  worldLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: inkRadius.pill },
});

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  type TextInputInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { portraitPosition } from '@/components/chat/chat-ground';
import { familySeats } from '@/components/find/family-row';
import { MissCard, RoleSheet } from '@/components/find/miss-card';
import { FamilySheet } from '@/components/find/family-sheet';
import { useEarlyAccess } from '@/components/plans/early-access';
import { InkSegmented, InkText, tileTint } from '@/components/ink';
import { CharacterAvatar, EmptyState, GlassButton, NO_RESULTS, PressableScale, Screen, SearchBar } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { isNewCharacter, isReleased } from '@/economy/early-access';
import { familyOf, type FamilyLabel } from '@/lib/kin';
import { leadFirst, partOfDay } from '@/lib/night-hour';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { groupBySeries, type CharacterGroup } from '@/mock';
import { WORLDS } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, friendColor, space, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character, CharacterGender } from '@/types';

/** Who to show; characters without a gender (some user creations) show under "Everyone" only. */
type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
/** Under the words on a scene: clear on the face, dark at the foot. */
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] as const;
/** "Say hi" is 40 pt tall; this makes its tap area HIG's 44 pt. */
const SAY_HI_SLOP = { top: 2, bottom: 2, left: 4, right: 4 };
const SAY_HI_H = 40;
/** The page never grows past a phone's width (tablets, web), so cards keep their shape. */
const MAX_WIDTH = 520;
const WHITE = '#FFFFFF';
/** The press that fans a folder's cards: lively, settles fast, still under Reduce Motion. */
const FAN = { damping: 14, stiffness: 260, mass: 0.7, reduceMotion: ReduceMotion.System };

const heroOf = (c: Character) => HEROES[c.id] ?? PORTRAITS[c.id] ?? characterImage(c);
const imageOf = (c: Character) => {
  const src = characterImage(c);
  return typeof src === 'string' ? { uri: src } : src;
};

/**
 * Discovery on Apple's white ground (design-style §10, the approved four-tab prototype), built as iOS's
 * search tab landing page (HIG Search fields: a search field on top, suggestions and categories
 * before typing): the big rounded title with the apricot create button, the search field, Everyone /
 * Him / Her, a paging row of new characters as big scene cards, the family seats, the worlds as
 * coloured folders with three faces peeking out (a press fans them out), and "Talk now" for friends
 * who can take a call. Tapping the field turns the screen into search: recently viewed faces and
 * recent searches before typing, results while typing, the best match on top, then the rest.
 */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Tapping this tab again while it is open scrolls back to the top, as on iOS (the tab bar emits
  // tabPress on the current tab too).
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

  // The hour, read again on each visit: the friend it belongs to leads the row (audit §8.2.4).
  const [hour, setHour] = useState(() => new Date().getHours());
  useFocusEffect(useCallback(() => setHour(new Date().getHours()), []));
  // New releases first; without any, one face from each world keeps the row alive. The friend of the
  // hour (morning Sam, afternoon Caleb, evening Milo, after midnight Mia) opens it, as on the first run.
  const featured = useMemo(() => {
    const fresh = shown
      .filter((c) => isNewCharacter(c, Date.now()))
      .sort((a, b) => Date.parse(b.releasedAt!) - Date.parse(a.releasedAt!));
    // A character still waiting for their art (docs/worlds-plan.md) has no scene to show here.
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

  const page = Math.min(width, MAX_WIDTH);
  // A new character's card leaves the next one peeking, so the row reads as a row.
  const featureWidth = Math.round(Math.min(page * 0.74, 300));
  const featureHeight = Math.round(featureWidth * 1.24);
  const folderWidth = Math.floor((page - space.lg * 2 - space.md) / 2);

  return (
    <Screen background={ink.ground}>
      {searching ? null : (
        <View style={styles.head}>
          <InkText variant="display" style={styles.title}>
            {t('find.title')}
          </InkText>
          <GlassButton icon="add" accessibilityLabel={t('a11y.createCharacter')} onPress={() => router.push('/create-character')} />
        </View>
      )}

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
        {searching ? (
          <GlassButton icon="close" accessibilityLabel={t('find.closeSearch')} onPress={closeSearch} />
        ) : null}
      </View>
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
                    height={featureHeight}
                    isNew={!!early.fresh(c)}
                    onOpen={() => open(c)}
                    onSayHi={() => sayHi(c)}
                  />
                ))}
              </ScrollView>

              <Section title={t('find.missTitle')} />
              <MissCard seats={seats} onOpen={openFamily} onAdd={() => setRolesOpen(true)} />

              <Section title={t('find.worlds')} count={groups.length} />
              <View style={styles.folders}>
                {groups.map((g, i) => (
                  <WorldFolder key={g.series} group={g} index={i} width={folderWidth} onOpen={openWorld} />
                ))}
              </View>

              {callable.length > 0 ? (
                <>
                  <Section title={t('find.talkNow')} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
                    {callable.map((c) => (
                      <PressableScale
                        key={c.id}
                        scaleTo={0.94}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                        onPress={() => open(c)}
                        style={styles.face}>
                        <CharacterAvatar character={c} size={72} ring ringColor={WHITE} verified badge="call" />
                        <InkText variant="caption" color={ink.text} lines={1}>
                          {c.name.split(' ')[0]}
                        </InkText>
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

/** A section's heading in the serif, with an optional count on the right. */
function Section({ title, count, first }: { title: string; count?: number; first?: boolean }) {
  return (
    <View style={[styles.sectionRow, first && styles.sectionRowFirst]}>
      <InkText variant="card" accessibilityRole="header" style={styles.section}>
        {title}
      </InkText>
      {count != null ? <InkText variant="footnote">{count}</InkText> : null}
    </View>
  );
}

/** Everyone / Him / Her on the kit's segmented control. */
function WhoSwitch({ value, onChange }: { value: Who; onChange: (who: Who) => void }) {
  const { t } = useTranslation();
  return <InkSegmented options={WHO.map((option) => ({ value: option, label: t(`find.who.${option}`) }))} value={value} onChange={onChange} style={styles.who} />;
}

/**
 * One new character: their scene as a tall card, a tilted "New" sticker, the name big and the world
 * under it, and a clear glass "Say hi" the picture shows through (the owner's pick; a frosted
 * capsule was tried and reverted, D95).
 */
function Feature({
  character,
  width,
  height,
  isNew,
  onOpen,
  onSayHi,
}: {
  character: Character;
  width: number;
  height: number;
  isNew: boolean;
  onOpen: () => void;
  onSayHi: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.feature, { width, height }]}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={character.name}
        onPress={onOpen}
        style={StyleSheet.absoluteFill}>
        <Image
          source={heroOf(character)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={HEROES[character.id] ? undefined : portraitPosition(character.id, width / height)}
          transition={150}
        />
        <LinearGradient colors={SCRIM} style={styles.featureScrim} />
        {isNew ? (
          <View style={styles.newSticker}>
            <InkText variant="caption" color={colors.onMedia}>
              {t('find.newBadge')}
            </InkText>
          </View>
        ) : null}
        <View style={styles.featureFoot}>
          <InkText variant="title" color={colors.onMedia} lines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {character.name}
          </InkText>
          {character.series ? (
            <InkText variant="footnote" color={colors.onMediaMuted} lines={1} style={styles.featureWorld}>
              {phrase(character.series)}
            </InkText>
          ) : null}
        </View>
      </PressableScale>
      {/* A sibling, not a child: a button inside a button is invalid on web. Clear glass: on iOS a light
          blur behind it keeps the words readable on a bright picture, which still shows through. */}
      <PressableScale
        scaleTo={0.92}
        accessibilityRole="button"
        accessibilityLabel={`${t('find.sayHi')}, ${character.name}`}
        onPress={onSayHi}
        hitSlop={SAY_HI_SLOP}
        style={styles.sayHi}>
        {Platform.OS === 'ios' ? <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <Ionicons name="hand-left" size={16} color={WHITE} />
        <InkText variant="subStrong" color={colors.onMedia}>
          {t('find.sayHi')}
        </InkText>
      </PressableScale>
    </View>
  );
}

/** Where the three faces sit in a folder (share of its width / height) and how far a press fans them. */
const CARDS = [
  { left: 0.06, top: 0.1, rotate: -9, fanX: -0.08, fanY: -0.16, fanRotate: -16 },
  { left: 0.27, top: 0.02, rotate: 1, fanX: 0, fanY: -0.24, fanRotate: 1 },
  { left: 0.48, top: 0.09, rotate: 10, fanX: 0.08, fanY: -0.16, fanRotate: 16 },
] as const;
/** The middle face is drawn last, on top of the other two. */
const DRAW_ORDER = [0, 2, 1] as const;

/**
 * A world as a folder in a deep Ink tint (design-audit §8.1): a back panel with its tab, three of its
 * people as cards peeking out, and the front with the world's name in the serif and its head count. A press fans the cards up and out, a release
 * settles them; the tap opens the world. Memoised: Find re-renders on every keystroke of a search.
 */
const WorldFolder = memo(function WorldFolder({
  group,
  index,
  width,
  onOpen,
}: {
  group: CharacterGroup;
  index: number;
  width: number;
  onOpen: (group: CharacterGroup) => void;
}) {
  const { t } = useTranslation();
  const [front, back] = tileTint(index);
  const height = Math.round(width * 0.92);
  const card = Math.round(width * 0.46);
  const fan = useSharedValue(0);
  const name = phrase(group.series);
  const faces = group.characters.slice(0, 3);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: 1 - fan.value * 0.03 }] }));

  return (
    <Pressable
      onPress={() => onOpen(group)}
      onPressIn={() => {
        fan.value = withSpring(1, FAN);
      }}
      onPressOut={() => {
        fan.value = withSpring(0, FAN);
      }}
      accessibilityRole="button"
      accessibilityLabel={t('find.openWorld', { world: name })}>
      <Animated.View style={[{ width, height }, press]}>
        <View style={[styles.folderBack, { backgroundColor: back, top: height * 0.14 }]}>
          <View style={[styles.folderTab, { backgroundColor: back, width: width * 0.46 }]} />
        </View>
        {DRAW_ORDER.map((i) =>
          faces[i] ? (
            <FolderCard key={faces[i].id} character={faces[i]} index={i} size={card} width={width} height={height} fan={fan} />
          ) : null,
        )}
        <View style={[styles.folderFront, { backgroundColor: front, height: height * 0.52 }]}>
          {/* The name sits on a fixed pocket under the faces: one line that shrinks, never rising over the photos. */}
          <InkText variant="cardSmall" lines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1.3}>
            {name}
          </InkText>
          {/* How many people live there, with the glyph the world page uses. */}
          <View style={styles.folderCount}>
            <Ionicons name="person" size={11} color={ink.text2} />
            <InkText variant="caption">{group.characters.length}</InkText>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

function FolderCard({
  character,
  index,
  size,
  width,
  height,
  fan,
}: {
  character: Character;
  index: number;
  size: number;
  width: number;
  height: number;
  fan: SharedValue<number>;
}) {
  const spot = CARDS[index];
  // A creation's photo can be gone from the phone: fall back to its initial, as avatars do.
  const [broken, setBroken] = useState(false);
  const source = broken ? undefined : imageOf(character);
  const hue = friendColor(character.id);
  const cardHeight = Math.round((size * 4) / 3);
  const move = useAnimatedStyle(() => ({
    transform: [
      { translateX: fan.value * spot.fanX * width },
      { translateY: fan.value * spot.fanY * cardHeight },
      { rotate: `${interpolate(fan.value, [0, 1], [spot.rotate, spot.fanRotate])}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.folderCard, { left: spot.left * width, top: spot.top * height, width: size, height: cardHeight }, move]}>
      {source ? (
        <Image
          source={source}
          style={styles.folderImage}
          contentFit="cover"
          transition={120}
          recyclingKey={character.id}
          onError={() => setBroken(true)}
        />
      ) : (
        // A creation without a picture yet: its initial on the friend's own hue, never a blank card.
        <View style={[styles.folderImage, styles.folderInitial, { backgroundColor: hue.fill }]}>
          <InkText variant="title" color={hue.ink} maxFontSizeMultiplier={1}>
            {character.name.trim().charAt(0).toUpperCase() || '?'}
          </InkText>
        </View>
      )}
    </Animated.View>
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
          <Section title={t('find.topHit')} first />
          <View style={styles.topHit}>
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={top.name}
              onPress={() => onOpen(top)}
              style={styles.topOpen}>
              <CharacterAvatar character={top} size={72} />
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
                <CharacterAvatar character={c} size={68} ring ringColor={WHITE} />
                <InkText variant="caption" color={ink.text} lines={1}>
                  {c.name.split(' ')[0]}
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

/** A soft shadow on iOS only: Android elevation would lift a card over what is drawn after it. */
const softShadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } },
  default: {},
});

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  title: { flexShrink: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
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
  feature: { borderRadius: inkRadius.card, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: ink.card },
  featureScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  // "New" in clear glass on the picture, as the Say hi button.
  newSticker: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  featureFoot: { position: 'absolute', left: space.lg, right: space.lg, bottom: 16 + SAY_HI_H + 10 },
  featureWorld: { marginTop: 2 },
  // Clear glass on a photo (HIG: the clear variant is for components over rich media).
  sayHi: {
    position: 'absolute',
    left: space.lg,
    bottom: 16,
    height: SAY_HI_H,
    paddingHorizontal: 16,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  // Worlds: two folders a row; the gap above each lets the fanned cards rise without hitting the row above.
  folders: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.md,
    rowGap: 28,
    paddingTop: 10,
    paddingHorizontal: space.lg,
  },
  folderBack: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: inkRadius.chip, borderTopLeftRadius: 0 },
  folderTab: { position: 'absolute', left: 0, top: -12, height: 22, borderTopLeftRadius: 12, borderTopRightRadius: 14 },
  folderCard: {
    position: 'absolute',
    borderRadius: 11,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: ink.card,
    ...softShadow,
  },
  folderImage: { flex: 1, borderRadius: 8 },
  folderInitial: { alignItems: 'center', justifyContent: 'center' },
  folderFront: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: inkRadius.chip,
    paddingHorizontal: 12,
    paddingBottom: 10,
    justifyContent: 'flex-end',
    gap: 2,
  },
  folderCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  faces: { paddingHorizontal: space.lg, gap: space.lg },
  face: { width: 76, alignItems: 'center', gap: 6 },
  topHit: {
    marginHorizontal: space.lg,
    padding: 14,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
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

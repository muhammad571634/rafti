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
import { Button, CharacterAvatar, EmptyState, PressableScale, Screen, SearchBar, Segmented, SFIcon, Txt, useScrolledPast } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { isReleased } from '@/economy/early-access';
import { shortName } from '@/lib/format';
import { phrase } from '@/i18n';
import { localCharacter, localized } from '@/i18n/content';
import { chapterAt, chapterState, isEventOn, worldJoinedAt } from '@/lib/world-story';
import { WORLDS, type World } from '@/mock/worlds';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, isDark, space, systemColors } from '@/theme';
import type { Character, CharacterGender, WorldEvent, WorldStory } from '@/types';

type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
const HERO_HEIGHT = 330;
/** The buttons' row under the status bar: 44 pt buttons and their top gap. */
const BAR_ROOM = 44 + space.xs * 2;
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as const;

/**
 * A whole world from Find, like an artist page in Apple Music: its first face's scene
 * full-bleed with the world's name, how many live there and "Surprise me", then who you are here
 * and this week's chapter (docs/worlds-plan.md §3.3), Everyone / Him / Her and everyone in it as one
 * list on the aurora ground, then its events and how its people stand with each other. A row opens
 * the profile; the trailing "+" adds the friend, a mint tick shows one already made. The search
 * button opens a field that filters this list only (HIG Search fields: an inline field when search
 * applies to one view). The story sits in rows of short text (HIG Lists and tables: "prefer
 * displaying text in a list or table"), and the season folds away (HIG Disclosure controls).
 */
export default function WorldScreen() {
  const insets = useSafeAreaInsets();
  const { scrolled: edge, onScroll } = useScrolledPast(HERO_HEIGHT - BAR_ROOM);
  const { t } = useTranslation();
  const router = useRouter();
  const { series } = useLocalSearchParams<{ series: string }>();

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const rememberViewed = useAppStore((s) => s.rememberViewed);
  const relationships = useAppStore((s) => s.relationships);
  const enterWorld = useAppStore((s) => s.enterWorld);
  const startWorldGroup = useAppStore((s) => s.startWorldGroup);
  const early = useEarlyAccess();
  const world = useMemo(() => localized('worlds', WORLDS).find((w) => w.series === series), [series]);

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
  // The whole cast, as the chat and the pushes count it: blocking a friend does not rewind the season.
  const joinedAt = world ? worldJoinedAt(characters.filter((c) => c.series === world.series).map((c) => c.id), relationships) : undefined;
  const friendsHere = people.filter((c) => friendIds.has(c.id));
  const host = world ? characters.find((c) => c.id === world.story.entry.characterId) : undefined;
  const begin = () => {
    if (!world) return;
    const conversationId = enterWorld(world.key);
    if (conversationId) router.push(`/chat/${conversationId}`);
  };
  const openGroup = () => {
    if (!world) return;
    const groupId = startWorldGroup(world.key, phrase(world.series));
    if (groupId) router.push({ pathname: '/group/[id]', params: { id: groupId } });
  };
  const open = (c: Character) => {
    rememberViewed(c.id);
    router.push(`/character/${c.id}`);
  };
  const surprise = () => {
    if (shown.length > 0) open(shown[Math.floor(Math.random() * shown.length)]);
  };

  return (
    <Screen background="aurora" edgeToEdge statusBarStyle={edge && !isDark ? 'dark' : 'light'}>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={[styles.hero, { height: HERO_HEIGHT + insets.top }, world && { backgroundColor: world.accent }]}>
          {lead && (HEROES[lead.id] ?? characterImage(lead)) ? (
            <Image
              source={HEROES[lead.id] ?? characterImage(lead)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          <LinearGradient colors={SCRIM} style={styles.heroScrim} />
          <View style={styles.heroFoot}>
            {/* The whole width: beside the button, a long name in any language broke mid-word. */}
            <Txt style={styles.title} accessibilityRole="header" lines={2}>
              {phrase(series)}
            </Txt>
            <View style={styles.heroMeta}>
              <View style={styles.count}>
                <Ionicons name="person" size={14} color={colors.onMediaSoft} />
                <Txt variant="smallStrong" color={colors.onMediaSoft}>
                  {people.length}
                </Txt>
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
        </View>

        {world ? (
          <>
            <RoleCard
              role={world.story.userRole}
              started={!!host && friendIds.has(host.id)}
              onBegin={host && !blockedIds.includes(host.id) ? begin : undefined}
            />
            <SeasonCard season={world.story.season} joinedAt={joinedAt} />
          </>
        ) : null}

        {searchOpen ? (
          <SearchBar
            tone="aurora"
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('find.searchWorld', { world: phrase(series) })}
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

        {world ? <WorldFoot world={world} people={people} canGroup={friendsHere.length >= 2} onGroup={openGroup} /> : null}
      </ScrollView>

      {/* Past the scene the list would run under the status bar and the buttons: a scroll edge. */}
      {edge ? <View pointerEvents="none" style={[styles.edge, { height: insets.top + BAR_ROOM }]} /> : null}
      {/* Clear glass over the scene (HIG Materials: the clear variant is for rich media). */}
      <View style={[styles.bar, { top: insets.top + space.xs }]} pointerEvents="box-none">
        <PressableScale
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          onPress={() => router.back()}
          style={[styles.mediaButton, edge && styles.edgeButton]}>
          <Ionicons name="chevron-back" size={24} color={edge ? colors.text : colors.onMedia} style={styles.backIcon} />
        </PressableScale>
        <PressableScale
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('find.searchWorld', { world: phrase(series) })}
          onPress={() => {
            if (searchOpen) setQuery('');
            setSearchOpen((v) => !v);
          }}
          style={[styles.mediaButton, edge && styles.edgeButton]}>
          <Ionicons name={searchOpen ? 'close' : 'search'} size={20} color={edge ? colors.text : colors.onMedia} />
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
  const role = localCharacter(character).worldRole;
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
          <View style={styles.rowTop}>
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
          {role ? (
            <Txt style={styles.rowRole} lines={1}>
              {role}
            </Txt>
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

/** Who the user is in this world, and the way in: the scene that starts the story. */
function RoleCard({ role, started, onBegin }: { role: WorldStory['userRole']; started: boolean; onBegin?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, styles.firstCard]}>
      <Txt style={styles.overline}>{t('world.yourRole')}</Txt>
      <Txt style={styles.roleTitle} accessibilityRole="header">
        {role.title}
      </Txt>
      <Txt style={styles.body}>{role.hook}</Txt>
      {onBegin ? (
        <Button
          label={t(started ? 'world.continue' : 'world.start')}
          variant="primary"
          full
          onPress={onBegin}
          style={styles.begin}
        />
      ) : null}
    </View>
  );
}

/** The season: where the story is now; the rest unfolds under it, later chapters locked until their day. */
function SeasonCard({ season, joinedAt }: { season: WorldStory['season']; joinedAt?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = chapterAt(season, joinedAt, new Date());
  const index = current ? season.chapters.indexOf(current) : 0;
  return (
    <View style={styles.card}>
      <PressableScale
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}>
        <View style={styles.seasonHead}>
          <View style={styles.flex}>
            <Txt style={styles.overline}>{t('world.season')}</Txt>
            <Txt style={styles.seasonTitle} lines={2}>
              {season.title}
            </Txt>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.seasonBars}>
          {season.chapters.map((chapter, i) => (
            <View key={chapter.id} style={[styles.seasonBar, i <= index && styles.seasonBarOn]} />
          ))}
        </View>
        {current ? (
          <>
            <Txt style={styles.chapterMeta}>{t('world.chapterOf', { n: index + 1, total: season.chapters.length })}</Txt>
            <Txt style={styles.chapterTitle}>{current.title}</Txt>
            <Txt style={styles.body}>{current.beat}</Txt>
          </>
        ) : null}
      </PressableScale>
      {open
        ? season.chapters.map((chapter) => {
            const state = chapterState(chapter, current);
            return (
              <View key={chapter.id} style={styles.chapterRow}>
                <View style={styles.chapterIcon}>
                  <SFIcon
                    ios={state === 'locked' ? 'lock.fill' : state === 'now' ? 'circle.fill' : 'checkmark.circle.fill'}
                    icon={state === 'locked' ? 'lock-closed' : state === 'now' ? 'ellipse' : 'checkmark-circle'}
                    size={state === 'now' ? 10 : 16}
                    color={state === 'locked' ? colors.textFaint : colors.primary}
                  />
                </View>
                <Txt style={[styles.chapterName, state === 'locked' && styles.locked]} lines={2}>
                  {chapter.title}
                </Txt>
                {state === 'locked' ? <Txt style={styles.chapterDay}>{t('world.day', { n: chapter.opensOnDay + 1 })}</Txt> : null}
              </View>
            );
          })
        : null}
    </View>
  );
}

/** Under the cast: what comes round here, how its people stand with each other, the group chat. */
function WorldFoot({ world, people, canGroup, onGroup }: { world: World; people: Character[]; canGroup: boolean; onGroup: () => void }) {
  const { t } = useTranslation();
  const now = new Date();
  const byId = new Map(people.map((c) => [c.id, c]));
  const ties = world.story.ties.filter((tie) => byId.has(tie.a) && byId.has(tie.b));
  return (
    <>
      {canGroup ? (
        <View style={[styles.card, styles.flush]}>
          <PressableScale scaleTo={0.99} accessibilityRole="button" onPress={onGroup} style={styles.groupRow}>
            <SFIcon ios="person.2.fill" icon="people" size={20} color={colors.primary} />
            <Txt style={[styles.groupLabel, styles.flex]}>{t('world.crew')}</Txt>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </PressableScale>
        </View>
      ) : null}

      <Txt style={styles.section} accessibilityRole="header">
        {t('world.events')}
      </Txt>
      <View style={[styles.card, styles.flush]}>
        {world.story.events.map((event, i) => (
          <EventRow key={event.id} event={event} on={isEventOn(event, now)} last={i === world.story.events.length - 1} />
        ))}
      </View>

      {ties.length ? (
        <>
          <Txt style={styles.section} accessibilityRole="header">
            {t('world.ties')}
          </Txt>
          <View style={[styles.card, styles.flush]}>
            {ties.map((tie, i) => {
              const a = byId.get(tie.a)!;
              const b = byId.get(tie.b)!;
              return (
                <View key={`${tie.a}+${tie.b}`} style={[styles.tieRow, i < ties.length - 1 && styles.rowLine]}>
                  <View style={styles.tieFaces}>
                    <CharacterAvatar character={a} size={40} />
                    <CharacterAvatar character={b} size={40} ring ringColor={colors.surface} style={styles.tieSecond} />
                  </View>
                  <View style={styles.flex}>
                    <Txt style={styles.tieNames} lines={1}>
                      {`${shortName(a.name)} & ${shortName(b.name)}`}
                    </Txt>
                    <Txt style={styles.tieKind}>{t(`world.kinds.${tie.kind}`)}</Txt>
                    <Txt style={styles.tieNote}>{tie.note}</Txt>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </>
  );
}

function EventRow({ event, on, last }: { event: WorldEvent; on: boolean; last: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.eventRow, !last && styles.rowLine]}>
      <SFIcon ios="calendar" icon="calendar" size={20} color={on ? systemColors.pink : colors.textSecondary} />
      <View style={styles.flex}>
        <View style={styles.rowTop}>
          <Txt style={styles.eventTitle}>{event.title}</Txt>
          {on ? (
            <View style={styles.nowPill}>
              <Txt style={styles.nowText}>{t('world.now')}</Txt>
            </View>
          ) : null}
        </View>
        <Txt style={styles.tieKind}>{event.when}</Txt>
        <Txt style={styles.tieNote}>{event.note}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  firstCard: { marginTop: space.lg },
  flush: { padding: 0, overflow: 'hidden' },
  overline: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textSecondary },
  roleTitle: { marginTop: 2, fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.text },
  body: { marginTop: 6, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  begin: { marginTop: 14 },
  seasonHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  seasonTitle: { marginTop: 2, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  seasonBars: { flexDirection: 'row', gap: 4, marginTop: 12 },
  seasonBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt },
  seasonBarOn: { backgroundColor: colors.primary },
  chapterMeta: { marginTop: 12, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  chapterTitle: { marginTop: 2, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, marginTop: 4 },
  chapterIcon: { width: 18, alignItems: 'center' },
  chapterName: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.text },
  chapterDay: { fontSize: 13, color: colors.textSecondary },
  locked: { color: colors.textSecondary },
  section: {
    marginTop: space.xl,
    marginHorizontal: space.lg,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.text,
  },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54, paddingHorizontal: space.lg },
  groupLabel: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  eventTitle: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  nowPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: systemColors.pink },
  nowText: { fontSize: 12, fontWeight: '700', color: colors.white },
  tieRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  tieFaces: { flexDirection: 'row', width: 66 },
  tieSecond: { marginLeft: -14 },
  tieNames: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  tieKind: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  tieNote: { marginTop: 4, fontSize: 15, lineHeight: 20, color: colors.text },
  hero: { backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  heroFoot: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 18,
    gap: space.sm,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  // iOS large title: 34pt bold.
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: 0.4, color: colors.onMedia },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  surprise: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.onMediaButton,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: aurora.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: aurora.separator,
  },
  edgeButton: { backgroundColor: aurora.glass, borderColor: aurora.glassEdge },
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
  rowBody: { flex: 1, minHeight: 74, justifyContent: 'center', gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowRole: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
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

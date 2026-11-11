import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureBar, RoundButton } from '@/components/feature/feature-kit';
import { CircleCard } from '@/components/find/circle-card';
import { useEarlyAccess } from '@/components/plans/early-access';
import { Button, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, SearchBar, Segmented, SFIcon, Txt } from '@/components/ui';
import { isReleased } from '@/economy/early-access';
import { shortName } from '@/lib/format';
import { phrase } from '@/i18n';
import { localCharacter, localized } from '@/i18n/content';
import { chapterAt, chapterState, isEventOn, worldJoinedAt } from '@/lib/world-story';
import { WORLDS, type World } from '@/mock/worlds';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors, systemGround } from '@/theme';
import type { Character, CharacterGender, WorldEvent, WorldStory } from '@/types';

type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];

/**
 * A circle from Find (Friends, Partners, It's complicated, Around you), as the canvas board "Find:
 * doira ichi" draws it (owner, 2026-11-11): a large title with how many live here and "Surprise
 * me", Everyone / Him / Her, then each person as a wide photo card (`CircleCard`) with their face
 * on the trailing side and one glass button: Say hi, or Message once they are a friend. The card
 * opens the profile. The search button opens a field that filters this circle only (HIG Search
 * fields). A world with a story keeps its role, season, events and ties around the cards.
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

  const act = (c: Character) => {
    const chat = conversations.find((v) => v.characterId === c.id)?.id;
    if (chat) router.push(`/chat/${chat}`);
    else early.add(c);
  };

  return (
    <Screen background={systemGround.ground}>
      <FeatureBar
        backLabel={t('a11y.back')}
        onBack={() => router.back()}
        right={
          <RoundButton
            icon={searchOpen ? 'close' : 'search'}
            accessibilityLabel={t('find.searchWorld', { world: phrase(series) })}
            onPress={() => {
              if (searchOpen) setQuery('');
              setSearchOpen((v) => !v);
            }}
          />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{phrase(series)}</LargeTitle>
        <View style={styles.meta}>
          <View style={styles.count} accessible accessibilityLabel={`${people.length}`}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Txt style={styles.countText}>{people.length}</Txt>
          </View>
          {shown.length > 0 ? (
            <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={surprise} style={styles.surprise}>
              <Ionicons name="sparkles" size={15} color={colors.text} />
              <Txt style={styles.surpriseText}>{t('find.surprise')}</Txt>
            </PressableScale>
          ) : null}
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
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('find.searchWorld', { world: phrase(series) })}
            style={styles.search}
          />
        ) : null}
        <Segmented
          options={WHO.map((value) => ({ value, label: t(`find.who.${value}`) }))}
          value={who}
          onChange={setWho}
          style={styles.who}
        />

        {shown.length === 0 ? (
          <EmptyState title={t('find.noResults')} />
        ) : (
          <View style={styles.cards}>
            {shown.map((c) => (
              <CircleCard
                key={c.id}
                character={c}
                friend={friendIds.has(c.id)}
                fresh={!!early.fresh(c)}
                onOpen={() => open(c)}
                onAct={() => act(c)}
              />
            ))}
          </View>
        )}

        {world ? <WorldFoot world={world} people={people} canGroup={friendsHere.length >= 2} onGroup={openGroup} /> : null}
      </ScrollView>
      {early.sheet}
    </Screen>
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
            <SFIcon ios="person.2.fill" icon="people" size={20} color={colors.brandText} />
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
    borderRadius: 22,
    backgroundColor: systemGround.card,
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
  heroFoot: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 18,
    gap: space.sm,
  },
  // iOS large title: 34pt bold.
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginHorizontal: space.lg, marginTop: 2 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  surpriseText: { fontSize: 15, fontWeight: '600', color: colors.text },
  cards: { marginHorizontal: space.lg, marginTop: space.lg, gap: space.md },
  surprise: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: systemGround.fill },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: systemGround.ground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
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
  search: { marginHorizontal: space.lg, marginTop: space.lg },
  who: { marginHorizontal: space.lg, marginTop: space.lg },
  list: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    borderRadius: 22,
    backgroundColor: systemGround.card,
    overflow: 'hidden',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  add: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemGround.fill,
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

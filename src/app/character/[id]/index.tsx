import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendAccent } from '@/components/character/kit';
import { FriendMoments } from '@/components/character/moments';
import { ProfileHero } from '@/components/character/profile-hero';
import { InkText } from '@/components/ink';
import { planDate } from '@/components/plans/copy';
import { useEarlyAccess } from '@/components/plans/early-access';
import { Header, PressableScale, Screen, SFIcon, useScrolledPast } from '@/components/ui';
import { opensToAllAt } from '@/economy/early-access';
import { isActiveMemory } from '@/economy/memory-limit';
import { useOpenChat } from '@/hooks/use-open-chat';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { heightLabel } from '@/lib/character-facts';
import { daysBetween, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, hitSlop, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character, Relationship, Scene } from '@/types';

/**
 * Character Profile on the Ink Night ground (approved Ink+ prototype): full-bleed edge-to-edge
 * portrait melting into `#09090D`, a single unified Action Row (Message + Call + Secret note),
 * a Living Bond Strip matching Us's closeness language, live FriendMoments scenes, Story Beats,
 * and a compact About card. Preserves 100% of existing early-access, scene, and routing logic.
 */
export default function CharacterProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const memoryCount = useAppStore(
    (s) => s.memories.filter((m) => m.characterId === characterId && isActiveMemory(m)).length,
  );
  const addFriend = useAppStore((s) => s.addFriend);
  const continueMoment = useAppStore((s) => s.continueMoment);
  // Two quick taps on a moment start it once.
  const continuedAt = useRef(0);
  const locale = useAppStore((s) => s.user.locale);
  const openChatOnce = useOpenChat();
  const early = useEarlyAccess(openChatOnce);
  // Once scrolled past the hero, reveal a compact sticky top bar so Back stays reachable.
  const { scrolled, onScroll } = useScrolledPast(300);

  if (!character) {
    return (
      <Screen night background={ink.ground}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const isFriend = !!conversation;
  const voiceReady = character.voiceReady;
  const shown = localCharacter(character);
  const name = displayName(character, relationship);
  const first = shortName(name);
  const accent = friendAccent(character.id);
  const relation = shown.relation ?? shown.worldRole;
  const eyebrow = [relation, character.series ? phrase(character.series) : undefined].filter(Boolean).join(' · ') || character.handle;

  const locked = !isFriend && early.locked(character);
  const opensAt = opensToAllAt(character);

  const openChat = () => {
    if (locked) return early.add(character);
    const conversationId = conversation?.id ?? addFriend(character.id);
    openChatOnce(conversationId);
  };

  /** Continue in chat: the moment starts as a scene in the chat with them (a new friend is added by it). */
  const continueScene = (scene: Scene) => {
    if (locked) return early.add(character);
    if (Date.now() - continuedAt.current < 1000) return;
    const conversationId = continueMoment(character.id, scene.id);
    if (!conversationId) return;
    continuedAt.current = Date.now();
    haptic.success();
    openChatOnce(conversationId);
  };

  return (
    <Screen night edgeToEdge background={ink.ground}>
      <FriendAccent value={accent}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
          <ProfileHero
            character={character}
            name={name}
            eyebrow={eyebrow}
            tagline={shown.tagline}
            voiceReady={voiceReady}
            topInset={insets.top}
            onBack={() => router.back()}
          />

          <View style={styles.body}>
            {/* Unified Single-Row Action Bar: warm brand peach primary pill + round Call & Secret Note */}
            <View style={styles.actionsRow}>
              <PressableScale
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={isFriend ? t('us.messageFriend', { name: first }) : t('characterProfile.addFriend')}
                onPress={openChat}
                style={styles.primaryPill}>
                <Ionicons name={isFriend ? 'chatbubble' : locked ? 'lock-closed' : 'person-add'} size={18} color={ink.onAccent} />
                <InkText variant="bodyStrong" color={ink.onAccent} lines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.shrink}>
                  {isFriend ? t('us.messageFriend', { name: first }) : t('characterProfile.addFriend')}
                </InkText>
              </PressableScale>

              {isFriend ? (
                <>
                  <PressableScale
                    scaleTo={0.92}
                    disabled={!voiceReady}
                    accessibilityRole="button"
                    accessibilityLabel={t('characterProfile.call')}
                    accessibilityState={{ disabled: !voiceReady }}
                    onPress={() => router.push(`/call/${character.id}`)}
                    style={[styles.circleAction, !voiceReady && styles.disabled]}>
                    <Ionicons name="call-outline" size={21} color={systemColors.green} />
                  </PressableScale>
                  <PressableScale
                    scaleTo={0.92}
                    accessibilityRole="button"
                    accessibilityLabel={t('characterProfile.secretNote')}
                    onPress={() => router.push(`/secret-note/${character.id}`)}
                    style={styles.circleAction}>
                    <Ionicons name="mail-outline" size={21} color={ink.accent} />
                  </PressableScale>
                </>
              ) : null}
            </View>

            {locked ? (
              <InkText variant="footnote" color={ink.accent} center style={styles.caption}>
                {opensAt != null
                  ? `${t('find.proFirst')} · ${t('newCharacters.opensOn', { date: planDate(opensAt) })}`
                  : t('find.proFirst')}
              </InkText>
            ) : null}
            {character.review === 'pending' ? (
              <InkText variant="footnote" center style={styles.caption}>
                {t('createCharacter.inReview')}
              </InkText>
            ) : null}
            {!voiceReady ? (
              <InkText variant="footnote" center style={styles.caption}>
                {t('characterProfile.voiceTraining')}
              </InkText>
            ) : null}

            {/* Living Bond Strip: visual twin of Us screen's closeness language */}
            {isFriend && relationship ? (
              <BondStrip
                relationship={relationship}
                accentStrong={accent.strong}
                memoryCount={memoryCount}
                onMemories={() => router.push(`/character/${character.id}/memories`)}
              />
            ) : null}
          </View>

          {/* Live scenes to step into (keeps FriendMoments + weekly AI generation + share intact) */}
          <FriendMoments character={character} isFriend={isFriend} onContinue={continueScene} />

          <View style={styles.sections}>
            <StoryCard character={shown} level={relationship?.level ?? 0} accentStrong={accent.strong} accentSoft={accent.soft} />
            <AboutCard character={shown} name={first} locale={locale} />
          </View>
        </ScrollView>
      </FriendAccent>

      {/* Compact sticky top bar once scrolled past the hero */}
      {scrolled ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={[styles.stickyBar, { paddingTop: insets.top + 6 }]}>
          <PressableScale
            onPress={() => router.back()}
            scaleTo={0.88}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
            style={styles.stickyBack}>
            <Ionicons name="chevron-back" size={22} color={ink.text} style={styles.backGlyph} />
          </PressableScale>
          <InkText variant="cardSmall" lines={1} center style={styles.grow}>
            {name}
          </InkText>
          <View style={styles.stickySpacer} />
        </Animated.View>
      ) : null}

      {early.sheet}
    </Screen>
  );
}

/** Living Bond Strip matching Us's closeness language: Lv + streak/days + hairline bar + Memories link. */
function BondStrip({
  relationship,
  accentStrong,
  memoryCount,
  onMemories,
}: {
  relationship: Relationship;
  accentStrong: string;
  memoryCount: number;
  onMemories: () => void;
}) {
  const { t } = useTranslation();
  const { progress } = levelForIntimacy(relationship.intimacy);
  const days = daysBetween(relationship.anniversary) + 1;
  const maxed = relationship.intimacy >= relationship.nextLevelAt;
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <View style={styles.bondCard}>
      <LinearGradient
        colors={[`${accentStrong}30`, `${accentStrong}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.72, y: 0.9 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.bondTop}>
        <InkText variant="cardSmall" lines={1} style={[styles.grow, styles.tabular]}>
          {`${t('home.hero.level', { level: relationship.level })} · ${phrase(relationship.levelTitle)}`}
        </InkText>
        <View style={styles.streakPill}>
          {relationship.streakDays > 0 ? <SFIcon ios="flame.fill" icon="flame" size={12} color={ink.streakText} /> : null}
          <InkText variant="caption" color={ink.streakText} lines={1} style={styles.tabular}>
            {relationship.streakDays > 0
              ? `${relationship.streakDays} · ${days} ${t('us.daysShort', { count: days })}`
              : `${days} ${t('us.daysShort', { count: days })}`}
          </InkText>
        </View>
      </View>

      <View style={styles.bondTrack}>
        <View style={[styles.bondFill, { width: `${pct}%`, backgroundColor: accentStrong }]} />
      </View>

      <View style={styles.bondFoot}>
        <InkText variant="footnote" color={ink.text2} lines={1} style={[styles.grow, styles.tabular]}>
          {maxed
            ? t('us.intimacy', { count: relationship.intimacy })
            : t('us.toLevel', { count: Math.max(0, relationship.nextLevelAt - relationship.intimacy), level: relationship.level + 1 })}
        </InkText>
        <PressableScale
          scaleTo={0.95}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={memoryCount > 0 ? `${t('characterProfile.memories')}, ${memoryCount}` : t('characterProfile.memories')}
          onPress={onMemories}
          style={styles.memoriesBtn}>
          <InkText variant="footnoteStrong" color={ink.accent} style={styles.tabular}>
            {memoryCount > 0 ? `${t('characterProfile.memories')} · ${memoryCount}` : t('characterProfile.memories')}
          </InkText>
          <Ionicons name="chevron-forward" size={14} color={ink.accent} />
        </PressableScale>
      </View>
    </View>
  );
}

/** Story Beats ("What they hold back"): unlocked chapters glow in the friend's accent. */
function StoryCard({
  character,
  level,
  accentStrong,
  accentSoft,
}: {
  character: Character;
  level: number;
  accentStrong: string;
  accentSoft: string;
}) {
  const { t } = useTranslation();
  const beats = character.arc?.beats;
  if (!beats?.length) return null;
  const openCount = beats.filter((b) => level >= b.atLevel).length;

  return (
    <View style={styles.inkCard}>
      <View style={styles.cardHead}>
        <InkText variant="cardSmall" accessibilityRole="header" style={styles.grow}>
          {t('world.story')}
        </InkText>
        <InkText variant="footnote" color={ink.text3} style={styles.tabular}>
          {`${openCount}/${beats.length}`}
        </InkText>
      </View>

      {beats.map((beat, i) => {
        const open = level >= beat.atLevel;
        return (
          <View key={beat.atLevel} style={[styles.storyRow, i < beats.length - 1 && styles.rowLine]}>
            <View style={[styles.storyIcon, open && { backgroundColor: accentSoft }]}>
              <SFIcon
                ios={open ? 'key.fill' : 'lock.fill'}
                icon={open ? 'key' : 'lock-closed'}
                size={15}
                color={open ? accentStrong : ink.text3}
              />
            </View>
            <InkText variant={open ? 'subStrong' : 'sub'} color={open ? ink.text : ink.text3} style={styles.grow}>
              {open ? beat.title : t('world.level', { level: beat.atLevel })}
            </InkText>
          </View>
        );
      })}
    </View>
  );
}

/** Compact About Card: bio, backstory, tags, and clean 2-column facts inside one calm Ink card. */
function AboutCard({ character, name, locale }: { character: Character; name: string; locale: string }) {
  const { t } = useTranslation();
  const rows = [
    character.trope ? { key: 'dynamic', label: t('world.dynamic'), value: t(`world.tropes.${character.trope}`) } : null,
    character.age ? { key: 'age', label: t('createCharacter.age'), value: String(character.age) } : null,
    character.heightCm ? { key: 'height', label: t('characterProfile.height'), value: heightLabel(character.heightCm, locale) } : null,
    character.likes?.length ? { key: 'loves', label: t('intro.loves'), value: character.likes.join(', ') } : null,
    character.dislikes?.length ? { key: 'cantStand', label: t('intro.cantStand'), value: character.dislikes.join(', ') } : null,
  ].filter((row) => row !== null);

  const hasBio = !!character.bio || !!character.backstory || character.tags.length > 0;
  if (!hasBio && !rows.length) return null;

  return (
    <View style={styles.inkCard}>
      <View style={[styles.aboutTop, rows.length > 0 && styles.rowLine]}>
        <InkText variant="cardSmall" accessibilityRole="header">
          {t('intro.open', { name })}
        </InkText>
        {character.bio ? <InkText variant="sub" color="rgba(255,255,255,0.72)">{character.bio}</InkText> : null}
        {character.backstory ? <InkText variant="sub" color={ink.text2}>{character.backstory}</InkText> : null}
        {character.tags.length > 0 ? (
          <View style={styles.tags}>
            {character.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <InkText variant="caption" color={ink.text2}>
                  {tag}
                </InkText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {rows.map((row, i) => (
        <View key={row.key} style={[styles.factRow, i < rows.length - 1 && styles.rowLine]}>
          <InkText variant="footnote" color={ink.text3} style={styles.factLabel}>
            {row.label}
          </InkText>
          <InkText variant="subStrong" color={ink.text} style={styles.factValue}>
            {row.value}
          </InkText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  body: { paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  sections: { paddingHorizontal: 16, marginTop: 16, gap: 14 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryPill: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 25,
    borderCurve: 'continuous',
    backgroundColor: ink.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  circleAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  caption: { paddingHorizontal: 8 },
  bondCard: {
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    padding: 16,
    gap: 10,
  },
  bondTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.streakFill,
  },
  bondTrack: {
    height: 6,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.hairlineFill,
    overflow: 'hidden',
  },
  bondFill: { height: '100%', borderRadius: inkRadius.pill },
  bondFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  memoriesBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  inkCard: {
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ink.edge,
  },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  storyIcon: {
    width: 34,
    height: 34,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutTop: { padding: 16, gap: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  factLabel: { minWidth: '34%', flexShrink: 0, paddingTop: 1 },
  factValue: { flex: 1, textAlign: 'right' },
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(9,9,13,0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ink.edge,
  },
  stickyBack: {
    width: 40,
    height: 40,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
  },
  backGlyph: { marginLeft: -2 },
  stickySpacer: { width: 40 },
});

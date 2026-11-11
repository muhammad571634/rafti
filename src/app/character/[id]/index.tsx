import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BondHead,
  BondTrack,
  FaceCard,
  FriendAccent,
  GlassPill,
  Group,
  LinkRow,
  PeachButton,
  ProfileTop,
  QuickAction,
  useFriendAccent,
  QuickRow,
  TopButton,
  profileSheet,
} from '@/components/character/kit';
import { Header, Screen, SFIcon, Txt, useScrolledPast } from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { useEarlyAccess } from '@/components/plans/early-access';
import { opensToAllAt } from '@/economy/early-access';
import { isActiveMemory } from '@/economy/memory-limit';
import { useOpenChat } from '@/hooks/use-open-chat';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { heightLabel } from '@/lib/character-facts';
import { daysBetween, shortName } from '@/lib/format';
import { levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { fonts, night, space } from '@/theme';
import type { Character, Relationship } from '@/types';

// Always dark (appearance B, owner 2026-11-11): a friend's page is a moment with them.
const { colors, ground: systemGround, friendAccent } = night;
const profileStyles = profileSheet.night;

/**
 * Discovery -> profile -> "Add friend" is the reference app's way in: adding a character opens a
 * chat that starts with their greeting. In the four tabs' look (0z152) on the night ground in both
 * themes (appearance B): their picture as Find's photo card with the name on it, one peach action,
 * and cards below.
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
  const locale = useAppStore((s) => s.user.locale);
  // A new character is Pro-only for its first 7 days; the sheet's trial adds it and opens the chat.
  const openChatOnce = useOpenChat();
  const early = useEarlyAccess(openChatOnce);
  // Past the face card, the top row shows the name.
  const { scrolled, onScroll } = useScrolledPast(360);

  if (!character) {
    return (
      <Screen night background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const isFriend = !!conversation;
  const voiceReady = character.voiceReady;
  const shown = localCharacter(character);
  const name = displayName(character, relationship);

  const locked = !isFriend && early.locked(character);
  const opensAt = opensToAllAt(character);

  const openChat = () => {
    if (locked) return early.add(character);
    const conversationId = conversation?.id ?? addFriend(character.id);
    // Back to that chat when it is under this profile, else on top of it (`useOpenChat`).
    openChatOnce(conversationId);
  };

  return (
    <Screen night background={systemGround.ground}>
      <ProfileTop
        title={name}
        showTitle={scrolled}
        onBack={() => router.back()}
        right={
          isFriend ? (
            <TopButton
              icon="ellipsis-horizontal"
              accessibilityLabel={t('characterProfile.settings')}
              onPress={() => router.dismissTo(`/character/${character.id}/settings`)}
            />
          ) : undefined
        }
      />

      {/* Their own space: quick actions, the level and the row tiles in their colour. */}
      <FriendAccent value={friendAccent(character.id)}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: space.xs, paddingBottom: insets.bottom + space.huge }}>
          <FaceCard
            tall
            character={character}
            name={name}
            // Store rule: an AI character is marked as one.
            nameBadge={<GlassPill label={t('safety.ai')} accessibilityLabel={t('safety.ai')} />}
            lines={[`${character.handle}${character.series ? ` · ${phrase(character.series)}` : ''}`, shown.relation ?? shown.worldRole]}
            topLeft={
              voiceReady ? (
                <GlassPill
                  label={t('find.voiceReady')}
                  icon={
                    // SF Symbols' own pulse on iPhone: the voice is alive.
                    <SFIcon ios="waveform" icon="pulse" size={14} color={colors.onMedia} animation={{ effect: { type: 'pulse' }, repeating: true, speed: 0.5 }} />
                  }
                />
              ) : undefined
            }
          />

          {locked ? <Txt style={[profileStyles.caption, styles.bold]}>{t('find.proFirst')}</Txt> : null}
          {character.review === 'pending' ? <Txt style={profileStyles.caption}>{t('createCharacter.inReview')}</Txt> : null}

          <View style={styles.words}>
            {shown.tagline ? (
              <Txt style={styles.tagline} center>
                {shown.tagline}
              </Txt>
            ) : null}
            <Txt style={styles.bio} center>
              {shown.bio}
            </Txt>
            {shown.tags.length > 0 ? (
              <View style={styles.tags}>
                {shown.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Txt style={styles.tagText} maxFontSizeMultiplier={1.3}>
                      {tag}
                    </Txt>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <PeachButton
            label={isFriend ? t('characterProfile.chat') : t('characterProfile.addFriend')}
            icon={isFriend ? 'chatbubble' : locked ? 'lock-closed' : 'person-add'}
            onPress={openChat}
          />
          {locked && opensAt != null ? <Txt style={profileStyles.caption}>{t('newCharacters.opensOn', { date: planDate(opensAt) })}</Txt> : null}
          {isFriend ? (
            <QuickRow center>
              <QuickAction
                icon="call"
                label={t('characterSettings.quickCall')}
                accessibilityLabel={t('characterProfile.call')}
                disabled={!voiceReady}
                onPress={() => router.push(`/call/${character.id}`)}
              />
              <QuickAction icon="mail" label={t('characterProfile.secretNote')} onPress={() => router.push(`/secret-note/${character.id}`)} />
            </QuickRow>
          ) : null}
          {!voiceReady ? <Txt style={profileStyles.caption}>{t('characterProfile.voiceTraining')}</Txt> : null}

          <AboutCard character={shown} name={shortName(name)} locale={locale} />

          <StoryCard character={shown} level={relationship?.level ?? 0} />

          {isFriend && relationship ? (
            <BondCard
              relationship={relationship}
              memoryCount={memoryCount}
              onMemories={() => router.push(`/character/${character.id}/memories`)}
            />
          ) : null}
        </ScrollView>
      </FriendAccent>
      {early.sheet}
    </Screen>
  );
}

/**
 * Their story and facts in one white card (`src/mock/character-profiles.ts`), as the chat's first
 * card shows them: the story, then the dynamic, age and height, what they love and can't stand.
 */
function AboutCard({ character, name, locale }: { character: Character; name: string; locale: string }) {
  const { t } = useTranslation();
  const rows = [
    character.trope ? { key: 'dynamic', label: t('world.dynamic'), value: t(`world.tropes.${character.trope}`) } : null,
    character.age ? { key: 'age', label: t('createCharacter.age'), value: String(character.age) } : null,
    character.heightCm ? { key: 'height', label: t('characterProfile.height'), value: heightLabel(character.heightCm, locale) } : null,
    character.likes?.length ? { key: 'loves', label: t('intro.loves'), value: character.likes.join(', ') } : null,
    character.dislikes?.length ? { key: 'cantStand', label: t('intro.cantStand'), value: character.dislikes.join(', ') } : null,
  ].filter((row) => row !== null);
  if (!character.backstory && !rows.length) return null;

  return (
    <Group title={t('intro.open', { name })}>
      {character.backstory ? (
        <View style={[styles.aboutStory, rows.length > 0 && styles.line]}>
          <Txt style={styles.aboutLabel}>{t('intro.story')}</Txt>
          <Txt style={styles.aboutText}>{character.backstory}</Txt>
        </View>
      ) : null}
      {rows.map((row, i) => (
        <View key={row.key} style={[styles.aboutRow, i < rows.length - 1 && styles.line]}>
          <Txt style={styles.aboutLabel}>{row.label}</Txt>
          <Txt style={styles.aboutValue}>{row.value}</Txt>
        </View>
      ))}
    </Group>
  );
}

/**
 * What they hold back, opening with the bond (`src/lib/world-story.ts`): a beat's title once its
 * level is reached, a lock and the level before that. The secret itself only comes up in the chat.
 */
function StoryCard({ character, level }: { character: Character; level: number }) {
  const { t } = useTranslation();
  const beats = character.arc?.beats;
  if (!beats?.length) return null;
  return (
    <Group title={t('world.story')}>
      <View style={styles.storyList}>
        {beats.map((beat, i) => {
          const open = level >= beat.atLevel;
          return (
            <View key={beat.atLevel} style={[styles.storyRow, i < beats.length - 1 && styles.line]}>
              <View style={[styles.storyIcon, open && styles.storyIconOpen]}>
                <SFIcon
                  ios={open ? 'key.fill' : 'lock.fill'}
                  icon={open ? 'key' : 'lock-closed'}
                  size={15}
                  color={open ? colors.brandText : colors.textFaint}
                />
              </View>
              <Txt style={[styles.aboutValue, styles.grow, !open && styles.storyLocked]}>{open ? beat.title : t('world.level', { level: beat.atLevel })}</Txt>
            </View>
          );
        })}
      </View>
    </Group>
  );
}

/** Level, progress, streak and days together in one white card, with Memories as its last row. */
function BondCard({
  relationship,
  memoryCount,
  onMemories,
}: {
  relationship: Relationship;
  memoryCount: number;
  onMemories: () => void;
}) {
  const { t } = useTranslation();
  const accent = useFriendAccent();
  const progress = levelForIntimacy(relationship.intimacy).progress;
  // Intimacy keeps growing past the last threshold, so the top level shows a plain total.
  const maxed = relationship.intimacy >= relationship.nextLevelAt;

  return (
    <Group>
      <BondHead
        // One SF Symbols bounce when the card appears (iPhone).
        heart={<SFIcon ios="heart.fill" icon="heart" size={18} color={accent?.strong ?? colors.brandText} animation={{ effect: { type: 'bounce' } }} />}
        title={t('characterProfile.levelLine', { level: relationship.level, title: phrase(relationship.levelTitle) })}
        line={`${t('us.streak', { count: relationship.streakDays })} · ${t('us.daysTogether', { count: daysBetween(relationship.anniversary) + 1 })}`}
        end={
          <Txt style={styles.progress}>
            {maxed
              ? t('us.intimacy', { count: relationship.intimacy })
              : t('characterProfile.progress', { current: relationship.intimacy, next: relationship.nextLevelAt })}
          </Txt>
        }
      />
      <BondTrack progress={progress} />
      <View style={styles.bondFoot}>
        <LinkRow label={t('characterProfile.memories')} icon="bookmark" meta={memoryCount > 0 ? String(memoryCount) : undefined} onPress={onMemories} last />
      </View>
    </Group>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '700' },
  words: { paddingHorizontal: space.xl, paddingTop: 18, paddingBottom: 18, alignItems: 'center' },
  // Their own words come in every script: the system face, heavy.
  tagline: { fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4, color: systemGround.label },
  bio: { marginTop: 8, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  tag: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: systemGround.fill },
  tagText: { fontFamily: fonts.playfulBold, fontSize: 13.5, color: systemGround.label },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  aboutStory: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, gap: 4 },
  aboutRow: { paddingHorizontal: 18, paddingVertical: 12, gap: 2 },
  aboutLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  aboutText: { fontSize: 15, lineHeight: 22 },
  aboutValue: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  storyList: { paddingTop: 4 },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 18, paddingVertical: 12 },
  storyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  storyIconOpen: { backgroundColor: colors.primarySofter },
  storyLocked: { color: colors.textSecondary },
  progress: { fontFamily: fonts.playfulBold, fontSize: 14, color: colors.textSecondary },
  bondFoot: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
});

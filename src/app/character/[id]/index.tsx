import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  CharacterAvatar,
  GlassBar,
  GlassButton,
  Header,
  InsetGroup,
  InsetRow,
  PressableScale,
  Screen,
  SFIcon,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { useEarlyAccess } from '@/components/plans/early-access';
import { opensToAllAt } from '@/economy/early-access';
import { isActiveMemory } from '@/economy/memory-limit';
import { phrase } from '@/i18n';
import { heightLabel } from '@/lib/character-facts';
import { daysBetween } from '@/lib/format';
import { levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Character, Relationship } from '@/types';

/**
 * Discovery -> profile -> "Add friend" is the reference app's way in: adding a
 * character opens a chat that starts with their greeting. The profile sits on the
 * plain canvas: a centred portrait, one apricot action, and quiet rows below.
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
  const early = useEarlyAccess((conversationId) => router.push(`/chat/${conversationId}`));
  // Past the avatar and name, the bar shows the name (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(150);

  if (!character) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const isFriend = !!conversation;
  const voiceReady = character.voiceReady;

  const locked = !isFriend && early.locked(character);
  const opensAt = opensToAllAt(character);

  const openChat = () => {
    if (locked) return early.add(character);
    const conversationId = conversation?.id ?? addFriend(character.id);
    // Chat → settings → profile → Message goes back to that chat, not a second copy of it.
    router.dismissTo(`/chat/${conversationId}`);
  };

  return (
    // iOS contact poster (approved prototype `Profile.dc.html`): grey ground, glass bar, inset cards.
    <Screen background={colors.bg}>
      <GlassBar
        title={displayName(character, relationship)}
        scrolled={scrolled}
        right={
          isFriend ? (
            <GlassButton
              icon="ellipsis-horizontal"
              accessibilityLabel={t('characterProfile.settings')}
              onPress={() => router.dismissTo(`/character/${character.id}/settings`)}
            />
          ) : null
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.huge }]}>
        <View style={styles.hero}>
          <CharacterAvatar character={character} size={112} />
          <View style={styles.nameRow}>
            <Txt style={styles.name} center lines={2}>
              {displayName(character, relationship)}
            </Txt>
            {/* Store rule: an AI character is marked as one. */}
            <View style={styles.aiMark} accessibilityLabel={t('safety.ai')}>
              <Txt style={styles.aiText}>{t('safety.ai')}</Txt>
            </View>
          </View>
          <Txt style={styles.handle} center>
            {character.handle}
            {character.series ? ` · ${phrase(character.series)}` : ''}
          </Txt>
          {locked ? (
            <Txt variant="caption" color={colors.textSecondary} center style={styles.bold}>
              {t('find.proFirst')}
            </Txt>
          ) : null}
          {character.review === 'pending' ? (
            <Txt variant="caption" color={colors.textSecondary} center>
              {t('createCharacter.inReview')}
            </Txt>
          ) : null}
          {voiceReady ? (
            <View style={styles.voice}>
              {/* SF Symbols' own pulse on iPhone: the voice is alive. */}
              <SFIcon
                ios="waveform"
                icon="pulse"
                size={14}
                color={colors.bondText}
                animation={{ effect: { type: 'pulse' }, repeating: true, speed: 0.5 }}
              />
              <Txt style={styles.voiceText} color={colors.bondText}>
                {t('find.voiceReady')}
              </Txt>
            </View>
          ) : null}
          {character.tagline ? (
            <Txt style={styles.tagline} center>
              {character.tagline}
            </Txt>
          ) : null}
          <Txt style={styles.bio} center>
            {character.bio}
          </Txt>
          {character.tags.length > 0 ? (
            <Txt style={styles.tags} center>
              {character.tags.join(' · ')}
            </Txt>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label={isFriend ? t('characterProfile.chat') : t('characterProfile.addFriend')}
            variant="primary"
            size="lg"
            full
            onPress={openChat}
            left={
              <Ionicons
                name={isFriend ? 'chatbubble' : locked ? 'lock-closed' : 'person-add'}
                size={18}
                color={colors.textOnPrimary}
              />
            }
          />
          {locked && opensAt != null ? (
            <Txt variant="caption" color={colors.textSecondary} center>
              {t('newCharacters.opensOn', { date: planDate(opensAt) })}
            </Txt>
          ) : null}
          {isFriend ? (
            <View style={styles.pair}>
              <PressableScale
                scaleTo={0.95}
                disabled={!voiceReady}
                onPress={() => router.push(`/call/${character.id}`)}
                accessibilityRole="button"
                accessibilityState={{ disabled: !voiceReady }}
                accessibilityLabel={t('characterProfile.call')}
                style={[styles.tile, !voiceReady && styles.off]}>
                <SFIcon ios="phone.fill" icon="call" size={22} color={colors.primary} />
                <Txt style={styles.tileLabel} color={colors.brandText}>
                  {t('characterSettings.quickCall')}
                </Txt>
              </PressableScale>
              <PressableScale
                scaleTo={0.95}
                onPress={() => router.push(`/secret-note/${character.id}`)}
                accessibilityRole="button"
                accessibilityLabel={t('characterProfile.secretNote')}
                style={styles.tile}>
                <SFIcon ios="envelope" icon="mail-outline" size={22} color={colors.primary} />
                <Txt style={styles.tileLabel} color={colors.brandText}>
                  {t('characterProfile.secretNote')}
                </Txt>
              </PressableScale>
            </View>
          ) : null}
          {!voiceReady ? (
            <Txt variant="caption" color={colors.textSecondary} center>
              {t('characterProfile.voiceTraining')}
            </Txt>
          ) : null}
        </View>

        <AboutCard character={character} locale={locale} />

        {isFriend && relationship ? (
          <BondCard
            relationship={relationship}
            memoryCount={memoryCount}
            onMemories={() => router.push(`/character/${character.id}/memories`)}
          />
        ) : null}
      </ScrollView>
      {early.sheet}
    </Screen>
  );
}

/**
 * Their story and facts in one white card (`src/mock/character-profiles.ts`), as the chat's first
 * card shows them: age and height, the story, then what they love and can't stand.
 */
function AboutCard({ character, locale }: { character: Character; locale: string }) {
  const { t } = useTranslation();
  const rows = [
    character.age ? { key: 'age', label: t('createCharacter.age'), value: String(character.age) } : null,
    character.heightCm ? { key: 'height', label: t('characterProfile.height'), value: heightLabel(character.heightCm, locale) } : null,
    character.likes?.length ? { key: 'loves', label: t('intro.loves'), value: character.likes.join(', ') } : null,
    character.dislikes?.length ? { key: 'cantStand', label: t('intro.cantStand'), value: character.dislikes.join(', ') } : null,
  ].filter((row) => row !== null);
  if (!character.backstory && !rows.length) return null;

  return (
    <InsetGroup style={styles.about}>
      {character.backstory ? (
        <View style={[styles.aboutStory, rows.length > 0 && styles.aboutLine]}>
          <Txt style={styles.aboutLabel}>{t('intro.story')}</Txt>
          <Txt style={styles.aboutText}>{character.backstory}</Txt>
        </View>
      ) : null}
      {rows.map((row, i) => (
        <View key={row.key} style={[styles.aboutRow, i < rows.length - 1 && styles.aboutLine]}>
          <Txt style={styles.aboutLabel}>{row.label}</Txt>
          <Txt style={styles.aboutValue}>{row.value}</Txt>
        </View>
      ))}
    </InsetGroup>
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
  const progress = levelForIntimacy(relationship.intimacy).progress;
  // Intimacy keeps growing past the last threshold, so the top level shows a plain total.
  const maxed = relationship.intimacy >= relationship.nextLevelAt;

  return (
    <InsetGroup style={styles.bond}>
      <View style={styles.bondHead}>
        <View style={styles.bondHeart}>
          {/* One SF Symbols bounce when the card appears (iPhone). */}
          <SFIcon ios="heart.fill" icon="heart" size={16} color={colors.bond} animation={{ effect: { type: 'bounce' } }} />
        </View>
        <View style={styles.grow}>
          <Txt style={styles.bondTitle} lines={1}>
            {t('characterProfile.levelLine', { level: relationship.level, title: phrase(relationship.levelTitle) })}
          </Txt>
          <Txt style={styles.bondLine}>
            {t('us.streak', { count: relationship.streakDays })}
            {' · '}
            {t('us.daysTogether', { count: daysBetween(relationship.anniversary) + 1 })}
          </Txt>
        </View>
        <Txt style={styles.bondLine}>
          {maxed
            ? t('us.intimacy', { count: relationship.intimacy })
            : t('characterProfile.progress', { current: relationship.intimacy, next: relationship.nextLevelAt })}
        </Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
      </View>
      <View style={styles.bondFoot}>
        <InsetRow
          label={t('characterProfile.memories')}
          meta={memoryCount > 0 ? String(memoryCount) : undefined}
          chevron
          last
          onPress={onMemories}
        />
      </View>
    </InsetGroup>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.huge },
  hero: { alignItems: 'center', paddingTop: space.xs, paddingHorizontal: space.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  name: { flexShrink: 1, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.3 },
  aiMark: { height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.surfaceAlt, justifyContent: 'center' },
  aiText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  handle: { marginTop: 2, fontSize: 15, color: colors.textSecondary },
  bold: { fontWeight: '700' },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  voiceText: { fontSize: 13, fontWeight: '500' },
  tagline: { marginTop: 10, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4 },
  bio: { marginTop: 10, fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  about: { marginTop: 22 },
  aboutStory: { paddingHorizontal: space.lg, paddingVertical: 12, gap: 4 },
  aboutRow: { paddingHorizontal: space.lg, paddingVertical: 11, gap: 2 },
  aboutLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  aboutLabel: { fontSize: 13, color: colors.textSecondary },
  aboutText: { fontSize: 15, lineHeight: 21 },
  aboutValue: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  tags: { marginTop: space.sm, fontSize: 13, color: colors.textSecondary },
  actions: { marginTop: 20, gap: space.sm, paddingHorizontal: space.lg },
  pair: { flexDirection: 'row', gap: space.sm },
  tile: {
    flex: 1,
    height: 62,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tileLabel: { fontSize: 12, fontWeight: '500' },
  off: { opacity: 0.45 },
  bond: { marginTop: 22 },
  bondHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: 14 },
  bondHeart: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bondSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bondTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  bondLine: { fontSize: 13, color: colors.textSecondary },
  grow: { flex: 1 },
  track: {
    height: 6,
    marginLeft: space.lg + 30 + space.md,
    marginRight: space.lg,
    marginTop: space.md,
    marginBottom: 14,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.bond },
  bondFoot: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
});

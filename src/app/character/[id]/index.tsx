import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  CharacterAvatar,
  Header,
  IconButton,
  ClayIcon,
  IconTile,
  ListRow,
  Screen,
  Txt,
} from '@/components/ui';
import { daysBetween, shortDate } from '@/lib/format';
import { levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Relationship } from '@/types';

/** Leading tile size for the profile's link rows; the divider inset follows it. */
const ROW_TILE = 34;

/**
 * Discovery -> profile -> "Add friend" is the reference app's way in: adding a
 * character opens a chat that starts with their greeting. The profile sits on the
 * plain canvas: a centred portrait, one apricot action, and quiet rows below.
 */
export default function CharacterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const memoryCount = useAppStore(
    (s) => s.memories.filter((m) => m.characterId === characterId).length,
  );
  const addFriend = useAppStore((s) => s.addFriend);

  if (!character) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const isFriend = !!conversation;
  const voiceReady = character.voiceReady;

  const openChat = () => {
    const conversationId = conversation?.id ?? addFriend(character.id);
    router.push(`/chat/${conversationId}`);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        right={
          isFriend ? (
            <IconButton
              icon="ellipsis-horizontal"
              accessibilityLabel={t('a11y.more')}
              onPress={() => router.push(`/character/${character.id}/settings`)}
            />
          ) : null
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <CharacterAvatar character={character} size={92} />
          <View style={styles.nameRow}>
            <Txt variant="h2" center style={styles.shrink}>
              {displayName(character, relationship)}
            </Txt>
            {/* Store rule: an AI character is marked as one. */}
            <View style={styles.aiMark} accessibilityLabel={t('safety.ai')}>
              <Txt variant="tiny" color={colors.textSecondary}>
                {t('safety.ai')}
              </Txt>
            </View>
          </View>
          <Txt variant="small" color={colors.textMuted} center style={styles.handle}>
            {character.handle}
            {character.series ? ` · ${character.series}` : ''}
          </Txt>
          {character.review === 'pending' ? (
            <Txt variant="caption" color={colors.brandText} center>
              {t('createCharacter.inReview')}
            </Txt>
          ) : null}
          {voiceReady ? (
            <View style={styles.voice}>
              <View style={styles.voiceDot} />
              <Txt variant="caption" color={colors.bondText}>
                {t('find.voiceReady')}
              </Txt>
            </View>
          ) : null}
          <Txt variant="body" color={colors.textSecondary} center style={styles.bio}>
            {character.bio}
          </Txt>
          {character.tags.length > 0 ? (
            <Txt variant="small" color={colors.textMuted} center style={styles.tags}>
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
                name={isFriend ? 'chatbubble-outline' : 'person-add-outline'}
                size={18}
                color={colors.textOnPrimary}
              />
            }
          />
          {isFriend ? (
            <View style={styles.pair}>
              <Button
                label={t('characterProfile.call')}
                variant="secondary"
                disabled={!voiceReady}
                onPress={() => router.push(`/call/${character.id}`)}
                left={<Ionicons name="call-outline" size={17} color={colors.text} />}
                style={styles.half}
              />
              <Button
                label={t('characterProfile.secretNote')}
                variant="secondary"
                onPress={() => router.push(`/secret-note/${character.id}`)}
                left={<Ionicons name="mail-outline" size={17} color={colors.text} />}
                style={styles.half}
              />
            </View>
          ) : null}
          {!voiceReady ? (
            <Txt variant="caption" color={colors.textMuted} center>
              {t('characterProfile.voiceTraining')}
            </Txt>
          ) : null}
        </View>

        {isFriend && relationship ? <BondCard relationship={relationship} /> : null}

        {isFriend ? (
          <View style={styles.list}>
            <ListRow
              size="large"
              left={<ClayIcon name="jar" size={ROW_TILE} tile={false} />}
              title={t('characterProfile.memories')}
              meta={memoryCount > 0 ? String(memoryCount) : undefined}
              chevron
              onPress={() => router.push(`/character/${character.id}/memories`)}
              accessibilityLabel={
                memoryCount > 0 ? `${t('characterProfile.memories')}, ${memoryCount}` : t('characterProfile.memories')
              }
            />
            <ListRow
              size="large"
              left={<IconTile icon="settings-outline" size={ROW_TILE} background="transparent" glyphSize={24} />}
              title={t('characterProfile.settings')}
              chevron
              onPress={() => router.push(`/character/${character.id}/settings`)}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Level, progress to the next one and how long you have known each other; mint marks the bond. No card around it. */
function BondCard({ relationship }: { relationship: Relationship }) {
  const { t } = useTranslation();
  const progress = levelForIntimacy(relationship.intimacy).progress;
  // Intimacy keeps growing past the last threshold, so the top level shows a plain total.
  const maxed = relationship.intimacy >= relationship.nextLevelAt;

  return (
    <View style={styles.bond}>
      <View style={styles.bondHead}>
        <Txt variant="smallStrong" lines={1} style={styles.grow}>
          {t('characterProfile.levelLine', {
            level: relationship.level,
            title: relationship.levelTitle,
          })}
        </Txt>
        <Txt variant="caption" color={colors.textMuted}>
          {maxed
            ? t('us.intimacy', { count: relationship.intimacy })
            : t('characterProfile.progress', {
                current: relationship.intimacy,
                next: relationship.nextLevelAt,
              })}
        </Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
      </View>
      <Txt variant="caption" color={colors.textMuted}>
        {t('us.streak', { count: relationship.streakDays })}
        {' · '}
        {t('us.daysTogether', { count: daysBetween(relationship.anniversary) + 1 })}
      </Txt>
      <Txt variant="caption" color={colors.textFaint} style={styles.since}>
        {t('characterProfile.friends', { date: shortDate(relationship.anniversary) })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.huge },
  hero: { alignItems: 'center', paddingTop: space.sm },
  handle: { marginTop: space.xxs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  shrink: { flexShrink: 1 },
  aiMark: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voice: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  voiceDot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.bond },
  bio: { marginTop: space.md },
  tags: { marginTop: space.sm },
  actions: { marginTop: space.xl, gap: space.sm },
  pair: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1 },
  bond: { marginTop: space.xl },
  bondHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  track: {
    height: 4,
    marginVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.bond },
  since: { marginTop: space.xs },
  list: { marginTop: space.lg, marginHorizontal: -space.lg },
});

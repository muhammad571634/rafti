import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  BlurBackdrop,
  Button,
  Card,
  CharacterAvatar,
  Chip,
  Header,
  IconButton,
  Screen,
  Txt,
  characterImage,
} from '@/components/ui';
import { daysBetween, shortDate } from '@/lib/format';
import { levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

/**
 * Discovery -> profile -> "Add Friend" is the reference app's way in: adding a
 * character opens a chat that starts with their greeting.
 */
export default function CharacterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const addFriend = useAppStore((s) => s.addFriend);

  if (!character) {
    return (
      <Screen>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const isFriend = !!conversation;
  const progress = relationship ? levelForIntimacy(relationship.intimacy).progress : 0;

  const openChat = () => {
    const conversationId = conversation?.id ?? addFriend(character.id);
    router.push(`/chat/${conversationId}`);
  };

  return (
    <Screen
      background={gradients.home}
      backdrop={
        <BlurBackdrop source={characterImage(character)} blur={60} overlay="rgba(255,247,236,0.72)" />
      }>
      <Header
        right={
          isFriend ? (
            <IconButton
              icon="ellipsis-horizontal"
              color={colors.textSecondary}
              accessibilityLabel={t('a11y.more')}
              onPress={() => router.push(`/character/${character.id}/settings`)}
            />
          ) : null
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <CharacterAvatar character={character} size={128} ring ringColor={colors.white} />
          <Txt variant="h2" style={styles.name}>
            {displayName(character, relationship)}
          </Txt>
          <Txt variant="small" color={colors.textMuted}>
            {character.handle}
            {character.series ? ` · ${character.series}` : ''}
          </Txt>
          {character.voiceReady ? (
            <View style={styles.voicePill}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Txt variant="caption" color={colors.success}>
                {t('find.voiceReady')}
              </Txt>
            </View>
          ) : null}
        </View>

        <Card>
          <Txt variant="body" color={colors.textSecondary}>
            {character.bio}
          </Txt>
          <View style={styles.tags}>
            {character.tags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} tone="neutral" />
            ))}
          </View>
        </Card>

        {relationship && isFriend ? (
          <Card style={styles.bond}>
            <View style={styles.bondHead}>
              <Txt variant="title">{t('us.level', { level: relationship.level })}</Txt>
              <Txt variant="smallStrong" color={colors.accent}>
                {relationship.levelTitle}
              </Txt>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
            </View>
            <View style={styles.bondStats}>
              <Stat icon="heart" label={t('us.intimacy', { count: relationship.intimacy })} />
              <Stat icon="flame" label={t('us.streak', { count: relationship.streakDays })} />
              <Stat
                icon="calendar"
                label={t('us.daysTogether', { count: daysBetween(relationship.anniversary) })}
              />
            </View>
            <Txt variant="caption" color={colors.textFaint}>
              {t('characterProfile.friends', { date: shortDate(relationship.anniversary) })}
            </Txt>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={isFriend ? t('characterProfile.chat') : t('characterProfile.addFriend')}
            onPress={openChat}
            full
            left={
              <Ionicons name={isFriend ? 'chatbubble' : 'person-add'} size={16} color={colors.white} />
            }
          />
          {isFriend ? (
            <>
              <Button
                label={t('characterProfile.call')}
                variant="soft"
                disabled={!character.voiceReady}
                onPress={() => router.push(`/call/${character.id}`)}
                full
                left={<Ionicons name="call" size={16} color={colors.primary} />}
              />
              <Button
                label={t('characterProfile.secretNote')}
                variant="ghost"
                onPress={() => router.push(`/secret-note/${character.id}`)}
                full
                left={<Ionicons name="mail-unread-outline" size={16} color={colors.textSecondary} />}
              />
            </>
          ) : null}
          {!character.voiceReady ? (
            <Txt variant="caption" color={colors.textMuted} center>
              {t('characterProfile.voiceTraining')}
            </Txt>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Txt variant="caption" color={colors.textSecondary}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.huge, gap: space.lg },
  hero: { alignItems: 'center', gap: space.xs, paddingBottom: space.sm },
  name: { marginTop: space.md },
  voicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(62,208,126,0.12)',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  bond: { gap: space.md },
  bondHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  bondStats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  actions: { gap: space.sm, marginTop: space.xs },
});

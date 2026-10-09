import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CharacterAvatar, EmptyState, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { buildInbox, isUnread, type InboxItem, type InboxKind } from '@/lib/inbox';
import { dayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Kinds drawn with an icon instead of the character's face. */
const ICONS: Partial<Record<InboxKind, IconName>> = {
  plan: 'calendar-outline',
  levelUp: 'heart-outline',
  spin: 'gift-outline',
};

const AVATAR = 46;

/**
 * Profile → Notifications: what happened lately, newest first, in Today and Earlier
 * (docs/design-style.md). Every row opens the place it talks about; the sliders in the
 * header open the push settings. "Mark all read" clears the dots.
 */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const characterDiary = useAppStore((s) => s.characterDiary);
  const calls = useAppStore((s) => s.calls);
  const schedules = useAppStore((s) => s.schedules);
  const moments = useAppStore((s) => s.moments);
  const boardPosts = useAppStore((s) => s.boardPosts);
  const daily = useAppStore((s) => s.daily);
  const seenAt = useAppStore((s) => s.inboxSeenAt);
  const markSeen = useAppStore((s) => s.markInboxSeen);

  const items = useMemo(
    () => buildInbox({ characterDiary, calls, schedules, moments, boardPosts, daily }),
    [characterDiary, calls, schedules, moments, boardPosts, daily],
  );

  const today = dayKey();
  const fresh = items.filter((item) => dayKey(new Date(item.at)) === today);
  const earlier = items.filter((item) => dayKey(new Date(item.at)) !== today);
  const anyUnread = items.some((item) => isUnread(item, seenAt));

  const nameOf = (id?: string) => {
    const character = characters.find((c) => c.id === id);
    return character ? shortName(displayName(character, relationships[character.id])) : '';
  };

  const text = (item: InboxItem) => t(`notifications.inbox.${item.kind}`, { name: nameOf(item.characterId), ...item.params });

  const when = (item: InboxItem) => {
    if (item.allDay) return t('common.today');
    if (dayKey(new Date(item.at)) === today) {
      return new Date(item.at).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' });
    }
    return relativeStamp(item.at);
  };

  const target = (item: InboxItem): Href => {
    const conversation = conversations.find((c) => c.characterId === item.characterId);
    switch (item.kind) {
      case 'diary':
        return { pathname: '/diary/page/[characterId]', params: { characterId: item.characterId!, date: String(item.params?.date ?? '') } };
      case 'missedCall':
        return conversation ? { pathname: '/chat/[id]', params: { id: conversation.id } } : '/call-history';
      case 'plan':
        return '/(tabs)/us';
      case 'levelUp':
        return { pathname: '/character/[id]', params: { id: item.characterId! } };
      case 'boardReply':
        return '/board';
      case 'spin':
        return '/gifts';
    }
  };

  const row = (item: InboxItem) => {
    const unread = isUnread(item, seenAt);
    const character = characters.find((c) => c.id === item.characterId);
    const icon = ICONS[item.kind];
    return (
      <PressableScale
        key={item.id}
        style={styles.row}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${text(item)}, ${when(item)}`}
        onPress={() => router.push(target(item))}>
        {character && !icon ? (
          <CharacterAvatar character={character} size={AVATAR} />
        ) : (
          <View style={styles.iconTile}>
            <Ionicons name={icon ?? 'notifications-outline'} size={21} color={colors.text} />
          </View>
        )}
        <View style={styles.flex}>
          <Txt variant={unread ? 'bodyStrong' : 'body'} color={unread ? colors.text : colors.textSecondary} lines={2}>
            {text(item)}
          </Txt>
          <Txt variant="small" color={colors.textMuted}>
            {when(item)}
          </Txt>
        </View>
        <View style={[styles.dot, unread && styles.dotOn]} />
      </PressableScale>
    );
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('notifications.title')}
        right={
          <PressableScale
            style={styles.settings}
            scaleTo={0.88}
            hitSlop={6}
            accessibilityLabel={t('notifications.settingsTitle')}
            onPress={() => router.push('/notifications/settings')}>
            <Ionicons name="options-outline" size={23} color={colors.text} />
          </PressableScale>
        }
      />

      {items.length === 0 ? (
        <EmptyState title={t('notifications.inbox.empty')} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {fresh.length > 0 ? (
            <>
              <View style={styles.sectionHead}>
                <Txt variant="h3">{t('common.today')}</Txt>
                {anyUnread ? (
                  <PressableScale scaleTo={0.95} hitSlop={8} onPress={markSeen}>
                    <Txt variant="smallStrong" color={colors.textSecondary}>
                      {t('notifications.inbox.markAll')}
                    </Txt>
                  </PressableScale>
                ) : null}
              </View>
              {fresh.map(row)}
            </>
          ) : null}

          {earlier.length > 0 ? (
            <>
              <View style={styles.sectionHead}>
                <Txt variant="h3">{t('notifications.inbox.earlier')}</Txt>
                {anyUnread && fresh.length === 0 ? (
                  <PressableScale scaleTo={0.95} hitSlop={8} onPress={markSeen}>
                    <Txt variant="smallStrong" color={colors.textSecondary}>
                      {t('notifications.inbox.markAll')}
                    </Txt>
                  </PressableScale>
                ) : null}
              </View>
              {earlier.map(row)}
            </>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.huge },
  settings: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -space.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  row: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconTile: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: colors.primary },
});

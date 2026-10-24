import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterAvatar, EmptyState, GlassBar, GlassIcons, InsetGroup, LargeTitle, MODULE_GLYPH, Screen, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { buildInbox, isUnread, type InboxItem, type InboxKind } from '@/lib/inbox';
import { dayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, moduleFills, space } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Kinds drawn with an icon instead of the character's face; modules in their Today colour. */
const ICONS: Partial<Record<InboxKind, { icon: IconName; fill: string }>> = {
  plan: { icon: 'calendar', fill: '#FF3B30' },
  levelUp: { icon: MODULE_GLYPH.bond.icon, fill: moduleFills.bond },
  spin: { icon: MODULE_GLYPH.gifts.icon, fill: moduleFills.gifts },
};

const AVATAR = 44;

/**
 * The bell on Us → Notifications (canvas "NotifInbox", 2026-10-21; BIMOBIMO keeps them on Us):
 * what happened lately, newest first, as iOS inset groups under Today and Earlier. Every row
 * opens the place it talks about; the glass capsule marks all read and opens the push settings.
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
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

  const row = (item: InboxItem, last: boolean) => {
    const unread = isUnread(item, seenAt);
    const character = characters.find((c) => c.id === item.characterId);
    const look = ICONS[item.kind];
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${text(item)}, ${when(item)}`}
        onPress={() => router.push(target(item))}>
        <View style={styles.dotCell}>{unread ? <View style={styles.dot} /> : null}</View>
        {character && !look ? (
          <CharacterAvatar character={character} size={AVATAR} />
        ) : (
          <View style={[styles.iconTile, { backgroundColor: look?.fill ?? '#8E8E93' }]}>
            <Ionicons name={look?.icon ?? 'notifications'} size={20} color="#FFFFFF" />
          </View>
        )}
        <View style={[styles.body, !last && styles.line]}>
          <Txt style={[styles.text, unread && styles.textUnread]} lines={3}>
            {text(item)}
          </Txt>
          <Txt style={styles.when}>{when(item)}</Txt>
        </View>
      </Pressable>
    );
  };

  const section = (title: string, list: InboxItem[]) =>
    list.length > 0 ? (
      <>
        <Txt style={styles.sectionLabel}>{title}</Txt>
        <InsetGroup>{list.map((item, i) => row(item, i === list.length - 1))}</InsetGroup>
      </>
    ) : null;

  return (
    <Screen background={colors.bg}>
      <GlassBar
        right={
          <GlassIcons
            items={[
              ...(anyUnread ? [{ icon: 'checkmark-done' as IconName, label: t('notifications.inbox.markAll'), onPress: markSeen }] : []),
              { icon: 'options-outline' as IconName, label: t('notifications.settingsTitle'), onPress: () => router.push('/notifications/settings') },
            ]}
          />
        }
      />

      {items.length === 0 ? (
        <>
          <LargeTitle>{t('notifications.title')}</LargeTitle>
          <EmptyState title={t('notifications.inbox.empty')} />
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
          <LargeTitle>{t('notifications.title')}</LargeTitle>
          {section(t('common.today'), fresh)}
          {section(t('notifications.inbox.earlier'), earlier)}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.xs },
  pressed: { backgroundColor: colors.surfaceAlt },
  dotCell: { width: 14, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  iconTile: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: 68, marginLeft: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: 14 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  text: { flex: 1, fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.text, paddingVertical: space.sm },
  textUnread: { fontWeight: '600' },
  when: { fontSize: 13, color: colors.textSecondary },
});

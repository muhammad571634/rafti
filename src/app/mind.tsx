import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { kindOf, KIND_LOOK, threadMeta, whenText } from '@/components/mind/labels';
import { ThreadSheet } from '@/components/mind/thread-sheet';
import { CharacterAvatar, EmptyState, GlassBar, IconRow, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { mindSections, nextTouch } from '@/lib/mind';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Thread } from '@/types';

/**
 * Keeping in mind (A2): everything friends took from the chats, open to the user. Coming up (with a
 * time, soonest first), Following (tasks, goals, quests) and Settled (the last week), each with when
 * the next text goes. One friend's (from their settings) or everyone's (Profile). A row opens the
 * thread to change its time, settle it, stop its texts or forget it.
 */
export default function MindScreen() {
  const { characterId } = useLocalSearchParams<{ characterId?: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const threads = useAppStore((s) => s.threads);
  const characters = useAppStore((s) => s.characters);
  const { scrolled, onScroll } = useScrolledPast(44);
  const [openId, setOpenId] = useState<string | null>(null);

  const sections = useMemo(() => mindSections(threads, characterId), [threads, characterId]);
  const groups = (
    [
      ['soon', sections.soon],
      ['following', sections.following],
      ['settled', sections.settled],
    ] as const
  ).filter(([, list]) => list.length);

  const row = (thread: Thread, last: boolean) => {
    const look = KIND_LOOK[kindOf(thread)];
    const next = nextTouch(thread);
    const meta = threadMeta(t, i18n.language, thread);
    const hint = next ? `${meta} · ${t('mind.next', { when: whenText(t, i18n.language, next.at) })}` : meta;
    const friend = characterId ? undefined : characters.find((c) => c.id === thread.characterId);
    return (
      <IconRow
        key={thread.id}
        icon={look.icon}
        fill={thread.status === 'closed' ? colors.textFaint : look.fill}
        title={thread.about}
        hint={hint}
        last={last}
        onPress={() => setOpenId(thread.id)}
        right={
          <View style={styles.right}>
            {friend ? <CharacterAvatar character={friend} size={26} /> : null}
            <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
          </View>
        }
      />
    );
  };

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('mind.title')} scrolled={scrolled} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge, flexGrow: 1 }}>
        <LargeTitle>{t('mind.title')}</LargeTitle>
        {groups.length ? (
          groups.map(([key, list]) => (
            <View key={key}>
              <Txt style={styles.section}>{t(`mind.${key}`)}</Txt>
              <InsetGroup>{list.map((thread, i) => row(thread, i === list.length - 1))}</InsetGroup>
            </View>
          ))
        ) : (
          <EmptyState title={t('mind.empty')} symbol={{ ios: 'bookmark', icon: 'bookmark-outline' }} />
        )}
      </ScrollView>
      <ThreadSheet threadId={openId} onClose={() => setOpenId(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: space.lg * 2,
    paddingTop: space.xl,
    paddingBottom: space.sm - 2,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

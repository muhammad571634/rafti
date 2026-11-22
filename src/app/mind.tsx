import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkNavBar, InkText } from '@/components/ink';
import { kindOf, KIND_LOOK, threadMeta, whenText } from '@/components/mind/labels';
import { ThreadSheet } from '@/components/mind/thread-sheet';
import { CharacterAvatar, EmptyState, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { shortName } from '@/lib/format';
import { mindSections, nextTouch } from '@/lib/mind';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, space } from '@/theme';
import { ink, inkFace, inkGutter, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { Thread } from '@/types';

const NEXT_PILL_BG = 'rgba(235,173,132,0.14)';

/**
 * Keeping in mind (approved Ink Night+ prototype): sticky Apple HIG nav bar, friend filter chips
 * when viewing everyone's threads, hairline-rimmed Ink inset groups with colored iOS Settings icon
 * tiles, warm peach next-text timing capsules, ringed friend avatars, and `ThreadSheet`.
 */
export default function MindScreen() {
  const { characterId } = useLocalSearchParams<{ characterId?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const threads = useAppStore((s) => s.threads);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const { scrolled, onScroll } = useScrolledPast(34);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterId, setFilterId] = useState<string | 'all'>('all');

  const activeCharacterId = characterId ?? (filterId === 'all' ? undefined : filterId);

  // Friends who appear in active or recent threads (shown as filter chips when viewing everyone).
  const chipFriends = useMemo(() => {
    if (characterId) return [];
    const seen = new Set<string>();
    const out = [];
    for (const th of threads) {
      if (seen.has(th.characterId)) continue;
      const c = characters.find((x) => x.id === th.characterId);
      if (c) {
        seen.add(c.id);
        out.push(c);
      }
    }
    return out;
  }, [characterId, threads, characters]);

  const sections = useMemo(() => mindSections(threads, activeCharacterId), [threads, activeCharacterId]);
  const groups = (
    [
      ['soon', sections.soon],
      ['following', sections.following],
      ['settled', sections.settled],
    ] as const
  ).filter(([, list]) => list.length);

  const renderRow = (thread: Thread, last: boolean) => {
    const look = KIND_LOOK[kindOf(thread)];
    const next = nextTouch(thread);
    const meta = threadMeta(t, i18n.language, thread);
    const nextLabel = next ? t('mind.next', { when: whenText(t, i18n.language, next.at) }) : undefined;
    const friend = activeCharacterId ? undefined : characters.find((c) => c.id === thread.characterId);
    const closed = thread.status === 'closed';
    const fAccent = friend ? friendAccent(friend.id).strong : undefined;

    return (
      <Pressable
        key={thread.id}
        onPress={() => setOpenId(thread.id)}
        accessibilityRole="button"
        accessibilityLabel={[thread.about, meta, nextLabel].filter(Boolean).join(', ')}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed, !last && styles.rowLine]}>
        <View style={[styles.tile, { backgroundColor: closed ? '#48484A' : look.fill }]}>
          <Ionicons name={look.icon} size={17} color={colors.white} />
        </View>
        <View style={styles.rowBody}>
          <Txt style={[styles.rowTitle, closed && styles.rowTitleClosed]} lines={2}>
            {thread.about}
          </Txt>
          <View style={styles.metaLine}>
            <Txt style={[styles.rowMeta, styles.tabular]} lines={1}>
              {meta}
            </Txt>
            {nextLabel && !closed ? (
              <View style={styles.nextPill}>
                <Txt style={[styles.nextText, styles.tabular]} lines={1}>
                  {nextLabel}
                </Txt>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.right}>
          {friend ? (
            <View style={[styles.avatarRing, { borderColor: closed ? 'transparent' : (fAccent ?? 'transparent') }]}>
              <CharacterAvatar character={friend} size={24} />
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={15} color={ink.text3} />
        </View>
      </Pressable>
    );
  };

  return (
    <Screen background={ink.ground}>
      <InkNavBar
        backLabel={t('a11y.back')}
        onBack={() => router.back()}
        title={t('mind.title')}
        scrolled={scrolled}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge, flexGrow: 1 }}>
        <InkText variant="display" accessibilityRole="header" style={styles.title}>
          {t('mind.title')}
        </InkText>

        {chipFriends.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
            <PressableScale
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityState={{ selected: filterId === 'all' }}
              onPress={() => setFilterId('all')}
              style={[styles.chip, filterId === 'all' && styles.chipOn]}>
              <InkText variant="footnoteStrong" color={filterId === 'all' ? inkPeachGlass.text : ink.text2}>
                {t('contacts.all')}
              </InkText>
            </PressableScale>
            {chipFriends.map((c) => {
              const on = filterId === c.id;
              const acc = friendAccent(c.id).strong;
              return (
                <PressableScale
                  key={c.id}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setFilterId(c.id)}
                  style={[styles.chip, styles.friendChip, on && styles.chipOn]}>
                  <View style={[styles.chipRing, { borderColor: on ? 'transparent' : acc }]}>
                    <CharacterAvatar character={c} size={22} />
                  </View>
                  <InkText variant="footnoteStrong" color={on ? inkPeachGlass.text : ink.text2} lines={1}>
                    {shortName(displayName(c, relationships[c.id]))}
                  </InkText>
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : null}

        {groups.length ? (
          groups.map(([key, list]) => (
            <View key={key}>
              <Txt style={styles.section}>{t(`mind.${key}`)}</Txt>
              <View style={styles.groupCard}>{list.map((thread, i) => renderRow(thread, i === list.length - 1))}</View>
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
  title: { marginTop: 2, marginHorizontal: inkGutter },
  chipsScroll: { marginTop: 14, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: inkGutter },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: ink.raised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendChip: { paddingLeft: 4, paddingRight: 12 },
  chipOn: {
    backgroundColor: inkPeachGlass.flat,
    borderWidth: 0.75,
    borderColor: inkPeachGlass.rim,
  },
  chipRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  section: {
    ...inkFace('footnoteStrong'),
    color: ink.text2,
    paddingHorizontal: inkGutter + 6,
    paddingTop: 20,
    paddingBottom: 8,
  },
  groupCard: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowPressed: { backgroundColor: ink.raised },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.text },
  rowTitleClosed: { color: ink.text2 },
  metaLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  rowMeta: { ...inkFace('caption'), fontWeight: '400', color: ink.text2 },
  nextPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: inkRadius.pill,
    backgroundColor: NEXT_PILL_BG,
  },
  nextText: { ...inkFace('caption'), fontSize: 11, color: ink.accent },
  tabular: { fontVariant: ['tabular-nums'] },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

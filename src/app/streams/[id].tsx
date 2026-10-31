import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble, TypingRow } from '@/components/chat';
import { useFollowNewest } from '@/components/chat/follow-newest';
import { runOf } from '@/components/chat/runs';
import { GroupAvatar } from '@/components/group-avatar';
import { PaywallSheet } from '@/components/paywall-sheet';
import { BUY_BAR_SPACE, StoreBuyBar } from '@/components/plans/store-look';
import { GlassBar, GlassButton, Header, Screen, Txt } from '@/components/ui';
import { freeRoundsLeft, STREAM_SHELLS } from '@/economy/streams';
import { confirmAction } from '@/lib/confirm';
import { shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { isPaused, isPlaying, lineMessage, nextTarget } from '@/lib/streams';
import { todayKey } from '@/mock/time';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Character, Message } from '@/types';

/**
 * Watching a stream: the two talk in bubbles as in a group chat, the one writing shows as typing,
 * and the header can stop them. When a round ends the bar keeps it going (a free round or shells)
 * or, once the stream is full, carries it on as a group chat with both.
 */
export default function StreamScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = Array.isArray(id) ? id[0] : id;
  const stream = useAppStore((s) => s.streams.find((x) => x.id === streamId));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const typingId = useAppStore((s) => (streamId ? s.streamTyping[streamId] : undefined));
  const animations = useAppStore((s) => s.settings.chatAnimation);
  const shells = useAppStore((s) => s.wallet.shells);
  const freeLeft = useAppStore((s) => freeRoundsLeft(s.streamUse, todayKey(), s.wallet.subscription, Date.now()));
  const keepStreaming = useAppStore((s) => s.keepStreaming);
  const pauseStream = useAppStore((s) => s.pauseStream);
  const resumeStream = useAppStore((s) => s.resumeStream);
  const deleteStream = useAppStore((s) => s.deleteStream);
  const createGroup = useAppStore((s) => s.createGroup);
  const groups = useAppStore((s) => s.groups);
  const listRef = useRef<FlatList<Message>>(null);
  // Past the faces and the topic, the bar shows the names (iOS scroll edge). The list is inverted,
  // so the offset counts from the newest line: the faces are out of sight once the rest of the
  // content above the screen is taller than they are.
  const [scrolled, setScrolled] = useState(false);
  // A new line keeps someone watching the newest end there, and leaves a reader further up alone.
  const { onScroll: followScroll, follow } = useFollowNewest(listRef);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      followScroll(e);
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const past = contentSize.height - layoutMeasurement.height - contentOffset.y > 150;
      setScrolled((was) => (was === past ? was : past));
    },
    [followScroll],
  );
  const [paywall, setPaywall] = useState<number | null>(null);
  // Only lines that arrive while the stream is open animate in.
  const [openedAt] = useState(() => Date.now());

  const pair = useMemo(
    () => (stream?.characterIds ?? []).map((cid) => characters.find((c) => c.id === cid)).filter((c): c is Character => !!c),
    [stream?.characterIds, characters],
  );
  const data = useMemo(() => (stream ? stream.lines.map((line) => lineMessage(stream.id, line)) : []), [stream]);
  // Newest first for the inverted list: the stream opens on its latest line with nothing to scroll.
  const rows = useMemo(() => [...data].reverse(), [data]);
  const nameOf = useCallback((c: Character) => shortName(displayName(c, relationships[c.id])), [relationships]);

  // The newest line stays in view, as in the chats (also when the bar comes up at a round's end).
  const lineCount = stream?.lines.length ?? 0;
  const barShown = !!stream && !isPlaying(stream);
  useEffect(() => {
    follow();
  }, [follow, lineCount, typingId, barShown]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => {
      const character = pair.find((c) => c.id === item.characterId);
      if (!character) return null;
      const run = runOf(data, data.length - 1 - index);
      return (
        <MessageBubble
          message={item}
          character={character}
          animate={animations && Date.parse(item.createdAt) > openedAt}
          showAvatar={run.runStart}
          runEnd={run.runEnd}
          senderName={nameOf(character)}
        />
      );
    },
    [pair, data, animations, openedAt, nameOf],
  );

  if (!stream || pair.length < 2) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const names = groupTitle(pair.map(nameOf));
  const playing = isPlaying(stream);
  const paused = isPaused(stream);
  const full = nextTarget(stream) === null;
  const typer = playing ? pair.find((c) => c.id === typingId) : undefined;

  const keepGoing = () => {
    const result = keepStreaming(stream.id);
    if (result === 'noShells') return setPaywall(STREAM_SHELLS);
    haptic.tap();
  };

  /** Their group chat: the one with just these two, or a new one. */
  const talkToBoth = () => {
    const ids = stream.characterIds;
    const existing = groups.find((g) => g.memberIds.length === 2 && ids.every((cid) => g.memberIds.includes(cid)));
    const groupId = existing?.id ?? createGroup([...ids]);
    if (groupId) router.push({ pathname: '/group/[id]', params: { id: groupId } });
  };

  const remove = () =>
    confirmAction({
      title: t('streams.deleteConfirm'),
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        deleteStream(stream.id);
        router.back();
      },
    });

  const bar = playing ? null : paused ? (
    <StoreBuyBar label={t('streams.goOn')} caption={t('streams.leftInRound', { count: stream.target - stream.lines.length })} onPress={() => resumeStream(stream.id)} />
  ) : full ? (
    <StoreBuyBar label={t('streams.talkToBoth')} caption={t('streams.full')} onPress={talkToBoth} />
  ) : (
    <StoreBuyBar
      label={t('streams.keepGoing')}
      caption={freeLeft > 0 ? t('streams.freeToday', { count: freeLeft }) : t('streams.costs', { count: STREAM_SHELLS, shells })}
      onPress={keepGoing}>
      <Pressable onPress={talkToBoth} accessibilityRole="button" hitSlop={8} style={styles.link}>
        <Txt style={styles.linkText}>{t('streams.talkToBothLink', { names })}</Txt>
      </Pressable>
    </StoreBuyBar>
  );

  return (
    <Screen background={colors.bgPlain}>
      <GlassBar
        title={names}
        scrolled={scrolled}
        right={
          playing ? (
            <GlassButton label={t('streams.stop')} accessibilityLabel={t('streams.stop')} onPress={() => pauseStream(stream.id)} />
          ) : (
            <GlassButton icon="trash-outline" accessibilityLabel={t('streams.delete')} onPress={remove} />
          )
        }
      />
      <FlatList
        ref={listRef}
        data={rows}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.list}
        // Inverted: the header sits under the newest line, the footer over the oldest.
        ListHeaderComponent={
          <>
            {typer ? <TypingRow characters={[typer]} label={t('group.typing', { name: nameOf(typer) })} /> : null}
            {/* Room for the bar under the newest line. */}
            <View style={{ height: (bar ? BUY_BAR_SPACE : space.xl) + insets.bottom }} />
          </>
        }
        ListFooterComponent={
          <View style={styles.head}>
            <GroupAvatar members={pair} size={64} ringColor={colors.bgPlain} />
            <Txt style={styles.names}>{names}</Txt>
            <Txt style={styles.topic}>{`“${stream.topic}”`}</Txt>
            <Txt style={styles.note}>{t('streams.aiNote')}</Txt>
          </View>
        }
      />
      {bar}
      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.md },
  head: { alignItems: 'center', gap: 6, paddingTop: space.md, paddingBottom: space.xl, paddingHorizontal: space.lg },
  names: { marginTop: space.sm, fontSize: 22, fontWeight: '700', letterSpacing: 0.2, color: colors.text, textAlign: 'center' },
  topic: { fontSize: 15, lineHeight: 20, color: colors.text, textAlign: 'center' },
  note: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  link: { alignSelf: 'center', paddingVertical: 4 },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.brandText },
});

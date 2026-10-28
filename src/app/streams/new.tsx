import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/create/quick-create';
import { FriendRow, useFriends, type Friend } from '@/components/group/friend-row';
import { PaywallSheet } from '@/components/paywall-sheet';
import { BUY_BAR_SPACE, GroupLabel, StoreBuyBar } from '@/components/plans/store-look';
import { CharacterAvatar, GlassBar, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { freeRoundsLeft, STREAM_SHELLS } from '@/economy/streams';
import { useFriendName } from '@/hooks/use-friend-name';
import { haptic } from '@/lib/haptics';
import { fillTopic, STREAM_TOPIC_MAX, STREAM_TOPICS } from '@/lib/streams';
import { phrase } from '@/i18n';
import { groupBySeries } from '@/mock/characters';
import { todayKey } from '@/mock/time';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { Character } from '@/types';

/**
 * A new stream: a topic (or one of the ideas), then the two who talk: friends first, then
 * everyone else by world, so a stream is also a way to meet someone. The bar starts it and says
 * what it costs: one of today's free rounds, or shells.
 */
export default function NewStreamScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const userName = useAppStore((s) => s.user.displayName);
  const characters = useAppStore((s) => s.characters);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const shells = useAppStore((s) => s.wallet.shells);
  const freeLeft = useAppStore((s) => freeRoundsLeft(s.streamUse, todayKey(), s.wallet.subscription, Date.now()));
  const startStream = useAppStore((s) => s.startStream);
  const friends = useFriends();
  const { scrolled, onScroll } = useScrolledPast(44);

  const [topic, setTopic] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);

  // Everyone else, by world: a stream is also how the user meets someone new.
  const others = useMemo(() => {
    const friendIds = new Set(friends.map((f) => f.character.id));
    const rest = characters.filter((c) => !friendIds.has(c.id) && !blockedIds.includes(c.id));
    return groupBySeries(rest).map((group) => ({ series: group.series, people: group.characters.map((c): Friend => ({ character: c, name: c.name })) }));
  }, [characters, friends, blockedIds]);

  const toggle = (id: string) => {
    haptic.selection();
    setError(null);
    setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 2 ? [...ids, id] : ids));
  };

  const start = () => {
    const result = startStream({ characterIds: picked, topic });
    if (result === 'noShells') return setPaywall(STREAM_SHELLS);
    if ('problem' in result) {
      haptic.error();
      return setError(t(`streams.problems.${result.problem}`));
    }
    haptic.success();
    router.replace({ pathname: '/streams/[id]', params: { id: result.id } });
  };

  const row = (friend: Friend, last: boolean) => {
    const on = picked.includes(friend.character.id);
    return (
      <FriendRow
        key={friend.character.id}
        friend={friend}
        picked={on}
        locked={!on && picked.length === 2}
        last={last}
        onPress={() => toggle(friend.character.id)}
        accessibilityLabel={friend.name}
      />
    );
  };

  const ready = picked.length === 2 && !!topic.trim();
  const pair = picked.map((id) => characters.find((c) => c.id === id)).filter((c): c is Character => !!c);

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('streams.new')} scrolled={scrolled} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + insets.bottom }}>
          <LargeTitle>{t('streams.new')}</LargeTitle>

          <GroupLabel>{t('streams.topic')}</GroupLabel>
          <InsetGroup>
            <TextInput
              value={topic}
              onChangeText={(value) => {
                setTopic(value);
                setError(null);
              }}
              placeholder={t('streams.topicPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={STREAM_TOPIC_MAX}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('streams.topic')}
            />
          </InsetGroup>
          {/* Ideas as one swipeable row of capsules under the field, not a wall of chips. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.ideasStrip}
            contentContainerStyle={styles.ideas}>
            {STREAM_TOPICS.map((idea) => {
              const text = fillTopic(idea, userName);
              return <Pill key={idea} label={text} active={topic === text} onPress={() => setTopic(text)} />;
            })}
          </ScrollView>

          <GroupLabel>{t('streams.whoTalks')}</GroupLabel>
          <PairSeats pair={pair} onRemove={toggle} />
          {friends.length ? <InsetGroup>{friends.map((friend, i) => row(friend, i === friends.length - 1))}</InsetGroup> : null}
          {others.map((group) => (
            <View key={group.series}>
              <GroupLabel>{group.series === 'Other' ? t('streams.others') : phrase(group.series)}</GroupLabel>
              <InsetGroup>{group.people.map((friend, i) => row(friend, i === group.people.length - 1))}</InsetGroup>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <StoreBuyBar
        label={t('streams.start')}
        caption={freeLeft > 0 ? t('streams.freeToday', { count: freeLeft }) : t('streams.costs', { count: STREAM_SHELLS, shells })}
        disabled={!ready}
        onPress={start}>
        {error ? <Txt style={styles.barError}>{error}</Txt> : null}
      </StoreBuyBar>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

/** The two who talk as two seats: a face and first name once picked (a tap takes them out), a grey seat before. */
function PairSeats({ pair, onRemove }: { pair: Character[]; onRemove: (id: string) => void }) {
  const friendName = useFriendName();
  const { t } = useTranslation();
  return (
    <View style={styles.pair}>
      {[0, 1].map((i) => {
        const c = pair[i];
        return (
          <Fragment key={i}>
            {i === 1 ? (
              <View style={styles.pairLink}>
                <Ionicons name="chatbubbles" size={20} color={colors.textFaint} />
              </View>
            ) : null}
            <Pressable
              disabled={!c}
              onPress={c ? () => onRemove(c.id) : undefined}
              accessibilityRole={c ? 'button' : undefined}
              accessibilityLabel={c ? t('streams.remove', { name: friendName(c) }) : t('streams.pickOne')}
              style={styles.seat}>
              {c ? (
                <View>
                  <CharacterAvatar character={c} size={64} />
                  <View style={styles.seatOut}>
                    <Ionicons name="close" size={12} color={colors.white} />
                  </View>
                </View>
              ) : (
                <View style={styles.seatEmpty}>
                  <Ionicons name="add" size={28} color={colors.textSecondary} />
                </View>
              )}
              <Txt style={styles.seatName} lines={1}>
                {c ? friendName(c, true) : ' '}
              </Txt>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: { minHeight: 72, paddingHorizontal: space.lg, paddingTop: 12, paddingBottom: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  ideasStrip: { flexGrow: 0, marginTop: space.md },
  ideas: { gap: space.sm, paddingHorizontal: space.lg },
  pair: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space.lg, marginTop: space.xs, marginBottom: space.sm },
  pairLink: { height: 64, justifyContent: 'center' },
  seat: { width: 88, alignItems: 'center', gap: 6 },
  seatEmpty: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: systemColors.fill },
  seatOut: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemColors.gray,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  seatName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.text },
  barError: { textAlign: 'center', fontSize: 13, color: systemColors.red },
});

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/create/quick-create';
import { FriendRow, useFriends, type Friend } from '@/components/group/friend-row';
import { PaywallSheet } from '@/components/paywall-sheet';
import { BUY_BAR_SPACE, GroupLabel, StoreBuyBar } from '@/components/plans/store-look';
import { GlassBar, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { freeRoundsLeft, STREAM_SHELLS } from '@/economy/streams';
import { haptic } from '@/lib/haptics';
import { fillTopic, STREAM_TOPIC_MAX, STREAM_TOPICS } from '@/lib/streams';
import { groupBySeries } from '@/mock/characters';
import { todayKey } from '@/mock/time';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';

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
          <View style={styles.ideas}>
            {STREAM_TOPICS.map((idea) => {
              const text = fillTopic(idea, userName);
              return <Pill key={idea} label={text} active={topic === text} onPress={() => setTopic(text)} />;
            })}
          </View>

          <GroupLabel>{t('streams.whoTalks', { count: picked.length })}</GroupLabel>
          {friends.length ? <InsetGroup>{friends.map((friend, i) => row(friend, i === friends.length - 1))}</InsetGroup> : null}
          {others.map((group) => (
            <View key={group.series}>
              <GroupLabel>{group.series === 'Other' ? t('streams.others') : group.series}</GroupLabel>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: { minHeight: 72, paddingHorizontal: space.lg, paddingTop: 12, paddingBottom: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md, marginHorizontal: space.lg },
  barError: { textAlign: 'center', fontSize: 13, color: systemColors.red },
});

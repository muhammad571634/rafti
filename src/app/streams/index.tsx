import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupAvatar } from '@/components/group-avatar';
import { EmptyState, GlassBar, GlassButton, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { relativeStamp } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { isPlaying } from '@/lib/streams';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Character, Stream } from '@/types';

/**
 * Streams (Character.AI's Stream): two characters talk about a topic while the user watches. The
 * ones watched, newest first, and a new one; a row opens it to watch again or keep it going.
 */
export default function StreamsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const streams = useAppStore((s) => s.streams);
  const characters = useAppStore((s) => s.characters);
  const { scrolled, onScroll } = useScrolledPast(44);

  const startNew = () => router.push('/streams/new');

  return (
    <Screen background={colors.bg}>
      <GlassBar
        title={t('streams.title')}
        scrolled={scrolled}
        right={streams.length ? <GlassButton icon="add" accessibilityLabel={t('streams.new')} onPress={startNew} /> : undefined}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('streams.title')}</LargeTitle>

        {streams.length === 0 ? (
          <EmptyState
            symbol={{ ios: 'bubble.left.and.bubble.right.fill', icon: 'chatbubbles' }}
            title={t('streams.empty')}
            hint={t('streams.emptyHint')}
            actionLabel={t('streams.new')}
            onAction={startNew}
          />
        ) : (
          <InsetGroup style={styles.first}>
            {streams.map((stream, i) => (
              <StreamRow
                key={stream.id}
                stream={stream}
                characters={characters}
                last={i === streams.length - 1}
                onPress={() => router.push({ pathname: '/streams/[id]', params: { id: stream.id } })}
              />
            ))}
          </InsetGroup>
        )}
      </ScrollView>
    </Screen>
  );
}

/** One stream: the two faces, their names, the topic, and when (or "Live" while it plays). */
function StreamRow({ stream, characters, last, onPress }: { stream: Stream; characters: Character[]; last: boolean; onPress: () => void }) {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const pair = stream.characterIds.map((id) => characters.find((c) => c.id === id)).filter((c): c is Character => !!c);
  const names = groupTitle(pair.map((c) => friendName(c, true)));
  const live = isPlaying(stream);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${names}, ${stream.topic}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <GroupAvatar members={pair} size={44} ringColor={colors.surface} />
      <View style={[styles.body, !last && styles.line]}>
        <View style={styles.flex}>
          <Txt style={styles.title} lines={1}>
            {names}
          </Txt>
          <Txt style={styles.topic} lines={1}>
            {stream.topic}
          </Txt>
        </View>
        <Txt style={[styles.meta, live && styles.live]}>{live ? t('streams.live') : relativeStamp(stream.createdAt)}</Txt>
        <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  first: { marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.surfaceAlt },
  body: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: 14 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  title: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  topic: { marginTop: 2, fontSize: 13, lineHeight: 17, color: colors.textSecondary },
  meta: { fontSize: 15, color: colors.textSecondary },
  live: { color: colors.primary, fontWeight: '600' },
});

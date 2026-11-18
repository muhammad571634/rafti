import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { InkText, PillButton } from '@/components/ink';
import { PressableScale, Sheet, ShellIcon, SFIcon } from '@/components/ui';
import { THOUGHT_SHELLS } from '@/economy/thoughts';
import { useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, space } from '@/theme';

/**
 * Inner thoughts in the chat (owner's pick A on the "Inner thoughts" canvas, 2026-11-18): a cloud
 * button under their newest reply (`ReplyControls`), the thought itself under the reply in the
 * friend's own accent, a quiet "Thought read" mark once it is closed, and a small sheet when today's
 * free ones are used. The words come from the model with the reply (`src/ai/inner-thought.ts`).
 */

/** The thought cloud, drawn like the canvas: one stroke weight, round caps, two small puffs. */
export function ThoughtGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 15h8a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.6 8.4 3.3 3.3 0 0 0 8.5 15z" />
      <Circle cx={6.5} cy={18.6} r={1.4} />
      <Circle cx={4} cy={21.3} r={0.8} />
    </Svg>
  );
}

/** The opened thought under their reply: their name, the words in italics, a close button. */
export function ThoughtCard({ characterId, name, text, onClose }: { characterId: string; name: string; text: string; onClose: () => void }) {
  const { t } = useTranslation();
  const accent = friendAccent(characterId).strong;
  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.card, { borderColor: accent }]} accessible accessibilityLabel={`${t('chat.thoughtTitle', { name })}. ${text}`}>
      <View style={styles.cardHead}>
        <ThoughtGlyph size={16} color={accent} />
        <InkText variant="footnoteStrong" color={accent} style={styles.cardTitle}>
          {t('chat.thoughtTitle', { name })}
        </InkText>
        <PressableScale scaleTo={0.85} onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <SFIcon ios="xmark" icon="close" size={15} color={colors.onMediaMuted} />
        </PressableScale>
      </View>
      <InkText variant="body" style={styles.words}>
        {text}
      </InkText>
    </Animated.View>
  );
}

/** A read thought, closed: one quiet line under their reply that opens it again. */
export function ThoughtMark({ characterId, onPress }: { characterId: string; onPress: () => void }) {
  const { t } = useTranslation();
  const accent = friendAccent(characterId).strong;
  return (
    <PressableScale scaleTo={0.95} onPress={onPress} style={styles.markWrap} accessibilityRole="button" accessibilityLabel={t('chat.thoughtRead')}>
      <View style={[styles.mark, { borderColor: accent }]}>
        <ThoughtGlyph size={14} color={accent} />
        <InkText variant="footnoteStrong" color={accent}>
          {t('chat.thoughtRead')}
        </InkText>
      </View>
    </PressableScale>
  );
}

/** Today's free thoughts are used: read this one for shells, or not now. Too few shells: the packs. */
export function ThoughtSheet({ visible, characterId, name, onRead, onClose }: { visible: boolean; characterId: string; name: string; onRead: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const shells = useAppStore((s) => s.wallet.shells);
  const accent = friendAccent(characterId).strong;
  const enough = shells >= THOUGHT_SHELLS;
  const getShells = () => {
    onClose();
    router.push('/store/shell?tab=shells');
  };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={[styles.badge, { borderColor: accent }]}>
          <ThoughtGlyph size={34} color={accent} />
        </View>
        <InkText variant="card" center accessibilityRole="header">
          {t('chat.thoughtPayTitle', { name })}
        </InkText>
        <View style={styles.balance} accessible accessibilityLabel={t('plans.shells', { count: shells })}>
          <ShellIcon size={24} />
          <InkText variant="figureSmall">{String(shells)}</InkText>
        </View>
        <View style={styles.buttons}>
          {enough ? (
            <PillButton label={`${t('chat.thoughtReadIt')} · ${THOUGHT_SHELLS}`} accessibilityLabel={`${t('chat.thoughtReadIt')}, ${t('plans.shells', { count: THOUGHT_SHELLS })}`} onPress={onRead} />
          ) : (
            <PillButton label={t('chat.freeUsedShells')} onPress={getShells} />
          )}
          <PillButton label={t('chat.thoughtLater')} kind="quiet" onPress={onClose} />
        </View>
        <InkText variant="footnote" center>
          {t('chat.thoughtFreeAgain')}
        </InkText>
      </View>
    </Sheet>
  );
}

/** Their bubbles start here: 12 gutter + 28 avatar + 8 gap (`ReplyControls` row). */
const UNDER_BUBBLES = 48;

const styles = StyleSheet.create({
  card: {
    marginLeft: UNDER_BUBBLES,
    marginRight: space.xl,
    marginTop: space.xs,
    marginBottom: space.xs,
    maxWidth: 300,
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 11,
    gap: 4,
    borderRadius: 19,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    backgroundColor: colors.onMediaBubble,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1 },
  close: { width: 28, height: 28, marginVertical: -6, marginRight: -6, alignItems: 'center', justifyContent: 'center' },
  words: { fontStyle: 'italic', color: colors.onMedia },
  markWrap: { alignSelf: 'flex-start', marginLeft: UNDER_BUBBLES, marginTop: space.xs, marginBottom: space.xs, minHeight: 44, justifyContent: 'center' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, backgroundColor: colors.onMediaBubble },
  body: { gap: space.md, paddingTop: space.sm, alignItems: 'center' },
  badge: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  balance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttons: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xs },
});

import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { space } from '@/theme';
import { ink } from '@/theme/ink';
import type { ReplyTo } from '@/types';

/** The words a quote shows: the line itself, or what it was (a photo, a voice note). */
export function useQuoteWords(quote: ReplyTo): string {
  const { t } = useTranslation();
  if (quote.text) return quote.text;
  return quote.kind === 'image' ? t('chatList.previewPhoto') : t('chatList.previewVoice');
}

/**
 * The quoted line inside your reply (Telegram, iOS Messages inline reply): a peach bar, whose line it
 * was, then its words on up to two lines. A tap goes to the line while it is still in the chat.
 */
export function BubbleQuote({ quote, title, onPress, mine }: { quote: ReplyTo; title: string; onPress?: (id: string) => void; mine?: boolean }) {
  const words = useQuoteWords(quote);
  const body = (
    <>
      <View style={[styles.bar, mine && styles.barMine]} />
      <View style={styles.quoteText}>
        <Txt style={[styles.title, mine && styles.onMine]} lines={1}>
          {title}
        </Txt>
        <Txt style={[styles.words, mine && styles.wordsMine]} lines={2}>
          {words}
        </Txt>
      </View>
    </>
  );
  if (!onPress) return <View style={[styles.quote, mine && styles.quoteMine]}>{body}</View>;
  return (
    <Pressable
      onPress={() => onPress(quote.id)}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${words}`}
      style={({ pressed }) => [styles.quote, mine && styles.quoteMine, pressed && styles.quotePressed]}>
      {body}
    </Pressable>
  );
}

/** Over the composer while a reply is written: "Replying to Sam", the line, and × to drop it. */
export function ReplyBar({ quote, title, onCancel }: { quote: ReplyTo; title: string; onCancel: () => void }) {
  const { t } = useTranslation();
  const words = useQuoteWords(quote);
  return (
    <View style={styles.replyBar} accessibilityLiveRegion="polite">
      <Ionicons name="return-up-back" size={18} color={ink.accent} />
      <View style={styles.bar} />
      <View style={styles.quoteText}>
        <Txt style={styles.title} lines={1}>
          {t('chat.replyingTo', { name: title })}
        </Txt>
        <Txt style={styles.barWords} lines={1}>
          {words}
        </Txt>
      </View>
      <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('chat.cancelReply')} style={styles.cancel}>
        <Ionicons name="close" size={17} color={ink.text} />
      </Pressable>
    </View>
  );
}

/** How far to the left a bubble must go to reply; it gives less and less past the stop. */
const REPLY_AT = 56;
const STOP = 76;
const START = 16;
const SCROLL_FIRST = 10;
const BACK = { damping: 22, stiffness: 320, reduceMotion: ReduceMotion.System };

/**
 * Swipe a bubble to the left to answer it (Telegram; to the right would fight Android's back edge).
 * The bubble follows the finger, a reply arrow fades in on the right, a light tick at the line, and it
 * springs back on release. A vertical move first is the list's scroll; a still hold is the menu's.
 */
export function SwipeToReply({ onReply, children }: { onReply: () => void; children: ReactNode }) {
  const x = useSharedValue(0);
  const latest = useRef(onReply);
  latest.current = onReply;
  const pan = useMemo(() => {
    const reply = () => latest.current();
    return Gesture.Pan()
      .activeOffsetX(-START)
      .failOffsetX(START)
      .failOffsetY([-SCROLL_FIRST, SCROLL_FIRST])
      .onUpdate((e) => {
        const pull = Math.max(0, -e.translationX - START);
        x.value = -(pull > STOP ? STOP + (pull - STOP) * 0.15 : pull);
      })
      .onEnd(() => {
        if (x.value <= -REPLY_AT) scheduleOnRN(reply);
      })
      .onFinalize(() => {
        x.value = withSpring(0, BACK);
      });
  }, [x]);
  // One tick as the line is crossed, either way.
  useAnimatedReaction(
    () => x.value <= -REPLY_AT,
    (past, before) => {
      if (before !== null && past !== before && past) scheduleOnRN(haptic.selection);
    },
  );
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const arrow = useAnimatedStyle(() => {
    const shown = interpolate(-x.value, [START, REPLY_AT], [0, 1], Extrapolation.CLAMP);
    return { opacity: shown, transform: [{ scale: 0.6 + 0.4 * shown }] };
  });
  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.arrow, arrow]}>
        <View style={styles.arrowDisc}>
          <Ionicons name="return-up-back" size={16} color={ink.text} />
        </View>
      </Animated.View>
      <GestureDetector gesture={pan} touchAction="pan-y">
        <Animated.View style={moving}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  quote: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: 6,
    paddingVertical: 5,
    paddingRight: space.sm,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  quotePressed: { opacity: 0.7 },
  /** Inside your own peach bubble: the brand's ink on a faint ink wash (light words on peach read 1.6-2.5:1). */
  quoteMine: { backgroundColor: ink.onAccentWash },
  barMine: { backgroundColor: ink.onAccent },
  onMine: { color: ink.onAccent },
  wordsMine: { color: ink.onAccent, opacity: 0.85 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: ink.accent },
  quoteText: { flexShrink: 1, flexGrow: 1 },
  title: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: ink.accent },
  words: { fontSize: 14, lineHeight: 18, color: 'rgba(255,255,255,0.78)' },
  barWords: { fontSize: 14, lineHeight: 18, color: ink.text2 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginBottom: space.xs,
    paddingVertical: space.sm,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,34,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  cancel: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
  arrow: {
    position: 'absolute',
    right: space.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  arrowDisc: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
});

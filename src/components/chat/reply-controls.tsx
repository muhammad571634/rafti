import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { ThoughtGlyph } from '@/components/chat/thought';
import { PressableScale, SFIcon, Txt } from '@/components/ui';
import { colors, space } from '@/theme';

/** How far a swipe on their reply must travel to switch the version. */
const SWIPE = 48;

/**
 * Under their newest reply, kept calm (owner's "chat calm" pick A, 0z269; canvas `ChatRegen.dc.html`
 * before it): ↻ asks for a new version, and once there are several, ‹ 2/3 › steps between them;
 * Share puts the thread on a picture card (`share-sheet.tsx`). The 👍 👎 votes and Continue moved
 * to the reply's long-press menu (👍 is any happy reaction, `ratingOf`); a group, which has no
 * votes, still shows » here (Continue, `src/lib/chat-steer.ts`).
 * Icons in the on-picture white, as quiet as a read receipt; Share is a round clear-glass button
 * (owner on the canvas, 2026-11-17: "share tugmasi oynali bo'lsin").
 */
export function ReplyControls({
  count,
  index,
  onStep,
  onRedo,
  onContinue,
  onShare,
  shareReward = 0,
  onThought,
  thought = 'new',
  thoughtLabel,
  thoughtAccent,
}: {
  count: number;
  index: number;
  onStep: (delta: 1 | -1) => void;
  /** ↻; left out where there is no reply of theirs to redo yet (their greeting). */
  onRedo?: () => void;
  /** »; left out while the chat waits for the user. */
  onContinue?: () => void;
  /** Share; left out while their reply has no words yet (`shareLines`). */
  onShare?: () => void;
  /** Shells the next share pays (`shareReward`); 0 once today's paid shares are used. */
  shareReward?: number;
  /** The thought cloud (owner's pick A, 2026-11-18); left out when their reply came without a thought. */
  onThought?: () => void;
  /** `new`: not read yet (a dot in their accent); `open`: showing under the reply. */
  thought?: 'new' | 'read' | 'open';
  thoughtLabel?: string;
  /** The friend's accent (`friendAccent`): the dot, and the cloud while it is open. */
  thoughtAccent?: string;
}) {
  const { t } = useTranslation();
  const first = index === 0;
  const last = index === count - 1;
  const onPhoto = useOnPhoto();
  const quiet = onPhoto ? colors.onMediaSoft : colors.textSecondary;

  return (
    <View style={styles.row}>
      {count > 1 ? (
        <>
          <PressableScale
            scaleTo={0.85}
            disabled={first}
            onPress={() => onStep(-1)}
            style={[styles.button, first && styles.off]}
            hitSlop={TALL}
            accessibilityRole="button"
            accessibilityLabel={t('chat.prevVersion')}>
            <SFIcon ios="chevron.left" icon="chevron-back" size={17} color={quiet} />
          </PressableScale>
          <Txt style={[styles.count, onPhoto && onPhotoCount]} accessibilityLabel={t('chat.versionOf', { index: index + 1, count })}>
            {`${index + 1}/${count}`}
          </Txt>
          <PressableScale
            scaleTo={0.85}
            disabled={last}
            onPress={() => onStep(1)}
            style={[styles.button, last && styles.off]}
            hitSlop={TALL}
            accessibilityRole="button"
            accessibilityLabel={t('chat.nextVersion')}>
            <SFIcon ios="chevron.right" icon="chevron-forward" size={17} color={quiet} />
          </PressableScale>
        </>
      ) : null}
      {onRedo ? (
        <PressableScale
          scaleTo={0.85}
          haptic
          onPress={onRedo}
          style={styles.redo}
          hitSlop={TALL}
          accessibilityRole="button"
          accessibilityLabel={t('chat.newReply')}>
          <SFIcon ios="arrow.clockwise" icon="refresh" size={21} color={quiet} />
        </PressableScale>
      ) : null}
      {onThought ? (
        <PressableScale
          scaleTo={0.92}
          haptic
          onPress={onThought}
          style={styles.shareTarget}
          hitSlop={TALL}
          accessibilityRole="button"
          accessibilityState={{ expanded: thought === 'open' }}
          accessibilityLabel={thoughtLabel}>
          {/* Clear glass like Share; a dot in their accent while it is unread. */}
          <View style={[styles.share, onPhoto ? styles.shareGlass : styles.shareFill, thought === 'open' && thoughtAccent ? { borderColor: thoughtAccent, borderWidth: 1 } : null]}>
            <ThoughtGlyph size={21} color={thought === 'open' && thoughtAccent ? thoughtAccent : onPhoto ? colors.onMedia : colors.text} />
            {thought === 'new' && thoughtAccent ? <View style={[styles.dot, { backgroundColor: thoughtAccent }]} /> : null}
          </View>
        </PressableScale>
      ) : null}
      {onContinue ? (
        <PressableScale
          scaleTo={0.85}
          haptic
          onPress={onContinue}
          style={styles.redo}
          hitSlop={TALL}
          accessibilityRole="button"
          accessibilityLabel={t('chat.continue')}>
          <SFIcon ios="chevron.right.2" icon="play-forward-outline" size={21} color={quiet} />
        </PressableScale>
      ) : null}
      {onShare ? (
        <PressableScale
          scaleTo={0.92}
          haptic
          onPress={onShare}
          style={styles.shareTarget}
          hitSlop={TALL}
          accessibilityRole="button"
          accessibilityLabel={shareReward ? `${t('common.share')}, +${shareReward} ${t('common.shells')}` : t('common.share')}>
          {/* Round and clear glass, as the header's buttons on the picture; what it pays shows in the sheet. */}
          <View style={[styles.share, onPhoto ? styles.shareGlass : styles.shareFill]}>
            <SFIcon ios="square.and.arrow.up" icon="share-outline" size={19} color={onPhoto ? colors.onMedia : colors.text} />
          </View>
        </PressableScale>
      ) : null}
    </View>
  );
}

/**
 * A bubble of their newest reply that follows a sideways swipe: left shows the next version,
 * right the one before. Every bubble of the reply shares `offset`, so they move as one.
 */
export function VersionSwipe({
  offset,
  onStep,
  children,
}: {
  offset: SharedValue<number>;
  onStep: (delta: 1 | -1) => void;
  children: ReactNode;
}) {
  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Sideways only: a vertical drag still scrolls the chat, a still hold still opens the menu.
        .activeOffsetX([-14, 14])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          offset.value = e.translationX * 0.35;
        })
        .onEnd((e) => {
          offset.value = withSpring(0, { damping: 20, stiffness: 260 });
          if (e.translationX <= -SWIPE) scheduleOnRN(onStep, 1);
          else if (e.translationX >= SWIPE) scheduleOnRN(onStep, -1);
        }),
    [offset, onStep],
  );
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={moving}>{children}</Animated.View>
    </GestureDetector>
  );
}

/** The row is 40 pt tall: two points each way make every button a full 44 pt target. */
const TALL = { top: 2, bottom: 2 };
/** The round Share button, as tall as the row. */
const SHARE = 40;

const styles = StyleSheet.create({
  // Starts under their bubbles: 12 gutter + 28 avatar + 8 gap, less the button's own inset.
  row: { flexDirection: 'row', alignItems: 'center', height: 40, paddingLeft: 34, marginTop: -space.xs },
  button: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.3 },
  count: { minWidth: 34, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  redo: { width: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareTarget: { height: 40, justifyContent: 'center', marginLeft: space.xs },
  share: { width: SHARE, height: SHARE, borderRadius: SHARE / 2, alignItems: 'center', justifyContent: 'center' },
  // The chat header's glass on the picture (`chat-header.tsx` photoRound).
  shareGlass: { backgroundColor: colors.onMediaGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  shareFill: { backgroundColor: colors.surfaceAlt },
  dot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: colors.black },
});

const onPhotoCount = { color: colors.onMediaSoft };

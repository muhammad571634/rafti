import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { SharePill } from '@/components/share-card-sheet';
import { PressableScale, SFIcon, Txt } from '@/components/ui';
import type { Rating } from '@/lib/reply-rating';
import { colors, space } from '@/theme';

/** How far a swipe on their reply must travel to switch the version. */
const SWIPE = 48;

/**
 * Under their newest reply (canvas `ChatRegen.dc.html`): 👍 👎 vote on how it was written
 * (`src/lib/reply-rating.ts`), ↻ asks for a new version, and once there are several, ‹ 2/3 › steps
 * between them; » lets them go on without the user writing (Continue, `src/lib/chat-steer.ts`);
 * and Share puts the thread on a picture card (`share-sheet.tsx`).
 * Icons in the secondary grey, as quiet as a read receipt; a cast vote fills in peach. Share alone
 * wears the primary peach (owner, 2026-10-30: "colourful, a bit bigger, so people tap it"), with
 * "+5 🐚" while today's paid shares last.
 */
export function ReplyControls({
  count,
  index,
  onStep,
  onRedo,
  onContinue,
  onShare,
  shareReward = 0,
  rating,
  onRate,
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
  /** The reply's vote, cast or from a happy sticker (`ratingOf`). */
  rating?: Rating;
  /** 👍 👎; left out where the reply cannot be voted on (their greeting, a crisis reply). */
  onRate?: (rating: Rating) => void;
}) {
  const { t } = useTranslation();
  const first = index === 0;
  const last = index === count - 1;
  const up = rating === 'up';
  const down = rating === 'down';
  const onPhoto = useOnPhoto();
  const quiet = onPhoto ? colors.onMediaSoft : colors.textSecondary;

  return (
    <View style={styles.row}>
      {onRate ? (
        <>
          <PressableScale
            scaleTo={0.85}
            onPress={() => onRate('up')}
            style={styles.button}
            hitSlop={TALL}
            accessibilityRole="button"
            accessibilityLabel={t('chat.rateUp')}
            accessibilityState={{ selected: up }}>
            <SFIcon
              ios={up ? 'hand.thumbsup.fill' : 'hand.thumbsup'}
              icon={up ? 'thumbs-up' : 'thumbs-up-outline'}
              size={20}
              color={up ? colors.primary : quiet}
            />
          </PressableScale>
          <PressableScale
            scaleTo={0.85}
            onPress={() => onRate('down')}
            style={styles.button}
            hitSlop={TALL}
            accessibilityRole="button"
            accessibilityLabel={t('chat.rateDown')}
            accessibilityState={{ selected: down }}>
            <SFIcon
              ios={down ? 'hand.thumbsdown.fill' : 'hand.thumbsdown'}
              icon={down ? 'thumbs-down' : 'thumbs-down-outline'}
              size={20}
              color={down ? colors.primary : quiet}
            />
          </PressableScale>
          {count > 1 || onRedo || onContinue || onShare ? <View style={[styles.divider, onPhoto && styles.photoDivider]} /> : null}
        </>
      ) : null}
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
          {/* Owner 2026-11-08: a round peach share button only; what it pays shows in the sheet. */}
          <SharePill reward={0} />
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

const styles = StyleSheet.create({
  // Starts under their bubbles: 12 gutter + 28 avatar + 8 gap, less the button's own inset.
  row: { flexDirection: 'row', alignItems: 'center', height: 40, paddingLeft: 34, marginTop: -space.xs },
  button: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.3 },
  divider: { width: StyleSheet.hairlineWidth * 2, height: 18, marginHorizontal: space.xs, backgroundColor: colors.borderStrong },
  count: { minWidth: 34, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  redo: { width: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareTarget: { height: 40, justifyContent: 'center', marginLeft: space.xs },
  photoDivider: { backgroundColor: colors.onMediaHairline },
});

const onPhotoCount = { color: colors.onMediaSoft };

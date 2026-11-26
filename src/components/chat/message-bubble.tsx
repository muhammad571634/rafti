import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { cleanReact } from '@/ai/react';
import { BoothPhotoMessage, ChatPhoto, DatePhotoMessage } from '@/components/chat/bubble/media';
import {
  AgeCheckCard,
  AiNotice,
  BoardNoteLine,
  CallLine,
  HelplineCard,
  NotifyOffNote,
  SceneCard,
  SkipLine,
  SystemLine,
  VoiceQuotaNote,
  WeekCard,
} from '@/components/chat/bubble/notes';
import { EditedNote, NotDelivered, ReadReceipt } from '@/components/chat/bubble/receipts';
import { AVATAR, bubbleStyles } from '@/components/chat/bubble/styles';
import { TextBubble } from '@/components/chat/bubble/text-bubble';
import { VoiceBubble } from '@/components/chat/bubble/voice-bubble';
import { onPhotoText, useOnPhoto } from '@/components/chat/chat-ground';
import { SetupCard } from '@/components/chat/setup-card';
import { TONE_LOOK } from '@/components/chat/tone-menu';
import { ReactionBadge } from '@/components/ink';
import { Anim, CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { clockTime } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, friendColor, shadows, space } from '@/theme';
import { ink } from '@/theme/ink';
import type { Character, Message } from '@/types';

export interface MessageBubbleProps {
  message: Message;
  character: Character;
  /** First message of a run from the same author: a group member's name goes over it. */
  showAvatar: boolean;
  /** Last message of a run: it carries the avatar and the bubble's tail (iOS Messages). */
  runEnd: boolean;
  /** The user's last message shows "Read" or "Delivered" under it. */
  receipt?: boolean;
  /** One-to-one chats: their small face beside "Read" (a group has no one face to show). */
  readFace?: boolean;
  /** The time under the message (`showsTime`). */
  showTime?: boolean;
  animate?: boolean;
  onCallBack?: () => void;
  /** A tap (with `onDoubleTap`) or a hold on a text or photo opens the message menu (react, reply, copy, delete), lifted over where the bubble is. */
  onLongPress?: (message: Message, anchor?: BubbleAnchor) => void;
  /** A double tap on a text or photo: love it, or take the love back (Instagram). */
  onDoubleTap?: (message: Message) => void;
  /** Group chats: the member's name over the first bubble of their run. */
  senderName?: string;
  /** Group chats: optional friend-accent hue for sender label, avatar ring, and Variant A narration rule. */
  accentColor?: string;
  /** Group chats: the "not real people" line names everyone. */
  aiNoticeText?: string;
  /** The line is pinned to Memories: a small pin sits on its top corner. */
  pinned?: boolean;
  /** A line of yours that got no reply: "Not Delivered" under it asks again. */
  onRetry?: () => void;
  /** Group chats: a tap on the member's avatar asks them to speak. */
  onAvatarPress?: (character: Character) => void;
  /** A reply's quote: whose line it answers ("You", their name); without it no quote shows. */
  quoteTitle?: string;
  /** A tap on the quote goes to the quoted line. */
  onQuotePress?: (id: string) => void;
}

/** Where a held bubble sits on the screen, so the menu can lift it in place (iOS context menus). */
export interface BubbleAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The heart burst over a loved line. */
const BURST = 120;

/**
 * Memoised: a long history re-renders only the rows whose message or run position
 * changed, not every bubble on each new message or typing flip.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  character,
  showAvatar,
  runEnd,
  receipt,
  readFace,
  showTime,
  animate = true,
  onCallBack,
  onLongPress,
  onDoubleTap,
  senderName,
  accentColor,
  aiNoticeText,
  pinned,
  onRetry,
  onAvatarPress,
  quoteTitle,
  onQuotePress,
}: MessageBubbleProps) {
  const router = useRouter();
  const { t } = useTranslation();
  /** The held area, measured on a long press so the menu lifts the bubble where it is. */
  const holdRef = useRef<ViewInstance>(null);
  /** When a button inside the bubble (the quote) took the tap, so the tap does not open the menu too. */
  const innerPressAt = useRef(0);
  const openHeld = () => {
    if (!onLongPress) return;
    const node = holdRef.current;
    if (!node) return onLongPress(message);
    node.measureInWindow((x, y, width, height) => onLongPress(message, width > 0 ? { x, y, width, height } : undefined));
  };
  /** The heart that bursts over a line as a double tap loves it (the wired `heartBurst` Lottie). */
  const [burst, setBurst] = useState(0);
  const still = useReducedMotion();
  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(0), 1300);
    return () => clearTimeout(timer);
  }, [burst]);
  const love = () => {
    if (!still && message.reaction !== 'love') setBurst(Date.now());
    onDoubleTap?.(message);
  };
  const latest = useRef({ love, openHeld, message });
  latest.current = { love, openHeld, message };
  // One tap opens the menu (Telegram), once a second tap did not follow; two taps love the line.
  const taps = useMemo(() => {
    const double = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(260)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) latest.current.love();
      });
    const single = Gesture.Tap()
      // A hold is the long press's, not a tap.
      .maxDuration(250)
      .runOnJS(true)
      .onEnd((_e, success) => {
        // A picture opens itself on a tap; a hold still gives its menu.
        const shown = latest.current.message;
        if (!success || shown.photoId || (shown.kind === 'image' && shown.imageUri) || Date.now() - innerPressAt.current < 600) return;
        latest.current.openHeld();
      });
    return Gesture.Exclusive(double, single);
  }, []);
  const quotePress = onQuotePress
    ? (id: string) => {
        innerPressAt.current = Date.now();
        onQuotePress(id);
      }
    : undefined;
  // The name the user gave them ("Mom") is the one the chat header shows, so notes use it too.
  const nickname = useAppStore((s) => s.relationships[character.id]?.nickname);
  const name = nickname || character.name;
  const onPhoto = useOnPhoto();
  const mine = message.author === 'me';
  const photoId = message.photoId;
  /** A photo the user sent: a tap opens it full screen. */
  const viewUri = message.kind === 'image' && !message.dateId && !photoId ? message.imageUri : undefined;
  const named = !mine && showAvatar && !!senderName;
  const time = showTime ? clockTime(message.createdAt) : undefined;
  // Their bubble with a name over it or a time under it: the column holds the width cap.
  const column = named || (!mine && !!time);

  if (message.card === 'helpline') return <HelplineCard />;
  if (message.card === 'ageCheck') return <AgeCheckCard />;
  // Only groups still get the line; a one-to-one chat's header says "AI character" (2026-10-30).
  if (message.card === 'aiNotice') return aiNoticeText ? <AiNotice text={aiNoticeText} /> : null;
  if (message.card === 'voiceQuota') return <VoiceQuotaNote until={message.until} />;
  if (message.card === 'notifyOff') return <NotifyOffNote name={name.split(' ')[0]} />;
  if (message.card === 'week' && message.week) return <WeekCard week={message.week} />;
  if (message.card === 'setup') return <SetupCard message={message} />;
  if (message.card === 'board') return <BoardNoteLine text={message.text ?? ''} />;
  if (message.card === 'scene') return <SceneCard title={message.text ?? ''} setting={message.setting} />;
  if (message.card === 'sceneEnd') return <SystemLine text={t('scenes.ended', { title: message.text ?? '' })} />;
  // A continue is the user's turn without words: nothing to show, their lines follow.
  if (message.card === 'continue') return null;
  if (message.card === 'skip') return <SkipLine text={message.skip === 'own' && message.skipTo ? message.skipTo : t(`chat.skip.${message.skip ?? 'later'}`)} />;
  // A twist: their words, or just "Twist" when the friend picked it.
  if (message.card === 'twist') return <SkipLine icon="shuffle" text={message.skipTo?.trim() || t('chat.attachments.twist')} />;
  if (message.kind === 'system') return <SystemLine text={message.text ?? ''} />;
  if (message.kind === 'call') return <CallLine message={message} onCallBack={onCallBack} />;

  // With a double tap the wrapper carries the width cap, so the held area fills it.
  const holdStyle = [styles.holdable, (column || !!onDoubleTap) && bubbleStyles.wide, message.reaction || (mine && message.theirReaction) ? styles.withReaction : null];
  const inner = (
    <>
      {message.kind === 'image' && message.dateId ? (
        <DatePhotoMessage dateId={message.dateId} caption={message.text ?? ''} />
      ) : message.kind === 'image' && message.photoId ? (
        <BoothPhotoMessage photoId={message.photoId} character={character} />
      ) : message.kind === 'image' && message.imageUri ? (
        <ChatPhoto uri={message.imageUri} aspect={message.imageAspect} />
      ) : (
        <TextBubble message={message} mine={mine} tail={runEnd} accentColor={accentColor} quoteTitle={quoteTitle} onQuotePress={quotePress} />
      )}
      {burst ? <Anim key={burst} name="heartBurst" size={BURST} loop={false} style={styles.burst} /> : null}
      {pinned ? (
        <View
          style={[styles.pinBadge, mine ? styles.pinMine : styles.pinTheirs]}
          accessible
          accessibilityLabel={t('chat.pinnedToast')}>
          <Ionicons name="pin" size={14} color={colors.textSecondary} />
        </View>
      ) : null}
      {mine && message.tone ? (
        <View
          style={[styles.pinBadge, pinned ? styles.toneByPin : styles.pinMine, { backgroundColor: TONE_LOOK[message.tone].fill }]}
          accessible
          accessibilityLabel={t(`chat.tones.${message.tone}`)}>
          <Ionicons name={TONE_LOOK[message.tone].icon} size={14} color={colors.white} />
        </View>
      ) : null}
      {/* Your reaction (peach) and theirs on your line (their hue): drops pointing at the line that Bounce in, Replace, Disappear (§6.5). */}
      <ReactionBadge
        name={message.reaction}
        fill={ink.accent}
        glyph={ink.onAccent}
        point={mine && !message.theirReaction ? 'topRight' : 'topLeft'}
        // Your own reaction on your line steps to the other corner when theirs is on it.
        style={[styles.reaction, mine ? (message.theirReaction ? styles.reactionTheirs : styles.reactionMine) : styles.reactionTheirs]}
      />
      {mine ? (
        // Their reaction on what you said (owner, 2026-11-08: alive): it lands as it arrives.
        <ReactionBadge
          name={message.theirReaction}
          fill={friendColor(character.id).fill}
          glyph={friendColor(character.id).ink}
          point="topRight"
          tapOnLand
          style={[styles.reaction, styles.reactionMine]}
          accessibilityLabel={cleanReact(message.theirReaction) ? t('chat.theyReacted', { name: t(`chat.reactions.${message.theirReaction}`) }) : undefined}
        />
      ) : null}
    </>
  );
  const pressable = (
    // Still under the finger, as in iOS Messages: a hold opens the menu, nothing shrinks or dims.
    <Pressable
      ref={holdRef}
      delayLongPress={280}
      onPress={
        photoId
          ? () => router.push({ pathname: '/photo/[id]', params: { id: photoId } })
          : viewUri
            ? () => router.push({ pathname: '/photo/view', params: { uri: viewUri } })
            : undefined
      }
      onLongPress={onLongPress ? openHeld : undefined}
      style={holdStyle}>
      {inner}
    </Pressable>
  );
  const content =
    message.kind === 'voice' ? (
      <VoiceBubble message={message} mine={mine} tail={runEnd} wide={column} />
    ) : !onLongPress && !photoId && !viewUri ? (
      // Nothing to press (a stream's lines): a plain view.
      <View style={holdStyle}>{inner}</View>
    ) : onDoubleTap ? (
      <GestureDetector gesture={taps}>
        <View collapsable={false} style={column ? bubbleStyles.wide : styles.tapArea}>
          {pressable}
        </View>
      </GestureDetector>
    ) : (
      pressable
    );

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(260).springify().damping(22).stiffness(280) : undefined}
      style={[styles.row, !!time && styles.timedRow, runEnd && styles.runEnd]}>
      {mine ? (
        // The user's side: no avatar, as in iOS Messages; the last message says Read or Delivered.
        <View style={styles.mine}>
          {content}
          {message.failed ? (
            <NotDelivered onRetry={onRetry} time={time} />
          ) : receipt ? (
            <ReadReceipt message={message} time={time} face={readFace ? character : undefined} />
          ) : message.editedAt ? (
            <EditedNote time={time} />
          ) : time ? (
            <Txt style={[bubbleStyles.receipt, onPhoto && onPhotoText]}>{time}</Txt>
          ) : null}
        </View>
      ) : (
        <>
          <View style={[styles.avatarSlot, !!time && styles.avatarOverTime]}>
            {runEnd ? (
              onAvatarPress ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => onAvatarPress(character)}
                  hitSlop={8}>
                  {accentColor ? (
                    <View style={[styles.avatarRing, { borderColor: accentColor }]}>
                      <CharacterAvatar character={character} size={AVATAR - 4} />
                    </View>
                  ) : (
                    <CharacterAvatar character={character} size={AVATAR} />
                  )}
                </PressableScale>
              ) : accentColor ? (
                <View style={[styles.avatarRing, { borderColor: accentColor }]}>
                  <CharacterAvatar character={character} size={AVATAR - 4} />
                </View>
              ) : (
                <CharacterAvatar character={character} size={AVATAR} />
              )
            ) : null}
          </View>
          {column ? (
            <View style={styles.column}>
              {named ? (
                <Txt
                  variant="caption"
                  color={accentColor ?? (onPhoto ? colors.onMediaSoft : colors.textSecondary)}
                  lines={1}
                  style={[styles.sender, accentColor && styles.senderAccented, onPhoto && bubbleStyles.photoShadow]}>
                  {senderName}
                </Txt>
              ) : null}
              {content}
              {time ? <Txt style={[bubbleStyles.receipt, styles.timeTheirs, onPhoto && onPhotoText]}>{time}</Txt> : null}
            </View>
          ) : (
            content
          )}
        </>
      )}
    </Animated.View>
  );
});

/** A held text line drawn again over the menu's blur, where it sat (iOS context menus). */
export function HeldBubble({ message }: { message: Message }) {
  return <TextBubble message={message} mine={message.author === 'me'} tail={false} />;
}

const styles = StyleSheet.create({
  // The held area carries the bubble's width cap, so the text bubble fills it.
  holdable: { flexShrink: 1, maxWidth: '72%' },
  // A bubble with a member's name or a time shares one column with them, which carries the cap instead.
  column: { flexShrink: 1, maxWidth: '72%', alignItems: 'flex-start', gap: 3 },
  sender: { paddingLeft: space.xs },
  senderAccented: { fontWeight: '700' },
  timeTheirs: { paddingTop: 0, paddingRight: 0, paddingLeft: space.xs },
  // Room under the bubble for the reaction that hangs off its corner.
  withReaction: { marginBottom: space.xl + 2 },
  // The drop hangs off the bottom corner (the top corners carry the pin and tone marks). It overlaps
  // only the bubble's bottom padding: on a two-letter line ("Ok", A51 2026-11-18) it covered the words.
  reaction: { position: 'absolute', bottom: -space.xl - 4 },
  reactionMine: { left: -space.sm - 2 },
  reactionTheirs: { right: -space.sm - 2 },
  // A pinned line's mark, on the corner away from the tail (canvas `MenuPin.dc.html`).
  pinBadge: {
    position: 'absolute',
    top: -7,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  burst: { position: 'absolute', top: '50%', left: '50%', marginTop: -BURST / 2, marginLeft: -BURST / 2, zIndex: 2 },
  pinMine: { left: -7 },
  pinTheirs: { right: -7 },
  // A text's tone (`TONE_LOOK`) wears the pin's shape and steps aside for a pin.
  toneByPin: { left: 21 },
  // Bubbles of one run sit 2pt apart; a new run starts 10pt lower.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    marginBottom: 2,
  },
  timedRow: { marginBottom: space.sm },
  runEnd: { marginBottom: space.sm + 2 },
  mine: { flex: 1, alignItems: 'flex-end' },
  avatarSlot: { width: AVATAR },
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // The avatar stays level with the bubble, above the time's line (14pt + the 3pt gap).
  avatarOverTime: { marginBottom: 17 },
  tapArea: { flexShrink: 1, maxWidth: '72%' },
});

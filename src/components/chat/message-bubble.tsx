import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Anim, CharacterAvatar, PressableScale, Txt, UserAvatar } from '@/components/ui';
import { clockTime, duration as fmtDuration } from '@/lib/format';
import { colors, radius, shadows, space } from '@/theme';
import type { Character, Message, User } from '@/types';

export interface MessageBubbleProps {
  message: Message;
  character: Character;
  user: User;
  /** First message of a run from the same author — only then is the avatar drawn. */
  showAvatar: boolean;
  animate?: boolean;
  onCallBack?: () => void;
  /** Long-press on a text or photo opens the message menu (react, copy, delete). */
  onLongPress?: (message: Message) => void;
}

const AVATAR = 34;

/**
 * Memoised: a long history re-renders only the rows whose message or run position
 * changed, not every bubble on each new message or typing flip.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  character,
  user,
  showAvatar,
  animate = true,
  onCallBack,
  onLongPress,
}: MessageBubbleProps) {
  const mine = message.author === 'me';

  if (message.kind === 'system') return <SystemLine text={message.text ?? ''} />;
  if (message.kind === 'call') return <CallLine message={message} onCallBack={onCallBack} />;

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(220).springify().damping(18) : undefined}
      style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, showAvatar && styles.runStart]}>
      {!mine ? (
        <View style={styles.avatarSlot}>
          {showAvatar ? <CharacterAvatar character={character} size={AVATAR} /> : null}
        </View>
      ) : null}

      {mine ? <ReadReceipt message={message} /> : null}

      {message.kind === 'voice' ? (
        <VoiceBubble message={message} mine={mine} first={showAvatar} />
      ) : (
        <PressableScale
          scaleTo={0.97}
          delayLongPress={280}
          disabled={!onLongPress}
          onLongPress={onLongPress ? () => onLongPress(message) : undefined}
          style={[styles.holdable, message.reaction ? styles.withReaction : null]}>
          {message.kind === 'image' && message.imageUri ? (
            <Image source={{ uri: message.imageUri }} style={styles.photo} contentFit="cover" />
          ) : (
            <TextBubble message={message} mine={mine} first={showAvatar} />
          )}
          {message.reaction ? (
            <View style={[styles.reaction, mine ? styles.reactionMine : styles.reactionTheirs, shadows.card]}>
              <Txt variant="small">{message.reaction}</Txt>
            </View>
          ) : null}
        </PressableScale>
      )}

      {!mine ? (
        <Txt variant="tiny" color={colors.textFaint} style={styles.stamp}>
          {clockTime(message.createdAt)}
        </Txt>
      ) : null}

      {mine ? (
        <View style={styles.avatarSlot}>{showAvatar ? <UserAvatar user={user} size={AVATAR - 4} /> : null}</View>
      ) : null}
    </Animated.View>
  );
});

function TextBubble({ message, mine, first }: { message: Message; mine: boolean; first: boolean }) {
  const muted = message.muted;

  return (
    <View
      style={[
        styles.bubble,
        styles.fill,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        first && (mine ? styles.tailMine : styles.tailTheirs),
        muted && styles.bubbleMuted,
        !muted && shadows.card,
      ]}>
      <Txt
        variant="body"
        color={muted ? colors.bubbleTranscriptText : mine ? colors.bubbleSelfText : colors.bubbleOtherText}>
        {message.text}
      </Txt>
    </View>
  );
}

/** "🔊 0:06" — tap plays (mock), long-press reveals what was said. */
function VoiceBubble({ message, mine, first }: { message: Message; mine: boolean; first: boolean }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const seconds = message.durationSec ?? 0;

  const play = () => {
    if (playing) return setPlaying(false);
    setPlaying(true);
    // Real builds stream the clip with expo-audio; the mock just runs the clock.
    setTimeout(() => setPlaying(false), Math.min(seconds, 12) * 1000);
  };

  return (
    <View style={[styles.voiceWrap, mine && styles.voiceWrapMine]}>
      <PressableScale
        onPress={play}
        onLongPress={() => setShowTranscript((v) => !v)}
        scaleTo={0.95}
        accessibilityLabel={t('chat.tapToPlay')}
        style={[
          styles.bubble,
          styles.voiceBubble,
          { minWidth: Math.min(200, 84 + seconds * 5) },
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          first && (mine ? styles.tailMine : styles.tailTheirs),
          shadows.card,
        ]}>
        {playing ? (
          <Anim name="voiceWave" size={24} tint={mine ? colors.primary : colors.textSecondary} />
        ) : (
          <Ionicons name="volume-medium" size={18} color={mine ? colors.primary : colors.textSecondary} />
        )}
        <Txt variant="small" color={mine ? colors.bubbleSelfText : colors.bubbleOtherText}>
          {fmtDuration(seconds)}
        </Txt>
      </PressableScale>

      {showTranscript && message.transcript ? (
        <View style={[styles.bubble, styles.transcript]}>
          <Txt variant="small" color={colors.bubbleTranscriptText}>
            {message.transcript}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function ReadReceipt({ message }: { message: Message }) {
  const { t } = useTranslation();

  return (
    <View style={styles.receipt}>
      {message.pending ? (
        <Txt variant="tiny" color={colors.textFaint}>
          {t('chat.sending')}
        </Txt>
      ) : (
        <>
          {message.readAt ? (
            <Txt variant="tiny" color={colors.textFaint}>
              {t('chat.read')}
            </Txt>
          ) : null}
          <Txt variant="tiny" color={colors.textFaint}>
            {clockTime(message.readAt ?? message.createdAt)}
          </Txt>
        </>
      )}
    </View>
  );
}

function SystemLine({ text }: { text: string }) {
  return (
    <View style={styles.system}>
      <View style={styles.systemPill}>
        <Txt variant="caption" color={colors.textSecondary}>
          {text}
        </Txt>
      </View>
    </View>
  );
}

function CallLine({ message, onCallBack }: { message: Message; onCallBack?: () => void }) {
  const { t } = useTranslation();
  const missed = !!message.missed;

  return (
    <View style={styles.system}>
      <PressableScale
        style={[styles.systemPill, styles.callPill]}
        onPress={onCallBack}
        disabled={!onCallBack}
        scaleTo={0.96}>
        <Ionicons
          name={missed ? 'call-outline' : 'call'}
          size={13}
          color={missed ? colors.danger : colors.primary}
        />
        <Txt variant="caption" color={missed ? colors.danger : colors.textSecondary}>
          {missed ? t('chat.callMissed') : t('chat.callDuration', { duration: fmtDuration(message.durationSec ?? 0) })}
        </Txt>
        {missed && onCallBack ? (
          <Txt variant="caption" color={colors.primary}>
            {' · '}
            {t('chat.callBack')}
          </Txt>
        ) : null}
        <Txt variant="tiny" color={colors.textFaint}>
          {'  '}
          {clockTime(message.createdAt)}
        </Txt>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  // The held area carries the bubble's width cap, so the text bubble fills it.
  holdable: { flexShrink: 1, maxWidth: '72%' },
  fill: { maxWidth: '100%' },
  // Room under the bubble for the reaction that hangs off its corner.
  withReaction: { marginBottom: space.md },
  reaction: {
    position: 'absolute',
    bottom: -space.md - 2,
    minWidth: 28,
    height: 26,
    paddingHorizontal: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionMine: { left: -space.xs },
  reactionTheirs: { right: -space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  runStart: { marginTop: space.xs },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  avatarSlot: { width: AVATAR, alignSelf: 'flex-start' },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.bubble,
  },
  bubbleMine: { backgroundColor: colors.bubbleSelf },
  bubbleTheirs: { backgroundColor: colors.bubbleOther },
  // The first bubble of a run points at the avatar beside it.
  tailMine: { borderTopRightRadius: radius.xs },
  tailTheirs: { borderTopLeftRadius: radius.xs },
  bubbleMuted: { backgroundColor: colors.bubbleTranscript },
  voiceWrap: { alignItems: 'flex-start', gap: space.xs, maxWidth: '72%' },
  voiceWrapMine: { alignItems: 'flex-end' },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '100%',
  },
  transcript: {
    backgroundColor: colors.bubbleTranscript,
    maxWidth: '100%',
  },
  photo: {
    width: 168,
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  receipt: { alignItems: 'flex-end', marginBottom: 2 },
  stamp: { marginBottom: 2 },
  system: { alignItems: 'center', paddingVertical: space.sm },
  systemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  callPill: { paddingHorizontal: space.md },
});

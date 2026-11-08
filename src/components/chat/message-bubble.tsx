import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { HELPLINE_URL } from '@/ai/safety';
import { REACTION_STICKERS, type ReactionName } from '@/assets/brand/registry';
import { onPhotoText, useOnPhoto } from '@/components/chat/chat-ground';
import { ReactionSticker } from '@/components/chat/reaction-sticker';
import { SetupCard } from '@/components/chat/setup-card';
import { playNote, stopNote } from '@/components/chat/voice-player';
import { TONE_LOOK } from '@/components/chat/tone-menu';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { Anim, Button, CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { VOICE_NO_WORDS } from '@/ai/voice-prompt';
import { clockTime, duration as fmtDuration } from '@/lib/format';
import { cutSegments, segments, segmentWords } from '@/lib/reply-engine';
import { useReveal } from '@/lib/reveal';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, shadows, space, systemColors } from '@/theme';
import type { Character, Message, WeekStats } from '@/types';

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
  /** Long-press on a text or photo opens the message menu (react, copy, delete), lifted over where the bubble is. */
  onLongPress?: (message: Message, anchor?: BubbleAnchor) => void;
  /** A double tap on a text or photo: love it, or take the love back (Instagram). */
  onDoubleTap?: (message: Message) => void;
  /** Group chats: the member's name over the first bubble of their run. */
  senderName?: string;
  /** Group chats: the "not real people" line names everyone. */
  aiNoticeText?: string;
  /** The line is pinned to Memories: a small pin sits on its top corner. */
  pinned?: boolean;
  /** A line of yours that got no reply: "Not Delivered" under it asks again. */
  onRetry?: () => void;
  /** Group chats: a tap on the member's avatar asks them to speak. */
  onAvatarPress?: (character: Character) => void;
}

/** Where a held bubble sits on the screen, so the menu can lift it in place (iOS context menus). */
export interface BubbleAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const AVATAR = 28;
/** iOS bubble corners; the tail corner of a run's last bubble is tighter. */
const CORNER = 19;
const TAIL = 6;

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
  aiNoticeText,
  pinned,
  onRetry,
  onAvatarPress,
}: MessageBubbleProps) {
  const router = useRouter();
  const { t } = useTranslation();
  /** The held area, measured on a long press so the menu lifts the bubble where it is. */
  const holdRef = useRef<ViewInstance>(null);
  const latest = useRef({ message, onDoubleTap });
  latest.current = { message, onDoubleTap };
  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDelay(260)
        .runOnJS(true)
        .onEnd((_e, success) => {
          if (success) latest.current.onDoubleTap?.(latest.current.message);
        }),
    [],
  );
  // The name the user gave them ("Mom") is the one the chat header shows, so notes use it too.
  const nickname = useAppStore((s) => s.relationships[character.id]?.nickname);
  const name = nickname || character.name;
  const onPhoto = useOnPhoto();
  const mine = message.author === 'me';
  const photoId = message.photoId;
  const named = !mine && showAvatar && !!senderName;
  const time = showTime ? clockTime(message.createdAt) : undefined;
  // Their bubble with a name over it or a time under it: the column holds the width cap.
  const column = named || (!mine && !!time);

  if (message.card === 'helpline') return <HelplineCard />;
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
  if (message.kind === 'system') return <SystemLine text={message.text ?? ''} />;
  if (message.kind === 'call') return <CallLine message={message} onCallBack={onCallBack} />;

  // With a double tap the wrapper carries the width cap, so the held area fills it.
  const holdStyle = [styles.holdable, (column || !!onDoubleTap) && styles.wide, message.reaction || (mine && message.theirReaction) ? styles.withReaction : null];
  const inner = (
    <>
      {message.kind === 'image' && message.photoId ? (
        <BoothPhotoMessage photoId={message.photoId} character={character} />
      ) : message.kind === 'image' && message.imageUri ? (
        <Image source={{ uri: message.imageUri }} style={styles.photo} contentFit="cover" />
      ) : (
        <TextBubble message={message} mine={mine} tail={runEnd} />
      )}
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
      {message.reaction && message.reaction in REACTION_STICKERS ? (
        <ReactionSticker
          name={message.reaction as ReactionName}
          play="still"
          // Your own sticker on your line steps to the other corner when theirs is on it.
          style={[styles.reaction, mine ? (message.theirReaction ? styles.reactionTheirs : styles.reactionMine) : styles.reactionTheirs]}
        />
      ) : null}
      {mine && message.theirReaction && message.theirReaction in REACTION_STICKERS ? (
        // Their sticker on what you said (owner, 2026-11-08: alive): it pops in as it lands.
        <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.reaction, styles.reactionMine]} accessible accessibilityLabel={t('chat.theyReacted', { name: t(`chat.reactions.${message.theirReaction}`) })}>
          <ReactionSticker name={message.theirReaction as ReactionName} play="still" style={styles.reactionFill} />
        </Animated.View>
      ) : null}
    </>
  );
  const hold = () => {
    if (!onLongPress) return;
    const node = holdRef.current;
    if (!node) return onLongPress(message);
    node.measureInWindow((x, y, width, height) => onLongPress(message, width > 0 ? { x, y, width, height } : undefined));
  };
  const pressable = (
    // Still under the finger, as in iOS Messages: a hold opens the menu, nothing shrinks or dims.
    <Pressable
      ref={holdRef}
      delayLongPress={280}
      onPress={photoId ? () => router.push({ pathname: '/photo/[id]', params: { id: photoId } }) : undefined}
      onLongPress={onLongPress ? hold : undefined}
      style={holdStyle}>
      {inner}
    </Pressable>
  );
  const content =
    message.kind === 'voice' ? (
      <VoiceBubble message={message} mine={mine} tail={runEnd} wide={column} />
    ) : !onLongPress && !photoId ? (
      // Nothing to press (a stream's lines): a plain view.
      <View style={holdStyle}>{inner}</View>
    ) : onDoubleTap ? (
      <GestureDetector gesture={doubleTap}>
        <View collapsable={false} style={column ? styles.wide : styles.tapArea}>
          {pressable}
        </View>
      </GestureDetector>
    ) : (
      pressable
    );

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(220).springify().damping(18) : undefined}
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
            <Txt style={[styles.receipt, onPhoto && onPhotoText]}>{time}</Txt>
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
                  <CharacterAvatar character={character} size={AVATAR} />
                </PressableScale>
              ) : (
                <CharacterAvatar character={character} size={AVATAR} />
              )
            ) : null}
          </View>
          {column ? (
            <View style={styles.column}>
              {named ? (
                <Txt variant="caption" color={onPhoto ? colors.onMediaSoft : colors.textSecondary} lines={1} style={[styles.sender, onPhoto && styles.photoShadow]}>
                  {senderName}
                </Txt>
              ) : null}
              {content}
              {time ? <Txt style={[styles.receipt, styles.timeTheirs, onPhoto && onPhotoText]}>{time}</Txt> : null}
            </View>
          ) : (
            content
          )}
        </>
      )}
    </Animated.View>
  );
});

function TextBubble({ message, mine, tail }: { message: Message; mine: boolean; tail: boolean }) {
  const onPhoto = useOnPhoto();
  const muted = message.muted;
  const parts = useMemo(() => segments(message.text ?? ''), [message.text]);
  const total = useMemo(() => segmentWords(parts), [parts]);
  // A line that just arrived shows word by word (`src/lib/reveal.ts`); any other shows whole.
  const shown = useReveal(message.id, total);
  const revealing = shown < total;

  return (
    <View
      style={[
        styles.bubble,
        styles.fill,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        tail && (mine ? styles.tailMine : styles.tailTheirs),
        !mine && onPhoto && styles.photoBubble,
        muted && styles.bubbleMuted,
      ]}>
      <Txt
        style={styles.text}
        color={muted ? colors.bubbleTranscriptText : mine ? colors.bubbleSelfText : onPhoto ? colors.onMedia : colors.bubbleOtherText}
        // A screen reader hears the whole line at once, not each word as it lands.
        accessibilityLabel={revealing ? message.text : undefined}>
        {/* *Narration* (Mixed and Story replies) reads as an aside: italic and quieter than speech. */}
        {(revealing ? cutSegments(parts, shown) : parts).map((part, i) =>
          part.kind === 'action' ? (
            <Txt key={i} style={[styles.text, styles.action, mine ? styles.actionMine : onPhoto ? styles.photoAction : styles.actionTheirs]}>
              {part.text}
            </Txt>
          ) : (
            part.text
          ),
        )}
      </Txt>
    </View>
  );
}

/** Heights of the still waveform on a voice message (iOS draws one from the clip). */
const WAVE = [6, 10, 14, 8, 16, 12, 18, 10, 6, 12, 16, 20, 14, 8, 12, 16, 10, 6, 14, 18, 12, 8];

/** Play button, waveform and length; tap plays, long-press shows or hides what was said. Their notes have no file yet: the clock runs. */
function VoiceBubble({ message, mine, tail, wide }: { message: Message; mine: boolean; tail: boolean; wide?: boolean }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  // Your own note shows what the model heard, so a wrong hearing is seen and not only answered.
  const [showTranscript, setShowTranscript] = useState(!!message.audioFile && message.transcript !== VOICE_NO_WORDS);
  /** It is this bubble that plays, so scrolling it away stops the sound. */
  const sounding = useRef(false);
  useEffect(
    () => () => {
      if (sounding.current) stopNote();
    },
    [],
  );
  const onPhoto = useOnPhoto();
  const seconds = message.durationSec ?? 0;
  const theirsOnPhoto = !mine && onPhoto;
  const ink = mine ? colors.bubbleSelfText : theirsOnPhoto ? colors.onMedia : colors.bubbleOtherText;
  const faint = mine ? colors.bubbleSelfText : theirsOnPhoto ? colors.onMediaMuted : colors.textSecondary;

  const play = () => {
    if (playing) {
      if (sounding.current) stopNote();
      return setPlaying(false);
    }
    setPlaying(true);
    if (message.audioFile) {
      sounding.current = true;
      const done = () => {
        sounding.current = false;
        setPlaying(false);
      };
      void playNote(message.audioFile, done).then((found) => {
        // Not on this phone (a chat restored from the server): the clock runs instead.
        if (found) return;
        sounding.current = false;
        setTimeout(() => setPlaying(false), Math.min(seconds, 12) * 1000);
      });
      return;
    }
    setTimeout(() => setPlaying(false), Math.min(seconds, 12) * 1000);
  };

  return (
    <View style={[styles.voiceWrap, mine && styles.voiceWrapMine, wide && styles.wide]}>
      <Pressable
        onPress={play}
        onLongPress={() => setShowTranscript((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t('chat.tapToPlay')}
        style={[
          styles.bubble,
          styles.voiceBubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          tail && (mine ? styles.tailMine : styles.tailTheirs),
          theirsOnPhoto && styles.photoBubble,
        ]}>
        <View style={[styles.play, { backgroundColor: ink }]}>
          <Ionicons name={playing ? 'pause' : 'play'} size={15} color={mine ? colors.bubbleSelf : theirsOnPhoto ? colors.black : colors.bubbleOther} />
        </View>
        {playing ? (
          <View style={styles.wave}>
            <Anim name="voiceWave" size={24} tint={ink} />
          </View>
        ) : (
          <View style={styles.wave}>
            {WAVE.slice(0, Math.max(8, Math.min(WAVE.length, 6 + seconds))).map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h, backgroundColor: faint }]} />
            ))}
          </View>
        )}
        <Txt style={styles.voiceLength} color={faint}>
          {fmtDuration(seconds)}
        </Txt>
      </Pressable>

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

function ReadReceipt({ message, time, face }: { message: Message; time?: string; face?: Character }) {
  const { t } = useTranslation();
  const meta = [styles.receipt, useOnPhoto() && onPhotoText];
  const read = !message.pending && !!message.readAt;

  return (
    // Read: their small face beside the word, so you see who read it (Instagram's "Seen").
    <View style={styles.receiptRow}>
    <Txt style={meta}>
      {message.editedAt ? (
        <>
          <Txt style={[...meta, styles.receiptStrong]}>{t('chat.edited')}</Txt>
          {' · '}
        </>
      ) : null}
      {message.pending ? (
        t('chat.sending')
      ) : message.readAt ? (
        <Txt style={[...meta, styles.receiptStrong]}>{t('chat.read')}</Txt>
      ) : (
        <Txt style={[...meta, styles.receiptStrong]}>{t('chat.delivered')}</Txt>
      )}
      {time ? ` · ${time}` : null}
    </Txt>
    {read && face ? <CharacterAvatar character={face} size={14} /> : null}
    </View>
  );
}

/** A held text line drawn again over the menu's blur, where it sat (iOS context menus). */
export function HeldBubble({ message }: { message: Message }) {
  return <TextBubble message={message} mine={message.author === 'me'} tail={false} />;
}

/** "Edited" under a message you changed (iOS Messages), once a newer one carries the receipt. */
function EditedNote({ time }: { time?: string }) {
  const { t } = useTranslation();
  const meta = [styles.receipt, useOnPhoto() && onPhotoText];
  return (
    <Txt style={meta}>
      <Txt style={[...meta, styles.receiptStrong]}>{t('chat.edited')}</Txt>
      {time ? ` · ${time}` : null}
    </Txt>
  );
}

/** iOS Messages' "Not Delivered" in system red under the line; a tap asks for the reply again. */
function NotDelivered({ onRetry, time }: { onRetry?: () => void; time?: string }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onRetry}
      disabled={!onRetry}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`${t('chat.notDelivered')}. ${t('chat.tryAgain')}`}
      style={styles.failed}>
      <Ionicons name="alert-circle" size={15} color={systemColors.red} />
      <Txt style={[styles.receipt, styles.failedText]}>
        <Txt style={[styles.receipt, styles.receiptStrong, styles.failedText]}>{t('chat.notDelivered')}</Txt>
        {onRetry ? ` · ${t('chat.tryAgain')}` : null}
        {time ? ` · ${time}` : null}
      </Txt>
    </Pressable>
  );
}

/** System lines are plain grey text between the bubbles, as in iOS Messages. */
function SystemLine({ text }: { text: string }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system}>
      <Txt style={[styles.systemText, onPhoto && styles.photoSystem]} center>
        {text}
      </Txt>
    </View>
  );
}

/**
 * A note the user pinned for this friend on the board, on the user's side of the chat (0z138): what
 * the friend's answer below it is about. A tap opens the board.
 */
function BoardNoteLine({ text }: { text: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.boardWrap}>
      <PressableScale
        onPress={() => router.push('/board')}
        accessibilityRole="button"
        accessibilityLabel={`${t('board.title')}: ${text}`}
        style={styles.boardNote}>
        <Ionicons name="pin" size={16} color={palette.apricot300} style={styles.boardPin} />
        <Txt style={styles.boardText} lines={4}>
          {text}
        </Txt>
      </PressableScale>
    </View>
  );
}

/** Where the story moved on (a time skip): the new time, centred like the chat's own notes. */
function SkipLine({ text }: { text: string }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system} accessibilityRole="header">
      <View style={styles.sceneHead}>
        <Ionicons name="time-outline" size={16} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} />
        <Txt style={[styles.systemText, styles.systemStrong, onPhoto && styles.photoSystem]}>{text}</Txt>
      </View>
    </View>
  );
}

/** Where a scene starts in the chat: its title and set-up, centred like the chat's own notes. */
function SceneCard({ title, setting }: { title: string; setting?: string }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system} accessibilityRole="header">
      <View style={styles.sceneHead}>
        <Ionicons name="film-outline" size={16} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} />
        <Txt style={[styles.systemText, styles.systemStrong, onPhoto && styles.photoSystem]}>{title}</Txt>
      </View>
      {setting ? (
        <Txt style={[styles.systemText, styles.sceneSetting, onPhoto && styles.photoSystem]} center>
          {setting}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * The Sunday recap's numbers (`src/lib/week.ts`), above the friend's line: a calm card of icons and
 * numbers (days together, messages, wins, shared diary pages); the words are in their text.
 */
function WeekCard({ week }: { week: WeekStats }) {
  const { t } = useTranslation();
  const stats: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }[] = [
    { icon: 'calendar-outline', value: `${week.days}/7`, label: t('chat.week.days', { count: week.days }) },
    { icon: 'chatbubbles-outline', value: String(week.messages), label: t('chat.week.messages', { count: week.messages }) },
    { icon: 'trophy-outline', value: String(week.winCount + week.quests), label: t('chat.week.wins', { count: week.winCount + week.quests }) },
    { icon: 'book-outline', value: String(week.pages), label: t('chat.week.pages', { count: week.pages }) },
  ];
  return (
    <View style={styles.system}>
      <View style={styles.weekCard} accessibilityRole="summary" accessibilityLabel={[t('chat.week.title'), ...stats.map((x) => x.label)].join(', ')}>
        <View style={styles.sceneHead}>
          <Ionicons name="sparkles-outline" size={16} color={colors.textSecondary} />
          <Txt style={[styles.systemText, styles.systemStrong]}>{t('chat.week.title')}</Txt>
        </View>
        <View style={styles.weekRow}>
          {stats.map((x) => (
            <View key={x.icon} style={styles.weekStat}>
              <Ionicons name={x.icon} size={20} color={colors.brandText} />
              <Txt style={styles.weekValue}>{x.value}</Txt>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** A group's "Kai & Mia are AI characters, not real people." At a session's start and every 3 hours. */
function AiNotice({ text }: { text: string }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system}>
      <Txt style={[styles.systemText, onPhoto && styles.photoSystem]} center>
        {text}
      </Txt>
    </View>
  );
}

/** Under a text-only reply when a member's voice minutes ran out; once a day. */
function VoiceQuotaNote({ until }: { until?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.quota}>
      <Ionicons name="mic-off-outline" size={17} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={styles.quotaIcon} />
      <Txt variant="small" color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={[styles.quotaText, onPhoto && styles.photoShadow]}>
        {t('chat.voiceQuota', { date: until ? planDate(Date.parse(until)) : '' })}{' '}
        <Txt variant="smallStrong" color={onPhoto ? colors.onMedia : colors.text} onPress={() => router.push('/my-plan')} accessibilityRole="link">
          {t('chat.addMinutes')}
        </Txt>
      </Txt>
    </View>
  );
}

/** "Yes, text me!" while the phone blocks pushes: their texts cannot reach the lock screen yet. */
function NotifyOffNote({ name }: { name: string }) {
  const { t } = useTranslation();
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.quota}>
      <Ionicons name="notifications-off-outline" size={17} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={styles.quotaIcon} />
      <Txt variant="small" color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={[styles.quotaText, onPhoto && styles.photoShadow]}>
        {t('chat.notifyOff', { name })}{' '}
        <Txt variant="smallStrong" color={onPhoto ? colors.onMedia : colors.text} onPress={() => void Linking.openSettings()} accessibilityRole="link">
          {t('chat.notifyOffAction')}
        </Txt>
      </Txt>
    </View>
  );
}

/** Shown under a crisis message: never blocks the chat, one tap to local helplines. */
function HelplineCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.system}>
      <View style={styles.helpline}>
        <Txt variant="title" center>
          {t('safety.helplineTitle')}
        </Txt>
        <Button
          label={t('safety.helplineAction')}
          variant="secondary"
          size="sm"
          onPress={() => void Linking.openURL(HELPLINE_URL)}
        />
      </View>
    </View>
  );
}

function CallLine({ message, onCallBack }: { message: Message; onCallBack?: () => void }) {
  const { t } = useTranslation();
  const onPhoto = useOnPhoto();
  const missed = !!message.missed;
  const quiet = onPhoto ? colors.onMediaSoft : colors.textSecondary;

  return (
    <View style={styles.system}>
      <PressableScale style={styles.callLine} onPress={onCallBack} disabled={!onCallBack} scaleTo={0.96}>
        <Ionicons name={missed ? 'call-outline' : 'call'} size={15} color={missed ? colors.danger : quiet} />
        {/* The colour goes in the style: `Txt` lays `style` over its `color`. */}
        <Txt style={[styles.systemText, { color: missed ? colors.danger : quiet }, onPhoto && styles.photoShadow]}>
          {missed ? t('chat.callMissed') : t('chat.callDuration', { duration: fmtDuration(message.durationSec ?? 0) })}
        </Txt>
        {missed && onCallBack ? (
          <Txt style={[styles.systemText, styles.systemStrong, { color: onPhoto ? palette.apricot300 : colors.brandText }]}>
            {' · '}
            {t('chat.callBack')}
          </Txt>
        ) : null}
        <Txt style={[styles.systemText, onPhoto && styles.photoSystem]}>
          {'  '}
          {clockTime(message.createdAt)}
        </Txt>
      </PressableScale>
    </View>
  );
}

/** A Photo Booth picture sent to the chat, drawn from the kept photo; a tap opens it. */
function BoothPhotoMessage({ photoId, character }: { photoId: string; character: Character }) {
  const photo = useAppStore((s) => s.photos.find((p) => p.id === photoId));
  if (!photo) return <View style={styles.photo} />;
  return <BoothPicture photo={photo} character={character} width={fitWidth(photo.style, { width: 176, height: 240 })} />;
}

const styles = StyleSheet.create({
  // The held area carries the bubble's width cap, so the text bubble fills it.
  holdable: { flexShrink: 1, maxWidth: '72%' },
  // A bubble with a member's name or a time shares one column with them, which carries the cap instead.
  column: { flexShrink: 1, maxWidth: '72%', alignItems: 'flex-start', gap: 3 },
  sender: { paddingLeft: space.xs },
  timeTheirs: { paddingTop: 0, paddingRight: 0, paddingLeft: space.xs },
  wide: { maxWidth: '100%' },
  fill: { maxWidth: '100%' },
  // Room under the bubble for the reaction that hangs off its corner.
  withReaction: { marginBottom: space.lg },
  // The sticker carries its own white die-cut rim, so it needs no chip behind it.
  reaction: { position: 'absolute', bottom: -space.lg, width: 30, height: 30 },
  reactionMine: { left: -space.xs },
  reactionFill: { width: 30, height: 30 },
  reactionTheirs: { right: -space.xs },
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
  // The avatar stays level with the bubble, above the time's line (14pt + the 3pt gap).
  avatarOverTime: { marginBottom: 17 },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 13,
    paddingVertical: space.sm,
    borderRadius: CORNER,
    // iOS squircle corners; Android ignores it.
    borderCurve: 'continuous',
  },
  text: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  action: { fontStyle: 'italic' },
  actionTheirs: { color: colors.textSecondary },
  actionMine: { color: colors.bubbleSelfText, opacity: 0.8 },
  bubbleMine: { backgroundColor: colors.bubbleSelf },
  // White on the cream with a faint rim, so it holds on a white or light wallpaper too.
  bubbleTheirs: { backgroundColor: colors.bubbleOther, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bubbleOtherRim },
  // A run's last bubble points down at its sender's side.
  tailMine: { borderBottomRightRadius: TAIL },
  tailTheirs: { borderBottomLeftRadius: TAIL },
  bubbleMuted: { backgroundColor: colors.bubbleTranscript },
  // Their bubble on a picture (an Art wallpaper): dark glass with a hairline rim (`useOnPhoto`).
  photoBubble: { backgroundColor: colors.onMediaBubble, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  photoAction: { color: colors.onMediaMuted },
  photoSystem: { color: colors.onMediaSoft, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  photoShadow: { textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  voiceWrap: { alignItems: 'flex-start', gap: space.xs, maxWidth: '72%' },
  voiceWrapMine: { alignItems: 'flex-end' },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '100%',
    height: 38,
    paddingVertical: 0,
    paddingLeft: space.sm,
    paddingRight: space.md,
  },
  play: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 20, minWidth: 40 },
  waveBar: { width: 2, borderRadius: 1, opacity: 0.6 },
  voiceLength: { fontSize: 13, marginLeft: space.xs },
  transcript: {
    backgroundColor: colors.bubbleTranscript,
    maxWidth: '100%',
  },
  photo: {
    width: 168,
    height: 210,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceAlt,
  },
  receiptRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  tapArea: { flexShrink: 1, maxWidth: '72%' },
  receipt: { fontSize: 11, lineHeight: 14, color: colors.textSecondary, paddingTop: 3, paddingRight: space.xs },
  receiptStrong: { fontWeight: '600', paddingTop: 0, paddingRight: 0 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 3, paddingRight: space.xs },
  failedText: { color: systemColors.red, paddingTop: 0, paddingRight: 0 },
  system: { alignItems: 'center', paddingVertical: space.sm + 2, paddingHorizontal: space.xxl },
  systemText: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  systemStrong: { fontWeight: '600' },
  boardWrap: { alignItems: 'flex-end', paddingHorizontal: space.md, paddingVertical: space.xs },
  boardNote: {
    maxWidth: '78%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: 18,
    backgroundColor: '#EFE8FF',
    transform: [{ rotate: '-1.5deg' }],
    ...shadows.card,
  },
  boardPin: { marginTop: 2 },
  boardText: { flexShrink: 1, fontSize: 15, lineHeight: 20, color: '#2B2350' },
  sceneHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sceneSetting: { marginTop: 2, fontStyle: 'italic' },
  weekCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  weekRow: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-around' },
  weekStat: { alignItems: 'center', gap: 4, minWidth: 56 },
  weekValue: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  callLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // Lines up with their bubbles: past the avatar column.
  quota: {
    flexDirection: 'row',
    gap: space.xs + 2,
    paddingLeft: space.md + AVATAR + space.sm,
    paddingRight: space.xxl,
    paddingVertical: space.xs,
  },
  quotaIcon: { marginTop: 2 },
  quotaText: { flex: 1 },
  helpline: {
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.xl,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

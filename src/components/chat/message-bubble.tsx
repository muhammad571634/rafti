import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { HELPLINE_URL } from '@/ai/safety';
import { cleanReact } from '@/ai/react';
import { onPhotoText, useOnPhoto } from '@/components/chat/chat-ground';
import { BubbleQuote } from '@/components/chat/reply-quote';
import { SetupCard } from '@/components/chat/setup-card';
import { playNote, seekNote, stopNote } from '@/components/chat/voice-player';
import { TONE_LOOK } from '@/components/chat/tone-menu';
import { Polaroid } from '@/components/date/polaroid';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { Anim, Button, CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { VOICE_NO_WORDS } from '@/ai/voice-prompt';
import { clockTime, duration as fmtDuration } from '@/lib/format';
import { cutSegments, segments, segmentWords } from '@/lib/reply-engine';
import { useReveal } from '@/lib/reveal';
import { barsFor, resampleWave } from '@/lib/voice-wave';
import { useAppStore } from '@/store/use-app-store';
import { ReactionBadge } from '@/components/ink';
import { colors, friendColor, palette, radius, shadows, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
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
  /** A tap (with `onDoubleTap`) or a hold on a text or photo opens the message menu (react, reply, copy, delete), lifted over where the bubble is. */
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

const AVATAR = 28;
/** iOS bubble corners; the tail corner of a run's last bubble is tighter. */
const CORNER = 19;
const TAIL = 6;
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
      {message.kind === 'image' && message.dateId ? (
        <DatePhotoMessage dateId={message.dateId} caption={message.text ?? ''} />
      ) : message.kind === 'image' && message.photoId ? (
        <BoothPhotoMessage photoId={message.photoId} character={character} />
      ) : message.kind === 'image' && message.imageUri ? (
        <ChatPhoto uri={message.imageUri} aspect={message.imageAspect} />
      ) : (
        <TextBubble message={message} mine={mine} tail={runEnd} quoteTitle={quoteTitle} onQuotePress={quotePress} />
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

function TextBubble({
  message,
  mine,
  tail,
  quoteTitle,
  onQuotePress,
}: {
  message: Message;
  mine: boolean;
  tail: boolean;
  quoteTitle?: string;
  onQuotePress?: (id: string) => void;
}) {
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
      {message.replyTo && quoteTitle ? <BubbleQuote quote={message.replyTo} title={quoteTitle} onPress={onQuotePress} /> : null}
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

/** The largest a sent photo is drawn in the chat; it keeps its own shape inside these. */
const PHOTO_MAX_W = 240;
const PHOTO_MAX_H = 300;

/** A sent photo in its own shape (width over height kept when it was sent, or read as it loads). */
function ChatPhoto({ uri, aspect }: { uri: string; aspect?: number }) {
  const [loaded, setLoaded] = useState<number>();
  const shape = Math.max(0.5, Math.min(2, aspect ?? loaded ?? 0.8));
  const width = Math.min(PHOTO_MAX_W, PHOTO_MAX_H * shape);
  return (
    <Image
      source={{ uri }}
      style={[styles.photo, { width, height: width / shape }]}
      contentFit="cover"
      onLoad={(e) => {
        if (!aspect && e.source.width > 0 && e.source.height > 0) setLoaded(e.source.width / e.source.height);
      }}
    />
  );
}

/** A note recorded before levels were kept draws this shape instead (0-1). */
const STILL_WAVE = [0.3, 0.5, 0.7, 0.4, 0.8, 0.6, 0.9, 0.5, 0.3, 0.6, 0.8, 1, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.6, 0.4];
/** The tallest bar of a note's wave. */
const WAVE_H = 20;

function VoiceBubble({ message, mine, tail, wide }: { message: Message; mine: boolean; tail: boolean; wide?: boolean }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  /** How far it has played (0-1): the bars up to here are drawn in full ink. */
  const [at, setAt] = useState(0);
  /** Its file is not on this phone (a chat restored from the server): it opens as text, never a silent "play". */
  const [missing, setMissing] = useState(false);
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
  const playable = !!message.audioFile && !missing;
  const bars = useMemo(() => resampleWave(message.levels?.length ? message.levels : STILL_WAVE, barsFor(seconds)), [message.levels, seconds]);
  const [waveWidth, setWaveWidth] = useState(0);

  const start = (from = 0) => {
    if (!message.audioFile) return;
    setPlaying(true);
    setAt(from);
    sounding.current = true;
    const done = () => {
      sounding.current = false;
      setPlaying(false);
      setAt(0);
    };
    void playNote(message.audioFile, done, { from, onProgress: setAt }).then((found) => {
      if (found) return;
      // Not on this phone: say what it said instead.
      sounding.current = false;
      setPlaying(false);
      setMissing(true);
      setShowTranscript(true);
    });
  };
  const press = () => {
    // A note with no sound (a friend's spoken line, or one whose file is gone) opens as its words.
    if (!playable) return setShowTranscript((v) => !v);
    if (playing) {
      if (sounding.current) stopNote();
      setAt(0);
      return setPlaying(false);
    }
    start();
  };

  // Drag along the wave to move through it (Telegram): playing, it jumps there; still, it starts there.
  const latest = useRef({ playing, start, waveWidth });
  latest.current = { playing, start, waveWidth };
  const scrub = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-6, 6])
        .failOffsetY([-10, 10])
        .runOnJS(true)
        .onUpdate((e) => {
          const width = latest.current.waveWidth;
          if (width > 0) setAt(Math.max(0, Math.min(1, e.x / width)));
        })
        .onEnd((e) => {
          const width = latest.current.waveWidth;
          if (!(width > 0)) return;
          const to = Math.max(0, Math.min(0.98, e.x / width));
          if (latest.current.playing) seekNote(to);
          else latest.current.start(to);
        }),
    [],
  );

  const wave = (
    <View style={styles.wave} onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width)}>
      {bars.map((v, i) => (
        <View
          key={i}
          style={[styles.waveBar, { height: 3 + v * (WAVE_H - 3), backgroundColor: playing && i / bars.length < at ? ink : faint }, playing && i / bars.length < at && styles.waveBarPlayed]}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.voiceWrap, mine && styles.voiceWrapMine, wide && styles.wide]}>
      <Pressable
        onPress={press}
        onLongPress={() => setShowTranscript((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={playable ? t('chat.tapToPlay') : t('chat.voiceText')}
        style={[
          styles.bubble,
          styles.voiceBubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          tail && (mine ? styles.tailMine : styles.tailTheirs),
          theirsOnPhoto && styles.photoBubble,
        ]}>
        <View style={[styles.play, { backgroundColor: ink }, !playable && styles.playText]}>
          <Ionicons
            name={!playable ? 'text' : playing ? 'pause' : 'play'}
            size={!playable ? 14 : 15}
            color={mine ? colors.bubbleSelf : theirsOnPhoto ? colors.black : colors.bubbleOther}
          />
        </View>
        {playable ? <GestureDetector gesture={scrub}>{wave}</GestureDetector> : wave}
        <Txt style={styles.voiceLength} color={faint}>
          {fmtDuration(playing ? Math.round(seconds * at) : seconds)}
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

/**
 * Where a scene starts in the chat, kept quiet (owner's "chat calm" pick, 0z269): a small capsule
 * with its title and the first line of its set-up; a tap opens the whole set-up, another closes it.
 */
function SceneCard({ title, setting }: { title: string; setting?: string }) {
  const onPhoto = useOnPhoto();
  const [open, setOpen] = useState(false);
  const body = setting?.trim();
  const soft = onPhoto ? colors.onMediaMuted : colors.textSecondary;
  const chevron = <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={soft} />;
  return (
    <View style={styles.system} accessibilityRole="header">
      <PressableScale
        scaleTo={0.97}
        disabled={!body}
        onPress={() => setOpen((was) => !was)}
        accessibilityRole="button"
        accessibilityLabel={body ? `${title}. ${body}` : title}
        accessibilityState={body ? { expanded: open } : undefined}
        style={[styles.sceneCard, onPhoto ? styles.sceneOnPhoto : styles.scenePlain]}>
        <View style={styles.sceneHead}>
          <Ionicons name="film-outline" size={15} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} />
          <Txt style={[styles.sceneTitle, onPhoto && styles.sceneTitlePhoto]}>{title}</Txt>
        </View>
        {body ? (
          // Closed: one line and a chevron beside it; open: the whole set-up, the chevron under it.
          <View style={open ? styles.sceneBodyOpen : styles.sceneBody}>
            <Txt style={[styles.sceneSetting, { color: soft }]} center lines={open ? undefined : 1}>
              {body}
            </Txt>
            {chevron}
          </View>
        ) : null}
      </PressableScale>
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

/** A date's polaroid the user sent to this friend (0z157), drawn from the kept date. */
function DatePhotoMessage({ dateId, caption }: { dateId: string; caption: string }) {
  const { i18n } = useTranslation();
  const record = useAppStore((s) => s.dates.find((d) => d.id === dateId));
  const partner = useAppStore((s) => (record ? s.characters.find((c) => c.id === record.characterId) : undefined));
  // A date whose friend is gone (blocked, deleted) keeps its caption as a plain line.
  if (!record || !partner) return <SystemLine text={caption} />;
  const when = new Date(record.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  return <Polaroid character={partner} caption={caption} date={when} width={176} tilt={2} style={styles.datePhoto} />;
}

/** A Photo Booth picture sent to the chat, drawn from the kept photo; a tap opens it. */
function BoothPhotoMessage({ photoId, character }: { photoId: string; character: Character }) {
  const photo = useAppStore((s) => s.photos.find((p) => p.id === photoId));
  if (!photo) return <View style={styles.photo} />;
  return <BoothPicture photo={photo} character={character} width={fitWidth(photo.style, { width: 176, height: 240 })} />;
}

const styles = StyleSheet.create({
  // A sent polaroid keeps clear of the next bubble's tilt.
  datePhoto: { marginVertical: space.sm },
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
  // The drop hangs off the bottom corner (the top corners carry the pin and tone marks).
  reaction: { position: 'absolute', bottom: -space.lg - 2 },
  reactionMine: { left: -space.xs - 2 },
  reactionTheirs: { right: -space.xs - 2 },
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
  waveBar: { width: 3, borderRadius: 1.5, opacity: 0.5 },
  waveBarPlayed: { opacity: 1 },
  // A note with no sound: its disc says "text", a little quieter than a play button.
  playText: { paddingLeft: 0, opacity: 0.85 },
  voiceLength: { fontSize: 13, marginLeft: space.xs },
  transcript: {
    backgroundColor: colors.bubbleTranscript,
    maxWidth: '100%',
  },
  photo: {
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
  sceneCard: {
    maxWidth: 300,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingTop: space.sm,
    paddingBottom: 9,
    borderRadius: inkRadius.chip,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // A quiet dark glass on the picture, lighter than a bubble's, so it reads as a note, not a line.
  sceneOnPhoto: { backgroundColor: colors.onMediaField, borderColor: colors.onMediaRim },
  scenePlain: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
  sceneTitle: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sceneTitlePhoto: { color: colors.onMediaSoft },
  sceneBody: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' },
  sceneBodyOpen: { alignItems: 'center', gap: 2 },
  sceneSetting: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
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

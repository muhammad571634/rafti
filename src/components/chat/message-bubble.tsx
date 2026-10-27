import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { HELPLINE_URL } from '@/ai/safety';
import { REACTION_STICKERS, type ReactionName } from '@/assets/brand/registry';
import { ReactionSticker } from '@/components/chat/reaction-sticker';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { Anim, Button, CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { clockTime, duration as fmtDuration } from '@/lib/format';
import { segments } from '@/lib/reply-engine';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, shadows, space } from '@/theme';
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
  animate?: boolean;
  onCallBack?: () => void;
  /** Long-press on a text or photo opens the message menu (react, copy, delete). */
  onLongPress?: (message: Message) => void;
  /** Group chats: the member's name over the first bubble of their run. */
  senderName?: string;
  /** Group chats: the "not real people" line names everyone. */
  aiNoticeText?: string;
  /** The line is pinned to Memories: a small pin sits on its top corner. */
  pinned?: boolean;
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
  animate = true,
  onCallBack,
  onLongPress,
  senderName,
  aiNoticeText,
  pinned,
}: MessageBubbleProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const mine = message.author === 'me';
  const photoId = message.photoId;
  const named = !mine && showAvatar && !!senderName;

  if (message.card === 'helpline') return <HelplineCard />;
  if (message.card === 'aiNotice') return <AiNotice name={character.name} text={aiNoticeText} />;
  if (message.card === 'voiceQuota') return <VoiceQuotaNote until={message.until} />;
  if (message.card === 'notifyOff') return <NotifyOffNote name={character.name.split(' ')[0]} />;
  if (message.card === 'week' && message.week) return <WeekCard week={message.week} />;
  if (message.card === 'scene') return <SceneCard title={message.text ?? ''} setting={message.setting} />;
  if (message.card === 'sceneEnd') return <SystemLine text={t('scenes.ended', { title: message.text ?? '' })} />;
  // A continue is the user's turn without words: nothing to show, their lines follow.
  if (message.card === 'continue') return null;
  if (message.card === 'skip') return <SkipLine text={message.skip === 'own' && message.skipTo ? message.skipTo : t(`chat.skip.${message.skip ?? 'later'}`)} />;
  if (message.kind === 'system') return <SystemLine text={message.text ?? ''} />;
  if (message.kind === 'call') return <CallLine message={message} onCallBack={onCallBack} />;

  // The bubble itself; in a group it sits under the member's name, which then holds the width cap.
  const holdStyle = [styles.holdable, named && styles.wide, message.reaction ? styles.withReaction : null];
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
          <Ionicons name="pin" size={12} color={colors.textSecondary} />
        </View>
      ) : null}
      {message.reaction && message.reaction in REACTION_STICKERS ? (
        <ReactionSticker
          name={message.reaction as ReactionName}
          play="still"
          style={[styles.reaction, mine ? styles.reactionMine : styles.reactionTheirs]}
        />
      ) : null}
    </>
  );
  const content =
    message.kind === 'voice' ? (
      <VoiceBubble message={message} mine={mine} tail={runEnd} wide={named} />
    ) : !onLongPress && !photoId ? (
      // Nothing to press (a stream's lines): a plain view.
      <View style={holdStyle}>{inner}</View>
    ) : (
      // Still under the finger, as in iOS Messages: a hold opens the menu, nothing shrinks or dims.
      <Pressable
        delayLongPress={280}
        onPress={photoId ? () => router.push({ pathname: '/photo/[id]', params: { id: photoId } }) : undefined}
        onLongPress={onLongPress ? () => onLongPress(message) : undefined}
        style={holdStyle}>
        {inner}
      </Pressable>
    );

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(220).springify().damping(18) : undefined}
      style={[styles.row, runEnd && styles.runEnd]}>
      {mine ? (
        // The user's side: no avatar, as in iOS Messages; the last message says Read or Delivered.
        <View style={styles.mine}>
          {content}
          {receipt ? <ReadReceipt message={message} /> : message.editedAt ? <EditedNote /> : null}
        </View>
      ) : (
        <>
          <View style={styles.avatarSlot}>
            {runEnd ? <CharacterAvatar character={character} size={AVATAR} /> : null}
          </View>
          {named ? (
            <View style={styles.named}>
              <Txt variant="caption" color={colors.textSecondary} lines={1} style={styles.sender}>
                {senderName}
              </Txt>
              {content}
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
  const muted = message.muted;

  return (
    <View
      style={[
        styles.bubble,
        styles.fill,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        tail && (mine ? styles.tailMine : styles.tailTheirs),
        muted && styles.bubbleMuted,
      ]}>
      <Txt
        style={styles.text}
        color={muted ? colors.bubbleTranscriptText : mine ? colors.bubbleSelfText : colors.bubbleOtherText}>
        {/* *Narration* (Mixed and Story replies) reads as an aside: italic and quieter than speech. */}
        {segments(message.text ?? '').map((part, i) =>
          part.kind === 'action' ? (
            <Txt key={i} style={[styles.text, styles.action, mine ? styles.actionMine : styles.actionTheirs]}>
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

/** Play button, waveform and length; tap plays (mock), long-press reveals what was said. */
function VoiceBubble({ message, mine, tail, wide }: { message: Message; mine: boolean; tail: boolean; wide?: boolean }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const seconds = message.durationSec ?? 0;
  const ink = mine ? colors.bubbleSelfText : colors.bubbleOtherText;
  const faint = mine ? colors.bubbleSelfText : colors.textSecondary;

  const play = () => {
    if (playing) return setPlaying(false);
    setPlaying(true);
    // Real builds stream the clip with expo-audio; the mock just runs the clock.
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
        ]}>
        <View style={[styles.play, { backgroundColor: ink }]}>
          <Ionicons name={playing ? 'pause' : 'play'} size={13} color={mine ? colors.bubbleSelf : colors.bubbleOther} />
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

function ReadReceipt({ message }: { message: Message }) {
  const { t } = useTranslation();

  return (
    <Txt style={styles.receipt}>
      {message.editedAt ? (
        <>
          <Txt style={[styles.receipt, styles.receiptStrong]}>{t('chat.edited')}</Txt>
          {' · '}
        </>
      ) : null}
      {message.pending ? (
        t('chat.sending')
      ) : message.readAt ? (
        <>
          <Txt style={[styles.receipt, styles.receiptStrong]}>{t('chat.read')}</Txt> {clockTime(message.readAt)}
        </>
      ) : (
        <Txt style={[styles.receipt, styles.receiptStrong]}>{t('chat.delivered')}</Txt>
      )}
    </Txt>
  );
}

/** "Edited" under a message you changed (iOS Messages), once a newer one carries the receipt. */
function EditedNote() {
  const { t } = useTranslation();
  return <Txt style={[styles.receipt, styles.receiptStrong]}>{t('chat.edited')}</Txt>;
}

/** System lines are plain grey text between the bubbles, as in iOS Messages. */
function SystemLine({ text }: { text: string }) {
  return (
    <View style={styles.system}>
      <Txt style={styles.systemText} center>
        {text}
      </Txt>
    </View>
  );
}

/** Where the story moved on (a time skip): the new time, centred like the chat's own notes. */
function SkipLine({ text }: { text: string }) {
  return (
    <View style={styles.system} accessibilityRole="header">
      <View style={styles.sceneHead}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <Txt style={[styles.systemText, styles.systemStrong]}>{text}</Txt>
      </View>
    </View>
  );
}

/** Where a scene starts in the chat: its title and set-up, centred like the chat's own notes. */
function SceneCard({ title, setting }: { title: string; setting?: string }) {
  return (
    <View style={styles.system} accessibilityRole="header">
      <View style={styles.sceneHead}>
        <Ionicons name="film-outline" size={14} color={colors.textSecondary} />
        <Txt style={[styles.systemText, styles.systemStrong]}>{title}</Txt>
      </View>
      {setting ? (
        <Txt style={[styles.systemText, styles.sceneSetting]} center>
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
          <Ionicons name="sparkles-outline" size={14} color={colors.textSecondary} />
          <Txt style={[styles.systemText, styles.systemStrong]}>{t('chat.week.title')}</Txt>
        </View>
        <View style={styles.weekRow}>
          {stats.map((x) => (
            <View key={x.icon} style={styles.weekStat}>
              <Ionicons name={x.icon} size={18} color={colors.primary} />
              <Txt style={styles.weekValue}>{x.value}</Txt>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** "Kai is an AI character, not a real person." At a session's start and every 3 hours. */
function AiNotice({ name, text }: { name: string; text?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.system}>
      <Txt style={styles.systemText} center>
        {text ?? t('chat.aiNotice', { name })}
      </Txt>
    </View>
  );
}

/** Under a text-only reply when a member's voice minutes ran out; once a day. */
function VoiceQuotaNote({ until }: { until?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.quota}>
      <Ionicons name="mic-off-outline" size={15} color={colors.textSecondary} style={styles.quotaIcon} />
      <Txt variant="small" color={colors.textSecondary} style={styles.quotaText}>
        {t('chat.voiceQuota', { date: until ? planDate(Date.parse(until)) : '' })}{' '}
        <Txt variant="smallStrong" color={colors.text} onPress={() => router.push('/my-plan')} accessibilityRole="link">
          {t('chat.addMinutes')}
        </Txt>
      </Txt>
    </View>
  );
}

/** "Yes, text me!" while the phone blocks pushes: their texts cannot reach the lock screen yet. */
function NotifyOffNote({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.quota}>
      <Ionicons name="notifications-off-outline" size={15} color={colors.textSecondary} style={styles.quotaIcon} />
      <Txt variant="small" color={colors.textSecondary} style={styles.quotaText}>
        {t('chat.notifyOff', { name })}{' '}
        <Txt variant="smallStrong" color={colors.text} onPress={() => void Linking.openSettings()} accessibilityRole="link">
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
  const missed = !!message.missed;

  return (
    <View style={styles.system}>
      <PressableScale style={styles.callLine} onPress={onCallBack} disabled={!onCallBack} scaleTo={0.96}>
        <Ionicons name={missed ? 'call-outline' : 'call'} size={13} color={missed ? colors.danger : colors.textSecondary} />
        <Txt style={styles.systemText} color={missed ? colors.danger : colors.textSecondary}>
          {missed ? t('chat.callMissed') : t('chat.callDuration', { duration: fmtDuration(message.durationSec ?? 0) })}
        </Txt>
        {missed && onCallBack ? (
          <Txt style={[styles.systemText, styles.systemStrong]} color={colors.primary}>
            {' · '}
            {t('chat.callBack')}
          </Txt>
        ) : null}
        <Txt style={styles.systemText}>
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
  // In a group the name and bubble share one column, which carries the cap instead.
  named: { flexShrink: 1, maxWidth: '72%', alignItems: 'flex-start', gap: 3 },
  sender: { paddingLeft: space.xs },
  wide: { maxWidth: '100%' },
  fill: { maxWidth: '100%' },
  // Room under the bubble for the reaction that hangs off its corner.
  withReaction: { marginBottom: space.lg },
  // The sticker carries its own white die-cut rim, so it needs no chip behind it.
  reaction: { position: 'absolute', bottom: -space.lg, width: 30, height: 30 },
  reactionMine: { left: -space.xs },
  reactionTheirs: { right: -space.xs },
  // A pinned line's mark, on the corner away from the tail (canvas `MenuPin.dc.html`).
  pinBadge: {
    position: 'absolute',
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  pinMine: { left: -6 },
  pinTheirs: { right: -6 },
  // Bubbles of one run sit 2pt apart; a new run starts 10pt lower.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    marginBottom: 2,
  },
  runEnd: { marginBottom: space.sm + 2 },
  mine: { flex: 1, alignItems: 'flex-end' },
  avatarSlot: { width: AVATAR },
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
  bubbleTheirs: { backgroundColor: colors.bubbleOther },
  // A run's last bubble points down at its sender's side.
  tailMine: { borderBottomRightRadius: TAIL },
  tailTheirs: { borderBottomLeftRadius: TAIL },
  bubbleMuted: { backgroundColor: colors.bubbleTranscript },
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
  play: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
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
  receipt: { fontSize: 11, lineHeight: 14, color: colors.textSecondary, paddingTop: 3, paddingRight: space.xs },
  receiptStrong: { fontWeight: '600', paddingTop: 0, paddingRight: 0 },
  system: { alignItems: 'center', paddingVertical: space.sm + 2, paddingHorizontal: space.xxl },
  systemText: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  systemStrong: { fontWeight: '600' },
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

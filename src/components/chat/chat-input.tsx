import { Ionicons } from '@expo/vector-icons';
import { PaperPlaneTiltIcon } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Anim, IconButton, PressableScale, Txt } from '@/components/ui';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { duration as fmtDuration } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { bottomRoom, colors, playful, radius, shadows, space, systemColors } from '@/theme';
import type { MessageTone } from '@/types';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { HoldMic } from './hold-mic';
import { useKeptDraft } from './use-kept-draft';
import { useToneTip } from './use-tone-tip';
import { useVoiceNote, type VoiceNote } from './use-voice-note';

/** The "+" circle and the one-line field (canvas v3: a step bigger, easy for a thumb). */
const FIELD = 54;
/** Send, stop and the mic sit inside the field, 4pt in. */
const ACTION = 46;
const LINE = 22;
/** The field grows with the text up to this many lines, then scrolls. */
const MAX_LINES = 5;

/**
 * On a phone the keyboard's key starts a new line and only the plane sends, as in iOS Messages: a
 * slip of the thumb must not spend shells. On the web Enter sends and Shift+Enter adds a line, and
 * react-native-web draws a two-row textarea unless told otherwise.
 */
const webField = Platform.OS === 'web' ? ({ rows: 1, submitBehavior: 'submit', blurOnSubmit: true, returnKeyType: 'send' } as const) : {};

export interface ChatInputProps {
  placeholder: string;
  /** Return false to keep the draft (e.g. out of shells). */
  onSend: (text: string, tone?: MessageTone) => boolean;
  /** Send was held: the chat offers the tones, then calls `send` with the one picked. Without it a hold does nothing. */
  onHoldSend?: (send: (tone: MessageTone) => void) => void;
  /** "+": opens or closes the panel in the keyboard's place. */
  onAttach: () => void;
  /** The "+" panel is open: "+" reads ×, and the bar sits on the panel. */
  attachOpen?: boolean;
  /** The field took focus (the keyboard comes up): the chat closes the "+" panel. */
  onFieldFocus?: () => void;
  /** The recorder sheet, where a phone cannot record here (the web). */
  onVoice: () => void;
  /** A voice message made with the mic. */
  onVoiceNote?: (note: VoiceNote) => void;
  /** Asked before recording: false when the note could not be paid for (the chat says why). */
  canRecord?: () => boolean;
  /** Text already in the field when the chat opens (e.g. replying to a diary page). */
  initialValue?: string;
  /** When set, the field is closed and shows this line instead (the daily fair-use limit). */
  locked?: string;
  /**
   * Editing your newest message (canvas `ChatEdit.dc.html`): the field holds its text, ✕ takes the
   * place of "+" and ✓ of send. `onSave` returns false to stay in the edit (e.g. out of shells).
   */
  editing?: { id: string; text: string; onSave: (text: string) => boolean; onCancel: () => void };
  /** Puts this text in the field and focuses it (a long-pressed reply idea); `at` makes each fill new. */
  fill?: { text: string; at: number };
  /** Set while their reply is on its way: an empty field shows ■ to stop it (Character.AI). */
  onStop?: () => void;
  /** The field has text (true) or is empty (false): a reply waiting for more messages waits longer while they type. */
  onTyping?: (typing: boolean) => void;
  /** Keeps the unsent text for this chat, so it waits in the field after leaving. Key the input by it. */
  draftId?: string;
}

/**
 * The composer (owner, 2026-11-08, canvas v1 + v3): a white "+" and a white field on the cream, dark
 * glass on a picture. Inside the field one button: the mic while it is empty, the peach paper plane
 * once there is text, ■ while their reply is on its way. A tap on the mic records at once, right here
 * (trash, clock, wave, send); a hold records while held: let go to send, slide left to drop it, slide
 * up to lock it and go on hands free. The swaps are instant.
 */
export function ChatInput({
  placeholder,
  onSend,
  onHoldSend,
  onAttach,
  attachOpen,
  onFieldFocus,
  onVoice,
  onVoiceNote,
  canRecord,
  initialValue = '',
  locked,
  editing,
  fill,
  onStop,
  onTyping,
  draftId,
}: ChatInputProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // With the keyboard or the "+" panel up, the home indicator is covered, so the bar sits right on it.
  const keyboardUp = useKeyboardVisible();
  const barBottom = keyboardUp || attachOpen ? space.sm : bottomRoom(insets.bottom, space.md);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<TextInputInstance>(null);
  /** The unsent draft waits here while a message is edited, and comes back after. */
  const draft = useRef<string | null>(null);
  useKeptDraft(draftId, value, setValue, draft, !!initialValue);
  const editingId = editing?.id;
  const editingText = editing?.text;

  useEffect(() => {
    if (editingId) {
      if (draft.current === null) draft.current = value;
      setValue(editingText ?? '');
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
    if (draft.current !== null) {
      setValue(draft.current);
      draft.current = null;
    }
    // Runs when an edit starts or ends, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const fillAt = fill?.at;
  useEffect(() => {
    if (!fillAt || !fill) return;
    setValue(fill.text);
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
    // A new fill only, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillAt]);

  const hasText = value.trim().length > 0;

  // Typing a new message (not an edit) tells a waiting reply to wait for it; leaving the chat stops that.
  const typingNow = hasText && !editingId;
  const reportTyping = useRef(onTyping);
  reportTyping.current = onTyping;
  useEffect(() => {
    reportTyping.current?.(typingNow);
  }, [typingNow]);
  useEffect(() => () => reportTyping.current?.(false), []);

  const toneTip = useToneTip(hasText && !editing && !!onHoldSend);
  const voice = useVoiceNote(draftId, (note) => onVoiceNote?.(note), canRecord);
  const recording = voice.phase === 'recording';
  const voiceBusy = voice.phase !== 'idle';
  /** Recording without a finger on the mic: started with a tap, or a hold slid up to the lock. */
  const [handsFree, setHandsFree] = useState(false);
  useEffect(() => {
    if (voice.phase === 'idle') setHandsFree(false);
  }, [voice.phase]);
  const onPhoto = useOnPhoto();
  const surface = [styles.surface, onPhoto && styles.photoSurface];
  const ink = onPhoto ? colors.onMedia : colors.text;

  const submit = (tone?: MessageTone) => {
    if (!hasText) return;
    if (editing) {
      editing.onSave(value);
      return;
    }
    toneTip.done();
    if (onSend(value, tone)) setValue('');
    // react-native-web only submits a multiline field by blurring it; take focus back.
    if (Platform.OS === 'web') setTimeout(() => inputRef.current?.focus(), 30);
  };
  // The menu stays open over a live keyboard, so a pick sends what the field holds by then.
  const latestSubmit = useRef(submit);
  useEffect(() => {
    latestSubmit.current = submit;
  });
  const holdSend = () => {
    if (!onHoldSend) return;
    haptic.lift();
    toneTip.done();
    onHoldSend((tone) => latestSubmit.current(tone));
  };

  const recordHandsFree = () => {
    setHandsFree(true);
    voice.start();
  };

  // A draft typed before the lock stays in state and comes back with the field.
  if (locked) {
    return (
      <View style={[styles.bar, { paddingBottom: barBottom }]}>
        <View style={styles.locked} accessibilityRole="text">
          <Txt variant="bodyStrong" color={colors.textSecondary} center>
            {locked}
          </Txt>
        </View>
      </View>
    );
  }

  const leftButton =
    handsFree && recording ? (
      // Recording hands free: the trash takes the "+" place and drops what was said.
      <PressableScale
        scaleTo={0.9}
        onPress={() => voice.finish(false)}
        accessibilityRole="button"
        accessibilityLabel={t('common.delete')}
        style={[...surface, styles.plus]}>
        <Ionicons name="trash-outline" size={24} color={systemColors.red} />
      </PressableScale>
    ) : (
      <PressableScale
        scaleTo={0.9}
        onPress={editing ? editing.onCancel : onAttach}
        accessibilityRole="button"
        accessibilityLabel={editing || attachOpen ? t('common.close') : t('a11y.attach')}
        accessibilityState={{ expanded: !!attachOpen }}
        style={[...surface, styles.plus]}>
        <Ionicons name={editing || attachOpen ? 'close' : 'add'} size={editing || attachOpen ? 27 : 31} color={ink} />
      </PressableScale>
    );

  return (
    <View style={[styles.bar, { paddingBottom: barBottom }]}>
      {toneTip.show ? (
        <View pointerEvents="none" style={styles.tip}>
          <Txt variant="caption" color={colors.textOnInk}>
            {t('chat.toneTip')}
          </Txt>
        </View>
      ) : null}
      {/* While a hold records: slide up to here to lock it and let go (WhatsApp). */}
      {recording && !handsFree ? (
        <View pointerEvents="none" style={[styles.lock, { bottom: barBottom + FIELD + space.sm }]}>
          <Ionicons name="lock-closed-outline" size={19} color={ink} />
          <Ionicons name="chevron-up" size={15} color={onPhoto ? colors.onMediaMuted : colors.textSecondary} />
        </View>
      ) : null}

      {leftButton}

      <View style={[...surface, styles.field]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          onFocus={onFieldFocus}
          // The voice row lies over the field (see-through on a picture): no placeholder under it.
          placeholder={voiceBusy || voice.notice ? '' : placeholder}
          placeholderTextColor={onPhoto ? colors.onMediaMuted : colors.textFaint}
          style={[styles.input, onPhoto && styles.photoInput]}
          multiline
          maxLength={2000}
          onSubmitEditing={Platform.OS === 'web' ? () => submit() : undefined}
          {...webField}
        />

        {/* Inside the field, as in iOS Messages: a quiet mic while empty, the peach paper plane once there is text. */}
        {editing ? (
          // ✓ sends the change; an emptied field keeps it off, as there is nothing to send.
          <IconButton
            icon="checkmark"
            size={23}
            color={hasText ? colors.textOnPrimary : colors.textFaint}
            background={hasText ? colors.primaryFill : colors.surfaceAlt}
            haptic={hasText}
            accessibilityLabel={t('chat.saveEdit')}
            onPress={() => submit()}
            style={styles.action}
          />
        ) : onStop && !hasText && !voiceBusy ? (
          // Typing a new line brings send back; the reply then answers both.
          <IconButton
            icon="stop"
            size={16}
            color={colors.textOnPrimary}
            background={colors.primaryFill}
            accessibilityLabel={t('a11y.stopReply')}
            onPress={onStop}
            style={styles.action}
          />
        ) : hasText ? (
          <PressableScale
            onPress={() => submit()}
            onLongPress={onHoldSend ? holdSend : undefined}
            delayLongPress={400}
            hitSlop={8}
            scaleTo={0.88}
            haptic
            accessibilityLabel={t('a11y.send')}
            accessibilityHint={onHoldSend ? t('chat.toneTip') : undefined}
            style={[styles.action, styles.send]}>
            <PaperPlaneTiltIcon size={25} weight="bold" color={colors.textOnPrimary} style={styles.plane} />
          </PressableScale>
        ) : Platform.OS === 'web' || !onVoiceNote ? (
          <IconButton
            icon="mic-outline"
            size={26}
            color={ink}
            accessibilityLabel={t('a11y.voiceMessage')}
            onPress={onVoice}
            style={[styles.action, onPhoto ? styles.photoMic : styles.mic]}
          />
        ) : (
          <HoldMic
            recording={recording && !handsFree}
            onTap={recordHandsFree}
            onHoldStart={() => {
              setHandsFree(false);
              voice.start();
            }}
            onHoldEnd={voice.finish}
            onLock={() => setHandsFree(true)}
            accessibilityLabel={t('a11y.voiceMessage')}
            accessibilityHint={t('chat.voice.hold')}
            style={[styles.action, onPhoto ? styles.photoMic : styles.mic]}
          />
        )}

        {/* Over the empty field while a voice message is made; a hold leaves the mic under the finger uncovered. */}
        {voiceBusy || voice.notice ? (
          <View style={[styles.voiceRow, onPhoto && styles.photoVoiceRow, handsFree && recording && styles.voiceRowFull]}>
            {recording ? (
              <>
                <View style={styles.recDot} />
                <Txt style={[styles.voiceClock, onPhoto && styles.photoInput]}>{fmtDuration(voice.seconds)}</Txt>
                {handsFree ? (
                  <>
                    <View style={styles.voiceWave}>
                      <Anim name="voiceWave" size={40} tint={systemColors.red} />
                    </View>
                    <PressableScale
                      onPress={() => voice.finish(true)}
                      hitSlop={8}
                      scaleTo={0.88}
                      haptic
                      accessibilityLabel={t('a11y.send')}
                      style={[styles.action, styles.send]}>
                      {/* A voice note goes with an arrow; the paper plane is for written words (owner, 2026-11-08). */}
                      <Ionicons name="arrow-up" size={25} color={colors.textOnPrimary} />
                    </PressableScale>
                  </>
                ) : (
                  <Txt variant="small" color={onPhoto ? colors.onMediaMuted : colors.textSecondary} numberOfLines={1} style={styles.voiceHint}>
                    {t('chat.voice.slideCancel')}
                  </Txt>
                )}
              </>
            ) : voice.phase === 'sending' ? (
              <>
                <ActivityIndicator color={onPhoto ? colors.onMediaSoft : colors.textSecondary} />
                <Txt style={[styles.voiceClock, onPhoto && styles.photoInput]}>{fmtDuration(voice.seconds)}</Txt>
              </>
            ) : voice.phase === 'failed' ? (
              <>
                <Txt variant="small" color={colors.danger} numberOfLines={1} style={styles.voiceHint}>
                  {t('chat.notDelivered')}
                </Txt>
                <IconButton icon="refresh" size={20} color={ink} accessibilityLabel={t('chat.tryAgain')} onPress={() => void voice.retry()} style={styles.voiceAction} />
                <IconButton icon="trash-outline" size={20} color={onPhoto ? colors.onMediaMuted : colors.textSecondary} accessibilityLabel={t('common.delete')} onPress={voice.discard} style={styles.voiceAction} />
              </>
            ) : (
              <Txt variant="small" color={onPhoto ? colors.onMediaMuted : colors.textSecondary} numberOfLines={1} style={styles.voiceHint}>
                {voice.notice === 'tooShort' ? t('chat.voice.tooShort') : t('chat.voice.noSpeech')}
              </Txt>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xs,
  },
  // White on the cream with a faint rim, as the tabs' cards (owner, 2026-11-08).
  surface: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bubbleOtherRim,
    ...shadows.glassButton,
  },
  plus: { width: FIELD, height: FIELD, borderRadius: FIELD / 2, alignItems: 'center', justifyContent: 'center' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: FIELD,
    paddingLeft: space.lg + 2,
    paddingRight: 4,
    borderRadius: FIELD / 2,
    // A grown, multi-line field keeps iOS squircle corners; Android ignores it.
    borderCurve: 'continuous',
  },
  action: { width: ACTION, height: ACTION, borderRadius: ACTION / 2, marginBottom: (FIELD - ACTION) / 2 - StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  send: { backgroundColor: colors.primaryFill },
  // The plane points up and right; nudged so it looks centred in its circle.
  plane: { marginLeft: -2, marginTop: 1 },
  mic: { backgroundColor: playful.round },
  photoMic: { backgroundColor: colors.onMediaGlass },
  // Covers the field up to the mic while a voice message is made.
  voiceRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: ACTION + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg + 2,
    borderRadius: FIELD / 2,
    backgroundColor: colors.surface,
  },
  // Hands free there is no finger on the mic: the row takes the whole field, send included.
  voiceRowFull: { right: 0, paddingRight: 4 },
  photoVoiceRow: { backgroundColor: colors.onMediaField },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: systemColors.red },
  voiceClock: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.text },
  voiceWave: { flex: 1, alignItems: 'flex-start', overflow: 'hidden' },
  voiceHint: { flex: 1 },
  voiceAction: { width: 34, height: 34 },
  // Over the mic while a hold records: where to slide to lock.
  lock: {
    position: 'absolute',
    right: space.md + 4,
    width: ACTION,
    height: 84,
    borderRadius: ACTION / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bubbleOtherRim,
    ...shadows.glassButton,
  },
  // Once, over the send button (`useToneTip`); from the top edge, so a grown field never covers it.
  tip: {
    position: 'absolute',
    right: space.md,
    top: -28,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  locked: {
    flex: 1,
    height: FIELD,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  input: {
    fontSize: 17,
    letterSpacing: -0.4,
    lineHeight: LINE,
    flex: 1,
    color: colors.text,
    // One line sits level with the "+"; past MAX_LINES the field scrolls.
    paddingHorizontal: 0,
    paddingVertical: (FIELD - LINE) / 2,
    maxHeight: LINE * MAX_LINES + (FIELD - LINE),
  },
  // On a picture (their portrait or an Art wallpaper, `useOnPhoto`): dark glass and white words.
  photoSurface: { backgroundColor: colors.onMediaField, borderColor: colors.onMediaHairline },
  photoInput: { color: colors.onMedia },
});

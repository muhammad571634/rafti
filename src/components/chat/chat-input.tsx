import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, PressableScale, Txt } from '@/components/ui';
import { colors, radius, shadows, space } from '@/theme';

/** IconButton draws a circle of `size + space.lg`, so 24pt glyphs make 40pt buttons. */
const ICON = 24;
const BUTTON = ICON + space.lg;
/** The "+" circle and the one-line field are both 40pt tall. */
const FIELD = 40;
const LINE = 22;
/** The field grows with the text up to this many lines, then scrolls. */
const MAX_LINES = 5;

/** react-native-web draws a two-row textarea unless told otherwise. */
const webSingleRow = Platform.OS === 'web' ? { rows: 1 } : {};

export interface ChatInputProps {
  placeholder: string;
  /** Return false to keep the draft (e.g. out of shells). */
  onSend: (text: string) => boolean;
  onAttach: () => void;
  onVoice: () => void;
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
}

/**
 * The composer: a floating pill over the wallpaper with "+" for attachments, the
 * text field, and one primary button that records a voice message while the field
 * is empty and sends once there is text. The swap is instant; nothing here animates.
 */
export function ChatInput({ placeholder, onSend, onAttach, onVoice, initialValue = '', locked, editing, fill }: ChatInputProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<TextInputInstance>(null);
  /** The unsent draft waits here while a message is edited, and comes back after. */
  const draft = useRef<string | null>(null);
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

  const submit = () => {
    if (!hasText) return;
    if (editing) {
      editing.onSave(value);
      return;
    }
    if (onSend(value)) setValue('');
    // react-native-web only submits a multiline field by blurring it; take focus back.
    if (Platform.OS === 'web') setTimeout(() => inputRef.current?.focus(), 30);
  };

  // A draft typed before the lock stays in state and comes back with the field.
  if (locked) {
    return (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.locked} accessibilityRole="text">
          <Txt variant="bodyStrong" color={colors.textSecondary} center>
            {locked}
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <PressableScale
        scaleTo={0.9}
        onPress={editing ? editing.onCancel : onAttach}
        accessibilityRole="button"
        accessibilityLabel={editing ? t('chat.cancelEdit') : t('a11y.attach')}
        style={[styles.glass, styles.plus]}>
        <Ionicons name={editing ? 'close' : 'add'} size={editing ? 22 : 24} color={colors.text} />
      </PressableScale>

      <View style={[styles.glass, styles.field]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          maxLength={2000}
          onSubmitEditing={submit}
          submitBehavior="submit"
          // Web reads the legacy prop: Enter sends, Shift+Enter adds a line.
          blurOnSubmit={Platform.OS === 'web' ? true : undefined}
          returnKeyType="send"
          {...webSingleRow}
        />

        {/* Inside the field, as in iOS Messages: a quiet mic while empty, the peach send once there is text. */}
        {editing ? (
          // ✓ sends the change; an emptied field keeps it off, as there is nothing to send.
          <IconButton
            icon="checkmark"
            size={19}
            color={hasText ? colors.textOnPrimary : colors.textFaint}
            background={hasText ? colors.primaryFill : colors.surfaceAlt}
            haptic={hasText}
            accessibilityLabel={t('chat.saveEdit')}
            onPress={submit}
            style={styles.action}
          />
        ) : (
          <IconButton
            icon={hasText ? 'arrow-up' : 'mic-outline'}
            size={hasText ? 18 : 21}
            color={hasText ? colors.textOnPrimary : colors.textSecondary}
            background={hasText ? colors.primaryFill : undefined}
            haptic={hasText}
            accessibilityLabel={hasText ? t('a11y.send') : t('a11y.voiceMessage')}
            onPress={hasText ? submit : onVoice}
            style={styles.action}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // "+" in its own glass circle, then the glass field (approved iOS prototype).
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xs,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.glassButton,
  },
  plus: { width: FIELD, height: FIELD, borderRadius: FIELD / 2, alignItems: 'center', justifyContent: 'center' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: FIELD,
    paddingLeft: space.lg,
    paddingRight: 4,
    borderRadius: FIELD / 2,
    // A grown, multi-line field keeps iOS squircle corners; Android ignores it.
    borderCurve: 'continuous',
    borderColor: colors.borderStrong,
  },
  // A 32pt circle that sits 4pt inside the 40pt field.
  action: { width: 32, height: 32, marginBottom: 4 },
  locked: {
    flex: 1,
    height: BUTTON + space.xs * 2 + 2,
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
});

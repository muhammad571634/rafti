import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { colors, radius, shadows, space, type } from '@/theme';

/** IconButton draws a circle of `size + space.lg`, so 24pt glyphs make 40pt buttons. */
const ICON = 24;
const BUTTON = ICON + space.lg;
const LINE = type.body.lineHeight ?? 21;
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
}

/**
 * The composer: a floating pill over the wallpaper with "+" for attachments, the
 * text field, and one primary button that records a voice message while the field
 * is empty and sends once there is text. The swap is instant; nothing here animates.
 */
export function ChatInput({ placeholder, onSend, onAttach, onVoice }: ChatInputProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const hasText = value.trim().length > 0;

  const submit = () => {
    if (!hasText) return;
    if (onSend(value)) setValue('');
    // react-native-web only submits a multiline field by blurring it; take focus back.
    if (Platform.OS === 'web') setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <View style={[styles.pill, shadows.card]}>
        <IconButton
          icon="add"
          size={ICON}
          background={colors.surfaceAlt}
          accessibilityLabel={t('a11y.attach')}
          onPress={onAttach}
        />

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

        <IconButton
          icon={hasText ? 'arrow-up' : 'mic'}
          size={ICON}
          color={colors.textOnPrimary}
          background={colors.primary}
          haptic={hasText}
          accessibilityLabel={hasText ? t('a11y.send') : t('a11y.voiceMessage')}
          onPress={hasText ? submit : onVoice}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: space.md,
    paddingTop: space.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    padding: space.xs,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    ...type.body,
    flex: 1,
    color: colors.text,
    // One line sits level with the buttons; past MAX_LINES the field scrolls.
    paddingHorizontal: 0,
    paddingVertical: (BUTTON - LINE) / 2,
    maxHeight: LINE * MAX_LINES + (BUTTON - LINE),
  },
});

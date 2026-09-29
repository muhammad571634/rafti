import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui';
import { colors, hitSlop, radius, space, type } from '@/theme';

export interface ChatInputProps {
  /** Return false to keep the draft (e.g. out of shells). */
  onSend: (text: string) => boolean;
  onAttach: () => void;
  onGallery: () => void;
}

/** "+", gallery, the pill field with an emoji key, and the paper-plane — as in the reference. */
export function ChatInput({ onSend, onAttach, onGallery }: ChatInputProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const canSend = value.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    if (onSend(value)) setValue('');
    // react-native-web only submits a multiline field by blurring it; take focus back.
    if (Platform.OS === 'web') setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <PressableScale onPress={onAttach} hitSlop={hitSlop} scaleTo={0.85} style={styles.iconBtn}>
        <Ionicons name="add" size={28} color={colors.text} />
      </PressableScale>

      <PressableScale onPress={onGallery} hitSlop={hitSlop} scaleTo={0.85} style={styles.iconBtn}>
        <Ionicons name="image-outline" size={24} color={colors.text} />
      </PressableScale>

      <View style={styles.field}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          maxLength={2000}
          onSubmitEditing={submit}
          submitBehavior="submit"
          // Web reads the legacy prop: Enter sends, Shift+Enter adds a line.
          blurOnSubmit={Platform.OS === 'web' ? true : undefined}
          returnKeyType="send"
        />
        <PressableScale hitSlop={hitSlop} scaleTo={0.85}>
          <Ionicons name="happy-outline" size={21} color={colors.textMuted} />
        </PressableScale>
      </View>

      <PressableScale
        onPress={submit}
        disabled={!canSend}
        hitSlop={hitSlop}
        scaleTo={0.85}
        haptic
        accessibilityLabel="Send"
        style={styles.iconBtn}>
        <Ionicons name={canSend ? 'send' : 'send-outline'} size={22} color={canSend ? colors.primary : colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  iconBtn: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  input: {
    flex: 1,
    padding: 0,
    color: colors.text,
    maxHeight: 96,
    ...type.body,
  },
});

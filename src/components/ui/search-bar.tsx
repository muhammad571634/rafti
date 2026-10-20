import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';

import { aurora, colors, radius, space, type } from '@/theme';

import { AuroraGlass } from './aurora';
import { PressableScale } from './pressable-scale';

export interface SearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onSubmit?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  inputRef?: React.Ref<TextInput>;
  /** `light`: white field with a hairline border; `aurora`: a glass field on the aurora ground. */
  tone?: 'filled' | 'light' | 'aurora';
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  style,
  onSubmit,
  autoFocus,
  onFocus,
  inputRef,
  tone = 'filled',
}: SearchBarProps) {
  const { t } = useTranslation();
  const faint = tone === 'aurora' ? aurora.textMuted : colors.textFaint;
  const Field = tone === 'aurora' ? AuroraGlass : View;

  return (
    <Field style={[styles.base, tone === 'light' && styles.light, tone === 'aurora' && styles.aurora, style]}>
      <Ionicons name="search" size={17} color={faint} />
      <TextInput
        ref={inputRef}
        onFocus={onFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={faint}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <PressableScale
          onPress={() => onChangeText('')}
          scaleTo={0.85}
          hitSlop={14}
          accessibilityLabel={t('a11y.clearSearch')}>
          <Ionicons name="close-circle" size={17} color={faint} />
        </PressableScale>
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  light: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  aurora: { backgroundColor: undefined },
  input: {
    flex: 1,
    padding: 0,
    color: colors.text,
    ...type.body,
  },
});

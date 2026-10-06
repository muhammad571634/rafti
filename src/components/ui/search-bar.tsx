import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';

import { colors, radius, space, type } from '@/theme';

import { PressableScale } from './pressable-scale';

export interface SearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onSubmit?: () => void;
  autoFocus?: boolean;
  /** `light`: white field with a hairline border, as on Find. */
  tone?: 'filled' | 'light';
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  style,
  onSubmit,
  autoFocus,
  tone = 'filled',
}: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.base, tone === 'light' && styles.light, style]}>
      <Ionicons name="search" size={17} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
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
          <Ionicons name="close-circle" size={17} color={colors.textFaint} />
        </PressableScale>
      ) : null}
    </View>
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
  input: {
    flex: 1,
    padding: 0,
    color: colors.text,
    ...type.body,
  },
});

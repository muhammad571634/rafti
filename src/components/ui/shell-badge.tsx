import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, palette, radius, space } from '@/theme';

import { ShellIcon } from './icon-3d';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface ShellBadgeProps {
  count: number;
  onPress?: () => void;
  /** Adds the `+` top-up affordance seen in the chat header. */
  showAdd?: boolean;
  style?: StyleProp<ViewStyle>;
  /** `neutral`: the calm-cards grey pill (docs/design-style.md), for screen headers. */
  tone?: 'light' | 'dark' | 'neutral';
}

/** The shell + balance pill: wallet on Home, Gifts and the chat header. */
export function ShellBadge({ count, onPress, showAdd, style, tone = 'light' }: ShellBadgeProps) {
  const { t } = useTranslation();
  const dark = tone === 'dark';
  const neutral = tone === 'neutral';
  const fg = dark ? colors.white : neutral ? colors.text : palette.shellText;

  const content = (
    <View
      style={[
        styles.base,
        dark ? styles.dark : neutral ? styles.neutral : styles.light,
        style,
      ]}>
      <ShellIcon size={14} />
      <Txt variant="smallStrong" color={fg}>
        {count}
      </Txt>
      {showAdd ? <Ionicons name="add" size={13} color={fg} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    // 22pt pill, 44pt target.
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      dimOnPress={false}
      hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
      accessibilityLabel={`${count} ${t('common.shells')}`}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: space.sm,
    height: 22,
    borderRadius: radius.pill,
  },
  light: {
    backgroundColor: palette.shellSoft,
    borderWidth: 1,
    borderColor: palette.shellBorder,
  },
  dark: { backgroundColor: 'rgba(0,0,0,0.28)' },
  neutral: { backgroundColor: colors.surfaceAlt, height: 30, paddingHorizontal: space.md, gap: 5 },
});

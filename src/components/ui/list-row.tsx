import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading visual: an avatar or an IconTile. */
  left?: React.ReactNode;
  /** Small mark right after the title text, e.g. a bond level chip beside a name. */
  titleAfter?: React.ReactNode;
  /** Small mark just before `meta` on the title line, e.g. a pin for a pinned chat. */
  titleAccessory?: React.ReactNode;
  /** Short muted text on the title line's right edge: a time, a price. */
  meta?: string;
  /** Small element at the end of the subtitle line: a CountBadge, a muted icon. */
  trailing?: React.ReactNode;
  /** A control at the row's right edge, vertically centred: a Switch, a small Button. */
  right?: React.ReactNode;
  /** The › affordance for rows that open another screen. */
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one list row of the app: chats, settings, sheet actions. Rows sit on the
 * canvas with no card or shadow; lists separate them with an inset Divider.
 */
export function ListRow({
  title,
  subtitle,
  left,
  titleAfter,
  titleAccessory,
  meta,
  trailing,
  right,
  chevron,
  onPress,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const body = (
    <>
      {left}
      <View style={styles.text}>
        <View style={styles.line}>
          {titleAfter ? (
            // The mark hugs the name; the name gives way first when space runs out.
            <View style={[styles.grow, styles.titleGroup]}>
              <Txt variant="bodyStrong" lines={1} style={styles.shrink}>
                {title}
              </Txt>
              {titleAfter}
            </View>
          ) : (
            <Txt variant="bodyStrong" lines={1} style={styles.grow}>
              {title}
            </Txt>
          )}
          {titleAccessory}
          {meta ? (
            <Txt variant="caption" color={colors.textMuted}>
              {meta}
            </Txt>
          ) : null}
          {subtitle ? null : trailing}
        </View>
        {subtitle ? (
          <View style={styles.line}>
            <Txt variant="small" color={colors.textSecondary} lines={1} style={styles.grow}>
              {subtitle}
            </Txt>
            {trailing}
          </View>
        ) : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
    </>
  );

  if (!onPress) return <View style={[styles.row, style]}>{body}</View>;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.row, style]}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  text: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  shrink: { flexShrink: 1 },
});
